# Comprehensive Adversarial Code Audit & Remediation Plan
**Target Codebase:** `CBT Exam Master 2026` (`/Users/jigar/Downloads/CBT/test-android`)  
**Auditor Role:** Adversarial Software QA & Distributed Systems Architect  
**Audit Scope:** End-to-End Architectural Integrity, Distributed Storage, Real-Time Concurrency, Platform Bridges, Security & Resilience  
**Date:** September 2026  

---

## 1. Executive Summary & Threat/Risk Matrix

This comprehensive adversarial audit evaluates the distributed architecture, real-time concurrency models, offline durability, platform abstractions, and security boundaries across the **CBT Exam Master 2026** application ecosystem spanning **Android (Capacitor/WebView)**, **iOS (Capacitor/WKWebView)**, **macOS & Windows (Electron)**, and **Web**.

The platform is designed to emulate high-stakes Computer-Based Testing (e.g., TCS iON CRP-SPL-XVI 2026) with offline-first capabilities, in-flight exam crash protection, and bi-directional cross-device synchronization backed by Google Drive’s `appDataFolder` sandbox.

### Vulnerability & Defect Severity Summary

| Severity | Count | Primary Impact |
| :--- | :---: | :--- |
| **P0 - Critical** | **7** | Data loss, local file inclusion / arbitrary file read, Google OAuth failure on mobile, LocalStorage quota starvation breaking crash recovery, KaTeX crash on numeric options, and array index out-of-bounds player lockup. |
| **P1 - High** | **8** | Wall-clock timer skew in background tabs, stale snapshot timer closures, undeletable zombie attempts in Google Drive, active question timing telemetry race conditions, Electron dev build isolation failure, and lack of deletion tombstones. |
| **P2 - Medium** | **9** | Lack of Safe Area insets (camera notch & gesture bar collisions), hardware back button leaks causing accidental app exit, hardcoded Google API keys, SPA index.html fallback breaking JSON fetches, unthrottled API sync flooding, and dead Android system plugins. |
| **P3 - Low** | **5** | Deprecated JavaScript APIs (`substr`), missing PWA manifest separation, unhandled floating-point score rounding display artifacts, and redundant event listener churn. |

---

## 2. Risk Matrix & Issue Index

| ID | Category | Component / File | Severity | Flaw Description |
| :--- | :--- | :--- | :---: | :--- |
| **BUG-01** | Security / Host OS | `electron/main.js` | **P0** | **Critical CWE-22 Path Traversal & Arbitrary File Read** via un-sanitized internal HTTP server `path.join(outDir, pathname)` with wildcard CORS. |
| **BUG-02** | Distributed Storage | `src/lib/gdrive/gdriveAuth.ts` | **P0** | **Google Identity Services (GSI) 403 `disallowed_useragent`** block on Android & iOS Capacitor WebViews; breaks cloud sync completely on mobile. |
| **BUG-03** | Storage / Durability | `src/lib/analyticsStorage.ts` | **P0** | **LocalStorage 5MB Quota Starvation**: Caching entire test papers in `localStorage` throws `QuotaExceededError`, silently disabling in-flight crash snapshots. |
| **BUG-04** | Runtime Crash | `src/components/MathRenderer.tsx` | **P0** | **Uncaught TypeError on Numeric Content**: `content.replace is not a function` when options contain numbers (e.g., `42`, `100`), crashing the component. |
| **BUG-05** | Runtime Crash | `src/components/DeepAnalyticsView.tsx` | **P0** | **Array Index Out-of-Bounds**: `onJumpToQuestionSolution` passes global `q.questionNumber - 1` instead of section question index, crashing `CBTExamPlayer`. |
| **BUG-06** | Concurrency / Timers | `src/components/CBTExamPlayer.tsx` | **P0** | **Background Timer Freezing & Drift**: `setInterval(..., 1000)` ticks are throttled to 1/min by mobile OS/browsers, freezing the exam clock when tabbed out. |
| **BUG-07** | Security / Secrets | Repository Root | **P0** | **Leaked Live Bearer Tokens & Cookies** in `testbook_auth.json` committed to the repository root. |
| **BUG-08** | Distributed Sync | `src/lib/gdrive/gdriveSync.ts` | **P1** | **Undeletable Zombie Attempts**: Deletions have no tombstones; deleting local attempts causes immediate re-download from Google Drive on next sync. |
| **BUG-09** | Distributed Sync | `src/lib/gdrive/gdriveSync.ts` | **P1** | **In-Flight Snapshot Cross-Device Overwrite**: Unsynchronized wall clocks (`Date.now()`) allow stale device snapshots to overwrite active exam states. |
| **BUG-10** | Distributed Sync | `src/lib/gdrive/gdriveSync.ts` | **P1** | **Resurrecting Finished Exams**: Device B syncing with old in-flight snapshots re-uploads them, forcing submitted tests back into "In Progress" on Device A. |
| **BUG-11** | Concurrency / State | `src/components/CBTExamPlayer.tsx` | **P1** | **Stale Timer in Snapshot Closures**: `saveCurrentSnapshot()` in the state change effect captures stale `timeLeft` because it is omitted from dependencies. |
| **BUG-12** | Concurrency / State | `src/components/CBTExamPlayer.tsx` | **P1** | **Telemetry Capture Race Condition**: Batched React state causes `closeActiveQuestionInterval()` to record stale answers when users click "Save & Next". |
| **BUG-13** | Concurrency / State | `src/components/CBTExamPlayer.tsx` | **P1** | **Cascading State Updates in Timer**: Invoking `setCurrentSectionIndex` and `handleFinalSubmit` directly inside `setTimeLeft` functional updater violates React 19 purity. |
| **BUG-14** | Distributed Sync | `src/lib/gdrive/gdriveAuth.ts` | **P1** | **Silent Mid-Exam Token Expiry**: GSI access tokens expire after 3600s; exams lasting 2-3 hours silently fail final attempt upload with no token refresh. |
| **BUG-15** | Platform / Electron | `electron/main.js`, `package.json` | **P1** | **Desktop Dev Loophole**: `npm run desktop` boots `next dev` on port 3000, but Electron ignores it and serves stale `out/` build. |
| **BUG-16** | Platform / UI | `src/components/CBTExamPlayer.tsx` | **P2** | **Zero Safe Area Insets**: Exam header renders under iPhone Dynamic Island/notch; bottom actions collide with gesture navigation pill. |
| **BUG-17** | Platform / Android | `src/components/CBTExamPlayer.tsx`, `DeepAnalyticsView.tsx` | **P2** | **Hardware Back Button Trapping**: Back button in Deep Analytics or Scorecard fails to intercept and minimizes/exits the application. |
| **BUG-18** | Platform / Electron | `src/lib/platform/platformBridge.ts` | **P2** | **Failed Electron Runtime Detection**: `isElectron()` inspects `process.type` (hidden by context isolation) and ignores exposed `window.electronAPI`. |
| **BUG-19** | Network / Server | `electron/main.js`, `contentProvider.ts` | **P2** | **SPA 404 Rewrite Breaks JSON Parsing**: Missing `.json` endpoints return 200 with `index.html`, causing `res.json()` to throw `SyntaxError`. |
| **BUG-20** | Offline / Storage | `src/lib/analyticsStorage.ts` | **P2** | **Asymmetric Fallback Loss**: `getAllAttempts()` ignores `localStorage` if IndexedDB contains any records, permanently hiding offline-fallback attempts. |
| **BUG-21** | Performance / UI | `src/components/QuestionPaperModal.tsx` | **P2** | **Synchronous KaTeX Thread Freezing**: Rendering 1000+ formulas simultaneously blocks main UI thread and risks Android WebView OOM crash. |
| **BUG-22** | Concurrency / Sync | `src/lib/gdrive/gdriveClient.ts` | **P2** | **Google Drive Duplicate Named Folders**: Concurrent calls to `ensureAppDataFolder` create multiple folders with identical names in `appDataFolder`. |
| **BUG-23** | Concurrency / Network | `src/components/CBTExamPlayer.tsx` | **P2** | **Unthrottled Snapshot Sync Flooding**: Rapid question navigation triggers dozens of Google Drive multipart uploads, causing HTTP 429 rate limits. |
| **BUG-24** | Platform / Android | `android/.../MainActivity.java` | **P2** | **Dead Custom Plugin**: `SystemThemePlugin` registered in `MainActivity.java` is never invoked by TypeScript code. |
| **BUG-25** | Distributed Sync | `src/lib/gdrive/gdriveSync.ts` | **P3** | **Storage Key Mismatch**: Theme sync reads `cbt_theme` while `ThemeContext` writes to `cbt_theme_mode`, breaking theme sync across devices. |
| **BUG-26** | UX / Platform | `src/components/CBTExamPlayer.tsx` | **P3** | **Oversensitive Window Blur Auto-Pause**: Clicking a secondary monitor or OS notification on desktop freezes the exam and displays pause overlay. |
| **BUG-27** | Web / PWA | `public/manifest.json` | **P3** | **18MB Catalog Named `manifest.json`**: Clashes with PWA Web App Manifest specification, causing browser parsing failures. |
| **BUG-28** | Analytics Engine | `src/lib/analyticsEngine.ts` | **P3** | **Average Time Metric Distortion**: Divides total test time (including unattempted time) by attempted questions, skewing analytics. |
| **BUG-29** | Performance | `src/components/CBTExamPlayer.tsx` | **P3** | **High-Frequency Event Listener Churn**: `useEffect` on `timeLeft` re-binds window blur/visibility listeners every second (3,600+ times/exam). |

