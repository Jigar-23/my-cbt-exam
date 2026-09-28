'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  User,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  BookOpen,
  BarChart2,
  Pause,
  Play,
  LayoutGrid,
  X,
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import QuestionPaperModal from './QuestionPaperModal';
import InstructionsModal from './InstructionsModal';
import ScorecardModal from './ScorecardModal';
import DeepAnalyticsView from './DeepAnalyticsView';
import { QuestionTelemetry, AttemptRecord, evaluateAttempt } from '../lib/analyticsEngine';
import { saveCompletedAttempt, saveInFlightSnapshot, clearInFlightSnapshot, InFlightExamSnapshot } from '../lib/analyticsStorage';
import { syncAttemptToDrive, syncInFlightToDrive, clearInFlightFromDrive } from '../lib/gdrive/gdriveSync';
import { platformBridge } from '../lib/platform/platformBridge';

interface CBTExamPlayerProps {
  testData: any;
  onExit: () => void;
  initialStudyMode?: boolean;
  initialSnapshot?: InFlightExamSnapshot | null;
}

export default function CBTExamPlayer({
  testData,
  onExit,
  initialStudyMode = false,
  initialSnapshot = null,
}: CBTExamPlayerProps) {
  const isResuming = !!initialSnapshot;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(initialSnapshot?.currentSectionIndex ?? 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialSnapshot?.currentQuestionIndex ?? 0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(initialSnapshot?.userAnswers ?? {});
  const userAnswersRef = useRef<Record<string, string>>(initialSnapshot?.userAnswers ?? {});
  const [questionStatus, setQuestionStatus] = useState<
    Record<string, 'not_visited' | 'not_answered' | 'answered' | 'marked_review' | 'answered_marked'>
  >((initialSnapshot?.questionStatus as any) ?? {});
  const [isStudyMode, setIsStudyMode] = useState(initialStudyMode);
  const [isExamStarted, setIsExamStarted] = useState(initialStudyMode || isResuming);
  const [fontSizeOffset, setFontSizeOffset] = useState(0); // -2, 0, 2, 4
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(!initialStudyMode && !isResuming);
  const [isStarterInstruction, setIsStarterInstruction] = useState(!initialStudyMode && !isResuming);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Question Palette Visibility (Default closed on mobile to prevent overlapping question view, open on desktop)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsPaletteOpen(true);
    }
  }, []);

  // Hardware Back Button Protection for Native Mobile (Android)
  useEffect(() => {
    return platformBridge.registerBackHandler(() => {
      if (isQuestionPaperOpen) {
        setIsQuestionPaperOpen(false);
        return true;
      }
      if (isInstructionsOpen) {
        setIsInstructionsOpen(false);
        return true;
      }
      if (isSubmitModalOpen) {
        setIsSubmitModalOpen(false);
        return true;
      }
      if (isPaletteOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsPaletteOpen(false);
        return true;
      }
      if (isExamStarted && !isSubmitted && !isStudyMode) {
        if (window.confirm('Do you want to pause and exit the exam? Your answers and timer are saved in-flight.')) {
          handleExitToDashboard();
        }
        return true;
      }
      return false;
    });
  }, [isQuestionPaperOpen, isInstructionsOpen, isSubmitModalOpen, isPaletteOpen, isExamStarted, isSubmitted, isStudyMode]);

  // Pause State
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string>('');

  // Analytics & Scorecard Modals
  const [latestAttempt, setLatestAttempt] = useState<AttemptRecord | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [isDeepAnalyticsOpen, setIsDeepAnalyticsOpen] = useState(false);

  // Telemetry Refs (Guarantees true timestamp intervals without React render drift)
  const activeQuestionRef = useRef<{
    questionId: string;
    sectionId: string;
    enteredAt: number;
  } | null>(null);
  const telemetryMapRef = useRef<Record<string, QuestionTelemetry>>(initialSnapshot?.telemetryMap ?? {});
  const examStartedAtRef = useRef<number>(initialSnapshot?.startedAt ?? Date.now());
  const submissionLockRef = useRef<boolean>(false);

  // Sectional Timer logic (20 mins per section for New Pattern 2026, or total test duration)
  const isNewPattern = testData?.pattern === 'NEW_PATTERN_2026';
  const sectionDurationSeconds = isNewPattern ? 20 * 60 : (testData?.totalDurationMinutes || 120) * 60;
  const [timeLeft, setTimeLeft] = useState(initialSnapshot?.timeLeft ?? sectionDurationSeconds);
  const targetEndTimeRef = useRef<number>(Date.now() + (initialSnapshot?.timeLeft ?? sectionDurationSeconds) * 1000);


  const sections = testData?.sections || [];
  const currentSection = sections[currentSectionIndex] || { questions: [] };
  const currentQuestions = currentSection.questions || [];
  const currentQ = currentQuestions[currentQuestionIndex];

  // 1. Close Active Question Timing Interval
  const closeActiveQuestionInterval = () => {
    if (!activeQuestionRef.current) return;
    const now = Date.now();
    const { questionId, sectionId, enteredAt } = activeQuestionRef.current;
    const durationMs = Math.max(0, now - enteredAt);
    const durationSec = durationMs / 1000;

    if (!telemetryMapRef.current[questionId]) {
      telemetryMapRef.current[questionId] = {
        questionId,
        sectionId,
        firstOpenedAt: enteredAt,
        lastOpenedAt: now,
        totalActiveTimeSeconds: 0,
        visitCount: 0,
        visits: [],
        answer: userAnswersRef.current[questionId] || null,
        answerChangeCount: 0,
        markedForReview: false,
      };
    }

    const record = telemetryMapRef.current[questionId];
    record.lastOpenedAt = now;
    record.totalActiveTimeSeconds += durationSec;
    record.visits.push({ enteredAt, exitedAt: now, durationMs });
    record.answer = userAnswersRef.current[questionId] || null;

    activeQuestionRef.current = null;
  };

  // 2. Open New Active Question Timing Interval
  const openQuestionInterval = (questionId: string, sectionId: string) => {
    if (activeQuestionRef.current) {
      if (activeQuestionRef.current.questionId === questionId) {
        return;
      }
      closeActiveQuestionInterval();
    }

    const now = Date.now();
    if (!telemetryMapRef.current[questionId]) {
      telemetryMapRef.current[questionId] = {
        questionId,
        sectionId,
        firstOpenedAt: now,
        lastOpenedAt: now,
        totalActiveTimeSeconds: 0,
        visitCount: 1,
        visits: [],
        answer: userAnswersRef.current[questionId] || null,
        answerChangeCount: 0,
        markedForReview: false,
      };
    } else {
      telemetryMapRef.current[questionId].visitCount += 1;
    }

    activeQuestionRef.current = {
      questionId,
      sectionId,
      enteredAt: now,
    };
  };

  // Initialize statuses if not resuming
  useEffect(() => {
    if (!testData || isResuming) return;
    const initialStatuses: Record<string, any> = {};
    for (const sec of testData.sections || []) {
      for (const q of sec.questions || []) {
        initialStatuses[q.id] = 'not_visited';
      }
    }
    setQuestionStatus(initialStatuses);
  }, [testData, isResuming]);

  // Mark current question as not_answered if it was not_visited
  useEffect(() => {
    if (!currentQ) return;
    setQuestionStatus((prev) => {
      if (prev[currentQ.id] === 'not_visited' || !prev[currentQ.id]) {
        return { ...prev, [currentQ.id]: 'not_answered' };
      }
      return prev;
    });
  }, [currentQ?.id]);

  // Telemetry Question Visit Lifecycle Hook
  useEffect(() => {
    if (!currentQ || isSubmitted || !isExamStarted || isPaused) return;
    const secId = currentSection?.id || `sec_${currentSectionIndex}`;
    openQuestionInterval(currentQ.id, secId);

    return () => {
      closeActiveQuestionInterval();
    };
  }, [currentQ?.id, isSubmitted, isExamStarted, isPaused]);

  // Helper: In-Flight Crash Protection Snapshot
  const lastCloudSnapshotSyncRef = useRef<number>(0);

  const saveCurrentSnapshot = (forceCloudSync = false) => {
    if (!isExamStarted || isSubmitted || isStudyMode) return;
    const testId = testData?.testId || testData?._id || testData?.id || 'unknown';
    const now = Date.now();
    const currentRemainingTime = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));
    const snapshot: InFlightExamSnapshot = {
      testId,
      testTitle: testData?.title || 'Test',
      startedAt: examStartedAtRef.current,
      lastSavedAt: now,
      currentSectionIndex,
      currentQuestionIndex,
      userAnswers: { ...userAnswersRef.current },
      questionStatus,
      timeLeft: currentRemainingTime,
      telemetryMap: telemetryMapRef.current,
    };
    saveInFlightSnapshot(snapshot);

    // Throttle Google Drive cloud upload (at most once per 15s, or immediate on forceCloudSync)
    if (forceCloudSync || now - lastCloudSnapshotSyncRef.current >= 15000) {
      lastCloudSnapshotSyncRef.current = now;
      syncInFlightToDrive(snapshot).catch(() => {});
    }
  };

  const saveCurrentSnapshotRef = useRef(saveCurrentSnapshot);
  saveCurrentSnapshotRef.current = saveCurrentSnapshot;
  const closeActiveIntervalRef = useRef(closeActiveQuestionInterval);
  closeActiveIntervalRef.current = closeActiveQuestionInterval;

  // Periodic Snapshot on question navigation or answer change
  useEffect(() => {
    saveCurrentSnapshot();
  }, [currentQuestionIndex, currentSectionIndex, userAnswers, questionStatus, isExamStarted, isSubmitted]);

  // Auto-Pause on Window Blur / App Minimize / Tab Switch (Bound once, immune to second-by-second listener churn)
  useEffect(() => {
    if (!isExamStarted || isSubmitted || isStudyMode) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        closeActiveIntervalRef.current();
        saveCurrentSnapshotRef.current(true);
        setIsPaused(true);
        setPauseReason('App minimized or sent to background');
      }
    };

    const handleBlur = () => {
      if (document.visibilityState === 'hidden') {
        closeActiveIntervalRef.current();
        saveCurrentSnapshotRef.current(true);
        setIsPaused(true);
        setPauseReason('Window lost focus or minimized');
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isExamStarted, isSubmitted, isStudyMode]);

  // Clean Exit to Dashboard with Immediate Snapshotting
  const handleExitToDashboard = () => {
    closeActiveQuestionInterval();
    if (isExamStarted && !isSubmitted && !isStudyMode) {
      saveCurrentSnapshot(true);
    }
    onExit();
  };

  // Idempotent Final Submission & Scoring Engine
  const handleFinalSubmit = async () => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;

    // 1. Close current active question timer
    closeActiveQuestionInterval();

    // 2. Stop exam state
    setIsSubmitted(true);
    setIsStudyMode(true);
    setIsSubmitModalOpen(false);
    setIsPaused(false);

    // 3. Evaluate dynamically
    const attemptRecord = evaluateAttempt(
      testData,
      userAnswersRef.current,
      telemetryMapRef.current,
      questionStatus,
      examStartedAtRef.current,
      Date.now()
    );

    // 4. Save to IndexedDB & clear crash snapshot
    await saveCompletedAttempt(attemptRecord);
    const finalTestId = testData?.testId || testData?._id || testData?.id || 'unknown';
    clearInFlightSnapshot(finalTestId);

    // 5. Asynchronous background sync to Google Drive
    syncAttemptToDrive(attemptRecord).catch(() => {});
    clearInFlightFromDrive(finalTestId).catch(() => {});

    setLatestAttempt(attemptRecord);
    setIsScorecardOpen(true);
  };

  // Wall-Clock Monotonic Countdown timer (immune to mobile background throttling & sleep)
  useEffect(() => {
    if (isSubmitted || isStudyMode || !isExamStarted || isPaused) return;

    // Anchor target end time based on current remaining timeLeft
    targetEndTimeRef.current = Date.now() + timeLeft * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));

      if (remainingSecs <= 0) {
        setTimeLeft(0);
        if (isNewPattern && currentSectionIndex < sections.length - 1) {
          closeActiveQuestionInterval();
          setCurrentSectionIndex((idx) => idx + 1);
          setCurrentQuestionIndex(0);
          targetEndTimeRef.current = Date.now() + sectionDurationSeconds * 1000;
          setTimeLeft(sectionDurationSeconds);
        } else {
          handleFinalSubmit();
        }
      } else {
        setTimeLeft(remainingSecs);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, isStudyMode, isExamStarted, isPaused, currentSectionIndex, sections.length, isNewPattern]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };


  // Top-level early return for Deep Analytics View
  if (isDeepAnalyticsOpen && latestAttempt) {
    return (
      <DeepAnalyticsView
        currentAttempt={latestAttempt}
        onBackToPlayer={() => setIsDeepAnalyticsOpen(false)}
        onExitToDashboard={onExit}
        onJumpToQuestionSolution={(secIdx, qIdx) => {
          setIsDeepAnalyticsOpen(false);
          setCurrentSectionIndex(secIdx);
          setCurrentQuestionIndex(qIdx);
        }}
      />
    );
  }

  const handleSelectOption = (optionId: string) => {
    if (!currentQ) return;
    platformBridge.triggerHaptic('selection');
    const prev = userAnswersRef.current[currentQ.id];
    if (prev !== optionId && telemetryMapRef.current[currentQ.id]) {
      telemetryMapRef.current[currentQ.id].answerChangeCount += 1;
    }
    userAnswersRef.current = {
      ...userAnswersRef.current,
      [currentQ.id]: optionId,
    };
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    platformBridge.triggerHaptic('light');
    closeActiveQuestionInterval();
    const hasAnswer = !!userAnswersRef.current[currentQ.id];
    setQuestionStatus((prev) => ({
      ...prev,
      [currentQ.id]: hasAnswer ? 'answered' : 'not_answered',
    }));

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentSectionIndex < sections.length - 1 && !isNewPattern) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentQ) return;
    platformBridge.triggerHaptic('medium');
    closeActiveQuestionInterval();
    const hasAnswer = !!userAnswersRef.current[currentQ.id];
    setQuestionStatus((prev) => ({
      ...prev,
      [currentQ.id]: hasAnswer ? 'answered_marked' : 'marked_review',
    }));
    if (telemetryMapRef.current[currentQ.id]) {
      telemetryMapRef.current[currentQ.id].markedForReview = true;
    }

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentSectionIndex < sections.length - 1 && !isNewPattern) {
      setCurrentSectionIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    platformBridge.triggerHaptic('light');
    const nextAnswers = { ...userAnswersRef.current };
    delete nextAnswers[currentQ.id];
    userAnswersRef.current = nextAnswers;
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
    setQuestionStatus((prev) => ({
      ...prev,
      [currentQ.id]: 'not_answered',
    }));
  };

  const handleJumpToQuestion = (idx: number) => {
    platformBridge.triggerHaptic('selection');
    if (idx === currentQuestionIndex) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsPaletteOpen(false);
      }
      return;
    }
    closeActiveQuestionInterval();
    setCurrentQuestionIndex(idx);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsPaletteOpen(false);
    }
  };

  const handleSwitchSection = (secIdx: number) => {
    if (secIdx === currentSectionIndex) return;
    platformBridge.triggerHaptic('selection');
    if (isNewPattern && !isSubmitted && !isStudyMode) {
      // In official 2026 new pattern, sections are locked by timer
      alert('Section switching is locked in Exam Mode. Each section runs on a strict 20-minute timer.');
      return;
    }
    closeActiveQuestionInterval();
    setCurrentSectionIndex(secIdx);
    setCurrentQuestionIndex(0);
  };

  // Palette status color helper (matching authentic official TCS iON)
  const getPaletteBadgeClass = (qId: string) => {
    const status = questionStatus[qId] || 'not_visited';
    switch (status) {
      case 'answered':
        return 'tcs-polygon-answered shadow-xs';
      case 'not_answered':
        return 'tcs-polygon-not-answered shadow-xs';
      case 'marked_review':
        return 'tcs-polygon-marked shadow-xs';
      case 'answered_marked':
        return 'tcs-polygon-answered-marked shadow-xs';
      case 'not_visited':
      default:
        return 'tcs-polygon-not-visited';
    }
  };

  // Status counters
  const totalAnswered = Object.values(questionStatus).filter((s) => s === 'answered').length;
  const totalNotAnswered = Object.values(questionStatus).filter((s) => s === 'not_answered').length;
  const totalMarked = Object.values(questionStatus).filter((s) => s === 'marked_review').length;
  const totalAnsweredMarked = Object.values(questionStatus).filter((s) => s === 'answered_marked').length;
  const totalNotVisited = Object.values(questionStatus).filter((s) => s === 'not_visited').length;

  // Render question palette contents (reusable for both desktop sidebar and mobile overlay drawer)
  const renderPaletteContent = (isMobile: boolean = false) => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status Legend Grid (Authentic TCS iON Geometric Shapes) */}
      <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Question Status Legend</h3>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 tcs-polygon-answered shrink-0" />
            <span className="truncate">Answered ({totalAnswered})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 tcs-polygon-not-answered shrink-0" />
            <span className="truncate">Not Answered ({totalNotAnswered})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 tcs-polygon-not-visited shrink-0" />
            <span className="truncate">Not Visited ({totalNotVisited})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 tcs-polygon-marked shrink-0" />
            <span className="truncate">Marked ({totalMarked})</span>
          </div>
          <div className="flex items-center space-x-2 col-span-2">
            <div className="w-5 h-5 tcs-polygon-answered-marked shrink-0 relative">
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-purple-900" />
            </div>
            <span className="truncate">Answered &amp; Marked for Review ({totalAnsweredMarked})</span>
          </div>
        </div>
      </div>

      {/* Section Name Ribbon */}
      <div className="bg-blue-600 text-white px-4 py-2 text-xs font-bold flex justify-between items-center shadow-xs shrink-0">
        <span className="truncate mr-2">{currentSection.name}</span>
        <span className="font-mono text-[11px] font-normal shrink-0">
          {currentQuestions.length} Questions
        </span>
      </div>

      {/* Question Grid Numbers */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {currentQuestions.map((q: any, qIdx: number) => {
            const isCurrent = qIdx === currentQuestionIndex;
            const badgeClass = getPaletteBadgeClass(q.id);
            const status = questionStatus[q.id] || 'not_visited';

            return (
              <button
                key={q.id || qIdx}
                onClick={() => handleJumpToQuestion(qIdx)}
                className={`h-9 w-9 text-xs font-bold transition-all flex items-center justify-center cursor-pointer relative mx-auto ${badgeClass} ${
                  isCurrent ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : 'hover:opacity-90'
                }`}
              >
                <span>{qIdx + 1}</span>
                {status === 'answered_marked' && (
                  <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-purple-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 bg-white border-t border-slate-200 text-center shrink-0">
        <button
          onClick={() => {
            if (isMobile) setIsPaletteOpen(false);
            setIsSubmitModalOpen(true);
          }}
          className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
        >
          Submit Entire Test
        </button>
      </div>
    </div>
  );

  if (!testData || !currentQ) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Test data could not be loaded</h3>
          <button onClick={onExit} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* 1. TOP HEADER BAR (Dark Slate/Black #2a2a2a) */}
      <header className="bg-[#242424] text-white px-3 md:px-4 py-2 flex items-center justify-between border-b border-neutral-700 select-none z-20 shrink-0">
        <div className="flex items-center space-x-3 truncate">
          <button
            onClick={handleExitToDashboard}
            className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-medium rounded transition-colors cursor-pointer border border-neutral-700 hover:border-neutral-600"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
          <h1 className="text-amber-400 font-bold text-sm md:text-base tracking-wide truncate">
            {testData.title}
          </h1>
          <span className="hidden md:inline-block text-xs bg-neutral-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-neutral-700">
            {testData.pattern}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Performance Analytics Button (Available after submission or in study mode) */}
          {(isSubmitted || latestAttempt) && (
            <button
              onClick={() => {
                if (!latestAttempt) {
                  // If in initial study mode without a prior run, generate dynamic baseline report
                  const baseline = evaluateAttempt(
                    testData,
                    userAnswers,
                    telemetryMapRef.current,
                    questionStatus,
                    examStartedAtRef.current,
                    Date.now()
                  );
                  setLatestAttempt(baseline);
                }
                setIsDeepAnalyticsOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-xs transition-all animate-pulse"
            >
              <BarChart2 size={14} />
              <span>📊 Performance Analytics</span>
            </button>
          )}

          {/* Study Mode Toggle */}
          <button
            onClick={() => setIsStudyMode(!isStudyMode)}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              isStudyMode
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-neutral-800 text-slate-300 hover:bg-neutral-700'
            }`}
          >
            {isStudyMode ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{isStudyMode ? '💡 Solution Mode ON' : 'Exam Mode'}</span>
          </button>

          {/* Question Paper Button */}
          <button
            onClick={() => setIsQuestionPaperOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Question Paper</span>
          </button>

          {/* Instructions Button */}
          <button
            onClick={() => {
              setIsStarterInstruction(false);
              setIsInstructionsOpen(true);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium rounded transition-colors"
          >
            <HelpCircle size={14} />
            <span className="hidden sm:inline">Instructions</span>
          </button>

          {/* Submit Test (Safe Header Placement) */}
          {!isSubmitted && !isStudyMode && isExamStarted && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer border border-rose-400/40"
              title="Submit Entire Exam"
            >
              <span>Submit Test</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. SUB-HEADER: SECTION TABS + COUNTDOWN TIMER + CANDIDATE CARD */}
      <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0 select-none">
        {/* Section Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
          {sections.map((sec: any, sIdx: number) => {
            const isActive = sIdx === currentSectionIndex;
            const isProfessionalIT = sec.isProfessionalIT || sec.name.toLowerCase().includes('professional');
            return (
              <button
                key={sec.id || sIdx}
                onClick={() => handleSwitchSection(sIdx)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-all flex items-center space-x-1.5 whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 border-blue-600 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 border-transparent'
                }`}
              >
                {isProfessionalIT && <span className="text-amber-500 font-bold">⭐</span>}
                <span>{sec.name}</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                  {sec.questions?.length || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Timer, Palette & Candidate Card */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Pause Exam Button */}
          {!isSubmitted && !isStudyMode && isExamStarted && (
            <button
              onClick={() => {
                closeActiveQuestionInterval();
                saveCurrentSnapshot();
                setIsPaused(true);
                setPauseReason('Manually paused by candidate');
              }}
              className="flex items-center space-x-1.5 px-2.5 md:px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 font-semibold border border-amber-500/30 rounded-md text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              title="Pause Exam Timer"
            >
              <Pause size={13} />
              <span className="hidden sm:inline">Pause</span>
            </button>
          )}

          {/* Digital Timer (3-Stage Visual Urgency) */}
          <div
            className={`flex items-center space-x-1.5 md:space-x-2 px-2.5 md:px-3.5 py-1 rounded-md shadow-inner transition-colors duration-300 border ${
              timeLeft <= 60
                ? 'bg-rose-950/90 text-rose-200 border-rose-500 animate-pulse'
                : timeLeft <= 300
                ? 'bg-amber-950/80 text-amber-200 border-amber-500'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <Clock
              size={15}
              className={
                timeLeft <= 60
                  ? 'text-rose-400 animate-pulse'
                  : timeLeft <= 300
                  ? 'text-amber-400 animate-pulse'
                  : 'text-amber-400'
              }
            />
            <span className="hidden sm:inline text-xs font-medium opacity-80">Time Left:</span>
            <span
              className={`font-mono text-xs sm:text-sm md:text-base font-bold tracking-wider ${
                timeLeft <= 60
                  ? 'text-rose-400 font-extrabold'
                  : timeLeft <= 300
                  ? 'text-amber-300'
                  : 'text-amber-400'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Question Palette Toggle Button (Open/Close) */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`flex items-center space-x-1.5 px-2.5 md:px-3 py-1 text-xs font-semibold rounded shadow-xs transition-all cursor-pointer ${
              isPaletteOpen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isPaletteOpen ? 'Close Question Palette' : 'Open Question Palette'}
          >
            <LayoutGrid size={14} className="text-amber-400" />
            <span className="font-bold">{isPaletteOpen ? 'Close Grid' : 'Questions'}</span>
          </button>

          {/* Candidate Card */}
          <div className="hidden xl:flex items-center space-x-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <User size={16} />
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-bold text-slate-800">Jigar</p>
              <p className="text-[10px] text-slate-500 font-mono">Candidate ID: 2026-IT</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (Question on Left, Collapsible Palette on Right or Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT 75%: QUESTION VIEW */}
        <main className="flex-1 flex flex-col bg-white overflow-y-auto border-r border-slate-200">
          {/* Question Meta Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 md:px-6 py-2 flex items-center justify-between text-xs text-slate-700 shrink-0 select-none">
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="font-bold text-sm text-slate-900">
                Q.No: {currentQuestionIndex + 1}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-medium text-rose-600">MCQ Single</span>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Text Zoom */}
              <div className="flex items-center space-x-1">
                <span className="hidden sm:inline text-slate-500 text-[11px]">Text Size:</span>
                <button
                  onClick={() => setFontSizeOffset((prev) => Math.min(prev + 2, 6))}
                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-bold text-[11px]"
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSizeOffset((prev) => Math.max(prev - 2, -2))}
                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-bold text-[11px]"
                >
                  A-
                </button>
              </div>

              {/* Marks pill */}
              <div className="flex items-center space-x-1.5 font-mono text-xs">
                <span className="text-slate-500">Marks:</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  +{currentQ?.marks ?? 1}
                </span>
                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
                  -{currentQ?.negativeMarks ?? 0.25}
                </span>
              </div>
            </div>
          </div>

          {/* Question & Options Area */}
          <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
            {!currentQ ? (
              <div className="h-full flex items-center justify-center text-center p-8">
                <p className="text-slate-500 font-medium">No question data available for this question index.</p>
              </div>
            ) : (
              <>
            {/* Direction / Passage Context */}
            {(currentQ.passage || currentQ.direction || currentQ.precondition || currentQ.instruction || currentQ.caselet) && (
              <div
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed overflow-x-auto space-y-2"
                style={{ fontSize: `${14 + fontSizeOffset}px` }}
              >
                {currentQ.direction && <MathRenderer content={currentQ.direction} />}
                {currentQ.passage && <MathRenderer content={currentQ.passage} />}
                {currentQ.precondition && <MathRenderer content={currentQ.precondition} />}
                {currentQ.instruction && <MathRenderer content={currentQ.instruction} />}
                {currentQ.caselet && <MathRenderer content={currentQ.caselet} />}
              </div>
            )}

            {/* Question Text */}
            <div className="text-slate-900 font-medium leading-relaxed" style={{ fontSize: `${15 + fontSizeOffset}px` }}>
              <MathRenderer content={currentQ.text} />
            </div>

            {/* Question Diagram / Image */}
            {currentQ.image && (
              <div className="my-4 p-2 bg-slate-50 border border-slate-200 rounded-lg inline-block">
                <img
                  src={
                    currentQ.image.startsWith('http')
                      ? currentQ.image
                      : currentQ.image.startsWith('//')
                      ? `https:${currentQ.image}`
                      : currentQ.image.startsWith('/')
                      ? currentQ.image
                      : `/${currentQ.image}`
                  }
                  alt="Question Diagram"
                  className="max-h-72 max-w-full object-contain rounded"
                />
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {(currentQ.options || []).map((opt: any, oIdx: number) => {
                const optId = opt.id || `${oIdx + 1}`;
                const isSelected = userAnswers[currentQ.id] === optId;
                const isCorrect = String(currentQ.correctOptionId) === String(optId) || String(currentQ.correctOptionId) === String(oIdx + 1);

                let optionBg = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';
                if (isSelected) {
                  optionBg = 'bg-blue-50 border-blue-600 text-blue-950 font-medium shadow-xs';
                }
                if (isStudyMode && isCorrect) {
                  optionBg = 'bg-emerald-50 border-emerald-600 text-emerald-950 font-medium ring-1 ring-emerald-500';
                } else if (isStudyMode && isSelected && !isCorrect) {
                  optionBg = 'bg-rose-50 border-rose-600 text-rose-950';
                }

                return (
                  <label
                    key={optId}
                    onClick={() => handleSelectOption(optId)}
                    className={`flex items-start space-x-3 p-3.5 rounded-lg border cursor-pointer transition-all ${optionBg}`}
                    style={{ fontSize: `${14 + fontSizeOffset}px` }}
                  >
                    <input
                      type="radio"
                      name={`q_${currentQ.id}`}
                      checked={isSelected}
                      onChange={() => handleSelectOption(optId)}
                      className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 shrink-0"
                    />
                    <div className="flex-1 flex items-start space-x-2 leading-relaxed">
                      <span className="font-bold text-slate-500 shrink-0">({opt.label || String.fromCharCode(65 + oIdx)})</span>
                      <MathRenderer content={opt.text} className="flex-1" />
                    </div>

                    {isStudyMode && isCorrect && (
                      <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded shrink-0">
                        ✓ Correct Answer
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Instant Solution & Detailed Explanation Box (Study Mode) */}
            {isStudyMode && currentQ?.explanation && (
              <div className="mt-8 p-5 bg-blue-50/60 border border-blue-200 rounded-xl shadow-xs space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-blue-900 font-bold text-sm">
                  <span>💡 Step-by-Step Official Explanation & Proof:</span>
                </div>
                <div className="text-slate-800 text-sm leading-relaxed prose prose-blue max-w-none">
                  <MathRenderer content={currentQ.explanation} />
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* 4. BOTTOM ACTION TOOLBAR */}
          <footer className="bg-slate-100 border-t border-slate-300 px-4 md:px-6 py-2.5 md:py-3 safe-bottom flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
            {/* Left Controls */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                onClick={handleMarkForReviewAndNext}
                className="px-3 md:px-5 py-2 bg-white hover:bg-slate-50 text-purple-700 border border-purple-300 hover:border-purple-400 rounded font-semibold text-xs md:text-sm shadow-xs transition-colors cursor-pointer"
              >
                Mark for Review & Next
              </button>
              <button
                onClick={handleClearResponse}
                className="px-3 md:px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 rounded font-medium text-xs md:text-sm shadow-xs transition-colors cursor-pointer"
              >
                Clear Response
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Quick Mobile Palette Button */}
              <button
                onClick={() => setIsPaletteOpen(true)}
                className="lg:hidden px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                title="View Question Palette"
              >
                <LayoutGrid size={14} className="text-amber-400" />
                <span>Palette</span>
              </button>

              <button
                onClick={handleSaveAndNext}
                className="px-5 md:px-8 py-2 md:py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded font-bold text-xs md:text-sm shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Save & Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </main>

        {/* DESKTOP QUESTION PALETTE SIDEBAR (lg+ only, collapsible) */}
        {isPaletteOpen && (
          <aside className="hidden lg:flex w-80 lg:w-96 bg-slate-100 flex-col border-l border-slate-300 select-none shrink-0 animate-in slide-in-from-right duration-200">
            {/* Desktop Palette Header with Collapse Button */}
            <div className="p-2.5 bg-slate-800 text-white flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center space-x-2 pl-1">
                <LayoutGrid size={15} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Question Palette</span>
              </div>
              <button
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-300 hover:text-white flex items-center space-x-1 text-xs cursor-pointer"
                title="Collapse Palette"
              >
                <ChevronRight size={16} />
                <span className="text-[11px]">Hide</span>
              </button>
            </div>
            {renderPaletteContent(false)}
          </aside>
        )}

        {/* Desktop Re-open Button (when collapsed) */}
        {!isPaletteOpen && (
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-l-lg shadow-lg items-center space-x-1 z-30 transition-all cursor-pointer"
            title="Open Question Palette"
          >
            <ChevronLeft size={18} />
            <span className="text-xs font-bold [writing-mode:vertical-lr] rotate-180 py-1">Palette</span>
          </button>
        )}
      </div>

      {/* MOBILE QUESTION PALETTE DRAWER & BACKDROP OVERLAY (<lg screens) */}
      {isPaletteOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPaletteOpen(false)}
          />

          {/* Drawer Slide-in from Right */}
          <div className="relative ml-auto w-[85vw] max-w-sm h-full bg-slate-100 flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Mobile Header with Close Button */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center space-x-2">
                <LayoutGrid size={16} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Question Palette</span>
              </div>
              <button
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white flex items-center space-x-1 text-xs cursor-pointer"
                title="Close Palette"
              >
                <span className="text-xs mr-1">Close</span>
                <X size={18} />
              </button>
            </div>

            {renderPaletteContent(true)}
          </div>
        </div>
      )}

      {/* Question Paper Modal */}
      <QuestionPaperModal
        isOpen={isQuestionPaperOpen}
        onClose={() => setIsQuestionPaperOpen(false)}
        testData={testData}
        currentSectionIndex={currentSectionIndex}
      />

      {/* Instructions Modal */}
      <InstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        testData={testData}
        isStarter={isStarterInstruction}
        onBegin={() => {
          setIsExamStarted(true);
          setIsStarterInstruction(false);
          setIsInstructionsOpen(false);
        }}
      />

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-300 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Submit Examination?</h3>
            <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-600 space-y-1.5 text-left border">
              <p className="flex justify-between">
                <span>Total Answered:</span>
                <strong className="text-emerald-600 font-bold">{totalAnswered + totalAnsweredMarked}</strong>
              </p>
              <p className="flex justify-between">
                <span>Not Answered:</span>
                <strong className="text-rose-600 font-bold">{totalNotAnswered}</strong>
              </p>
              <p className="flex justify-between">
                <span>Marked for Review:</span>
                <strong className="text-purple-600 font-bold">{totalMarked}</strong>
              </p>
              <p className="flex justify-between">
                <span>Not Visited:</span>
                <strong className="text-slate-500 font-bold">{totalNotVisited}</strong>
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to end and submit the test?
            </p>
            <div className="flex space-x-3 justify-center pt-2">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-xs transition-colors"
              >
                Continue Test
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-colors shadow-md"
              >
                Yes, Submit & View Solutions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Post-Exam Scorecard Modal */}
      <ScorecardModal
        isOpen={isScorecardOpen}
        attempt={latestAttempt}
        onViewDeepAnalytics={() => {
          setIsScorecardOpen(false);
          setIsDeepAnalyticsOpen(true);
        }}
        onReviewSolutions={() => {
          setIsScorecardOpen(false);
        }}
        onReturnToDashboard={handleExitToDashboard}
      />

      {/* Paused Overlay Modal */}
      {isPaused && !isSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Pause size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Examination Paused</h3>
              <p className="text-xs text-slate-500">
                {pauseReason || 'Timer is frozen. Your progress and answers are safely preserved.'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 border border-slate-200 text-left">
              <div className="flex justify-between items-center text-slate-700">
                <span>Time Remaining:</span>
                <span className="font-mono font-bold text-amber-600 text-sm">
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Current Section:</span>
                <span className="font-semibold">{currentSection?.name || 'Section'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Progress:</span>
                <span className="font-semibold text-emerald-600">
                  {totalAnswered + totalAnsweredMarked} answered / {Object.keys(questionStatus).length} total
                </span>
              </div>
            </div>

            <div className="flex space-x-3 justify-center pt-2">
              <button
                onClick={handleExitToDashboard}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
              >
                Exit to Dashboard
              </button>
              <button
                onClick={() => {
                  targetEndTimeRef.current = Date.now() + timeLeft * 1000;
                  setIsPaused(false);
                  setPauseReason('');
                  if (currentQ) {
                    openQuestionInterval(currentQ.id, currentSection?.id || `sec_${currentSectionIndex}`);
                  }
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-600/25 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Play size={14} fill="currentColor" />
                <span>Resume Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
