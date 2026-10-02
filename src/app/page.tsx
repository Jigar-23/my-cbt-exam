'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Award,
  Train,
  ShieldAlert,
  Search,
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  Eye,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Shield,
  Building2,
  Scale,
  GraduationCap,
  CheckCircle2,
  CircleDashed,
  ArrowUpDown,
  RotateCcw,
  BarChart2,
  Check,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  DownloadCloud,
  Filter,
  Pause,
  Bookmark,
  Settings,
  KeyRound,
  WifiOff,
} from 'lucide-react';
import CBTExamPlayer from '@/components/CBTExamPlayer';
import DeepAnalyticsView from '@/components/DeepAnalyticsView';
import AnalyticsGrowthHub from '@/components/AnalyticsGrowthHub';
import BookmarksModal from '@/components/BookmarksModal';
import AppSettingsModal from '@/components/AppSettingsModal';
import { defaultContentProvider } from '@/lib/contentProvider';
import { AttemptRecord } from '@/lib/analyticsEngine';
import { getAllAttempts, getAllInFlightSnapshots, clearInFlightSnapshot, InFlightExamSnapshot } from '@/lib/analyticsStorage';
import { getAllBookmarks } from '@/lib/bookmarkStorage';
import { getSecurityStatus, SecurityCheckResult } from '@/lib/securityManager';
import UserPreferencesView, { UserPreferences } from '@/components/UserPreferencesView';
import ThemeToggle from '@/components/ThemeToggle';
import GoogleDriveLinkModal from '@/components/GoogleDriveLinkModal';
import { getStoredAccessToken } from '@/lib/gdrive/gdriveAuth';
import { syncAllWithDrive } from '@/lib/gdrive/gdriveSync';
import { platformBridge } from '@/lib/platform/platformBridge';

