/**
 * Robust Local Persistence & Crash Protection Store (IndexedDB + LocalStorage Fallback)
 * CBT Exam Master 2026
 * 
 * Manages:
 * 1. Historical completed exam attempt records (IndexedDB 'exam_attempts').
 * 2. Cached offline test paper bodies (IndexedDB 'offline_test_papers' - relieves 5MB localStorage quota).
 * 3. In-flight exam state snapshots for crash and refresh recovery (IndexedDB + LocalStorage).
 */

import { AttemptRecord } from './analyticsEngine';

const DB_NAME = 'CBTExamMasterAnalyticsDB';
const DB_VERSION = 2;
const STORE_ATTEMPTS = 'exam_attempts';
const STORE_PAPERS = 'offline_test_papers';
const STORE_SNAPSHOTS = 'in_flight_snapshots';

const LOCAL_STORAGE_KEY_ATTEMPTS = 'cbt_exam_attempts_backup';
const LOCAL_STORAGE_KEY_SNAPSHOT_PREFIX = 'cbt_in_flight_snapshot_';
const LOCAL_STORAGE_KEY_TOMBSTONES = 'cbt_deleted_tombstones';

/**
 * Returns all locally recorded tombstone attempt IDs (deleted attempts).
 */
export function getDeletedTombstones(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TOMBSTONES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Records a deleted attempt ID as a tombstone to prevent resurrection during sync.
 */
export function recordTombstone(attemptId: string): void {
  if (typeof window === 'undefined' || !attemptId) return;
  try {
    const list = getDeletedTombstones();
    if (!list.includes(attemptId)) {
      list.push(attemptId);
      localStorage.setItem(LOCAL_STORAGE_KEY_TOMBSTONES, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Merges multiple tombstone attempt IDs into local storage.
 */
export function recordTombstones(attemptIds: string[]): void {
  if (typeof window === 'undefined' || !attemptIds || attemptIds.length === 0) return;
  try {
    const existing = new Set(getDeletedTombstones());
    attemptIds.forEach((id) => existing.add(id));
    localStorage.setItem(LOCAL_STORAGE_KEY_TOMBSTONES, JSON.stringify(Array.from(existing)));
  } catch {}
}

export interface InFlightExamSnapshot {
  testId: string;
  rawId?: string;
  aliasIds?: string[];
  testTitle: string;
  startedAt: number;
  lastSavedAt: number;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  questionStatus: Record<string, string>;
  timeLeft: number;
  telemetryMap: Record<string, any>;
}

// In-memory fallback if storage is completely blocked
const memorySnapshotCache: Record<string, InFlightExamSnapshot> = {};

// IndexedDB Helper
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        const store = db.createObjectStore(STORE_ATTEMPTS, { keyPath: 'attemptId' });
        store.createIndex('testId', 'testId', { unique: false });
        store.createIndex('submittedAt', 'submittedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PAPERS)) {
        db.createObjectStore(STORE_PAPERS, { keyPath: 'testKey' });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'testId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clean up legacy offline paper blobs from localStorage to prevent quota starvation
if (typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cbt_offline_paper_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Saves a completed exam attempt record into IndexedDB and LocalStorage fallback.
 */
export async function saveCompletedAttempt(attempt: AttemptRecord): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const req = store.put(attempt);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful fallback to LocalStorage (trimming historical list to 25 items to conserve quota)
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS);
      const list: AttemptRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [attempt, ...list.filter(a => a.attemptId !== attempt.attemptId)];
      localStorage.setItem(LOCAL_STORAGE_KEY_ATTEMPTS, JSON.stringify(updated.slice(0, 25)));
    } catch (e) {
      console.error('Failed to save to localStorage fallback:', e);
    }
  }

  // Clear in-flight snapshot upon successful submission (including all aliases)
  clearInFlightSnapshot(attempt.testId, [attempt.rawId, ...(attempt.aliasIds || [])].filter(Boolean) as string[]);
}

/**
 * Retrieves all saved exam attempts, reconciling IndexedDB and LocalStorage fallback.
 * Automatically backfills missing fallback records and excludes tombstoned items.
 */
export async function getAllAttempts(): Promise<AttemptRecord[]> {
  const map = new Map<string, AttemptRecord>();
  const tombstones = new Set<string>(getDeletedTombstones());

  // 1. Read from IndexedDB
  try {
    const db = await openDatabase();
    const records = await new Promise<AttemptRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (records && records.length > 0) {
      for (const r of records) {
        if (!tombstones.has(r.attemptId)) {
          map.set(r.attemptId, r);
        }
      }
    }
  } catch {
    // Read from fallback
  }

  // 2. Read from LocalStorage fallback & backfill if needed
  const toBackfill: AttemptRecord[] = [];
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS);
    if (existingRaw) {
      const list: AttemptRecord[] = JSON.parse(existingRaw);
      for (const r of list) {
        if (!tombstones.has(r.attemptId) && !map.has(r.attemptId)) {
          map.set(r.attemptId, r);
          toBackfill.push(r);
        }
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage fallback:', e);
  }

  // 3. Asynchronously backfill missing fallback records into IndexedDB
  if (toBackfill.length > 0) {
    openDatabase().then((db) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
      const store = tx.objectStore(STORE_ATTEMPTS);
      toBackfill.forEach((a) => store.put(a));
    }).catch(() => {});
  }

  return Array.from(map.values()).sort((a, b) => b.submittedAt - a.submittedAt);
}

/**
 * Deletes a single attempt by attemptId from IndexedDB and LocalStorage fallback.
 */
export async function deleteAttempt(attemptId: string): Promise<void> {
  recordTombstone(attemptId);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const req = store.delete(attemptId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore and proceed to fallback
  }

  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS);
    if (existingRaw) {
      const list: AttemptRecord[] = JSON.parse(existingRaw);
      const filtered = list.filter(a => a.attemptId !== attemptId);
      localStorage.setItem(LOCAL_STORAGE_KEY_ATTEMPTS, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to delete attempt from localStorage fallback:', e);
  }
}

/**
 * Clears all attempts from IndexedDB and LocalStorage, recording tombstones to prevent sync resurrection.
 */
export async function clearAllAttempts(): Promise<void> {
  try {
    const all = await getAllAttempts();
    if (all && all.length > 0) {
      recordTombstones(all.map(a => a.attemptId));
    }
  } catch {}

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore and proceed to fallback
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_ATTEMPTS);
  } catch (e) {
    console.error('Failed to clear localStorage fallback:', e);
  }
}