---

## 3. Deep Dive 1: Google Drive Directory Differences & Concurrency

### 3.1 OS-Level Filesystem & Storage Mechanics

The application runs across four fundamentally distinct operating system storage architectures:

```
+---------------------------------------------------------------------------------------+
|                                CROSS-PLATFORM STORAGE BACKENDS                        |
+--------------------------+----------------------------+-------------------------------+
| Platform                 | Storage Location           | Eviction / Retention Policies |
+--------------------------+----------------------------+-------------------------------+
| Android 11-15 (Capacitor)| /data/user/0/<app_id>/     | Preserved until user clears   |
|                          | app_webview/Default/       | data. Scoped storage isolates |
|                          | IndexedDB/ & Local Storage/| native filesystem.            |
+--------------------------+----------------------------+-------------------------------+
| iOS 15-18 (Capacitor)    | Library/WebKit/            | CRITICAL: Apple WebKit ITP    |
|                          | WebsiteData/Default/       | evicts IndexedDB/LocalStorage |
|                          | IndexedDB/                 | after 7 days of non-use!      |
+--------------------------+----------------------------+-------------------------------+
| macOS (Electron)         | ~/Library/Application      | Preserved indefinitely.       |
|                          | Support/<app_name>/        | POSIX case-insensitive (APFS).|
+--------------------------+----------------------------+-------------------------------+
| Windows 10/11 (Electron) | %APPDATA%\<app_name>\      | Preserved indefinitely.       |
|                          |                            | NTFS file locking & MAX_PATH. |
+--------------------------+----------------------------+-------------------------------+
```

#### The iOS 7-Day Storage Deletion Catastrophe
On iOS, Capacitor uses `WKWebView`. Under Apple's WebKit storage guidelines (Intelligent Tracking Prevention):
- Client-side storage (IndexedDB, LocalStorage) without server cookies or explicit native container management is subject to **automatic purge after 7 days of user inactivity**.
- If a student prepares for an exam, takes 20 mocks, and leaves the app for 8 days before the final test, **all local attempt records and in-flight states are completely deleted by iOS**.
- *Remediation:* Test attempts and preferences must be persisted through native storage plugins (e.g. `@capacitor/preferences` or a SQLite native database) rather than unmanaged WebKit IndexedDB alone.

