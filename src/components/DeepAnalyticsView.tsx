'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Trophy,
  Clock,
  Target,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  RotateCcw,
  BookOpen,
  Filter,
  TrendingUp,
  History,
  Sparkles,
  ChevronRight,
  Layers,
  Activity,
} from 'lucide-react';
import { AttemptRecord, QuestionAnalysis } from '../lib/analyticsEngine';
import { getAllAttempts } from '../lib/analyticsStorage';
import { platformBridge } from '../lib/platform/platformBridge';

interface DeepAnalyticsViewProps {
  currentAttempt: AttemptRecord;
  onBackToPlayer: () => void;
  onExitToDashboard: () => void;
  onJumpToQuestionSolution?: (sectionIndex: number, questionIndex: number) => void;
  onBackToHub?: () => void;
  onSelectAttempt?: (attempt: AttemptRecord) => void;
  backButtonLabel?: string;
}

export default function DeepAnalyticsView({
  currentAttempt,
  onBackToPlayer,
  onExitToDashboard,
  onJumpToQuestionSolution,
  onBackToHub,
  onSelectAttempt,
  backButtonLabel = 'Back to Solutions',
}: DeepAnalyticsViewProps) {
  const [activeAttempt, setActiveAttempt] = useState<AttemptRecord>(currentAttempt);
  const [activeTab, setActiveTab] = useState<'sections' | 'speed' | 'quadrant' | 'matrix' | 'history'>('sections');
  const [selectedSectionTab, setSelectedSectionTab] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<'all' | 'attempted' | 'unattempted'>('all');
  const [highlightedQId, setHighlightedQId] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted' | 'timetrap' | 'revisited'>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [selectedQuadrantSection, setSelectedQuadrantSection] = useState<string>('all');
  const [selectedQuadrantType, setSelectedQuadrantType] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'unattempted'>('all');
  const [hoveredScatterQ, setHoveredScatterQ] = useState<QuestionAnalysis | null>(null);
  const [allPastAttempts, setAllPastAttempts] = useState<AttemptRecord[]>([]);

  useEffect(() => {
    setActiveAttempt(currentAttempt);
  }, [currentAttempt]);

  useEffect(() => {
    getAllAttempts().then((attempts) => {
      setAllPastAttempts(attempts);
    });
  }, [activeAttempt]);

  // Hardware Back Button Protection for Native Mobile (Android)
  useEffect(() => {
    return platformBridge.registerBackHandler(() => {
      if (activeTab !== 'sections') {
        setActiveTab('sections');
        return true;
      }
      if (onBackToHub) {
        onBackToHub();
        return true;
      }
      if (onBackToPlayer) {
        onBackToPlayer();
        return true;
      }
      return false;
    });
  }, [activeTab, onBackToHub, onBackToPlayer]);

  const handleSwitchAttempt = (newAttempt: AttemptRecord) => {
    setActiveAttempt(newAttempt);
    if (onSelectAttempt) {
      onSelectAttempt(newAttempt);
    }
  };

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remM = mins % 60;
      return `${hrs}h ${remM}m ${remainderSecs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${remainderSecs}s`;
    }
    return `${remainderSecs}s`;
  };

  // Filter questions for the interactive matrix
  const filteredQuestions = activeAttempt.questions.filter((q) => {
    if (selectedSectionFilter !== 'all' && q.sectionId !== selectedSectionFilter) {
      return false;
    }
    if (questionFilter === 'correct') return q.status === 'correct';
    if (questionFilter === 'incorrect') return q.status === 'incorrect';
    if (questionFilter === 'unattempted') return q.status === 'unattempted';
    if (questionFilter === 'timetrap') return q.timeClassification === 'TIME_TRAP';
    if (questionFilter === 'revisited') return q.visitCount > 1;
    return true;
  });

  const { summary, timeIntelligence, sections, insights } = activeAttempt;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToHub || onBackToPlayer}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>{backButtonLabel}</span>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {activeAttempt.pattern}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(activeAttempt.submittedAt).toLocaleDateString()} at {new Date(activeAttempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-base md:text-lg font-bold text-white mt-0.5">{activeAttempt.testTitle}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onExitToDashboard}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Analytics Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2.5 rounded-t-lg text-xs md:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'sections'
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers size={16} />
            <span>Sectional Mastery & Topics</span>
          </button>

          <button
            onClick={() => setActiveTab('speed')}
            className={`px-4 py-2.5 rounded-t-lg text-xs md:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'speed'
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap size={16} />
            <span>Speed & Time Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('quadrant')}
            className={`px-4 py-2.5 rounded-t-lg text-xs md:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'quadrant'
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity size={16} />
            <span>4-Quadrant Diagnostic</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2.5 rounded-t-lg text-xs md:text-sm font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'matrix'
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Target size={16} />
            <span>Question Matrix ({activeAttempt.questions.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SECTIONAL MASTERY */}
        {/* ========================================================================= */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            {/* Top Stat Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Final Net Score</span>
                <div className="text-2xl md:text-3xl font-extrabold text-blue-400 mt-1">
                  {summary.netScore} <span className="text-xs text-slate-500 font-normal">/ {summary.maxMarks}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  +{summary.positiveMarks} positive | -{summary.negativeMarks} penalty
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Overall Accuracy</span>
                <div className={`text-2xl md:text-3xl font-extrabold mt-1 ${summary.accuracy >= 80 ? 'text-emerald-400' : summary.accuracy >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {summary.accuracy}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {summary.correct} correct out of {summary.attempted} attempted
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Attempt Breakdown</span>
                <div className="text-2xl md:text-3xl font-extrabold text-indigo-300 mt-1">
                  {summary.attempted} <span className="text-xs text-slate-500 font-normal">/ {summary.totalQuestions}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {summary.unattempted} skipped / left blank
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Total Active Time</span>
                <div className="text-xl md:text-2xl font-extrabold text-cyan-300 mt-1">
                  {formatSecs(activeAttempt.totalTimeSpentSeconds)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Avg {timeIntelligence.avgTimePerQuestionSeconds}s / question
                </div>
              </div>
            </div>

            {/* Section Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((sec) => (
                <div
                  key={sec.sectionId}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{sec.sectionName}</h3>
                      <span className="text-[11px] text-slate-400">{sec.totalQuestions} Questions</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-lg shadow-sm">
                      Score: {sec.netScore} / {sec.maxMarks}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Attempted</span>
                      <span className="font-bold text-white text-sm">{sec.attemptedCount} / {sec.totalQuestions}</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Correct</span>
                      <span className="font-bold text-emerald-400 text-sm">{sec.correctCount}</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Accuracy</span>
                      <span className={`font-bold text-sm ${sec.accuracyPercentage >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sec.accuracyPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Questions Accuracy</span>
                      <span>{sec.correctCount} of {sec.attemptedCount} attempted</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${sec.attemptedCount > 0 ? (sec.correctCount / sec.totalQuestions) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${sec.attemptedCount > 0 ? (sec.incorrectCount / sec.totalQuestions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Total Time Spent:</span>
                    <span className="font-mono font-semibold text-slate-200">{formatSecs(sec.totalTimeSpentSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Avg Time / Question:</span>
                    <span className="font-mono font-semibold text-slate-200">{sec.avgTimePerAttemptSeconds}s</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ========================================================================= */}
            {/* SECTIONAL EXPANSION / DEEP DIVE (COMMENTED OUT FOR NOW) */}
            {/* ========================================================================= */}
            {/*
            {sections
              .filter((sec) => selectedSectionTab === 'all' || selectedSectionTab === sec.sectionId)
              .map((sec) => {
                const sectionQuestions = activeAttempt.questions.filter((q) => q.sectionId === sec.sectionId);
                const maxQuestionTime = Math.max(...sectionQuestions.map((q) => q.timeSpentSeconds), 60);
                const revisitedQuestions = sectionQuestions.filter((q) => q.visitCount > 1);
                const correctRevisits = revisitedQuestions.filter((q) => q.isCorrect).length;

                const topicsMap: Record<string, {
                  name: string;
                  questions: QuestionAnalysis[];
                  total: number;
                  attempted: number;
                  correct: number;
                  incorrect: number;
                  unattempted: number;
                  timeSpent: number;
                  posMarks: number;
                  negMarks: number;
                  netScore: number;
                  accuracy: number;
                  isAttempted: boolean;
                }> = {};

                sectionQuestions.forEach((q) => {
                  let topicKey = q.topic && q.topic.trim() && q.topic !== 'Test'
                    ? q.topic.trim()
                    : q.subtopic && q.subtopic.trim()
                    ? q.subtopic.trim()
                    : '';

                  if (!topicKey || topicKey.toLowerCase() === sec.sectionName.toLowerCase()) {
                    const blockNum = Math.floor((q.questionNumber - 1) / 5) + 1;
                    topicKey = `${sec.sectionName} Topic Group #${blockNum}`;
                  }

                  if (!topicsMap[topicKey]) {
                    topicsMap[topicKey] = {
                      name: topicKey,
                      questions: [],
                      total: 0,
                      attempted: 0,
                      correct: 0,
                      incorrect: 0,
                      unattempted: 0,
                      timeSpent: 0,
                      posMarks: 0,
                      negMarks: 0,
                      netScore: 0,
                      accuracy: 0,
                      isAttempted: false,
                    };
                  }

                  const t = topicsMap[topicKey];
                  t.questions.push(q);
                  t.total += 1;
                  t.timeSpent += q.timeSpentSeconds;
                  t.posMarks += q.posMarks;
                  t.negMarks += q.negMarks;
                  t.netScore += q.marksEarned;
                  if (q.isAttempted) {
                    t.attempted += 1;
                    t.isAttempted = true;
                    if (q.isCorrect) t.correct += 1;
                    else t.incorrect += 1;
                  } else {
                    t.unattempted += 1;
                  }
                });

                const topicsList = Object.values(topicsMap).map((t) => ({
                  ...t,
                  netScore: Number(t.netScore.toFixed(2)),
                  accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0,
                  attemptRate: Math.round((t.attempted / t.total) * 100),
                }));

                const attemptedTopics = topicsList.filter((t) => t.isAttempted);
                const unattemptedTopics = topicsList.filter((t) => !t.isAttempted);

                const displayedTopics = topicsList.filter((t) => {
                  if (selectedTopicFilter === 'attempted') return t.isAttempted;
                  if (selectedTopicFilter === 'unattempted') return !t.isAttempted;
                  return true;
                });

                return (
                  <div key={sec.sectionId} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            SECTION BREAKDOWN
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {sec.totalQuestions} Total Questions • {formatSecs(sec.totalTimeSpentSeconds)} Active Time
                          </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-extrabold text-white mt-1">{sec.sectionName}</h2>
                      </div>

                      <div className="flex items-center space-x-4 bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Net Score</span>
                          <span className="text-base font-extrabold text-blue-400">{sec.netScore}</span>
                          <span className="text-slate-500 text-[10px]">/{sec.maxMarks}</span>
                        </div>
                        <div className="h-7 w-px bg-slate-700" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Accuracy</span>
                          <span className={`text-base font-extrabold ${sec.accuracyPercentage >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {sec.accuracyPercentage}%
                          </span>
                        </div>
                        <div className="h-7 w-px bg-slate-700" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Avg / Question</span>
                          <span className="text-base font-extrabold text-cyan-300 font-mono">{sec.avgTimePerAttemptSeconds}s</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                            <BookOpen size={15} className="text-blue-400" />
                            <span>Topic-wise Attempt & Coverage Matrix</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Detailed breakdown of syllabus topics you actively solved vs. topics you skipped entirely.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                          <button
                            onClick={() => setSelectedTopicFilter('all')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              selectedTopicFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            All Topics ({topicsList.length})
                          </button>

                          <button
                            onClick={() => setSelectedTopicFilter('attempted')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                              selectedTopicFilter === 'attempted'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            <span>Attempted Topics ({attemptedTopics.length})</span>
                          </button>

                          <button
                            onClick={() => setSelectedTopicFilter('unattempted')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                              selectedTopicFilter === 'unattempted'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                            <span>Unattempted / Skipped ({unattemptedTopics.length})</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {displayedTopics.map((topic, tIdx) => {
                          const isUnattempted = !topic.isAttempted;
                          const isFullyAttempted = topic.attemptRate === 100;

                          return (
                            <div
                              key={tIdx}
                              className={`border rounded-xl p-4 space-y-3 transition-all ${
                                isUnattempted
                                  ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                                  : isFullyAttempted
                                  ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <h4 className="font-bold text-white text-sm line-clamp-1">{topic.name}</h4>
                                  <span className="text-[11px] text-slate-400">
                                    {topic.total} {topic.total === 1 ? 'Question' : 'Questions'} • Score: {topic.netScore > 0 ? `+${topic.netScore}` : topic.netScore}
                                  </span>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono whitespace-nowrap ${
                                    isUnattempted
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : isFullyAttempted
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {isUnattempted
                                    ? '✗ Not Attempted (0%)'
                                    : isFullyAttempted
                                    ? '✓ 100% Attempted'
                                    : `⚡ ${topic.attemptRate}% Attempted`}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Attempted</span>
                                  <span className={`font-bold font-mono text-xs ${isUnattempted ? 'text-rose-400' : 'text-slate-200'}`}>
                                    {topic.attempted} / {topic.total}
                                  </span>
                                </div>

                                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Accuracy</span>
                                  <span
                                    className={`font-bold font-mono text-xs ${
                                      isUnattempted
                                        ? 'text-slate-500'
                                        : topic.accuracy >= 80
                                        ? 'text-emerald-400'
                                        : topic.accuracy >= 60
                                        ? 'text-amber-400'
                                        : 'text-rose-400'
                                    }`}
                                  >
                                    {isUnattempted ? '-' : `${topic.accuracy}%`}
                                  </span>
                                </div>

                                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                                  <span className="text-slate-400 block text-[10px]">Active Time</span>
                                  <span className="font-bold font-mono text-xs text-cyan-300">
                                    {formatSecs(topic.timeSpent)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                  Questions in Topic:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {topic.questions.map((q) => (
                                    <button
                                      key={q.questionId}
                                      onClick={() => setHighlightedQId(highlightedQId === q.questionId ? null : q.questionId)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                                        q.status === 'correct'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                          : q.status === 'incorrect'
                                          ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                      } ${highlightedQId === q.questionId ? 'ring-2 ring-cyan-400 scale-105' : ''}`}
                                      title={`Q.${q.questionNumber}: ${q.status} (${q.timeSpentSeconds}s cumulative)`}
                                    >
                                      Q.{q.questionNumber} {q.status === 'correct' ? '✓' : q.status === 'incorrect' ? '✗' : '○'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                            <Activity size={15} className="text-cyan-400" />
                            <span>Cumulative Time Spent on Each Question (Total Time Across All Visits)</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Whether you navigated 1 → 100 and returned back to 1, all time intervals are cumulatively tracked.
                          </p>
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] font-medium">
                          <span className="flex items-center space-x-1 text-emerald-400">
                            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                            <span>Correct</span>
                          </span>
                          <span className="flex items-center space-x-1 text-rose-400">
                            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                            <span>Incorrect</span>
                          </span>
                          <span className="flex items-center space-x-1 text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-xs bg-slate-600 inline-block" />
                            <span>Skipped</span>
                          </span>
                          <span className="flex items-center space-x-1 text-purple-400">
                            <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 inline-block animate-pulse" />
                            <span>Time Trap</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 pb-2 overflow-x-auto">
                        <div className="flex items-end space-x-2 min-w-full h-44 pb-6 pt-4 px-2 border-b border-slate-800">
                          {sectionQuestions.map((q) => {
                            const heightPercent = Math.min(100, Math.max(8, (q.timeSpentSeconds / maxQuestionTime) * 100));
                            const isRevisited = q.visitCount > 1;
                            const isTrap = q.timeClassification === 'TIME_TRAP';
                            const isHighlighted = highlightedQId === q.questionId;

                            const barBg =
                              isTrap
                                ? 'bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-900/50'
                                : q.status === 'correct'
                                ? 'bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-950/40'
                                : q.status === 'incorrect'
                                ? 'bg-rose-500 hover:bg-rose-400 shadow-md shadow-rose-950/40'
                                : 'bg-slate-700 hover:bg-slate-600';

                            return (
                              <div
                                key={q.questionId}
                                onClick={() => setHighlightedQId(highlightedQId === q.questionId ? null : q.questionId)}
                                className={`flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center justify-end h-full group cursor-pointer transition-all ${
                                  isHighlighted ? 'scale-105' : ''
                                }`}
                                title={`Q.${q.questionNumber}: ${q.timeSpentSeconds}s cumulative (${q.visitCount} visits) - ${q.status}`}
                              >
                                <div className="text-[10px] font-mono text-slate-300 font-bold mb-1 opacity-80 group-hover:opacity-100 group-hover:text-cyan-300 whitespace-nowrap transition-opacity">
                                  {q.timeSpentSeconds}s
                                </div>

                                <div
                                  style={{ height: `${heightPercent}%` }}
                                  className={`w-full rounded-t-md transition-all relative ${barBg} ${
                                    isHighlighted ? 'ring-2 ring-cyan-400' : ''
                                  }`}
                                >
                                  {isRevisited && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-300 font-mono">
                                      🔁{q.visitCount}
                                    </span>
                                  )}
                                </div>

                                <span className={`text-[10px] font-mono mt-1.5 ${isHighlighted ? 'font-bold text-cyan-400' : 'text-slate-400 group-hover:text-white'}`}>
                                  Q.{q.questionNumber}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                          <div className="p-2 bg-blue-950 text-blue-400 rounded-lg">
                            <Clock size={16} />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Revisited Questions</span>
                            <span className="font-bold text-white text-sm">
                              {revisitedQuestions.length} of {sectionQuestions.length}
                            </span>
                            <span className="text-[10px] text-emerald-400 block font-mono">
                              {correctRevisits} became correct on revisit
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                          <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg">
                            <Zap size={16} />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Fastest Solved</span>
                            {sectionQuestions.filter(q => q.isAttempted && q.timeSpentSeconds > 0).length > 0 ? (
                              (() => {
                                const fastest = [...sectionQuestions.filter(q => q.isAttempted && q.timeSpentSeconds > 0)].sort((a, b) => a.timeSpentSeconds - b.timeSpentSeconds)[0];
                                return (
                                  <>
                                    <span className="font-bold text-emerald-400 text-sm">
                                      Q.{fastest.questionNumber} ({fastest.timeSpentSeconds}s)
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      {fastest.isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                          <div className="p-2 bg-rose-950 text-rose-400 rounded-lg">
                            <AlertTriangle size={16} />
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Longest Cumulative Time</span>
                            {sectionQuestions.length > 0 ? (
                              (() => {
                                const slowest = [...sectionQuestions].sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds)[0];
                                return (
                                  <>
                                    <span className="font-bold text-rose-400 text-sm">
                                      Q.{slowest.questionNumber} ({formatSecs(slowest.timeSpentSeconds)})
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      {slowest.visitCount} visits • {slowest.status}
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <Target size={15} className="text-blue-400" />
                          <span>Question Pacing & Visit Breakdown Matrix ({sectionQuestions.length} Questions)</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          Shows total accumulated active seconds per question
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {sectionQuestions.map((q) => {
                          const isHighlighted = highlightedQId === q.questionId;
                          const isRevisited = q.visitCount > 1;

                          return (
                            <div
                              key={q.questionId}
                              id={`q-card-${q.questionId}`}
                              className={`bg-slate-950/80 border rounded-xl p-4 transition-all space-y-3 ${
                                isHighlighted
                                  ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-900/90'
                                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-extrabold text-white text-sm">
                                      Question {q.questionNumber}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                                        q.status === 'correct'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : q.status === 'incorrect'
                                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                                      }`}
                                    >
                                      {q.status === 'correct'
                                        ? `✓ Correct (+${q.posMarks})`
                                        : q.status === 'incorrect'
                                        ? `✗ Incorrect (-${q.negMarks})`
                                        : '○ Skipped (0)'}
                                    </span>
                                  </div>

                                  <div className="text-xs text-slate-400 flex items-center space-x-3 font-mono">
                                    <span>
                                      Your Ans: {q.selectedOptionId ? `Option ${q.selectedOptionId}` : 'None'}
                                    </span>
                                    <span>•</span>
                                    <span className="text-emerald-400">
                                      Key: Option {q.correctOptionId || '-'}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono whitespace-nowrap ${
                                    q.timeClassification === 'FAST'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : q.timeClassification === 'TIME_TRAP'
                                      ? 'bg-purple-950 text-purple-300 border border-purple-800 animate-pulse'
                                      : q.timeClassification === 'SLOW'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}
                                >
                                  {q.timeClassification}
                                </span>
                              </div>

                              <div className="bg-slate-900 border border-slate-800/90 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    Cumulative Time Spent
                                  </span>
                                  <div className="text-base font-extrabold text-cyan-300 font-mono flex items-center space-x-1.5">
                                    <Clock size={14} className="text-cyan-400" />
                                    <span>{formatSecs(q.timeSpentSeconds)}</span>
                                    <span className="text-xs text-slate-500 font-normal">
                                      ({q.timeSpentSeconds}s active)
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-0.5 text-right">
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    Visits & Iterations
                                  </span>
                                  <div className="text-xs font-bold text-slate-200 font-mono flex items-center space-x-1">
                                    {isRevisited ? (
                                      <span className="text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded flex items-center space-x-1">
                                        <RotateCcw size={11} />
                                        <span>{q.visitCount} Visits (Revisited)</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">1 Visit</span>
                                    )}
                                    {q.answerChanges > 0 && (
                                      <span className="text-purple-300 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.5 rounded text-[10px]">
                                        ✏️ {q.answerChanges} {q.answerChanges === 1 ? 'change' : 'changes'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {q.visits && q.visits.length > 1 && (
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                    <span className="flex items-center space-x-1">
                                      <History size={12} className="text-amber-400" />
                                      <span>Session Visit Breakdown:</span>
                                    </span>
                                    <span className="font-mono text-cyan-400">
                                      Sum = {q.timeSpentSeconds}s
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {q.visits.map((v, vIdx) => {
                                      const vSecs = Math.round(v.durationMs / 1000);
                                      return (
                                        <span
                                          key={vIdx}
                                          className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300"
                                        >
                                          Visit #{vIdx + 1}: <span className="font-bold text-amber-300">{vSecs}s</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => {
                                    if (onJumpToQuestionSolution) {
                                      const secIdx = sections.findIndex(s => s.sectionId === q.sectionId);
                                      const secQuestions = activeAttempt.questions.filter(item => item.sectionId === q.sectionId);
                                      const relQIdx = secQuestions.findIndex(item => item.questionId === q.questionId);
                                      onJumpToQuestionSolution(secIdx >= 0 ? secIdx : 0, relQIdx >= 0 ? relQIdx : 0);
                                    } else {
                                      onBackToPlayer();
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                                >
                                  <span>View Question & Solution</span>
                                  <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            */}

            {/* Insights Banner */}
            {insights.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles size={16} />
                  <span>Strategic Insights & Observations</span>
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                  {insights.map((item, idx) => (
                    <li key={idx} className="bg-slate-800/40 p-3 rounded-lg border border-slate-800 flex items-start space-x-2.5">
                      <span className="text-blue-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SPEED & TIME INTELLIGENCE */}
        {/* ========================================================================= */}
        {activeTab === 'speed' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Time on Correct Questions</span>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatSecs(timeIntelligence.timeSpentOnCorrectSeconds)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Average {timeIntelligence.avgTimeCorrectSeconds}s per correct answer.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Time on Incorrect Questions</span>
                  <XCircle size={16} className="text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-rose-400">
                  {formatSecs(timeIntelligence.timeSpentOnIncorrectSeconds)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Average {timeIntelligence.avgTimeIncorrectSeconds}s per incorrect answer.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Time Wasted / Inefficient</span>
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {formatSecs(timeIntelligence.timeWastedSeconds)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Time lost on incorrect questions and long unattempted stalls.
                </p>
              </div>
            </div>

            {/* Speed Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timeIntelligence.fastestQuestion && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
                    <Zap size={24} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fastest Solved Question</span>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      Q.{timeIntelligence.fastestQuestion.questionNumber} ({timeIntelligence.fastestQuestion.sectionName})
                    </h4>
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      Solved in {timeIntelligence.fastestQuestion.timeSeconds} seconds {timeIntelligence.fastestQuestion.isCorrect ? '(Correct)' : ''}
                    </span>
                  </div>
                </div>
              )}

              {timeIntelligence.slowestQuestion && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
                  <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-400">
                    <Clock size={24} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Longest Time Spent</span>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      Q.{timeIntelligence.slowestQuestion.questionNumber} ({timeIntelligence.slowestQuestion.sectionName})
                    </h4>
                    <span className="text-xs text-rose-400 font-mono font-bold">
                      Spent {formatSecs(timeIntelligence.slowestQuestion.timeSeconds)} {timeIntelligence.slowestQuestion.isCorrect ? '(Correct)' : '(Incorrect)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Time Traps List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span>Time Traps Identified ({timeIntelligence.timeTrapsCount})</span>
                </h3>
                <span className="text-xs text-slate-400">Questions taking &gt;1.5x expected time without positive returns</span>
              </div>

              {activeAttempt.questions.filter(q => q.timeClassification === 'TIME_TRAP').length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  🎉 Great pacing! No critical time traps were detected during this attempt.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeAttempt.questions
                    .filter(q => q.timeClassification === 'TIME_TRAP')
                    .map((q) => (
                      <div key={q.questionId} className="bg-slate-800/60 border border-amber-900/40 rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 text-xs">Question {q.questionNumber}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded">
                            {q.status === 'incorrect' ? 'Incorrect (-0.25)' : 'Unattempted'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 font-semibold">{q.sectionName}</div>
                        <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-2 font-mono">
                          <span>Time Spent:</span>
                          <span className="text-amber-400 font-bold">{formatSecs(q.timeSpentSeconds)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 4-QUADRANT SPEED-ACCURACY DIAGNOSTIC MATRIX & SCATTER PLOT */}
        {/* ========================================================================= */}
        {activeTab === 'quadrant' && (() => {
          const qQuestions = activeAttempt.questions.filter(
            (q) => selectedQuadrantSection === 'all' || q.sectionId === selectedQuadrantSection
          );
          const avgTimePerQ =
            timeIntelligence.avgTimePerQuestionSeconds > 0
              ? timeIntelligence.avgTimePerQuestionSeconds
              : 60;

          const quad1 = qQuestions.filter((q) => q.isAttempted && q.isCorrect && q.timeSpentSeconds <= avgTimePerQ);
          const quad2 = qQuestions.filter((q) => q.isAttempted && !q.isCorrect && q.timeSpentSeconds <= avgTimePerQ);
          const quad3 = qQuestions.filter((q) => q.isAttempted && q.isCorrect && q.timeSpentSeconds > avgTimePerQ);
          const quad4 = qQuestions.filter((q) => q.isAttempted && !q.isCorrect && q.timeSpentSeconds > avgTimePerQ);
          const quadUnattempted = qQuestions.filter((q) => !q.isAttempted);

          const maxPlotTime = Math.max(90, Math.ceil((Math.max(...qQuestions.map((q) => q.timeSpentSeconds || 0)) + 15) / 10) * 10);
          const minPlotMarks = Math.min(-0.25, ...qQuestions.map((q) => q.marksEarned || 0));
          const maxPlotMarks = Math.max(1.0, ...qQuestions.map((q) => q.marksEarned || 0));
          const marksRange = maxPlotMarks - minPlotMarks || 1;

          const xMin = 65;
          const xMax = 770;
          const plotW = xMax - xMin;
          const yMin = 30;
          const yMax = 320;
          const plotH = yMax - yMin;

          const getX = (time: number) => xMin + Math.min(plotW, Math.max(0, (time / maxPlotTime) * plotW));
          const getY = (marks: number) => yMax - Math.min(plotH, Math.max(0, ((marks - minPlotMarks) / marksRange) * plotH));

          const xThreshold = getX(avgTimePerQ);
          const yThreshold = getY(0);

          const activeInspectedQ = hoveredScatterQ || qQuestions.find((q) => q.questionId === highlightedQId) || null;

          const jumpToSolution = (q: QuestionAnalysis) => {
            if (onJumpToQuestionSolution) {
              const secIdx = sections.findIndex((s) => s.sectionId === q.sectionId);
              const secQuestions = activeAttempt.questions.filter((item) => item.sectionId === q.sectionId);
              const relQIdx = secQuestions.findIndex((item) => item.questionId === q.questionId);
              onJumpToQuestionSolution(secIdx >= 0 ? secIdx : 0, relQIdx >= 0 ? relQIdx : 0);
            } else {
              onBackToPlayer();
            }
          };

          return (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-white flex items-center space-x-2">
                    <Activity className="text-cyan-400" size={20} />
                    <span>Speed-Accuracy 4-Quadrant Diagnostic Matrix</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Visualizes cognitive pacing against correctness. Average time benchmark: <span className="font-mono text-cyan-300 font-bold">{avgTimePerQ}s / question</span>.
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400 font-medium">Filter Section:</span>
                  <select
                    value={selectedQuadrantSection}
                    onChange={(e) => setSelectedQuadrantSection(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Sections ({activeAttempt.questions.length} Qs)</option>
                    {sections.map((s) => (
                      <option key={s.sectionId} value={s.sectionId}>
                        {s.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2D Interactive Scatter Plot Canvas */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <Target size={15} className="text-cyan-400" />
                    <span>2D Question Diagnostic Scatter Plot (Click or Hover on Any Point)</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium">
                    <span className="flex items-center space-x-1.5 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>Q-I: Mastery</span>
                    </span>
                    <span className="flex items-center space-x-1.5 text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span>Q-II: Careless</span>
                    </span>
                    <span className="flex items-center space-x-1.5 text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                      <span>Q-III: Inefficient</span>
                    </span>
                    <span className="flex items-center space-x-1.5 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span>Q-IV: Time Trap</span>
                    </span>
                  </div>
                </div>

                {/* SVG Scatter Plot */}
                <div className="w-full overflow-x-auto bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
                  <svg viewBox="0 0 800 360" className="w-full min-w-[650px] h-auto font-sans select-none">
                    {/* Quadrant Background Tints */}
                    {/* Q1: Top Left (Fast & Correct) */}
                    <rect
                      x={xMin}
                      y={yMin}
                      width={Math.max(0, xThreshold - xMin)}
                      height={Math.max(0, yThreshold - yMin)}
                      fill="#064e3b"
                      fillOpacity="0.18"
                    />
                    <text x={xMin + 10} y={yMin + 20} fill="#10b981" fontSize="11" fontWeight="bold">
                      QUADRANT I: HIGH MASTERY
                    </text>

                    {/* Q2: Bottom Left (Fast & Incorrect) */}
                    <rect
                      x={xMin}
                      y={yThreshold}
                      width={Math.max(0, xThreshold - xMin)}
                      height={Math.max(0, yMax - yThreshold)}
                      fill="#78350f"
                      fillOpacity="0.16"
                    />
                    <text x={xMin + 10} y={yMax - 10} fill="#f59e0b" fontSize="11" fontWeight="bold">
                      QUADRANT II: CARELESS / RUSHED
                    </text>

                    {/* Q3: Top Right (Slow & Correct) */}
                    <rect
                      x={xThreshold}
                      y={yMin}
                      width={Math.max(0, xMax - xThreshold)}
                      height={Math.max(0, yThreshold - yMin)}
                      fill="#1e3a8a"
                      fillOpacity="0.18"
                    />
                    <text x={xMax - 10} y={yMin + 20} textAnchor="end" fill="#38bdf8" fontSize="11" fontWeight="bold">
                      QUADRANT III: INEFFICIENT MASTERY
                    </text>

                    {/* Q4: Bottom Right (Slow & Incorrect) */}
                    <rect
                      x={xThreshold}
                      y={yThreshold}
                      width={Math.max(0, xMax - xThreshold)}
                      height={Math.max(0, yMax - yThreshold)}
                      fill="#881337"
                      fillOpacity="0.22"
                    />
                    <text x={xMax - 10} y={yMax - 10} textAnchor="end" fill="#f43f5e" fontSize="11" fontWeight="bold">
                      QUADRANT IV: CRITICAL TIME TRAPS
                    </text>

                    {/* Threshold Divider Lines */}
                    {/* Vertical Benchmark Line (Avg Time) */}
                    <line
                      x1={xThreshold}
                      y1={yMin}
                      x2={xThreshold}
                      y2={yMax}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeOpacity="0.8"
                    />
                    <text
                      x={xThreshold}
                      y={yMin - 8}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      Avg Time: {avgTimePerQ}s
                    </text>

                    {/* Horizontal Zero Marks Line */}
                    <line
                      x1={xMin}
                      y1={yThreshold}
                      x2={xMax}
                      y2={yThreshold}
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      strokeOpacity="0.6"
                    />
                    <text
                      x={xMin - 8}
                      y={yThreshold + 4}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      0 Marks
                    </text>

                    {/* Axes Labels */}
                    <text x={xMin - 8} y={yMin + 8} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                      +{maxPlotMarks}m
                    </text>
                    <text x={xMin - 8} y={yMax} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                      {minPlotMarks}m
                    </text>

                    <text x={xMin} y={yMax + 24} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                      0s
                    </text>
                    <text x={xMax} y={yMax + 24} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                      {maxPlotTime}s
                    </text>
                    <text x={(xMin + xMax) / 2} y={yMax + 32} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">
                      Active Time Spent on Question (Seconds) →
                    </text>

                    {/* Question Data Circles */}
                    {qQuestions.map((q) => {
                      const cx = getX(q.timeSpentSeconds);
                      const cy = getY(q.marksEarned);
                      const isHovered = activeInspectedQ?.questionId === q.questionId;
                      const isHighlighted = highlightedQId === q.questionId;

                      let fillColor = '#64748b'; // unattempted
                      if (q.isAttempted) {
                        if (q.isCorrect) {
                          fillColor = q.timeSpentSeconds <= avgTimePerQ ? '#10b981' : '#38bdf8';
                        } else {
                          fillColor = q.timeSpentSeconds <= avgTimePerQ ? '#f59e0b' : '#f43f5e';
                        }
                      }

                      return (
                        <g
                          key={q.questionId}
                          className="cursor-pointer transition-transform"
                          onClick={() => setHighlightedQId(q.questionId)}
                          onMouseEnter={() => setHoveredScatterQ(q)}
                          onMouseLeave={() => setHoveredScatterQ(null)}
                        >
                          {/* Pulsing ring if selected or hovered */}
                          {(isHovered || isHighlighted) && (
                            <circle
                              cx={cx}
                              cy={cy}
                              r="12"
                              fill="none"
                              stroke={fillColor}
                              strokeWidth="2"
                              strokeOpacity="0.7"
                              className="animate-ping"
                            />
                          )}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered || isHighlighted ? 7 : 5}
                            fill={fillColor}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                          />
                          <text
                            x={cx}
                            y={cy - 8}
                            textAnchor="middle"
                            fill={isHovered || isHighlighted ? '#ffffff' : '#94a3b8'}
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight={isHovered || isHighlighted ? 'bold' : 'normal'}
                            opacity={isHovered || isHighlighted ? 1 : 0.75}
                          >
                            Q.{q.questionNumber}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Inspected Question Quick Card */}
                {activeInspectedQ ? (
                  <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm border ${
                          activeInspectedQ.isCorrect
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : activeInspectedQ.isAttempted
                            ? 'bg-rose-950 text-rose-300 border-rose-700'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Q.{activeInspectedQ.questionNumber}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{activeInspectedQ.sectionName}</span>
                          {activeInspectedQ.topic && (
                            <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                              {activeInspectedQ.topic}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1 font-mono">
                          <span>
                            Time: <strong className="text-slate-200">{formatSecs(activeInspectedQ.timeSpentSeconds)}</strong>
                          </span>
                          <span>
                            Marks:{' '}
                            <strong className={activeInspectedQ.marksEarned > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {activeInspectedQ.marksEarned > 0 ? `+${activeInspectedQ.marksEarned}` : activeInspectedQ.marksEarned}
                            </strong>
                          </span>
                          <span>
                            Visits: <strong className="text-slate-200">{activeInspectedQ.visitCount}</strong>
                          </span>
                          <span>
                            Status:{' '}
                            <strong
                              className={
                                activeInspectedQ.isCorrect
                                  ? 'text-emerald-400'
                                  : activeInspectedQ.isAttempted
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }
                            >
                              {activeInspectedQ.status.toUpperCase()}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => jumpToSolution(activeInspectedQ)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                      <span>Jump to Solution</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-slate-500 font-medium">
                    Hover or click any circle on the scatter plot above to inspect question timing, accuracy, and solution.
                  </div>
                )}
              </div>

              {/* 4 Diagnostic Quadrants Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quadrant 1: High Mastery */}
                <div
                  onClick={() => setSelectedQuadrantType(selectedQuadrantType === 'q1' ? 'all' : 'q1')}
                  className={`bg-emerald-950/20 border rounded-2xl p-5 space-y-3 transition-all cursor-pointer ${
                    selectedQuadrantType === 'q1'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/30'
                      : 'border-emerald-800/50 hover:border-emerald-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                        <Zap size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-emerald-300">Quadrant I: High Mastery Zone</h3>
                        <p className="text-[11px] text-slate-400">Fast solve speed (&le;{avgTimePerQ}s) + 100% Accuracy</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                      {quad1.length} Qs
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your core scoring engine. Questions in this zone reflect instantaneous recall and automated problem-solving reflexes.
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Questions in Zone:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {quad1.map((q) => (
                        <button
                          key={q.questionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToSolution(q);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 hover:scale-105 transition-all"
                          title={`Q.${q.questionNumber}: ${q.timeSpentSeconds}s (+${q.marksEarned}m)`}
                        >
                          Q.{q.questionNumber} ({q.timeSpentSeconds}s)
                        </button>
                      ))}
                      {quad1.length === 0 && <span className="text-xs text-slate-500">None in this section</span>}
                    </div>
                  </div>

                  <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-2.5 text-[11px] text-emerald-300/90 font-medium">
                    💡 <strong>Strategy:</strong> Anchor this rhythm. Maintain this tempo as your baseline throughout full mocks.
                  </div>
                </div>

                {/* Quadrant 2: Careless / Rushed */}
                <div
                  onClick={() => setSelectedQuadrantType(selectedQuadrantType === 'q2' ? 'all' : 'q2')}
                  className={`bg-amber-950/20 border rounded-2xl p-5 space-y-3 transition-all cursor-pointer ${
                    selectedQuadrantType === 'q2'
                      ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-950/30'
                      : 'border-amber-800/50 hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
                        <AlertTriangle size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-amber-300">Quadrant II: Careless / Rushed Zone</h3>
                        <p className="text-[11px] text-slate-400">Fast solve speed (&le;{avgTimePerQ}s) but Incorrect</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-md bg-amber-900/60 text-amber-300 border border-amber-700">
                      {quad2.length} Qs
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Premature submission blunders. High confidence or rushed reading resulting in negative mark penalties.
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Questions in Zone:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {quad2.map((q) => (
                        <button
                          key={q.questionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToSolution(q);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 hover:scale-105 transition-all"
                          title={`Q.${q.questionNumber}: ${q.timeSpentSeconds}s (${q.marksEarned}m)`}
                        >
                          Q.{q.questionNumber} ({q.timeSpentSeconds}s)
                        </button>
                      ))}
                      {quad2.length === 0 && <span className="text-xs text-slate-500">None in this section</span>}
                    </div>
                  </div>

                  <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2.5 text-[11px] text-amber-300/90 font-medium">
                    ⚠️ <strong>Strategy:</strong> Scan for traps: reread the prompt stem for &ldquo;NOT&rdquo;, &ldquo;EXCEPT&rdquo;, and unit mismatches before clicking Save &amp; Next.
                  </div>
                </div>

                {/* Quadrant 3: Inefficient Mastery */}
                <div
                  onClick={() => setSelectedQuadrantType(selectedQuadrantType === 'q3' ? 'all' : 'q3')}
                  className={`bg-sky-950/20 border rounded-2xl p-5 space-y-3 transition-all cursor-pointer ${
                    selectedQuadrantType === 'q3'
                      ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-950/30'
                      : 'border-sky-800/50 hover:border-sky-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
                        <Clock size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-sky-300">Quadrant III: Inefficient Mastery</h3>
                        <p className="text-[11px] text-slate-400">Over-deliberated (&gt;{avgTimePerQ}s) but Correct</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-md bg-sky-900/60 text-sky-300 border border-sky-700">
                      {quad3.length} Qs
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Concept is sound, but execution was sluggish. The extra time drained precious minutes needed for subsequent sections.
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Questions in Zone:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {quad3.map((q) => (
                        <button
                          key={q.questionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToSolution(q);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 hover:scale-105 transition-all"
                          title={`Q.${q.questionNumber}: ${q.timeSpentSeconds}s (+${q.marksEarned}m)`}
                        >
                          Q.{q.questionNumber} ({q.timeSpentSeconds}s)
                        </button>
                      ))}
                      {quad3.length === 0 && <span className="text-xs text-slate-500">None in this section</span>}
                    </div>
                  </div>

                  <div className="bg-sky-950/40 border border-sky-800/40 rounded-lg p-2.5 text-[11px] text-sky-300/90 font-medium">
                    ⏳ <strong>Strategy:</strong> Drill calculation shortcuts, approximation techniques, and faster reasoning templates.
                  </div>
                </div>

                {/* Quadrant 4: Critical Time Traps */}
                <div
                  onClick={() => setSelectedQuadrantType(selectedQuadrantType === 'q4' ? 'all' : 'q4')}
                  className={`bg-rose-950/20 border rounded-2xl p-5 space-y-3 transition-all cursor-pointer ${
                    selectedQuadrantType === 'q4'
                      ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/30'
                      : 'border-rose-800/50 hover:border-rose-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 rounded-lg bg-rose-950 border border-rose-800 text-rose-400">
                        <XCircle size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-rose-300">Quadrant IV: Critical Time Traps</h3>
                        <p className="text-[11px] text-slate-400">High time spent (&gt;{avgTimePerQ}s) + Negative Marks</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-md bg-rose-900/60 text-rose-300 border border-rose-700">
                      {quad4.length} Qs
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    The most destructive exam behavior: ego-trapping and sunk cost fallacy. Time was lost and negative marks incurred.
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Questions in Zone:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {quad4.map((q) => (
                        <button
                          key={q.questionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToSolution(q);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 hover:scale-105 transition-all"
                          title={`Q.${q.questionNumber}: ${q.timeSpentSeconds}s (${q.marksEarned}m)`}
                        >
                          Q.{q.questionNumber} ({q.timeSpentSeconds}s)
                        </button>
                      ))}
                      {quad4.length === 0 && <span className="text-xs text-slate-500">None in this section</span>}
                    </div>
                  </div>

                  <div className="bg-rose-950/40 border border-rose-800/40 rounded-lg p-2.5 text-[11px] text-rose-300/90 font-medium">
                    🚨 <strong>Strategy:</strong> Enforce a strict 90-second bail-out rule. If no definite path emerges, mark for review and move on immediately.
                  </div>
                </div>
              </div>

              {/* Unattempted & Skipped Questions Bar */}
              {quadUnattempted.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                    <span className="font-bold text-slate-300">Unattempted / Skipped Questions:</span>
                    <span className="text-slate-400 font-mono">({quadUnattempted.length} Questions)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quadUnattempted.map((q) => (
                      <button
                        key={q.questionId}
                        onClick={() => jumpToSolution(q)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        Q.{q.questionNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1 mr-1">
                  <Filter size={14} />
                  <span>Filter:</span>
                </span>
                {(['all', 'correct', 'incorrect', 'unattempted', 'timetrap', 'revisited'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setQuestionFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      questionFilter === f
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f === 'all' && `All (${activeAttempt.questions.length})`}
                    {f === 'correct' && `Correct (${summary.correct})`}
                    {f === 'incorrect' && `Incorrect (${summary.incorrect})`}
                    {f === 'unattempted' && `Unattempted (${summary.unattempted})`}
                    {f === 'timetrap' && `Time Traps (${timeIntelligence.timeTrapsCount})`}
                    {f === 'revisited' && `Revisited (${activeAttempt.questions.filter(q => q.visitCount > 1).length})`}
                  </button>
                ))}
              </div>

              {/* Section Filter Dropdown */}
              {sections.length > 1 && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Section:</span>
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Sections</option>
                    {sections.map((s) => (
                      <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Matrix Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-slate-400 uppercase font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Q.#</th>
                      <th className="py-3 px-3">Section</th>
                      <th className="py-3 px-3 text-center">Your Answer</th>
                      <th className="py-3 px-3 text-center">Correct Answer</th>
                      <th className="py-3 px-3 text-center">Marks</th>
                      <th className="py-3 px-3 text-center">Time Spent</th>
                      <th className="py-3 px-3 text-center">Visits</th>
                      <th className="py-3 px-3 text-center">Speed Class</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredQuestions.map((q, idx) => (
                      <tr key={q.questionId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">Q.{q.questionNumber}</td>
                        <td className="py-3 px-3 text-slate-300 font-medium">{q.sectionName}</td>
                        <td className="py-3 px-3 text-center font-mono font-semibold">
                          {q.selectedOptionId ? (
                            <span className={q.isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                              Option {q.selectedOptionId}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-400">
                          {q.correctOptionId ? `Option ${q.correctOptionId}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {q.marksEarned > 0 ? (
                            <span className="text-emerald-400">+{q.marksEarned}</span>
                          ) : q.marksEarned < 0 ? (
                            <span className="text-rose-400">{q.marksEarned}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-200">
                          {formatSecs(q.timeSpentSeconds)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {q.visitCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {q.status === 'correct' ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                q.timeClassification === 'FAST'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : q.timeClassification === 'SLOW'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {q.timeClassification}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (onJumpToQuestionSolution) {
                                const secIdx = sections.findIndex(s => s.sectionId === q.sectionId);
                                const secQuestions = activeAttempt.questions.filter(item => item.sectionId === q.sectionId);
                                const relQIdx = secQuestions.findIndex(item => item.questionId === q.questionId);
                                onJumpToQuestionSolution(secIdx >= 0 ? secIdx : 0, relQIdx >= 0 ? relQIdx : 0);
                              } else {
                                onBackToPlayer();
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center space-x-1 ml-auto"
                          >
                            <span>View Solution</span>
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HISTORICAL GROWTH & ALL-TEST TRENDS (COMMENTED OUT) */}
        {/* ========================================================================= */}
        {/*
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Total Tests Attempted</span>
                <div className="text-2xl md:text-3xl font-extrabold text-blue-400 mt-1">
                  {allPastAttempts.length}
                </div>
                <span className="text-[11px] text-slate-500">Persistent across app restarts</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Total Questions Solved</span>
                <div className="text-2xl md:text-3xl font-extrabold text-indigo-400 mt-1">
                  {allPastAttempts.reduce((acc, a) => acc + a.summary.attempted, 0)}
                </div>
                <span className="text-[11px] text-slate-500">Questions actively answered</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Lifetime Accuracy</span>
                <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1">
                  {allPastAttempts.length > 0
                    ? `${(allPastAttempts.reduce((acc, a) => acc + a.summary.accuracy, 0) / allPastAttempts.length).toFixed(1)}%`
                    : '0%'}
                </div>
                <span className="text-[11px] text-slate-500">Average across all attempts</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Best Net Score</span>
                <div className="text-2xl md:text-3xl font-extrabold text-cyan-400 mt-1">
                  {allPastAttempts.length > 0 ? Math.max(...allPastAttempts.map(a => a.summary.netScore)) : 0}
                </div>
                <span className="text-[11px] text-slate-500">Highest mock test score</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <TrendingUp size={16} className="text-blue-400" />
                <span>Past Attempt Records Timeline</span>
              </h3>

              {allPastAttempts.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No historical attempts recorded yet. Completed test records will automatically accumulate here!
                </p>
              ) : (
                <div className="space-y-3">
                  {allPastAttempts.map((att) => {
                    const isSelected = att.attemptId === activeAttempt.attemptId;
                    return (
                      <div
                        key={att.attemptId}
                        onClick={() => {
                          handleSwitchAttempt(att);
                          setActiveTab('sections');
                        }}
                        className={`border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950'
                            : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                              {att.pattern}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded">
                                Active Report
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {new Date(att.submittedAt).toLocaleDateString()} at {new Date(att.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-sm mt-1">{att.testTitle}</h4>
                        </div>

                        <div className="flex items-center space-x-6 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Score</span>
                            <span className="font-extrabold text-blue-400 text-base">{att.summary.netScore}</span>
                            <span className="text-slate-500 text-[10px]">/{att.summary.maxMarks}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Accuracy</span>
                            <span className={`font-bold text-sm ${att.summary.accuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {att.summary.accuracy}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Active Time</span>
                            <span className="font-mono text-slate-200 font-semibold">{formatSecs(att.totalTimeSpentSeconds)}</span>
                          </div>
                          <div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSwitchAttempt(att);
                                setActiveTab('sections');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white'
                              }`}
                            >
                              <span>{isSelected ? 'Viewing' : 'View Report'}</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        */}

      </div>
    </div>
  );
}
