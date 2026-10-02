/**
 * Dedicated Question Bookmark Storage & Sync Engine
 * CBT Exam Master 2026
 * 
 * Stores complete question statements, options, correct answers, explanations,
 * and candidate answers in a clean, standalone bookmarks JSON file.
 * Supports offline-first local persistence, export to JSON, and Google Drive sync.
 */

export interface BookmarkedQuestionOption {
  id: string;
  label?: string;
  text: string;
  image?: string | null;
}

export interface BookmarkedQuestion {
  bookmarkId: string; // Unique key: `${testId}_${questionId}`
  testId: string;
  testTitle: string;
  exam?: string;
  sectionId?: string;
  sectionName?: string;
  questionId: string;
  questionNumber?: number;
  text: string;
  image?: string | null;
  options: BookmarkedQuestionOption[];
  correctOptionId: string;
  correctOptionText?: string;
  userAnswer?: string | null;
  userAnswerText?: string | null;
  isCorrect?: boolean | null;
  explanation?: string;
  topic?: string;
  difficulty?: string;
  marks?: number;
  negativeMarks?: number;
  direction?: string | null;
  passage?: string | null;
  bookmarkedAt: number;
}

const STORAGE_KEY_BOOKMARKS = 'cbt_bookmarks_json';

// In-memory cache for ultra-fast lookups during examination
let memoryBookmarkCache: BookmarkedQuestion[] | null = null;

/**
 * Retrieves all bookmarked questions from localStorage / memory cache.
 */
export function getAllBookmarks(): BookmarkedQuestion[] {
  if (memoryBookmarkCache !== null) {
    return memoryBookmarkCache;
  }
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryBookmarkCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse bookmarks JSON from storage:', e);
  }

  memoryBookmarkCache = [];
  return [];
}

/**
 * Checks if a specific question is currently bookmarked.
 */
export function isQuestionBookmarked(testId: string, questionId: string): boolean {
  if (!testId || !questionId) return false;
  const bookmarks = getAllBookmarks();
  const targetId = `${testId}_${questionId}`;
  return bookmarks.some((b) => b.bookmarkId === targetId || (b.testId === testId && b.questionId === questionId));
}

/**
 * Returns a set of all bookmarked question IDs for a given test paper.
 */
export function getBookmarkedQuestionIdSet(testId: string): Set<string> {
  const bookmarks = getAllBookmarks();
  const set = new Set<string>();
  bookmarks.forEach((b) => {
    if (b.testId === testId) {
      set.add(b.questionId);
    }
  });
  return set;
}

/**
 * Persists the entire bookmarks collection to localStorage and dispatches a change event.
 */
function persistBookmarks(list: BookmarkedQuestion[]): void {
  memoryBookmarkCache = list;
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(list, null, 2));
    window.dispatchEvent(new Event('cbt_bookmarks_changed'));
  } catch (e) {
    console.error('Failed to write bookmarks JSON:', e);
  }
}

/**
 * Saves or updates a bookmarked question.
 */
export function saveBookmark(bookmark: BookmarkedQuestion): void {
  const current = getAllBookmarks();
  const existingIdx = current.findIndex((b) => b.bookmarkId === bookmark.bookmarkId);

  let updated: BookmarkedQuestion[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...current[existingIdx], ...bookmark };
  } else {
    updated = [bookmark, ...current];
  }

  persistBookmarks(updated);
}

/**
 * Removes a question from bookmarks.
 */
export function removeBookmark(testId: string, questionId: string): void {
  const targetId = `${testId}_${questionId}`;
  const current = getAllBookmarks();
  const updated = current.filter((b) => b.bookmarkId !== targetId && !(b.testId === testId && b.questionId === questionId));
  persistBookmarks(updated);
}

/**
 * Toggles bookmark status for a question.
 * Returns true if now bookmarked, false if removed.
 */