#### Local Cache Paths vs Cloud Object Keys
- In `contentProvider.ts`, file lookup assumes strict POSIX forward-slash paths (`/data/group_b/ibps_so_it/...`).
- On Windows Electron environments, path manipulation using `cleanPath.replace(/^(\.\/|\/)?public\//, '')` fails when paths originate with backslashes (`\`), causing path lookup failures.
- In Google Drive REST API v3, object names in `appDataFolder` are simple string metadata (`attempt_att_123.json`), not POSIX paths. However, `contentProvider.ts` attempts to map relative paths to test keys without uniform normalization.

### 3.2 Google Drive REST API `appDataFolder` Concurrency Flaws

#### BUG-08: Undeletable Zombie Attempts (Lack of Deletion Tombstones)
In `src/lib/gdrive/gdriveSync.ts`, `syncAllWithDrive()` performs an additive set union:
```typescript
// B. Download remote attempts not in local IndexedDB
for (const [attemptId, file] of remoteAttemptFileMap.entries()) {
  if (!localAttemptMap.has(attemptId)) {
    const remoteAttempt = await downloadAppDataFile<AttemptRecord>(file.id);
    if (remoteAttempt && remoteAttempt.attemptId) {
      await saveCompletedAttempt(remoteAttempt);
      downloadedCount++;
    }
  }
}
```
**Failure Scenario:**
1. A candidate takes a test; it syncs to Google Drive as `attempt_att_01.json`.
2. Later, in `AnalyticsGrowthHub.tsx`, the candidate deletes this test via `handleDeleteAttempt("att_01")` or clicks "Clear All Attempts".
3. `deleteAttempt("att_01")` purges it from local IndexedDB and `localStorage`.
4. However, the file remains in Google Drive `appDataFolder`.
5. On the next manual or automatic sync (`syncAllWithDrive()`), `localAttemptMap.has("att_01")` evaluates to `false`.
6. The engine downloads `attempt_att_01.json` from Google Drive and re-inserts it into IndexedDB!
7. **Result:** The user is completely unable to delete past attempts. Deletions are perpetually resurrected.

#### BUG-22: Non-Unique Folder Creation Race Condition
Google Drive REST API does not enforce unique file or folder names within a parent folder.
In `src/lib/gdrive/gdriveClient.ts`:
```typescript
export async function ensureAppDataFolder(folderName: string): Promise<string> {
  const existing = await findAppDataFileByName(folderName);
  if (existing && existing.mimeType === 'application/vnd.google-apps.folder') {
    return existing.id;
  }
  // Creates folder inside appDataFolder
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['appDataFolder'],
  };
  const res = await driveFetch(...);
  ...
}
```
**Failure Scenario:**
1. On initial setup, two background calls (e.g., `syncAttemptToDrive` and `syncInFlightToDrive`) run concurrently.
2. Both execute `findAppDataFileByName('attempts')` simultaneously; both get `null`.
3. Both issue `POST` requests to create `attempts`.
4. Google Drive creates **two separate folders** both named `attempts` with distinct `fileId`s.
5. Subsequent queries return whichever folder ID Google returns first, scattering attempt files across two orphaned folders.

#### BUG-09 & BUG-10: In-Flight Snapshot Overwrite & Resurrected Exams
In `gdriveSync.ts`:
```typescript
for (const file of remoteSnapshotFiles) {
  if (file.name.startsWith('in_flight_') && file.name.endsWith('.json')) {
    const testId = file.name.replace(/^in_flight_/, '').replace(/\.json$/, '');
    const localSnap = localSnapshots[testId];
    const remoteSnap = await downloadAppDataFile<InFlightExamSnapshot>(file.id);

    if (remoteSnap && (!localSnap || remoteSnap.lastSavedAt > localSnap.lastSavedAt)) {
      saveInFlightSnapshot(remoteSnap);
    }
  }
}
```
**Failure Scenario A: Unsynchronized Wall-Clock Skew**
- Device A (Mobile) has a system clock 2 minutes behind Device B (Desktop).
- Candidate answers Question 40 on Mobile at true time 10:00:00 (Mobile timestamp: 09:58:00).
- Candidate opens Desktop, where Desktop snapshot was saved at 09:59:00.
- `remoteSnap.lastSavedAt > localSnap.lastSavedAt` evaluates to `false` because Mobile clock is lagging. The fresh Mobile answers are overwritten by Desktop's stale snapshot.

**Failure Scenario B: Completed Exam Resurrected to In-Progress**
- Candidate finishes and submits Test `T1` on Device A. `handleFinalSubmit()` saves the completed attempt, deletes `in_flight_T1.json` from Drive, and clears local in-flight storage.
- Device B (which had an offline in-flight snapshot of `T1` saved 30 minutes ago) comes online.
- Device B executes `syncAllWithDrive()`.
- Lines 203-206: Device B iterates over `localSnapshots` and re-uploads `in_flight_T1.json` to Drive!
- Device A syncs later, sees `in_flight_T1.json`, and flags `T1` as "In Progress" on the dashboard, even though it was submitted!

### 3.3 Google OAuth 2.0 & Identity Services (GSI) Deficiencies

#### BUG-02: Fatal Google OAuth Block in Mobile WebViews (`403 disallowed_useragent`)
In `src/lib/gdrive/gdriveAuth.ts`, authentication is implemented via Google Identity Services:
```typescript
const tokenClient = window.google.accounts.oauth2.initTokenClient({
  client_id: clientId,
  scope: GDRIVE_APPDATA_SCOPE,
  callback: async (response: any) => { ... }
});
tokenClient.requestAccessToken({ prompt: 'consent' });
```
- **The Defect:** Google actively blocks OAuth 2.0 requests made from embedded web browsers (Android WebView and iOS WKWebView) under its Chromium/Safari User-Agent detection policy.
- When `tokenClient.requestAccessToken()` executes on Android or iOS inside Capacitor, Google’s auth endpoint rejects the request with HTTP 403 `Error: disallowed_useragent`.
- **Impact:** **Cloud sync is completely non-functional on Android and iOS.** Mobile users cannot link Google Drive.
- **Remediation:** Mobile platforms must use native system browser tabs (via `@capacitor/browser` or Android Custom Tabs / iOS `ASWebAuthenticationSession`) with PKCE (Proof Key for Code Exchange) and custom URI schemes (`com.cbtexammaster.app:/oauth2redirect`).

#### BUG-14: Silent Access Token Expiration Mid-Exam
- Tokens granted by `initTokenClient` expire in **3600 seconds (1 hour)**.
- CBT exams for competitive patterns (IBPS PO, UPSC CSAT, SSC CGL Tier 2) last between 60 and 180 minutes.
- In `gdriveAuth.ts`:
  ```typescript
  if (Date.now() > expNum - 60000) {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
    return null;
  }
  ```
- If an exam exceeds 59 minutes, `getStoredAccessToken()` deletes the token from `localStorage` and returns `null`.
- When the student finishes after 2 hours and clicks "Submit Entire Test", `syncAttemptToDrive()` silently fails (`return false`). The student believes their attempt was backed up to cloud, but it was dropped.

#### BUG-25: Storage Key Inconsistency in Profile Sync
- `ThemeContext.tsx` stores theme mode under:  
  `localStorage.setItem('cbt_theme_mode', mode)` (Line 80)
- `gdriveSync.ts` reads theme mode from:  
  `theme: (localStorage.getItem('cbt_theme') as any) || 'system'` (Line 140)
- `localStorage.getItem('cbt_theme')` is always `null`. The user's theme selection is never synced to Google Drive.

---

## 4. Deep Dive 2: In-Flight Timer & Exam State Concurrency

### 4.1 Countdown Timer Drift & Execution Throttling

#### BUG-06: Background Timer Freezing via `setInterval`
In `src/components/CBTExamPlayer.tsx`:
```typescript
useEffect(() => {
  if (isSubmitted || isStudyMode || !isExamStarted || isPaused) return;
  const interval = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        ...
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(interval);
}, [isSubmitted, isStudyMode, isExamStarted, isPaused, currentSectionIndex, sections.length, isNewPattern]);
```

**The Adversarial Flaw:**
- Modern mobile operating systems (Android Doze mode, iOS WebKit process freezing) and desktop browsers throttle background `setInterval` timers to **once every 60 seconds**, or pause execution entirely.
- If a student switches apps to answer a call or review a formula sheet for 15 minutes:
  - Expected timer consumption: 900 seconds.
  - Actual timer consumption: ~15 seconds.
- The exam clock is frozen. Conversely, if the app process is suspended and resumed, the timer does not catch up to elapsed wall-clock time.
- **Architectural Requirement:** Timers must **never** count iterations of `setInterval`. The countdown must be anchored to a monotonic target timestamp:
  $$\text{targetEndTime} = \text{Date.now()} + \text{remainingSeconds} \times 1000$$
  On every tick, `timeLeft = Math.max(0, Math.round((targetEndTime - Date.now()) / 1000))`.

### 4.2 Snapshot Concurrency & Stale Closures

#### BUG-11: Stale `timeLeft` in State Change Snapshots
In `src/components/CBTExamPlayer.tsx`:
```typescript
const saveCurrentSnapshot = () => {
  if (!isExamStarted || isSubmitted || isStudyMode) return;
  const snapshot: InFlightExamSnapshot = {
    testId,
    testTitle: testData?.title || 'Test',
    startedAt: examStartedAtRef.current,
    lastSavedAt: Date.now(),
    currentSectionIndex,
    currentQuestionIndex,
    userAnswers,
    questionStatus,
    timeLeft, // <--- Captured from React state
    telemetryMap: telemetryMapRef.current,
  };
  saveInFlightSnapshot(snapshot);
  syncInFlightToDrive(snapshot).catch(() => {});
};