/**
 * Retrieves a single attempt by its attempt ID.
 */
export async function getAttemptById(attemptId: string): Promise<AttemptRecord | null> {
  const all = await getAllAttempts();
  return all.find(a => a.attemptId === attemptId) || null;
}

/**
 * Retrieves past attempts for a specific test paper.
 */
export async function getAttemptsByTestId(testId: string): Promise<AttemptRecord[]> {
  const all = await getAllAttempts();
  return all.filter(a => a.testId === testId);
}

/**
 * In-Flight Crash Protection: Retrieves all active in-flight snapshots.
 */
export function getAllInFlightSnapshots(): Record<string, InFlightExamSnapshot> {
  if (typeof window === 'undefined') return {};
  const map: Record<string, InFlightExamSnapshot> = { ...memorySnapshotCache };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY_SNAPSHOT_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const snap: InFlightExamSnapshot = JSON.parse(raw);
            if (snap) {
              const testKey = key.replace(LOCAL_STORAGE_KEY_SNAPSHOT_PREFIX, '');
              if (testKey) map[testKey] = snap;
              if (snap.testId) map[snap.testId] = snap;
              if (snap.rawId) map[snap.rawId] = snap;
              if (Array.isArray(snap.aliasIds)) {
                snap.aliasIds.forEach((id) => {
                  if (id) map[id] = snap;
                });
              }
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('Could not read in-flight snapshots from localStorage:', e);
  }
  return map;
}

/**
 * Saves downloaded test paper into IndexedDB cache (relieves 5MB localStorage limit).
 */
export async function saveOfflineTestPaper(testKey: string, testData: any): Promise<void> {
  if (typeof window === 'undefined' || !testKey || !testData) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PAPERS, 'readwrite');
      const store = tx.objectStore(STORE_PAPERS);
      const req = store.put({ testKey, testData, savedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not save paper to IndexedDB cache:', e);
  }
}

/**
 * Retrieves cached test paper from IndexedDB.
 */
export async function getOfflineTestPaper(testKey: string): Promise<any | null> {
  if (typeof window === 'undefined' || !testKey) return null;
  try {
    const db = await openDatabase();
    return await new Promise<any | null>((resolve) => {
      const tx = db.transaction(STORE_PAPERS, 'readonly');
      const store = tx.objectStore(STORE_PAPERS);
      const req = store.get(testKey);
      req.onsuccess = () => resolve(req.result?.testData || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * In-Flight Crash Protection: Saves active exam state during the exam.
 * Stores in memory, localStorage, and IndexedDB asynchronously across all aliases.
 */
export function saveInFlightSnapshot(snapshot: InFlightExamSnapshot): void {
  if (typeof window === 'undefined' || !snapshot.testId) return;

  const allKeys = Array.from(new Set([snapshot.testId, snapshot.rawId, ...(snapshot.aliasIds || [])].filter(Boolean))) as string[];

  for (const id of allKeys) {
    memorySnapshotCache[id] = snapshot;
    try {
      const key = `${LOCAL_STORAGE_KEY_SNAPSHOT_PREFIX}${id}`;
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('LocalStorage snapshot write failed, relying on IndexedDB & memory:', e);
    }
  }

  // Also persist to IndexedDB asynchronously
  openDatabase().then((db) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    tx.objectStore(STORE_SNAPSHOTS).put(snapshot);
  }).catch(() => {});
}

/**
 * In-Flight Crash Protection: Retrieves saved active exam state if interrupted.
 */
export function getInFlightSnapshot(testId: string): InFlightExamSnapshot | null {
  if (typeof window === 'undefined' || !testId) return null;
  if (memorySnapshotCache[testId]) return memorySnapshotCache[testId];

  try {
    const key = `${LOCAL_STORAGE_KEY_SNAPSHOT_PREFIX}${testId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}

  return null;
}

/**
 * Clears saved in-flight snapshot upon exam completion or manual reset across all aliases.
 */
export function clearInFlightSnapshot(testId: string, aliasIds?: string[]): void {
  if (typeof window === 'undefined' || !testId) return;
  const allKeys = Array.from(new Set([testId, ...(aliasIds || [])].filter(Boolean))) as string[];

  for (const id of allKeys) {
    delete memorySnapshotCache[id];
    try {
      const key = `${LOCAL_STORAGE_KEY_SNAPSHOT_PREFIX}${id}`;
      localStorage.removeItem(key);
    } catch {}

    openDatabase().then((db) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      tx.objectStore(STORE_SNAPSHOTS).delete(id);
    }).catch(() => {});
  }
}