export function toggleQuestionBookmark(params: {
  testData: any;
  currentQ: any;
  currentSection?: any;
  currentQuestionIndex?: number;
  userAnswer?: string | null;
}): boolean {
  const { testData, currentQ, currentSection, currentQuestionIndex = 0, userAnswer = null } = params;
  if (!testData || !currentQ) return false;

  const testId = testData.manifestId || testData.testItemId || testData.testId || testData.id || 'test';
  const questionId = String(currentQ.id);
  const targetId = `${testId}_${questionId}`;

  const current = getAllBookmarks();
  const existingIdx = current.findIndex((b) => b.bookmarkId === targetId || (b.testId === testId && b.questionId === questionId));

  if (existingIdx >= 0) {
    // Remove existing bookmark
    const updated = current.filter((_, idx) => idx !== existingIdx);
    persistBookmarks(updated);
    return false;
  }

  // Extract correct option text and user answer text
  const options: BookmarkedQuestionOption[] = (currentQ.options || []).map((o: any, idx: number) => ({
    id: String(o.id ?? idx + 1),
    label: o.label || String(idx + 1),
    text: o.text || '',
    image: o.image || null,
  }));

  const correctOptionId = String(currentQ.correctOptionId || '1');
  const correctOptObj = options.find((o) => o.id === correctOptionId);
  const correctOptionText = correctOptObj ? correctOptObj.text : '';

  const userOptObj = userAnswer ? options.find((o) => o.id === String(userAnswer)) : null;
  const userAnswerText = userOptObj ? userOptObj.text : null;
  const isCorrect = userAnswer ? String(userAnswer) === correctOptionId : null;

  const newBookmark: BookmarkedQuestion = {
    bookmarkId: targetId,
    testId,
    testTitle: testData.title || testData.testTitle || 'Test Paper',
    exam: testData.exam || '',
    sectionId: currentSection?.id || '',
    sectionName: currentSection?.name || '',
    questionId,
    questionNumber: currentQ.questionNumber || currentQuestionIndex + 1,
    text: currentQ.text || '',
    image: currentQ.image || null,
    options,
    correctOptionId,
    correctOptionText,
    userAnswer: userAnswer || null,
    userAnswerText,
    isCorrect,
    explanation: currentQ.explanation || '',
    topic: currentQ.topic || '',
    difficulty: currentQ.difficulty || 'medium',
    marks: currentQ.marks || 1,
    negativeMarks: currentQ.negativeMarks || 0.25,
    direction: currentQ.direction || null,
    passage: currentQ.passage || null,
    bookmarkedAt: Date.now(),
  };

  persistBookmarks([newBookmark, ...current]);
  return true;
}

/**
 * Downloads the complete bookmark repository as a formatted JSON file.
 */
export function exportBookmarksAsJsonFile(): void {
  const bookmarks = getAllBookmarks();
  const jsonStr = JSON.stringify(bookmarks, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cbt_exam_bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clears all bookmarks.
 */
export function clearAllBookmarks(): void {
  persistBookmarks([]);
}

/**
 * Imports bookmarks from external JSON (merges non-conflicting by bookmarkId).
 */
export function importBookmarksFromJson(importedList: BookmarkedQuestion[]): number {
  if (!Array.isArray(importedList)) return 0;
  const current = getAllBookmarks();
  const map = new Map<string, BookmarkedQuestion>();

  // Add existing
  current.forEach((b) => map.set(b.bookmarkId, b));

  let addedCount = 0;
  for (const b of importedList) {
    if (b && b.bookmarkId && b.text) {
      if (!map.has(b.bookmarkId)) {
        map.set(b.bookmarkId, b);
        addedCount++;
      } else {
        const existing = map.get(b.bookmarkId)!;
        if (b.bookmarkedAt > existing.bookmarkedAt) {
          map.set(b.bookmarkId, b);
        }
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
  persistBookmarks(merged);
  return addedCount;
}