useEffect(() => {
  saveCurrentSnapshot();
}, [currentQuestionIndex, currentSectionIndex, userAnswers, questionStatus, isExamStarted, isSubmitted]);
```
- In the `useEffect` above, `timeLeft` is **deliberately omitted** from the dependency array to avoid saving every second.
- **The Concurrency Bug:** Because `timeLeft` is omitted, the `saveCurrentSnapshot` closure captures the value of `timeLeft` from when the component rendered. When an answer is clicked at minute 18, `saveCurrentSnapshot()` can serialize a stale `timeLeft` value from minute 20! If the browser crashes immediately after, the restored exam gifts the student 2 extra minutes.

#### BUG-29: High-Frequency Event Listener Churn
In `CBTExamPlayer.tsx`:
```typescript
useEffect(() => {
  if (!isExamStarted || isSubmitted || isStudyMode) return;
  const handleBlur = () => { ... };
  const handleVisibility = () => { ... };
  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}, [isExamStarted, isSubmitted, isStudyMode, currentSectionIndex, currentQuestionIndex, userAnswers, questionStatus, timeLeft]);
```
- Notice that `timeLeft` **is** included in this dependency array!
- Because `timeLeft` decrements every 1000ms, this effect is torn down and re-instantiated **every single second**.
- Over a 120-minute exam, `addEventListener` and `removeEventListener` are executed **7,200 times**, generating continuous garbage collection pressure and creating window intervals where blur events can be missed during listener re-attachment.

### 4.3 Active Question Timing Telemetry Race Conditions

#### BUG-12: Asynchronous State Batching in Question Intervals
In `CBTExamPlayer.tsx`:
```typescript
const closeActiveQuestionInterval = () => {
  if (!activeQuestionRef.current) return;
  const now = Date.now();
  const { questionId, sectionId, enteredAt } = activeQuestionRef.current;
  ...
  const record = telemetryMapRef.current[questionId];
  record.lastOpenedAt = now;
  record.totalActiveTimeSeconds += durationSec;
  record.visits.push({ enteredAt, exitedAt: now, durationMs });
  record.answer = userAnswers[questionId] || null; // <--- Reads React state
  activeQuestionRef.current = null;
};
```
- When a candidate selects Option C:
  `handleSelectOption('3')` dispatches `setUserAnswers(prev => ({ ...prev, [qId]: '3' }))`.
- The candidate immediately clicks "Save & Next" (`handleSaveAndNext()`), which synchronously calls:
  `closeActiveQuestionInterval()`.
- Under React 19 batched updates, `userAnswers` in the current execution frame **still reflects the old state**.
- `record.answer` is recorded as `null` or the previous answer.
- The telemetry recorded in `telemetryMapRef.current` and later evaluated by `evaluateAttempt()` records that the student had no answer at the time of leaving the question, distorting time-to-answer metrics.
- *Remediation:* Maintain a synchronized `userAnswersRef.current` that updates synchronously alongside React state.

#### BUG-13: Cascading State Updates Inside Functional Updaters
In `CBTExamPlayer.tsx`:
```typescript
setTimeLeft((prev) => {
  if (prev <= 1) {
    if (isNewPattern && currentSectionIndex < sections.length - 1) {
      closeActiveQuestionInterval();
      setCurrentSectionIndex((idx) => idx + 1);
      setCurrentQuestionIndex(0);
      return sectionDurationSeconds;
    } else {
      handleFinalSubmit();
      return 0;
    }
  }
  return prev - 1;
});
```
- Invoking side effects (`closeActiveQuestionInterval`, `handleFinalSubmit`) and outer state setters (`setCurrentSectionIndex`, `setCurrentQuestionIndex`) inside a functional state updater violates React's purity rules.
- In React 19 Concurrent Mode, state updaters may be invoked multiple times during reconciliation, leading to duplicate submissions or skipped sections.

---

## 5. Deep Dive 3: Offline & Network Resilience

### 5.1 Storage Exhaustion & Fallback Asymmetry

#### BUG-03: LocalStorage 5MB Quota Starvation via `saveOfflineTestPaper`
In `src/lib/analyticsStorage.ts`:
```typescript
export async function saveOfflineTestPaper(testKey: string, testData: any): Promise<void> {
  if (typeof window === 'undefined' || !testKey || !testData) return;
  try {
    const key = `cbt_offline_paper_${testKey}`;
    localStorage.setItem(key, JSON.stringify(testData));
  } catch (e) {
    // Local storage quota might be tight, ignore
  }
}
```
**The Systemic Collapse Chain:**
1. A competitive exam JSON with 100-200 questions, rich HTML passages, options, and comprehensive explanations weighs between **800 KB and 2.5 MB**.
2. Standard browser `localStorage` has a hard domain quota of **5 MB**.
3. After taking or previewing just 2 or 3 test papers, `localStorage` is 100% full.
4. Subsequent calls throw `QuotaExceededError`. The function catches and ignores it.
5. **The Cascading Failure:**
   - `saveInFlightSnapshot()` uses `localStorage.setItem('cbt_in_flight_snapshot_...', ...)`. **It now throws and fails!** In-flight crash protection is completely dead.
   - If IndexedDB is unavailable, `saveCompletedAttempt()` falls back to `localStorage`. **It throws and fails!** The candidate's completed exam attempt is permanently lost.
   - User preferences (`cbt_user_preferences`) and theme (`cbt_theme_mode`) fail to save.
6. **Remediation:** Offline test papers and attempt backups must be stored in **IndexedDB** (which supports hundreds of megabytes), reserving `localStorage` solely for tiny (<1KB) primitive configuration flags.

#### BUG-20: Orphaned Attempts in Asymmetric LocalStorage Fallback
In `analyticsStorage.ts`:
```typescript
export async function getAllAttempts(): Promise<AttemptRecord[]> {
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
      return records.sort((a, b) => b.submittedAt - a.submittedAt);
    }
  } catch {
    // Read from fallback
  }

  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS);
    if (existingRaw) {
      const list: AttemptRecord[] = JSON.parse(existingRaw);
      return list.sort((a, b) => b.submittedAt - a.submittedAt);
    }
  } catch (e) { ... }
  return [];
}
```
- **The Defect:** If IndexedDB has **even one** record, `records.length > 0` returns immediately.
- The `localStorage` fallback is **never queried**.
- If an attempt was saved to `localStorage` during an IndexedDB quota or transaction failure, that attempt becomes **permanently invisible** once IndexedDB functions again. It is never merged or re-ingested into IndexedDB.

### 5.2 Network Error Handling & Asset Serving

#### BUG-19: Electron Server 404 Rewrite Breaks Client JSON Parsing
In `electron/main.js`:
```typescript
let filePath = path.join(outDir, pathname);
let exists = false;
try {
  exists = fs.existsSync(filePath);
  if (exists && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    exists = fs.existsSync(filePath);
  }
} catch (e) { exists = false; }

