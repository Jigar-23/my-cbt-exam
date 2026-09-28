'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  BarChart2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  ArrowLeft,
  Trash2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { AttemptRecord } from '@/lib/analyticsEngine';
import { getAllAttempts, deleteAttempt, clearAllAttempts } from '@/lib/analyticsStorage';
import { deleteAttemptFromDrive } from '@/lib/gdrive/gdriveSync';
import { platformBridge } from '@/lib/platform/platformBridge';

interface AnalyticsGrowthHubProps {
  onSelectAttempt: (attempt: AttemptRecord) => void;
  onExitToCatalog: () => void;
  onReviewTest?: (testId: string, testTitle: string) => void;
  onOpenPreferences?: () => void;
}

export default function AnalyticsGrowthHub({
  onSelectAttempt,
  onExitToCatalog,
  onReviewTest,
  onOpenPreferences,
}: AnalyticsGrowthHubProps) {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score_high' | 'score_low' | 'accuracy_high'>('newest');
  
  // Deletion modal / confirmation state
  const [attemptToDelete, setAttemptToDelete] = useState<AttemptRecord | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadAttempts();
  }, []);

  // Hardware Back Button Protection for Native Mobile (Android)
  useEffect(() => {
    return platformBridge.registerBackHandler(() => {
      if (attemptToDelete) {
        setAttemptToDelete(null);
        return true;
      }
      if (showClearAllConfirm) {
        setShowClearAllConfirm(false);
        return true;
      }
      onExitToCatalog();
      return true;
    });
  }, [attemptToDelete, showClearAllConfirm, onExitToCatalog]);

  const loadAttempts = async () => {
    try {
      setIsLoading(true);
      const data = await getAllAttempts();
      setAttempts(data);
    } catch (e) {
      console.error('Failed to load past attempts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    await deleteAttempt(attemptId);
    deleteAttemptFromDrive(attemptId).catch(() => {});
    setAttemptToDelete(null);
    await loadAttempts();
  };

  const handleClearAll = async () => {
    await clearAllAttempts();
    setShowClearAllConfirm(false);
    await loadAttempts();
  };

  const formatSecs = (secs: number) => {
    if (!secs || isNaN(secs)) return '0s';
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remSecs = secs % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${remSecs}s`;
    }
    return `${remSecs}s`;
  };

  // Filtered and sorted attempts list
  const filteredAttempts = useMemo(() => {
    let result = [...attempts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.testTitle?.toLowerCase().includes(q) ||
          (a.pattern && a.pattern.toLowerCase().includes(q))
      );
    }

    // Pattern filter
    if (selectedPattern !== 'all') {
      result = result.filter((a) => a.pattern === selectedPattern);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.submittedAt - a.submittedAt;
        case 'oldest':
          return a.submittedAt - b.submittedAt;
        case 'score_high':
          return (b.summary?.netScore || 0) - (a.summary?.netScore || 0);
        case 'score_low':
          return (a.summary?.netScore || 0) - (b.summary?.netScore || 0);
        case 'accuracy_high':
          return (b.summary?.accuracy || 0) - (a.summary?.accuracy || 0);
        default:
          return b.submittedAt - a.submittedAt;
      }
    });

    return result;
  }, [attempts, searchQuery, selectedPattern, sortBy]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f5f8] dark:bg-[#0f1015] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans select-none pb-12 transition-colors duration-200">
      {/* 1. COMPACT MOBILE-FIRST TOP APP BAR */}
      <header className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border-b border-zinc-200 dark:border-[#27272a] px-3.5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <button
            onClick={onExitToCatalog}
            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] active:scale-95 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-transparent"
            aria-label="Back to Catalog"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide truncate">Test History</h1>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#0858f7]/10 dark:bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30 shrink-0">
                {attempts.length} {attempts.length === 1 ? 'Exam' : 'Exams'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              Performance telemetry & past attempts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={loadAttempts}
            title="Refresh History"
            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] active:scale-95 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all border border-zinc-200 dark:border-[#3f3f46]/60 cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#0858f7]' : ''} />
          </button>

          {onOpenPreferences && (
            <button
              onClick={onOpenPreferences}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#0858f7]/10 dark:bg-[#0858f7]/15 hover:bg-[#0858f7]/20 dark:hover:bg-[#0858f7]/25 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Filter size={12} />
              <span>Goals</span>
            </button>
          )}

          {attempts.length > 0 && (
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="p-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-colors cursor-pointer"
              title="Clear History"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Clear All Confirmation Modal */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Clear All Exam History?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                This will permanently delete all {attempts.length} attempt records. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Attempt Modal */}
      {attemptToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Delete Attempt Record?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Delete record for <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{attemptToDelete.testTitle}</span>?
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setAttemptToDelete(null)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAttempt(attemptToDelete.attemptId)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SEARCH & CONTROLS */}
      <div className="max-w-4xl w-full mx-auto p-3 space-y-3">
        {attempts.length > 0 && (
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl p-2.5 flex items-center space-x-2 shadow-xs">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-2.5 text-zinc-400 dark:text-zinc-500" size={14} />
              <input
                type="text"
                placeholder="Search history by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#0858f7]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46] text-zinc-800 dark:text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden cursor-pointer shadow-xs"
            >
              <option value="newest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="score_high">Score: High → Low</option>
              <option value="accuracy_high">Accuracy: High → Low</option>
            </select>
          </div>
        )}

        {/* 3. ATTEMPTS CARDS LIST */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2">
            <RefreshCw size={24} className="text-[#0858f7] animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Loading history...</p>
          </div>
        ) : attempts.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl p-8 text-center max-w-sm mx-auto space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#0858f7]/10 dark:bg-[#0858f7]/15 border border-[#0858f7]/30 text-[#0858f7] dark:text-[#60a5fa] flex items-center justify-center mx-auto shadow-xs">
              <Sparkles size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Exam Attempts Yet</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Take any mock test from the catalog. Your score, accuracy, speed telemetry, and questions will appear here.
              </p>
            </div>
            <button
              onClick={onExitToCatalog}
              className="px-4 py-2 bg-[#0858f7] hover:bg-[#0645c7] active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#0858f7]/25 cursor-pointer"
            >
              Browse Catalog →
            </button>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl p-6 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">No attempts match your search</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#0858f7] hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAttempts.map((attempt) => {
              const { summary, timeIntelligence } = attempt;
              const submittedDate = new Date(attempt.submittedAt);
              const dateStr = submittedDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              const timeStr = submittedDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const accuracy = summary?.accuracy ?? 0;
              const netScore = summary?.netScore ?? 0;
              const maxMarks = summary?.maxMarks || 100;
              const attemptedCount = summary?.attempted || 0;
              const totalQ = summary?.totalQuestions || 0;
              const timeTraps = timeIntelligence?.timeTrapsCount || 0;

              return (
                <div
                  key={attempt.attemptId}
                  onClick={() => onSelectAttempt(attempt)}
                  className="bg-white dark:bg-[#18181b] hover:bg-zinc-50 dark:hover:bg-[#202025] border border-zinc-200 dark:border-[#27272a] hover:border-[#0858f7]/40 rounded-2xl p-3.5 transition-all shadow-xs dark:shadow-sm active:bg-zinc-100 dark:active:bg-[#202025] cursor-pointer space-y-2.5"
                >
                  {/* Top Bar: Pattern + Date + Delete */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-[#0858f7]/10 dark:bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30">
                        {attempt.pattern || 'EXAM'}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">{dateStr}, {timeStr}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttemptToDelete(attempt);
                      }}
                      className="p-1 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-xs md:text-sm text-zinc-900 dark:text-white line-clamp-2 leading-snug">
                    {attempt.testTitle}
                  </h3>

                  {/* Uniform 3-Column Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-xl p-2 text-center">
                    <div>
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Net Score</div>
                      <div className="text-xs font-bold text-[#0858f7] dark:text-[#60a5fa] font-mono mt-0.5">
                        {netScore} <span className="text-[10px] text-zinc-400 dark:text-zinc-500">/{maxMarks}</span>
                      </div>
                    </div>

                    <div className="border-x border-zinc-200 dark:border-[#27272a]">
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Accuracy</div>
                      <div className={`text-xs font-bold font-mono mt-0.5 ${
                        accuracy >= 80 ? 'text-[#08bd80]' : accuracy >= 60 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'
                      }`}>
                        {accuracy}%
                      </div>
                    </div>

                    <div>
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Time Spent</div>
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
                        {formatSecs(attempt.totalTimeSpentSeconds)}
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar: Pacing + CTA */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 text-[10px] font-mono">
                      <span>{attemptedCount}/{totalQ} Solved</span>
                      {timeTraps > 0 && (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center space-x-0.5">
                          <AlertTriangle size={10} />
                          <span>{timeTraps} Traps</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[#0858f7] dark:text-[#60a5fa] font-semibold text-[11px] flex items-center space-x-0.5 hover:underline">
                      <span>Deep Report</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