export default function Home() {
  const [manifest, setManifest] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [securityStatus, setSecurityStatus] = useState<SecurityCheckResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('banking');
  const [selectedExamId, setSelectedExamId] = useState<string>('ibps_so_it');
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [bookmarksCount, setBookmarksCount] = useState<number>(0);

  useEffect(() => {
    const updateBookmarksCount = () => {
      setBookmarksCount(getAllBookmarks().length);
    };
    updateBookmarksCount();
    window.addEventListener('cbt_bookmarks_changed', updateBookmarksCount);
    return () => window.removeEventListener('cbt_bookmarks_changed', updateBookmarksCount);
  }, []);

  useEffect(() => {
    const syncSecurity = async () => {
      try {
        const sec = await getSecurityStatus(true);
        setSecurityStatus(sec);
      } catch (e) {
        console.warn('Failed to load security status:', e);
      }
    };
    syncSecurity();

    const handleSecUpdate = (e: any) => {
      if (e?.detail) {
        setSecurityStatus(e.detail);
      } else {
        getSecurityStatus().then(setSecurityStatus);
      }
    };

    window.addEventListener('cbt_security_updated', handleSecUpdate as any);
    window.addEventListener('cbt_work_code_changed', handleSecUpdate as any);

    return () => {
      window.removeEventListener('cbt_security_updated', handleSecUpdate as any);
      window.removeEventListener('cbt_work_code_changed', handleSecUpdate as any);
    };
  }, []);

  // Attempt & In-Flight Filters
  const [attemptsMap, setAttemptsMap] = useState<Record<string, AttemptRecord>>({});
  const [inFlightMap, setInFlightMap] = useState<Record<string, InFlightExamSnapshot>>({});
  const [activeSnapshot, setActiveSnapshot] = useState<InFlightExamSnapshot | null>(null);
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'in_progress' | 'unattempted'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'q_asc' | 'q_desc' | 'dur_asc' | 'dur_desc' | 'score_desc'>('default');
  const [workCodeAlertMessage, setWorkCodeAlertMessage] = useState<string | null>(null);

  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({ banking: true });

  const toggleDomain = (domainId: string) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  // Active test player state
  const [activeTestData, setActiveTestData] = useState<any>(null);
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false);
  const [isTestLoading, setIsTestLoading] = useState<boolean>(false);

  // Global Analytics State
  const [globalAnalyticsAttempt, setGlobalAnalyticsAttempt] = useState<AttemptRecord | null>(null);
  const [isGlobalAnalyticsOpen, setIsGlobalAnalyticsOpen] = useState<boolean>(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Landmark':
        return <Landmark size={17} />;
      case 'ShieldAlert':
        return <ShieldAlert size={17} />;
      case 'Scale':
        return <Scale size={17} />;
      case 'Shield':
        return <Shield size={17} />;
      case 'Award':
        return <Award size={17} />;
      case 'Building2':
        return <Building2 size={17} />;
      case 'GraduationCap':
        return <GraduationCap size={17} />;
      case 'Train':
        return <Train size={17} />;
      default:
        return <Layers size={17} />;
    }
  };

  // Load manifest, preferences, attempts & in-flight snapshots on startup
  useEffect(() => {
    fetchManifest();
    loadAttemptsAndSnapshots();
    const loadSavedPreferences = () => {
      try {
        const raw = localStorage.getItem('cbt_user_preferences');
        if (raw) {
          const parsed = JSON.parse(raw);
          // Self-heal: If legacy fallback auto-set single ['banking'] + ['ibps_so_it'], remove it so all categories show
          if (
            parsed.selectedDomains?.length === 1 &&
            parsed.selectedDomains[0] === 'banking' &&
            parsed.selectedSubdomains?.length === 1 &&
            parsed.selectedSubdomains[0] === 'ibps_so_it'
          ) {
            localStorage.removeItem('cbt_user_preferences');
            setUserPreferences(null);
          } else {
            setUserPreferences(parsed);
          }
        } else {
          setUserPreferences(null);
        }
      } catch {}
    };

    loadSavedPreferences();

    // Prompt user to connect Google Drive on first open if not dismissed or already linked
    const token = getStoredAccessToken();
    const dismissed = localStorage.getItem('cbt_gdrive_modal_dismissed');
    if (!token && !dismissed) {
      const timer = setTimeout(() => {
        setIsDriveModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    } else if (token) {
      // Auto-sync in background on app startup if authenticated
      syncAllWithDrive()
        .then(() => {
          loadAttemptsAndSnapshots();
          loadSavedPreferences();
        })
        .catch(() => {});
    }
  }, []);

  // Periodic background auto-sync (every 5 minutes) and on window/app resume
  useEffect(() => {
    const doBackgroundSync = async () => {
      const token = getStoredAccessToken();
      if (token) {
        try {
          await syncAllWithDrive();
          loadAttemptsAndSnapshots();
        } catch (e) {}
      }
      getSecurityStatus().then(setSecurityStatus).catch(() => {});
    };

    // 5 minutes interval = 300,000 ms
    const intervalId = setInterval(doBackgroundSync, 300000);

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        doBackgroundSync();
      }
    };
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, []);

  // Hardware Back Button handler for Dashboard Modals
  useEffect(() => {
    return platformBridge.registerBackHandler(() => {
      if (workCodeAlertMessage) {
        setWorkCodeAlertMessage(null);
        return true;
      }
      if (isDriveModalOpen) {
        setIsDriveModalOpen(false);
        return true;
      }
      if (isBookmarksOpen) {
        setIsBookmarksOpen(false);
        return true;
      }
      if (isLeftDrawerOpen) {
        setIsLeftDrawerOpen(false);
        return true;
      }
      if (isPreferencesOpen) {
        setIsPreferencesOpen(false);
        return true;
      }
      if (isGlobalAnalyticsOpen) {
        if (globalAnalyticsAttempt) {
          setGlobalAnalyticsAttempt(null);
        } else {
          setIsGlobalAnalyticsOpen(false);
        }
        return true;
      }
      return false; // Allow app to minimize
    });
  }, [workCodeAlertMessage, isDriveModalOpen, isBookmarksOpen, isLeftDrawerOpen, isPreferencesOpen, isGlobalAnalyticsOpen, globalAnalyticsAttempt]);

  const handleSavePreferences = (prefs: UserPreferences) => {
    // If all domains or zero domains are selected, treat as unfiltered (show all)
    const isAllSelected = manifest?.categories && prefs.selectedDomains.length >= manifest.categories.length;
    if (isAllSelected || prefs.selectedDomains.length === 0) {
      setUserPreferences(null);
      try {
        localStorage.removeItem('cbt_user_preferences');
      } catch {}
    } else {
      setUserPreferences(prefs);
      try {
        localStorage.setItem('cbt_user_preferences', JSON.stringify(prefs));
      } catch {}
    }

    if (prefs.selectedDomains.length > 0 && !prefs.selectedDomains.includes(selectedCategory)) {
      setSelectedCategory(prefs.selectedDomains[0]);
      const cat = manifest?.categories?.find((c: any) => c.id === prefs.selectedDomains[0]);
      const availableExam = cat?.exams?.find((e: any) => prefs.selectedSubdomains.includes(e.id)) || cat?.exams?.[0];
      if (availableExam) {
        setSelectedExamId(availableExam.id);
      }
    }

    // Auto-sync updated preferences to Google Drive in background
    const token = getStoredAccessToken();
    if (token) {
      syncAllWithDrive().catch(() => {});
    }
  };

  // Reload attempts and snapshots whenever returning to dashboard
  useEffect(() => {
    if (!activeTestData && !isGlobalAnalyticsOpen) {
      loadAttemptsAndSnapshots();
    }
  }, [activeTestData, isGlobalAnalyticsOpen]);

  const handleSyncComplete = async () => {
    await loadAttemptsAndSnapshots();
    try {
      const raw = localStorage.getItem('cbt_user_preferences');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.selectedDomains?.length === 1 &&
          parsed.selectedDomains[0] === 'banking' &&
          parsed.selectedSubdomains?.length === 1 &&
          parsed.selectedSubdomains[0] === 'ibps_so_it'
        ) {
          localStorage.removeItem('cbt_user_preferences');
          setUserPreferences(null);
        } else {
          setUserPreferences(parsed);
        }
      } else {
        setUserPreferences(null);
      }
    } catch {}
  };

  const loadAttemptsAndSnapshots = async () => {
    try {
      const attempts = await getAllAttempts();
      const map: Record<string, AttemptRecord> = {};
      for (const att of attempts) {
        if (!map[att.testId] || att.submittedAt > map[att.testId].submittedAt) {
          map[att.testId] = att;
        }
        if (att.rawId && (!map[att.rawId] || att.submittedAt > map[att.rawId].submittedAt)) {
          map[att.rawId] = att;
        }
        if (Array.isArray(att.aliasIds)) {
          for (const alias of att.aliasIds) {
            if (alias && (!map[alias] || att.submittedAt > map[alias].submittedAt)) {
              map[alias] = att;
            }
          }
        }
      }
      setAttemptsMap(map);

      const snapshots = getAllInFlightSnapshots();
      setInFlightMap(snapshots);
    } catch (e) {
      console.error('Error loading attempts and snapshots:', e);
    }
  };

  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState<boolean>(false);

  const fetchManifest = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshingCatalog(true);
      } else {
        setIsLoading(true);
      }
      const data = await defaultContentProvider.getManifest(forceRefresh);
      setManifest(data);
    } catch (e: any) {
      console.error('Failed to load manifest from Google Drive:', e);
      alert(`Error loading test catalog: ${e.message}`);
    } finally {
      setIsLoading(false);
      setIsRefreshingCatalog(false);
    }
  };

  const handleLaunchTest = async (testItem: any, studyMode: boolean = false, resume: boolean = false) => {
    // 1. Verify licensing / work code status
    const currentSec = await getSecurityStatus();
    setSecurityStatus(currentSec);

    if (currentSec.isBlocked) {
      return;
    }

    if (!currentSec.canTakeExams) {
      setWorkCodeAlertMessage("Kindly update the code, code isn't correct.");
      return;
    }

    try {
      setIsTestLoading(true);
      const driveId = testItem.driveFileId;
      const relativePath = testItem.path || testItem.relativePath;
      const testJson = await defaultContentProvider.getTest(driveId, relativePath, testItem);
      setIsStudyMode(studyMode);

      if (resume) {
        const snap = inFlightMap[testItem.id] || (testJson?.rawId && inFlightMap[testJson.rawId]);
        setActiveSnapshot(snap || null);
      } else {
        clearInFlightSnapshot(testItem.id, [testJson?.rawId, testJson?.testId].filter(Boolean));
        setActiveSnapshot(null);
      }

      setActiveTestData(testJson);
    } catch (e: any) {
      alert(`Error loading test paper: ${e.message}`);
    } finally {
      setIsTestLoading(false);
    }
  };


  const handleOpenTestAnalytics = (testId: string) => {
    const attempt = attemptsMap[testId];
    if (attempt) {
      setGlobalAnalyticsAttempt(attempt);
      setIsGlobalAnalyticsOpen(true);
    }
  };

  // Dynamic Multi-Tier Lazy Load: Load stages on-demand for selected exam safely
  const [loadedExamStagesMap, setLoadedExamStagesMap] = useState<Record<string, any[]>>({});
  const loadingExamIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedExamId) return;
    if (loadedExamStagesMap[selectedExamId] || loadingExamIdsRef.current.has(selectedExamId)) return;

    loadingExamIdsRef.current.add(selectedExamId);
    let isMounted = true;

    defaultContentProvider.getExamStages(selectedExamId).then((stages) => {
      if (isMounted) {
        setLoadedExamStagesMap((prev) => ({
          ...prev,
          [selectedExamId]: stages || [],
        }));
      }
    }).catch(() => {
      if (isMounted) {
        setLoadedExamStagesMap((prev) => ({
          ...prev,
          [selectedExamId]: [],
        }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedExamId]);

  const visibleCategories = useMemo(() => {
    if (!manifest?.categories) return [];
    if (!userPreferences || !userPreferences.selectedDomains || userPreferences.selectedDomains.length === 0) {
      return manifest.categories;
    }
    return manifest.categories
      .filter((cat: any) => userPreferences.selectedDomains.includes(cat.id) || cat.id === 'subject_practice')
      .map((cat: any) => {
        if (!userPreferences.selectedSubdomains || userPreferences.selectedSubdomains.length === 0) return cat;
        if (!userPreferences.selectedDomains.includes(cat.id)) return cat;
        const filteredExams = cat.exams?.filter((e: any) => userPreferences.selectedSubdomains.includes(e.id)) || [];
        return {
          ...cat,
          exams: filteredExams.length > 0 ? filteredExams : cat.exams,
        };
      });
  }, [manifest, userPreferences]);

  const currentCategory = visibleCategories?.find((c: any) => c.id === selectedCategory) || visibleCategories?.[0] || manifest?.categories?.[0];
  const currentExam = currentCategory?.exams?.find((e: any) => e.id === selectedExamId) || currentCategory?.exams?.[0];
  const stages = loadedExamStagesMap[selectedExamId] || currentExam?.stages || [];

  // Gather base tests from stages
  let baseTests: any[] = [];
  if (selectedStageId === 'all') {
    for (const st of stages) {
      baseTests = baseTests.concat(st.tests || []);
    }
  } else {
    const stage = stages.find((st: any) => st.id === selectedStageId);
    baseTests = stage?.tests || [];
  }

  // Calculate overall counts for the current stage/exam view
  const totalInCurrentView = baseTests.length;
  const attemptedInCurrentView = baseTests.filter((t: any) => !!attemptsMap[t.id]).length;
  const inProgressInCurrentView = baseTests.filter((t: any) => !attemptsMap[t.id] && !!inFlightMap[t.id]).length;
  const unattemptedInCurrentView = totalInCurrentView - attemptedInCurrentView - inProgressInCurrentView;

  // Filter by search query
  let filteredTests = [...baseTests];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredTests = filteredTests.filter((t: any) =>
      t.title?.toLowerCase().includes(q) ||
      t.stage?.toLowerCase().includes(q) ||
      t.pattern?.toLowerCase().includes(q)
    );
  }

  // Filter by attempt & in-progress status
  if (attemptFilter === 'attempted') {
    filteredTests = filteredTests.filter((t: any) => !!attemptsMap[t.id]);
  } else if (attemptFilter === 'in_progress') {
    filteredTests = filteredTests.filter((t: any) => !attemptsMap[t.id] && !!inFlightMap[t.id]);
  } else if (attemptFilter === 'unattempted') {
    filteredTests = filteredTests.filter((t: any) => !attemptsMap[t.id] && !inFlightMap[t.id]);
  }

  // Sort tests
  filteredTests.sort((a: any, b: any) => {
    if (sortBy === 'q_asc') return (a.totalQuestions || 0) - (b.totalQuestions || 0);
    if (sortBy === 'q_desc') return (b.totalQuestions || 0) - (a.totalQuestions || 0);
    if (sortBy === 'dur_asc') return (a.totalDurationMinutes || 0) - (b.totalDurationMinutes || 0);
    if (sortBy === 'dur_desc') return (b.totalDurationMinutes || 0) - (a.totalDurationMinutes || 0);
    if (sortBy === 'score_desc') {
      const scoreA = attemptsMap[a.id]?.summary?.netScore ?? -999;
      const scoreB = attemptsMap[b.id]?.summary?.netScore ?? -999;
      return scoreB - scoreA;
    }
    return 0;
  });

  const displayedTests = filteredTests;

  // Remote Kill-Switch Blocked Enforcement & Cloud Verification Guard
  if (securityStatus?.isBlocked) {
    const isNetworkRequired = securityStatus.source === 'fallback';
    return (
      <div className="fixed inset-0 z-[99999] bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className={`w-20 h-20 rounded-3xl ${isNetworkRequired ? 'bg-amber-500/10 border-amber-500/30 shadow-amber-500/20' : 'bg-rose-500/10 border-rose-500/30 shadow-rose-500/20'} border flex items-center justify-center mb-6 shadow-2xl`}>
          {isNetworkRequired ? (
            <WifiOff className="w-10 h-10 text-amber-500" />
          ) : (
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          )}
        </div>
        <span className={`px-3 py-1 ${isNetworkRequired ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'} border font-mono text-xs font-bold rounded-full mb-3 uppercase tracking-wider`}>
          {isNetworkRequired ? 'Verification Required' : 'Access Suspended'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
          {isNetworkRequired ? 'Internet Connection Required' : 'You have been blocked from using the app'}
        </h1>
        <p className="text-zinc-400 max-w-md text-xs sm:text-sm leading-relaxed mb-8">
          {securityStatus.blockMessage || (isNetworkRequired
            ? 'Internet connection required to verify device authorization with Google Drive. Please connect to the internet to continue.'
            : `This device (${securityStatus.deviceId || 'Hardware'}) has been restricted by administration.`)}
        </p>
        <button
          onClick={async () => {
            setIsLoading(true);
            const sec = await getSecurityStatus(true);
            setSecurityStatus(sec);
            setIsLoading(false);
          }}
          className="px-6 py-3 bg-[#0858f7] hover:bg-[#0747c7] text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-lg shadow-[#0858f7]/25 transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>{isNetworkRequired ? 'Retry Connection' : 'Check Authorization Status'}</span>
        </button>
      </div>
    );
  }

  // View Switching (Placed AFTER all Hooks have executed)
  if (activeTestData) {
    return (
      <CBTExamPlayer
        testData={activeTestData}
        testItemId={activeTestData?.manifestId || activeTestData?.testId}
        onExit={async () => {
          setActiveTestData(null);
          setActiveSnapshot(null);
          await loadAttemptsAndSnapshots();
        }}
        initialStudyMode={isStudyMode}
        initialSnapshot={activeSnapshot}
      />
    );
  }

  if (isPreferencesOpen) {
    return (
      <UserPreferencesView
        manifest={manifest}
        currentPreferences={userPreferences}
        onSavePreferences={handleSavePreferences}
        onClose={() => setIsPreferencesOpen(false)}
      />
    );
  }

  if (isGlobalAnalyticsOpen) {
    if (globalAnalyticsAttempt) {
      return (
        <DeepAnalyticsView
          currentAttempt={globalAnalyticsAttempt}
          backButtonLabel="Back to Catalog"
          onBackToHub={() => setGlobalAnalyticsAttempt(null)}
          onBackToPlayer={() => setGlobalAnalyticsAttempt(null)}
          onExitToDashboard={() => {
            setGlobalAnalyticsAttempt(null);
            setIsGlobalAnalyticsOpen(false);
          }}
          onSelectAttempt={(att) => setGlobalAnalyticsAttempt(att)}
        />
      );
    }

    return (
      <AnalyticsGrowthHub
        onSelectAttempt={(attempt) => setGlobalAnalyticsAttempt(attempt)}
        onExitToCatalog={() => setIsGlobalAnalyticsOpen(false)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] md:h-[100dvh] w-full max-w-full md:overflow-hidden bg-[#f4f5f8] dark:bg-[#0f1015] font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* 1. MOBILE TOP APP BAR (Phones only) */}
      <div className="md:hidden bg-white dark:bg-[#18181b] border-b border-zinc-200 dark:border-[#27272a] px-3.5 py-2.5 flex items-center justify-between safe-top shrink-0 min-w-0 shadow-xs">
        <div className="flex items-center space-x-2.5">
          {/* Hamburger Menu Drawer Trigger */}
          <button
            onClick={() => setIsLeftDrawerOpen(true)}
            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-[#3f3f46]/60 rounded-lg active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Open Navigation Drawer"
          >
            <Menu size={18} />
          </button>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0858f7] to-[#7c3aed] flex items-center justify-center shadow-md shadow-[#0858f7]/20 shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xs text-zinc-900 dark:text-white tracking-wide leading-tight">CBT EXAM MASTER</h1>
            <p className="text-[9px] text-[#7c3aed] dark:text-[#a78bfa] font-mono font-semibold">2026 OFFICIAL PATTERN</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <ThemeToggle variant="icon" />
          <button
            onClick={() => setIsBookmarksOpen(true)}
            className="relative p-2 bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/20 dark:hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold flex items-center border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
            title="Bookmarked Questions"
          >
            <Bookmark size={15} className="fill-amber-500 text-amber-500" />
            {bookmarksCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                {bookmarksCount > 99 ? '99+' : bookmarksCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="p-2 bg-[#0858f7]/10 dark:bg-[#0858f7]/15 hover:bg-[#0858f7]/20 dark:hover:bg-[#0858f7]/25 text-[#0858f7] dark:text-[#60a5fa] rounded-lg text-xs font-semibold flex items-center space-x-1 border border-[#0858f7]/30 active:scale-95 transition-all cursor-pointer"
            title="Set Target Goals"
          >
            <Filter size={15} />
          </button>
          <button
            onClick={() => setIsGlobalAnalyticsOpen(true)}
            className="p-2 bg-[#7c3aed]/10 dark:bg-[#7c3aed]/15 hover:bg-[#7c3aed]/20 dark:hover:bg-[#7c3aed]/25 text-[#7c3aed] dark:text-[#a78bfa] rounded-lg text-xs font-semibold flex items-center space-x-1 border border-[#7c3aed]/30 active:scale-95 transition-all cursor-pointer"
            title="Analytics Hub"
          >
            <BarChart2 size={15} />
          </button>
        </div>
      </div>

      {/* 1.0 MOBILE SLIDE-OUT NAVIGATION DRAWER (Left Sidebar) */}
      {isLeftDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-72 sm:w-80 bg-white dark:bg-[#18181b] h-full flex flex-col border-r border-zinc-200 dark:border-[#27272a] shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] flex items-center justify-between safe-top">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0858f7] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#0858f7]/20">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-xs text-zinc-900 dark:text-white tracking-wide">CBT EXAM MASTER</h2>
                  <p className="text-[9px] text-[#7c3aed] dark:text-[#a78bfa] font-mono font-semibold">2026 OFFICIAL PATTERN</p>
                </div>
              </div>
              <button
                onClick={() => setIsLeftDrawerOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#27272a] rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Categories & Domains Accordion */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 pt-1 pb-0.5">
                Exam Domains
              </div>
              {visibleCategories?.map((cat: any) => {
                const isCategoryActive = selectedCategory === cat.id;
                const isExpanded = !!expandedDomains[cat.id];
                const examCount = cat.exams?.length || 0;
                const totalTests = cat.exams?.reduce((sum: number, e: any) => sum + (e.totalTests || 0), 0) || 0;

                return (
                  <div key={`drawer-cat-${cat.id}`} className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (cat.exams && cat.exams.length > 0) {
                          setSelectedExamId(cat.exams[0].id);
                          setSelectedStageId('all');
                        }
                        toggleDomain(cat.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isCategoryActive
                          ? 'bg-[#0858f7]/10 dark:bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30'
                          : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className={isCategoryActive ? 'text-[#0858f7] dark:text-[#60a5fa]' : 'text-zinc-500'}>
                          {getIcon(cat.icon)}
                        </span>
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {totalTests > 0 && (
                          <span className="text-[10px] bg-zinc-100 dark:bg-[#27272a] px-1.5 py-0.5 rounded font-mono text-zinc-700 dark:text-zinc-300">
                            {totalTests}
                          </span>
                        )}
                        {examCount > 0 && (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && cat.exams && (
                      <div className="pl-6 pr-1 py-1 space-y-1">
                        {cat.exams.map((ex: any) => {
                          const isExamSelected = isCategoryActive && selectedExamId === ex.id;
                          const hasTests = (ex.totalTests || 0) > 0;
                          return (
                            <button
                              key={`drawer-exam-${ex.id}`}
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                setSelectedExamId(ex.id);
                                setSelectedStageId('all');
                                setIsLeftDrawerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                isExamSelected
                                  ? 'bg-[#0858f7] text-white font-semibold shadow-sm'
                                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
                              }`}
                            >
                              <span className="truncate text-left pr-1">{ex.name}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                                  isExamSelected
                                    ? 'bg-[#0645c7] text-white'
                                    : hasTests
                                    ? 'bg-zinc-100 dark:bg-[#27272a] text-zinc-600 dark:text-zinc-400'
                                    : 'bg-zinc-100/50 dark:bg-[#27272a]/50 text-zinc-400 dark:text-zinc-600'
                                }`}
                              >
                                {ex.totalTests || 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-3 border-t border-zinc-200 dark:border-[#27272a] space-y-2 bg-white dark:bg-[#18181b] safe-bottom">
              <button
                onClick={() => {
                  setIsPreferencesOpen(true);
                  setIsLeftDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#0858f7]/10 dark:bg-[#0858f7]/15 hover:bg-[#0858f7]/20 dark:hover:bg-[#0858f7]/25 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Filter size={14} />
                <span>Target Goals & Focus</span>
              </button>

              <button
                onClick={() => {
                  setIsGlobalAnalyticsOpen(true);
                  setIsLeftDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#7c3aed]/10 dark:bg-[#7c3aed]/15 hover:bg-[#7c3aed]/20 dark:hover:bg-[#7c3aed]/25 text-[#7c3aed] dark:text-[#a78bfa] border border-[#7c3aed]/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <BarChart2 size={14} />
                <span>Growth & Analytics Hub</span>
              </button>

              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                  setIsLeftDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-zinc-100 dark:bg-[#27272a] hover:bg-zinc-200 dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#3f3f46]/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Settings size={14} className="text-zinc-500 dark:text-zinc-400" />
                <span>Settings</span>
              </button>
            </div>
          </div>
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setIsLeftDrawerOpen(false)} />
        </div>
      )}

      {/* 1.1 MOBILE DOMAIN SELECTOR CHIPS (Phones only) */}
      <div className="md:hidden bg-white dark:bg-[#18181b] border-b border-zinc-200 dark:border-[#27272a] px-3 py-2 flex items-center space-x-2 overflow-x-auto shrink-0 select-none">
        {visibleCategories?.map((cat: any) => {
          const isCategoryActive = selectedCategory === cat.id;
          const totalTests = cat.exams?.reduce((sum: number, e: any) => sum + (e.totalTests || 0), 0) || 0;
          return (
            <button
              key={`mob-cat-${cat.id}`}
              onClick={() => {
                setSelectedCategory(cat.id);
                if (cat.exams && cat.exams.length > 0) {
                  setSelectedExamId(cat.exams[0].id);
                  setSelectedStageId('all');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                isCategoryActive
                  ? 'bg-[#0858f7] text-white shadow-md shadow-[#0858f7]/25'
                  : 'bg-zinc-100 dark:bg-[#27272a] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#3f3f46]/60'
              }`}
            >
              <span>{cat.name}</span>
              {totalTests > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isCategoryActive ? 'bg-[#0645c7] text-white' : 'bg-zinc-200 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400'}`}>
                  {totalTests}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1.2 MOBILE SUB-EXAM CHIPS (Phones only) */}
      {currentCategory?.exams && currentCategory.exams.length > 1 && (
        <div className="md:hidden bg-zinc-50 dark:bg-[#18181b] border-b border-zinc-200/80 dark:border-[#27272a] px-3 py-1.5 flex items-center space-x-1.5 overflow-x-auto shrink-0 select-none">
          {currentCategory.exams.map((ex: any) => {
            const isExamSelected = selectedExamId === ex.id;
            return (
              <button
                key={`mob-exam-${ex.id}`}
                onClick={() => {
                  setSelectedExamId(ex.id);
                  setSelectedStageId('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isExamSelected
                    ? 'bg-[#0858f7] text-white font-bold shadow-sm'
                    : 'bg-zinc-200/70 dark:bg-[#27272a] text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {ex.name} {ex.totalTests > 0 ? `(${ex.totalTests})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* 1.3 DESKTOP LEFT CATEGORY SIDEBAR (Hidden on Mobile, Collapsible on Desktop) */}
      {!isSidebarCollapsed && (
        <aside className="hidden md:flex w-64 bg-white dark:bg-[#18181b] border-r border-zinc-200 dark:border-[#27272a] flex-col shrink-0 select-none transition-all duration-200 animate-in slide-in-from-left">
          {/* Brand Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0858f7] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#0858f7]/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-zinc-900 dark:text-white tracking-wide">CBT EXAM MASTER</h1>
                <p className="text-[10px] text-[#7c3aed] dark:text-[#a78bfa] font-mono font-semibold">2026 OFFICIAL PATTERN</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#27272a] rounded-lg transition-colors cursor-pointer"
              title="Close Navigation Sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* Categories List (Accordion Style) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleCategories?.map((cat: any) => {
              const isCategoryActive = selectedCategory === cat.id;
              const isExpanded = !!expandedDomains[cat.id];
              const examCount = cat.exams?.length || 0;
              const totalTests = cat.exams?.reduce((sum: number, e: any) => sum + (e.totalTests || 0), 0) || 0;

              return (
                <div key={`cat-${cat.id}`} className="space-y-1">
                  {/* Domain Header Button */}
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.exams && cat.exams.length > 0) {
                        setSelectedExamId(cat.exams[0].id);
                        setSelectedStageId('all');
                      }
                      toggleDomain(cat.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCategoryActive
                        ? 'bg-[#0858f7]/10 dark:bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30'
                        : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isCategoryActive ? 'text-[#0858f7] dark:text-[#60a5fa]' : 'text-zinc-500'}>
                        {getIcon(cat.icon)}
                      </span>
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {totalTests > 0 && (
                        <span className="text-[10px] bg-zinc-100 dark:bg-[#27272a] px-1.5 py-0.5 rounded font-mono text-zinc-700 dark:text-zinc-300">
                          {totalTests}
                        </span>
                      )}
                      {examCount > 0 && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Subdomains / Exams List */}
                  {isExpanded && cat.exams && (
                    <div className="pl-6 pr-1 py-1 space-y-1">
                      {cat.exams.map((ex: any) => {
                        const isExamSelected = isCategoryActive && selectedExamId === ex.id;
                        const hasTests = (ex.totalTests || 0) > 0;
                        return (
                          <button
                            key={`exam-${ex.id}`}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setSelectedExamId(ex.id);
                              setSelectedStageId('all');
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                              isExamSelected
                                ? 'bg-[#0858f7] text-white font-semibold shadow-sm'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
                            }`}
                          >
                            <span className="truncate text-left pr-1">{ex.name}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                                isExamSelected
                                  ? 'bg-[#0645c7] text-white'
                                  : hasTests
                                  ? 'bg-zinc-100 dark:bg-[#27272a] text-zinc-600 dark:text-zinc-400'
                                  : 'bg-zinc-100/50 dark:bg-[#27272a]/50 text-zinc-400 dark:text-zinc-600'
                              }`}
                            >
                              {ex.totalTests || 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions & Sync Section */}
          <div className="p-3 border-t border-zinc-200 dark:border-[#27272a] space-y-2 bg-white dark:bg-[#18181b]">
            <button
              onClick={() => setIsPreferencesOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#0858f7]/10 dark:bg-[#0858f7]/15 hover:bg-[#0858f7]/20 dark:hover:bg-[#0858f7]/25 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30 rounded-xl text-xs font-semibold transition-all shadow-sm group cursor-pointer"
            >
              <Filter size={15} className="text-[#0858f7] dark:text-[#60a5fa] group-hover:scale-110 transition-transform" />
              <span>Target Goals & Focus</span>
            </button>

            <button
              onClick={() => setIsGlobalAnalyticsOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#7c3aed]/10 dark:bg-[#7c3aed]/15 hover:bg-[#7c3aed]/20 dark:hover:bg-[#7c3aed]/25 text-[#7c3aed] dark:text-[#a78bfa] border border-[#7c3aed]/30 rounded-xl text-xs font-semibold transition-all shadow-sm group cursor-pointer"
            >
              <BarChart2 size={15} className="text-[#7c3aed] dark:text-[#a78bfa] group-hover:scale-110 transition-transform" />
              <span>Growth & Analytics Hub</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-zinc-100 dark:bg-[#27272a] hover:bg-zinc-200 dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-[#3f3f46]/60 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm group"
            >
              <Settings size={14} className="text-zinc-500 dark:text-zinc-400 group-hover:rotate-45 transition-transform" />
              <span>Settings</span>
            </button>
          </div>
        </aside>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f4f5f8] dark:bg-[#0f1015] overflow-y-auto md:overflow-hidden transition-colors duration-200">
        {/* Top Header */}
        <header className="py-3 px-4 md:h-16 border-b border-zinc-200 dark:border-[#27272a] flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white/90 dark:bg-[#18181b]/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-[#27272a] hover:bg-zinc-200 dark:hover:bg-[#3f3f46] text-[#0858f7] dark:text-[#60a5fa] border border-zinc-200 dark:border-[#3f3f46] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Expand Navigation Sidebar"
              >
                <PanelLeftOpen size={16} />
                <span>Domains</span>
              </button>
            )}
            <div>
              <h2 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white flex items-center space-x-2">
                <span>{currentExam?.name || currentCategory?.name || 'Exam Portal'}</span>
                {currentExam?.code && (
                  <span className="text-[10px] md:text-[11px] font-mono bg-[#0858f7]/10 dark:bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30 px-1.5 py-0.5 rounded">
                    {currentExam.code}
                  </span>
                )}
              </h2>
              <p className="text-[11px] md:text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs md:max-w-md">
                {currentExam?.description || 'Authentic TCS iON CBT Mock Tests & Solutions'}
              </p>
            </div>
          </div>

          {/* Search Bar & Desktop Actions */}
          <div className="flex items-center space-x-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 text-zinc-400 dark:text-zinc-500" size={15} />
              <input
                type="text"
                placeholder="Search tests, topics, formulas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-[#27272a]/80 border border-zinc-200 dark:border-[#3f3f46] rounded-xl pl-9 pr-4 py-1.5 md:py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#0858f7] transition-all"
              />
            </div>
            {/* Bookmarked Questions Button */}
            <button
              onClick={() => setIsBookmarksOpen(true)}
              className="relative px-3 py-1.5 md:py-2 bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/20 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-amber-500/30 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="View Bookmarked Questions"
            >
              <Bookmark size={15} className="fill-amber-500 text-amber-500" />
              <span className="hidden sm:inline font-bold">Bookmarks</span>
              {bookmarksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
                  {bookmarksCount}
                </span>
              )}
            </button>

            {/* Download App Button */}
            <Link
              href="/download"
              className="relative px-3 py-1.5 md:py-2 bg-blue-500/10 dark:bg-blue-500/15 hover:bg-blue-500/20 dark:hover:bg-blue-500/25 text-[#0858f7] dark:text-[#60a5fa] rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-blue-500/30 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Download Desktop & Mobile Apps"
            >
              <DownloadCloud size={15} />
              <span className="hidden sm:inline font-bold">Download App</span>
            </Link>

            <div className="hidden md:flex">
              <ThemeToggle variant="icon" />
            </div>
          </div>
        </header>

        {/* Stage Filter Tabs (Only if stages exist) */}
        {stages.length > 0 && (
          <div className="bg-white/60 dark:bg-[#18181b]/60 border-b border-zinc-200 dark:border-[#27272a] px-4 md:px-6 py-2 flex items-center space-x-2 overflow-x-auto shrink-0 select-none">
            <button
              onClick={() => setSelectedStageId('all')}
              className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedStageId === 'all'
                  ? 'bg-[#0858f7] text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              All Papers ({stages.reduce((acc: number, s: any) => acc + (s.totalTests || 0), 0)})
            </button>

            {stages.map((st: any, sIdx: number) => {
              const isActive = st.id === selectedStageId;
              return (
                <button
                  key={`stage-${st.id || sIdx}-${sIdx}`}
                  onClick={() => setSelectedStageId(st.id)}
                  className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#0858f7] text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span>{st.name}</span>
                  <span className="text-[10px] bg-zinc-100 dark:bg-[#27272a] px-1.5 py-0.2 rounded font-mono text-zinc-700 dark:text-zinc-300">
                    {st.totalTests}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Secondary Filter & Sort Bar (Attempted / Not Attempted / Questions Sorting) */}
        {stages.length > 0 && (
          <div className="bg-white/95 dark:bg-[#18181b]/90 border-b border-zinc-200 dark:border-[#27272a] px-3 md:px-6 py-2 md:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none min-w-0">
            {/* Attempt Filter Tabs */}
            <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-[#121214] p-1 rounded-xl border border-zinc-200 dark:border-[#27272a] overflow-x-auto no-scrollbar max-w-full">
              <button
                onClick={() => setAttemptFilter('all')}
                className={`px-2.5 md:px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  attemptFilter === 'all'
                    ? 'bg-white dark:bg-[#27272a] text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                All ({totalInCurrentView})
              </button>

              <button
                onClick={() => setAttemptFilter('attempted')}
                className={`flex items-center space-x-1 px-2.5 md:px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  attemptFilter === 'attempted'
                    ? 'bg-[#7c3aed]/15 text-[#7c3aed] dark:text-[#a78bfa] font-semibold border border-[#7c3aed]/30 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-[#7c3aed] dark:hover:text-[#a78bfa]'
                }`}
              >
                <CheckCircle2 size={13} className="text-[#7c3aed] dark:text-[#a78bfa] shrink-0" />
                <span>Attempted ({attemptedInCurrentView})</span>
              </button>

              <button
                onClick={() => setAttemptFilter('in_progress')}
                className={`flex items-center space-x-1 px-2.5 md:px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  attemptFilter === 'in_progress'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                <Pause size={13} className="text-amber-500 shrink-0" />
                <span>In Progress ({inProgressInCurrentView})</span>
              </button>

              <button
                onClick={() => setAttemptFilter('unattempted')}
                className={`flex items-center space-x-1 px-2.5 md:px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  attemptFilter === 'unattempted'
                    ? 'bg-white dark:bg-[#27272a] text-zinc-900 dark:text-zinc-200 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <CircleDashed size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>Unattempted ({unattemptedInCurrentView})</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:flex items-center space-x-1">
                <ArrowUpDown size={13} className="text-zinc-400 dark:text-zinc-500" />
                <span>Sort:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-white dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46] rounded-lg px-2.5 py-1 md:py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-[#0858f7] font-medium cursor-pointer shadow-xs"
              >
                <option value="default">Default Order</option>
                <option value="q_asc">Questions: Low → High</option>
                <option value="q_desc">Questions: High → Low</option>
                <option value="dur_asc">Duration: Short → Long</option>
                <option value="dur_desc">Duration: Long → Short</option>
                <option value="score_desc">My Score: High → Low</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. TEST PAPERS GRID */}
        <div className="flex-1 p-3 md:p-6 min-w-0 max-w-full md:overflow-y-auto">
          {isLoading || isTestLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <RefreshCw size={28} className="text-[#0858f7] animate-spin mx-auto" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Loading test papers...</p>
              </div>
            </div>
          ) : stages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0858f7]/10 border border-[#0858f7]/20 flex items-center justify-center text-[#0858f7] shadow-lg shadow-[#0858f7]/5">
                <Award size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{currentCategory?.name || 'Domain'} Catalog</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Test papers are actively being ingested into this domain repository.
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory('banking')}
                className="px-4 py-2 bg-[#0858f7] hover:bg-[#0645c7] text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-[#0858f7]/20 cursor-pointer"
              >
                Go to Banking Domain →
              </button>
            </div>
          ) : displayedTests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 space-y-2">
              <FolderOpen size={40} className="stroke-1" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No test papers found matching query or filter</p>
              {attemptFilter !== 'all' && (
                <button
                  onClick={() => setAttemptFilter('all')}
                  className="text-xs text-[#0858f7] hover:underline pt-1 cursor-pointer"
                >
                  Clear attempt filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 min-w-0">
              {displayedTests.map((test: any, idx: number) => {
                const attempt = attemptsMap[test.id];
                const isAttempted = !!attempt;
                const inFlight = inFlightMap[test.id];
                const isInProgress = !isAttempted && !!inFlight;

                const getPatternInfo = (pat: string) => {
                  switch (pat) {
                    case 'NEW_PATTERN_2026':
                      return { label: 'New Pattern 2026', style: 'bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border-[#0858f7]/30' };
                    case 'OLD_PATTERN_2025':
                      return { label: 'Old Pattern 2025', style: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30' };
                    case 'PYQ_SHIFT':
                    case 'MATHS_PYP':
                    case 'REAS_PYP':
                    case 'ENG_PYP':
                    case 'GK_PYP':
                      return { label: 'Official PYQ Shift', style: 'bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border-[#0858f7]/30' };
                    case 'TOPIC_DRILL':
                      return { label: 'Topic Drill', style: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' };
                    case 'PRELIMS':
                    case 'PRELIMS_GS1':
                      return { label: 'Prelims Mock', style: 'bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border-[#0858f7]/30' };
                    case 'MAINS':
                      return { label: 'Mains Mock', style: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30' };
                    case 'TIER_1':
                      return { label: 'Tier-I Exam', style: 'bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border-[#0858f7]/30' };
                    case 'TIER_2':
                      return { label: 'Tier-II Exam', style: 'bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border-[#0858f7]/30' };
                    default:
                      return { label: pat ? pat.replace(/_/g, ' ') : 'Mock Test', style: 'bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border-[#0858f7]/30' };
                  }
                };

                const patternInfo = getPatternInfo(test.pattern);

                return (
                  <div
                    key={`test-${test.id || 't'}-${test.pattern || ''}-${idx}`}
                    className={`rounded-2xl p-4.5 flex flex-col justify-between transition-all group ${
                      isAttempted
                        ? 'bg-white dark:bg-[#18181b] border border-[#7c3aed]/40 hover:border-[#7c3aed] shadow-sm hover:shadow-md ring-1 ring-[#7c3aed]/20'
                        : isInProgress
                        ? 'bg-white dark:bg-[#18181b] border border-amber-500/50 hover:border-amber-500 shadow-sm hover:shadow-md ring-1 ring-amber-500/30'
                        : 'bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] hover:border-[#0858f7]/50 shadow-xs hover:shadow-lg dark:hover:shadow-black/50'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges: Pattern & Status */}
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-semibold border shrink-0 ${patternInfo.style}`}>
                          {patternInfo.label}
                        </span>

                        {/* Status Badge: Attempted vs In Progress vs Not Attempted */}
                        {isAttempted ? (
                          <span className="flex items-center space-x-1 text-[#7c3aed] dark:text-[#a78bfa] font-mono font-semibold bg-[#7c3aed]/15 border border-[#7c3aed]/30 px-2 py-0.5 rounded-full text-[11px] truncate">
                            <CheckCircle2 size={13} className="text-[#7c3aed] dark:text-[#a78bfa] shrink-0" />
                            <span>Attempted</span>
                            {attempt.summary && (
                              <span className="text-[#7c3aed] dark:text-[#a78bfa] font-bold ml-0.5">
                                ({attempt.summary.netScore.toFixed(1)}/{attempt.summary.maxMarks})
                              </span>
                            )}
                          </span>
                        ) : isInProgress ? (
                          <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-mono font-semibold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] truncate">
                            <Pause size={12} className="text-amber-500 shrink-0" />
                            <span>In Progress ({Math.floor((inFlight.timeLeft || 0) / 60)}m left)</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-zinc-500 dark:text-zinc-400 font-mono font-medium bg-zinc-100 dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46]/60 px-2 py-0.5 rounded-full text-[11px]">
                            <CircleDashed size={12} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span>Not Attempted</span>
                          </span>
                        )}
                      </div>

                      {/* Test Title */}
                      <h3 className={`font-bold text-sm leading-snug line-clamp-2 transition-colors ${
                        isAttempted
                          ? 'text-zinc-900 dark:text-zinc-100 group-hover:text-[#7c3aed] dark:group-hover:text-[#a78bfa]'
                          : isInProgress
                          ? 'text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                          : 'text-zinc-900 dark:text-zinc-100 group-hover:text-[#0858f7] dark:group-hover:text-[#60a5fa]'
                      }`}>
                        {test.title}
                      </h3>

                      {/* Specs */}
                      <div className="flex items-center space-x-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono pt-1">
                        <span className="flex items-center space-x-1">
                          <BookOpen size={14} className="text-zinc-400 dark:text-zinc-500" />
                          <span>{test.totalQuestions} Questions</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <Clock size={14} className="text-zinc-400 dark:text-zinc-500" />
                          <span>{test.totalDurationMinutes} Mins</span>
                          {test.sectionalDurationMinutes && (
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-200 dark:border-blue-800">
                              {test.sectionalDurationMinutes}m/sec
                            </span>
                          )}
                        </span>
                        <span>{test.totalMarks} Marks</span>
                      </div>

                      {/* Attempt Telemetry Info if attempted */}
                      {isAttempted && attempt.summary && (
                        <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-xl p-2 flex items-center justify-between text-[11px] font-mono text-purple-900 dark:text-[#a78bfa]">
                          <span>Accuracy: <strong>{attempt.summary.accuracy.toFixed(1)}%</strong></span>
                          <span>Time: <strong>{Math.round((attempt.totalTimeSpentSeconds || 0) / 60)}m</strong></span>
                          <span className="text-zinc-500 dark:text-zinc-400">{new Date(attempt.submittedAt).toLocaleDateString()}</span>
                        </div>
                      )}

                      {/* In-Flight Resume Info if In-Progress */}
                      {isInProgress && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 flex items-center justify-between text-[11px] font-mono text-amber-900 dark:text-amber-300">
                          <span>Paused: <strong>Q{(inFlight.currentQuestionIndex || 0) + 1}</strong></span>
                          <span>Saved: <strong>{Object.values(inFlight.questionStatus || {}).filter((s: any) => s === 'answered' || s === 'answered_marked').length} answered</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-3.5 border-t border-zinc-100 dark:border-[#27272a] mt-3.5">
                      {isAttempted ? (
                        <>
                          {/* Retake Exam Button */}
                          <button
                            onClick={() => handleLaunchTest(test, false, false)}
                            className="flex items-center justify-center space-x-1.5 py-2 bg-[#0858f7] hover:bg-[#0645c7] text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-[#0858f7]/25 active:scale-98 cursor-pointer"
                          >
                            <RotateCcw size={13} />
                            <span>Retake</span>
                          </button>

                          {/* Review Analytics & Solutions */}
                          <button
                            onClick={() => handleOpenTestAnalytics(test.id)}
                            className="flex items-center justify-center space-x-1.5 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-[#7c3aed]/25 active:scale-98 cursor-pointer"
                          >
                            <BarChart2 size={13} />
                            <span>Analysis</span>
                          </button>
                        </>
                      ) : isInProgress ? (
                        <>
                          {/* Resume In-Progress Exam */}
                          <button
                            onClick={() => handleLaunchTest(test, false, true)}
                            className="flex items-center justify-center space-x-1.5 py-2 bg-[#0858f7] hover:bg-[#0645c7] text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-[#0858f7]/25 active:scale-98 cursor-pointer"
                          >
                            <Play size={13} fill="currentColor" />
                            <span>Resume</span>
                          </button>

                          {/* Reset / Restart Fresh */}
                          <button
                            onClick={() => handleLaunchTest(test, false, false)}
                            className="flex items-center justify-center space-x-1.5 py-2 bg-zinc-100 dark:bg-[#27272a] hover:bg-zinc-200 dark:hover:bg-[#3f3f46] text-zinc-800 dark:text-zinc-200 rounded-xl font-semibold text-xs border border-zinc-200 dark:border-[#3f3f46] transition-colors cursor-pointer"
                            title="Start fresh from Question 1"
                          >
                            <RotateCcw size={13} />
                            <span>Restart</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Start Exam Mode */}
                          <button
                            onClick={() => handleLaunchTest(test, false, false)}
                            className="flex items-center justify-center space-x-1.5 py-2 bg-[#0858f7] hover:bg-[#0645c7] text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-[#0858f7]/25 active:scale-98 cursor-pointer"
                          >
                            <Play size={13} fill="currentColor" />
                            <span>Start Exam</span>
                          </button>

                          {/* Solutions Mode */}
                          <button
                            onClick={() => handleLaunchTest(test, true, false)}
                            className="flex items-center justify-center space-x-1.5 py-2 bg-zinc-100 dark:bg-[#27272a] hover:bg-zinc-200 dark:hover:bg-[#3f3f46] text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white rounded-xl font-semibold text-xs border border-zinc-200 dark:border-[#3f3f46] transition-colors cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>Solutions</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bookmarked Questions Modal */}
      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
      />

      {/* Google Drive Attachment Modal */}
      <GoogleDriveLinkModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSuccess={() => {
          setIsDriveModalOpen(false);
          loadAttemptsAndSnapshots();
        }}
      />

      {/* Application Settings & Licensing Modal */}
      <AppSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenGoogleDriveModal={() => {
          setIsSettingsOpen(false);
          setIsDriveModalOpen(true);
        }}
        onSyncComplete={handleSyncComplete}
        onSyncCatalog={() => fetchManifest(true)}
        isSyncingCatalog={isRefreshingCatalog}
      />

      {/* Work Code Required Warning Modal */}
      {workCodeAlertMessage && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12131a] border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl shadow-amber-500/10">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <KeyRound size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Work Code Required</h3>
            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              {workCodeAlertMessage}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setWorkCodeAlertMessage(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setWorkCodeAlertMessage(null);
                  setIsSettingsOpen(true);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                Update Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