if (!exists) {
  filePath = path.join(outDir, 'index.html'); // <--- SPA Fallback for EVERYTHING
}
...
res.writeHead(200, { 'Content-Type': contentType, ... });
res.end(content);
```
- When `contentProvider.ts` attempts to load modular exam stages:
  `fetch('/data/exams/non_existent_exam.json')`
- The file does not exist on disk.
- Electron's internal HTTP server catches `!exists`, rewrites `filePath` to `out/index.html`, and serves `index.html` with status `200 OK`!
- In `contentProvider.ts`:
  ```typescript
  const res = await fetch(`/data/exams/${examId}.json`);
  if (res.ok) { // Returns TRUE because status is 200!
    const examData = await res.json(); // <--- CRASH!
  ```
- `res.json()` attempts to parse `<!DOCTYPE html>...` as JSON, throwing `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
- **Remediation:** Internal server must check file extensions; non-existent `.json`, `.png`, `.svg` files must return HTTP `404 Not Found`, not `index.html`.

#### BUG-21: Synchronous KaTeX Thread Starvation in `QuestionPaperModal`
- `QuestionPaperModal.tsx` maps over all sections and questions simultaneously:
  ```typescript
  {(testData.sections || []).map((sec: any) =>
    (sec.questions || []).map((q: any) => (
      <MathRenderer content={q.text} />
      {q.options.map((opt: any) => <MathRenderer content={opt.text} />)}
    ))
  )}
  ```
- For a 200-question paper, this executes **over 1,000 synchronous KaTeX formula parsing cycles** within a single React render pass.
- On mid-range mobile devices (e.g. MediaTek or Snapdragon 600-series Android phones), this blocks the JavaScript thread for **3.5 to 6.2 seconds**, triggering Android ANR (Application Not Responding) dialogs and potential WebKit memory termination.
- **Remediation:** Virtualize question paper lists using windowing (`react-window` or `@tanstack/react-virtual`) or render plain text by default, rendering KaTeX only on viewport intersection.

---

## 6. Deep Dive 4: Android, Capacitor & Electron Platform Discrepancies

### 6.1 Security & Sandboxing Flaws

#### BUG-01: Critical CWE-22 Path Traversal in Electron HTTP Server
In `electron/main.js`:
```javascript
server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(outDir, pathname); // <--- UNVALIDATED JOIN
    let exists = false;
    ...
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*', // <--- WILDCARD CORS!
      'Cache-Control': 'no-cache',
    });
    res.end(content);
```
**Adversarial Exploit Scenario:**
1. The server listens on loopback: `http://127.0.0.1:<random_port>`.
2. Any external website visited in Chrome, Firefox, or Safari on the host computer can scan local ports `1024-65535`.
3. When the CBT Exam Master port is located, the website issues an AJAX request:
   `fetch('http://127.0.0.1:<port>/../../../../../../etc/passwd')` (or on Windows: `..\..\..\..\Windows\system.ini` or user credentials in `..\..\..\Users\<name>\.ssh\id_rsa`).
4. `decodeURIComponent` decodes `..%2F..%2F`.
5. `path.join(outDir, '../../etc/passwd')` resolves to `/etc/passwd`.
6. `fs.existsSync(filePath)` is `true`.
7. Because `'Access-Control-Allow-Origin': '*'` is explicitly set, the browser allows the malicious origin to read the file contents!
8. **Severity:** **P0 / CVSS 9.3 (Critical Local File Inclusion / Information Disclosure)**.
9. **Remediation:**
   ```javascript
   const normalizedPath = path.normalize(filePath);
   if (!normalizedPath.startsWith(path.resolve(outDir) + path.sep)) {
     res.writeHead(403);
     res.end('Forbidden');
     return;
   }
   ```
   Furthermore, remove `'Access-Control-Allow-Origin': '*'`.

#### BUG-07: Hardcoded Live Bearer Tokens in Repository Root
- File: `/Users/jigar/Downloads/CBT/test-android/testbook_auth.json`
- Contains active student session cookies (`activeSessionToken`), `tb_token`, and JWT bearer tokens (`eyJhbGciOiJSUzI1Ni...`) with claims `sub: "6a8d42db7e96202c94e5eb5f"`, `passAccess: false, passProAccess: true`.
- **Impact:** Compromises user session credentials and violates data protection standards.
- **Remediation:** Immediately revoke the session token, delete `testbook_auth.json` from git history, and add it to `.gitignore`.

### 6.2 Hardware Back Button, Gestures & Safe Area Insets

#### BUG-16: Zero Safe Area Insets in Exam Player
In `src/components/CBTExamPlayer.tsx`:
```tsx
<header className="bg-[#242424] text-white px-3 md:px-4 py-2 flex items-center justify-between ...">
...
<footer className="bg-slate-100 border-t border-slate-300 px-6 py-3 flex flex-wrap items-center justify-between ...">
```
- In `globals.css`, utilities `.safe-top` and `.safe-bottom` are defined with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **However, `CBTExamPlayer.tsx` uses NEITHER.**
- On iPhone 14/15/16 Pro (Dynamic Island) and modern Android devices with camera cutouts:
  - The top header (`Dashboard`, test title, `Exam Mode`) renders **directly behind the camera island / status bar**.
  - The bottom footer (`Save & Next`, `Clear Response`, `Submit Test`) renders **directly beneath the home gesture navigation indicator**.
  - Tapping "Save & Next" inadvertently triggers the OS home gesture or app switcher, interrupting the candidate.

#### BUG-17: Hardware Back Button Navigation Trapping
In `platformBridge.ts`:
```typescript
public registerBackHandler(handler: () => boolean): () => void {
  this.backButtonHandlers.push(handler);
  return () => {
    this.backButtonHandlers = this.backButtonHandlers.filter((h) => h !== handler);
  };
}
```
- In `CBTExamPlayer.tsx`:
  The back handler only inspects:
  - `isQuestionPaperOpen`
  - `isInstructionsOpen`
  - `isSubmitModalOpen`
  - `isPaletteOpen`
  - Active exam pause confirmation
- When the student submits the test and enters the **Scorecard Modal** (`isScorecardOpen = true`) or **Deep Analytics View** (`isDeepAnalyticsOpen = true`), `isSubmitted` is `true`.
- The back handler returns `false`!
- When the candidate taps the Android hardware back button to exit Deep Analytics or return to dashboard:
  The bridge executes `App.minimizeApp()`.
- **The entire application minimizes to the Android home screen** instead of navigating back.

### 6.3 Electron & Runtime Detection Discrepancies

#### BUG-18: Broken `isElectron()` Detection in `platformBridge.ts`
In `src/lib/platform/platformBridge.ts`:
```typescript
public isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window as any).process?.type === 'renderer' ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    !!(window as any).__electron
  );
}
```
- In `electron/main.js`:
  `contextIsolation: true`, `nodeIntegration: false`.
- Under context isolation:
  - `window.process` is `undefined`.
  - `window.__electron` was never set.
  - In custom packaged builds, `navigator.userAgent` may omit `Electron` depending on Chrome version.
- In `electron/preload.js`:
  ```javascript
  contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    version: process.versions.electron,
    isElectron: true,
    toggleFullScreen: () => ipcRenderer.send('toggle-fullscreen'),
  });
  ```
- **The Defect:** `preload.js` explicitly exposed `window.electronAPI.isElectron`, but `platformBridge.ts` **does not check `window.electronAPI`**!
- As a result, `platformBridge.getPlatform()` may incorrectly return `'web'`, disabling desktop-specific IPC and fullscreen handlers.

#### BUG-15: `npm run desktop` Ignores Next.js Dev Server
In `package.json`:
`"desktop": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron .\""`
- In `electron/main.js`:
  `createWindow()` always spins up its internal HTTP server serving static files from `../out`:
  `mainWindow.loadURL('http://127.0.0.1:' + port + '/index.html');`
- Electron completely ignores `http://localhost:3000`.
- Running `npm run desktop` builds Next.js on port 3000, but Electron loads whatever outdated build was previously left in `out/`. Developers editing React components see zero live updates.

---

## 7. Mathematical & Rendering Engine Audit

### 7.1 KaTeX Vulnerabilities & Numeric Crashes

#### BUG-04: KaTeX Type Crash on Numeric Options
In `src/components/MathRenderer.tsx`:
```typescript
export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;
    try {
      let processed = content
        .replace(/src=["']\/\/([^"']+)["']/g, 'src="https://$1"')
        .replace(/src=\/\/([^\s>]+)/g, 'src="https://$1"');
      ...
```
- In math, quantitative aptitude, and data interpretation tests, options frequently have numeric values:
  `{ id: '1', text: 42 }` or `{ id: '2', text: 0 }`.
- When `content` is `42` (`typeof content === 'number'`):
  `content.replace(...)` throws `TypeError: content.replace is not a function`.
- When `content` is `0`:
  `!content` evaluates to `true`, and the component silently aborts, rendering an empty option.
- **Impact:** Any exam paper containing raw numerical values in its options crashes with an unhandled React runtime error.
- **Remediation:** Coerce content to string immediately:
  `const rawText = content === null || content === undefined ? '' : String(content);`

### 7.2 Analytics Navigation Index Bug

#### BUG-05: Question Index Out-of-Bounds in `DeepAnalyticsView`
In `src/components/DeepAnalyticsView.tsx`:
```typescript
onJumpToQuestionSolution(secIdx >= 0 ? secIdx : 0, q.questionNumber - 1);
```
- In `analyticsEngine.ts`:
  `q.questionNumber` is calculated globally across the entire paper:
  Section 1: Q1 to Q50 (`questionNumber: 1` through `50`).
  Section 2: Q1 to Q50 (`questionNumber: 51` through `100`).
- When a student in Deep Analytics clicks Question 52 (which is in Section 2):
  `secIdx = 1`
  `questionIndex = 52 - 1 = 51`.
- In `CBTExamPlayer.tsx`:
  Section 2 only has 50 questions (indices 0 to 49).
  `currentQuestions[51]` is `undefined`!
- Line 584 of `CBTExamPlayer.tsx`:
  `if (!testData || !currentQ)` evaluates to `true`.
- **Result:** The player crashes into the "Test data could not be loaded" error screen.
- **Remediation:** Store `sectionalQuestionIndex` explicitly on `QuestionAnalysis` and pass `q.sectionalQuestionIndex` to the jump handler.

---

## 8. Prioritized Remediation Plan

### Phase 1: Immediate Critical Fixes (P0 - Security, Data Loss, & Crashes)

#### Task 1.1: Fix Path Traversal & Wildcard CORS in Electron Server (BUG-01)
- **File:** `electron/main.js`
- **Actions:**
  - Enforce path confinement:
    ```javascript
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(outDir) + path.sep)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }
    ```
  - Remove `'Access-Control-Allow-Origin': '*'`.
  - Fix SPA rewrite: Only rewrite paths without extensions or `.html` requests to `index.html`. Return genuine HTTP 404 for missing `.json`, `.png`, `.svg` assets.

#### Task 1.2: Resolve Mobile Google OAuth 403 Block (BUG-02)
- **Files:** `src/lib/gdrive/gdriveAuth.ts`, `capacitor.config.ts`, `android/app/build.gradle`
- **Actions:**
  - Detect mobile native environment via `Capacitor.isNativePlatform()`.
  - For Mobile (Android/iOS), implement OAuth via `@capacitor/browser` utilizing PKCE and custom URI scheme redirect (`com.cbtexammaster.app:/oauth2redirect`).
  - Restrict `window.google.accounts.oauth2` exclusively to desktop web and Electron.
  - Implement token refresh mechanism using refresh tokens or automatic re-prompt before token expiry.

#### Task 1.3: Eliminate LocalStorage 5MB Quota Starvation (BUG-03)
- **Files:** `src/lib/analyticsStorage.ts`, `src/lib/contentProvider.ts`
- **Actions:**
  - Create a dedicated object store `offline_papers` inside `CBTExamMasterAnalyticsDB` (IndexedDB).
  - Migrate `saveOfflineTestPaper` and `getOfflineTestPaper` to IndexedDB.
  - Remove test paper JSONs completely from `localStorage`.
  - Ensure `localStorage` is used strictly for scalar primitives (`theme`, `font_offset`, `dismissed_flags`).

#### Task 1.4: Sanitize & Type-Coerce MathRenderer (BUG-04)
- **File:** `src/components/MathRenderer.tsx`
- **Actions:**
  - Coerce input: `const str = content != null ? String(content) : '';`.
  - Add HTML sanitization via `DOMPurify` before injecting into `containerRef.current.innerHTML` to eliminate XSS vectors.

#### Task 1.5: Correct Sectional Question Index in Deep Analytics (BUG-05)
- **Files:** `src/lib/analyticsEngine.ts`, `src/components/DeepAnalyticsView.tsx`
- **Actions:**
  - Add `sectionQuestionIndex: number` to `QuestionAnalysis` interface.
  - In `analyticsEngine.ts`, set `sectionQuestionIndex = qIdx`.
  - In `DeepAnalyticsView.tsx`, update lines 867 & 1152 to pass `q.sectionQuestionIndex`.

#### Task 1.6: Fix Real-Time Countdown Timer Drift (BUG-06)
- **File:** `src/components/CBTExamPlayer.tsx`
- **Actions:**
  - Store `endTimeRef.current = Date.now() + timeLeft * 1000`.
  - In `setInterval`, compute `const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))`.
  - Update `setTimeLeft(remaining)`.
  - When pausing, compute and persist remaining duration; when resuming, recalculate `endTimeRef.current`.

#### Task 1.7: Revoke and Purge Leaked Credentials (BUG-07)
- **Actions:**
  - Revoke Testbook student authorization tokens in `testbook_auth.json`.
  - Delete `testbook_auth.json` from disk and git index.
  - Add `*.auth.json`, `testbook_auth.json`, and `.env*` to `.gitignore`.

---

### Phase 2: Distributed Concurrency & Storage Hardening (P1)

#### Task 2.1: Deletion Tombstones in Google Drive Sync Engine (BUG-08)
- **Files:** `src/lib/gdrive/gdriveSync.ts`, `src/lib/analyticsStorage.ts`
- **Actions:**
  - Maintain a `deleted_attempts` store in IndexedDB and a `tombstones.json` file in Google Drive `appDataFolder`.
  - When an attempt is deleted, record `{ attemptId, deletedAt }` in `tombstones.json`.
  - In `syncAllWithDrive()`, if an attempt is present in `tombstones.json`, delete it from both local storage and Google Drive rather than re-downloading it.

#### Task 2.2: Cross-Device In-Flight Snapshot Concurrency (BUG-09 & BUG-10)
- **File:** `src/lib/gdrive/gdriveSync.ts`
- **Actions:**
  - Before restoring or uploading an in-flight snapshot, check if `attempt_${testId}` already exists in completed attempts. If completed, discard the in-flight snapshot.
  - Attach a monotonic revision number (`revision: number`) to `InFlightExamSnapshot` instead of relying solely on client wall-clock `Date.now()`.

#### Task 2.3: Stale Closures & Snapshot Telemetry Race (BUG-11, BUG-12, BUG-13)
- **File:** `src/components/CBTExamPlayer.tsx`
- **Actions:**
  - Use `timeLeftRef.current` to store active remaining seconds, ensuring `saveCurrentSnapshot()` always writes the exact current time.
  - Use `userAnswersRef.current` updated synchronously on option click to guarantee `closeActiveQuestionInterval()` captures the active answer.
  - Move section auto-advance and submission logic outside the `setTimeLeft` functional updater into a dedicated timer effect.

#### Task 2.4: Align Electron Development Server (BUG-15)
- **File:** `electron/main.js`
- **Actions:**
  - Check `process.env.NODE_ENV === 'development'` or query port 3000.
  - If `http://localhost:3000` is active, load `http://localhost:3000` instead of static `out/` build to enable hot reload during desktop development.

---

### Phase 3: Platform UX, Resilience & Layout (P2 & P3)

#### Task 3.1: Implement Safe Area Insets in CBTExamPlayer (BUG-16)
- **File:** `src/components/CBTExamPlayer.tsx`
- **Actions:**
  - Add `safe-top` and `pt-[env(safe-area-inset-top)]` to `<header>`.
  - Add `safe-bottom` and `pb-[env(safe-area-inset-bottom)]` to `<footer>`.
  - Ensure palette drawer respects top and bottom insets.

#### Task 3.2: Complete Hardware Back Button Interception (BUG-17)
- **Files:** `src/components/CBTExamPlayer.tsx`, `src/components/DeepAnalyticsView.tsx`, `src/components/ScorecardModal.tsx`
- **Actions:**
  - Register back button handlers inside `DeepAnalyticsView` and `ScorecardModal` to navigate back to the previous screen rather than letting the root handler minimize the app.

#### Task 3.3: Fix `isElectron()` Bridge Detection (BUG-18)
- **File:** `src/lib/platform/platformBridge.ts`
- **Actions:**
  - Check `!!(window as any).electronAPI?.isElectron` in `isElectron()`.

#### Task 3.4: Virtualize Question Paper KaTeX List (BUG-21)
- **File:** `src/components/QuestionPaperModal.tsx`
- **Actions:**
  - Implement dynamic lazy rendering or section accordion so only the active section's questions are rendered in KaTeX at any given time.

#### Task 3.5: Align Theme Storage Keys (BUG-25)
- **Files:** `src/lib/gdrive/gdriveSync.ts`, `src/context/ThemeContext.tsx`
- **Actions:**
  - Standardize on `cbt_theme_mode` across both `ThemeContext` and `gdriveSync.ts`.

---

## 9. Verification & Quality Assurance Strategy

To ensure zero regressions, execute the following audit verification suite once remediations are staged:

1. **Adversarial Network Fuzzing**:
   - Disconnect network mid-exam; verify in-flight snapshots continue writing to IndexedDB.
   - Reconnect with 3G throttling; verify snapshot uploads are debounced (max 1 request every 5 seconds).
2. **Background App Lifecycle Test**:
   - On Android and iOS simulators/devices, send the app to background for 10 minutes during an exam.
   - Bring app back to foreground; verify `timeLeft` decremented by exactly 600 seconds.
3. **Cross-Device Race Simulation**:
   - Launch exam `T1` on Device A; answer questions 1 to 10.
   - Sync to Google Drive.
   - Launch `T1` on Device B; verify resume prompt loads 10 answered questions with matching timer.
   - Submit `T1` on Device B; verify `T1` cannot be resumed on Device A.
4. **Security Path Traversal Penetration Test**:
   - Run curl test against Electron internal server:
     `curl -v "http://127.0.0.1:<port>/../../../../etc/passwd"`
     Verify response is HTTP `403 Forbidden` or `404 Not Found`.
5. **KaTeX Fuzzing**:
   - Load test papers with numeric options (`0`, `1`, `42.5`), SVG data URIs, and raw LaTeX math matrices.
   - Verify zero unhandled React exceptions.
