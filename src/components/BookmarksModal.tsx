'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bookmark,
  X,
  Search,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Copy,
  Check,
  ChevronDown,
  Filter,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import {
  BookmarkedQuestion,
  getAllBookmarks,
  removeBookmark,
  clearAllBookmarks,
  exportBookmarksAsJsonFile,
  importBookmarksFromJson,
} from '../lib/bookmarkStorage';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTest?: (testId: string) => void;
}

export default function BookmarksModal({ isOpen, onClose, onOpenTest }: BookmarksModalProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh bookmarks from storage
  const loadBookmarks = () => {
    setBookmarks(getAllBookmarks());
  };

  useEffect(() => {
    if (isOpen) {
      loadBookmarks();
    }
  }, [isOpen]);

  // Listen to bookmarks changed event from any component
  useEffect(() => {
    const handleBookmarksChanged = () => {
      loadBookmarks();
    };
    window.addEventListener('cbt_bookmarks_changed', handleBookmarksChanged);
    return () => {
      window.removeEventListener('cbt_bookmarks_changed', handleBookmarksChanged);
    };
  }, []);

  // Compute unique exams and sections for filter dropdowns
  const uniqueExams = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.testTitle) set.add(b.testTitle);
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.sectionName) set.add(b.sectionName);
    });
    return Array.from(set).sort();
  }, [bookmarks]);

  // Filtered bookmarks list
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      // 1. Exam filter
      if (selectedExam !== 'all' && b.testTitle !== selectedExam) {
        return false;
      }

      // 2. Section filter
      if (selectedSection !== 'all' && b.sectionName !== selectedSection) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === 'correct' && b.isCorrect !== true) return false;
      if (statusFilter === 'incorrect' && (b.isCorrect !== false || !b.userAnswer)) return false;
      if (statusFilter === 'unattempted' && b.userAnswer) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = b.text.toLowerCase().includes(q);
        const matchesExplanation = (b.explanation || '').toLowerCase().includes(q);
        const matchesTestTitle = b.testTitle.toLowerCase().includes(q);
        const matchesSection = (b.sectionName || '').toLowerCase().includes(q);
        const matchesTopic = (b.topic || '').toLowerCase().includes(q);
        const matchesOptions = (b.options || []).some((opt) => opt.text.toLowerCase().includes(q));

        if (!matchesText && !matchesExplanation && !matchesTestTitle && !matchesSection && !matchesTopic && !matchesOptions) {
          return false;
        }
      }

      return true;
    });
  }, [bookmarks, selectedExam, selectedSection, statusFilter, searchQuery]);

  // Handle Remove Single Bookmark
  const handleRemove = (testId: string, questionId: string) => {
    removeBookmark(testId, questionId);
    loadBookmarks();
  };

  // Handle Clear All
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all bookmarked questions? This cannot be undone.')) {
      clearAllBookmarks();
      loadBookmarks();
    }
  };

  // Handle Copy Question & Solution JSON
  const handleCopyQuestionJson = (b: BookmarkedQuestion) => {
    navigator.clipboard.writeText(JSON.stringify(b, null, 2));
    setCopiedId(b.bookmarkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const added = importBookmarksFromJson(parsed);
          loadBookmarks();
          alert(`Successfully imported ${added} new bookmarked question(s)!`);
        } else {
          alert('Invalid file format: Expected an array of bookmarked questions in JSON format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file. Please ensure it is a valid bookmarks JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <header className="px-5 py-4 border-b border-zinc-200 dark:border-[#27272a] bg-zinc-50/80 dark:bg-[#1f1f23] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
              <Bookmark size={20} className="fill-amber-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Bookmarked Questions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-mono">
                  {bookmarks.length}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Complete questions, options, answers &amp; explanations stored offline in JSON
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={exportBookmarksAsJsonFile}
              disabled={bookmarks.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Download bookmarks as clean JSON file"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-[#27272a] hover:bg-zinc-200 dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 active:scale-95 shadow-xs transition-all cursor-pointer"
              title="Import JSON bookmarks file"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Import JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            {bookmarks.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                title="Clear all bookmarks"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* SEARCH & FILTERS BAR */}
        <div className="p-4 border-b border-zinc-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] flex flex-wrap items-center gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-zinc-400 dark:text-zinc-500" size={15} />
            <input
              type="text"
              placeholder="Search in questions, options, topics, solutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46] rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Exam Filter Dropdown */}
          {uniqueExams.length > 1 && (
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="bg-zinc-50 dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46] rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
            >
              <option value="all">All Exams ({uniqueExams.length})</option>
              {uniqueExams.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          )}

          {/* Section Filter Dropdown */}
          {uniqueSections.length > 1 && (
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-zinc-50 dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46] rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 max-w-[180px] truncate"
            >
              <option value="all">All Sections ({uniqueSections.length})</option>
              {uniqueSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          )}

          {/* Result Filter Tabs */}
          <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-[#27272a] p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-[#18181b] text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('correct')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'correct'
                  ? 'bg-white dark:bg-[#18181b] text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Correct
            </button>
            <button
              onClick={() => setStatusFilter('incorrect')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'incorrect'
                  ? 'bg-white dark:bg-[#18181b] text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Incorrect
            </button>
            <button
              onClick={() => setStatusFilter('unattempted')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'unattempted'
                  ? 'bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-200 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Unattempted
            </button>
          </div>
        </div>

        {/* QUESTIONS LIST BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {filteredBookmarks.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Bookmark size={32} className="stroke-[1.5]" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {bookmarks.length === 0 ? 'No Questions Bookmarked Yet' : 'No Matching Questions Found'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {bookmarks.length === 0
                    ? 'During any exam or study mode, click the Bookmark (★) button next to the question number. The full question, options, correct answer, and detailed proof will be saved here in a dedicated JSON file.'
                    : 'Try clearing your search query or switching your exam/section filters.'}
                </p>
              </div>
            </div>
          ) : (
            filteredBookmarks.map((item, index) => {
              const formattedDate = new Date(item.bookmarkedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <article
                  key={item.bookmarkId}
                  className="bg-zinc-50/70 dark:bg-[#1f1f23] border border-zinc-200 dark:border-[#2b2b30] rounded-2xl p-5 md:p-6 space-y-4 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  {/* Card Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-[#2b2b30] text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-[#27272a] px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                        Q.{item.questionNumber || index + 1}
                      </span>
                      {item.sectionName && (
                        <span className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/60">
                          {item.sectionName}
                        </span>
                      )}
                      <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[250px]" title={item.testTitle}>
                        {item.testTitle}
                      </span>
                      {item.topic && (
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {item.topic}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>Saved {formattedDate}</span>
                      
                      {/* Copy JSON Button */}
                      <button
                        onClick={() => handleCopyQuestionJson(item)}
                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded transition-colors cursor-pointer"
                        title="Copy question data as JSON"
                      >
                        {copiedId === item.bookmarkId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      {/* Remove Bookmark Button */}
                      <button
                        onClick={() => handleRemove(item.testId, item.questionId)}
                        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Remove bookmark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Passage / Direction (if available) */}
                  {(item.direction || item.passage) && (
                    <div className="p-3 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
                      {item.direction && (
                        <div className="font-medium">
                          <MathRenderer content={item.direction} />
                        </div>
                      )}
                      {item.passage && (
                        <div className="leading-relaxed">
                          <MathRenderer content={item.passage} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Statement */}
                  <div className="text-sm md:text-base font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    <MathRenderer content={item.text} />
                  </div>

                  {/* Question Image (if available) */}
                  {item.image && (
                    <div className="my-2">
                      <img
                        src={item.image}
                        alt="Question context"
                        className="max-h-72 rounded-lg border border-zinc-200 dark:border-zinc-700 object-contain bg-white"
                      />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-2 pt-1">
                    {item.options.map((opt, oIdx) => {
                      const isCorrect = String(opt.id) === String(item.correctOptionId) || String(oIdx + 1) === String(item.correctOptionId);
                      const isCandidateChoice = item.userAnswer ? String(opt.id) === String(item.userAnswer) : false;

                      let borderClass = 'border-zinc-200 dark:border-[#2f2f35] bg-white dark:bg-[#18181b] text-zinc-800 dark:text-zinc-200';
                      
                      if (isCorrect) {
                        borderClass = 'border-emerald-500 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/50';
                      } else if (isCandidateChoice && !isCorrect) {
                        borderClass = 'border-rose-400 dark:border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/40';
                      }

                      return (
                        <div
                          key={opt.id || oIdx}
                          className={`p-3 rounded-xl border flex items-start space-x-3 text-xs md:text-sm leading-relaxed transition-all ${borderClass}`}
                        >
                          <span className="font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                            ({opt.label || String.fromCharCode(65 + oIdx)})
                          </span>

                          <div className="flex-1">
                            <MathRenderer content={opt.text} />
                          </div>

                          {/* Badges for answer state */}
                          <div className="shrink-0 flex items-center space-x-1.5 text-xs">
                            {isCorrect && (
                              <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[11px] flex items-center space-x-1">
                                <CheckCircle2 size={12} />
                                <span>Correct Answer</span>
                              </span>
                            )}
                            {isCandidateChoice && !isCorrect && (
                              <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[11px] flex items-center space-x-1">
                                <XCircle size={12} />
                                <span>Your Choice</span>
                              </span>
                            )}
                            {isCandidateChoice && isCorrect && (
                              <span className="bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[11px]">
                                Your Choice ✓
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step-by-Step Explanation & Solution Box */}
                  {item.explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                      <div className="flex items-center space-x-1.5 text-blue-900 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                        <BookOpen size={14} />
                        <span>Step-by-Step Official Explanation &amp; Solution:</span>
                      </div>
                      <div className="text-xs md:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        <MathRenderer content={item.explanation} />
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <footer className="px-5 py-3 border-t border-zinc-200 dark:border-[#27272a] bg-zinc-50/80 dark:bg-[#1f1f23] flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span>Showing {filteredBookmarks.length} of {bookmarks.length} bookmarked question(s)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </footer>

      </div>
    </div>
  );
}
