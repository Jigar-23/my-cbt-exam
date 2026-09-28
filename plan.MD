# CBT Exam Master 2026: Master Engineering & Modernization Plan (`plan.MD`)

> **Consolidated Strategic Roadmap for Defect Remediation, Cross-Platform Concurrency, and UI/UX Modernization**  
> **Source Documents:** [**`plan-bug.MD`**](file:///Users/jigar/Downloads/CBT/test-android/plan-bug.MD) & [**`plan ui.MD`**](file:///Users/jigar/Downloads/CBT/test-android/plan%20ui.MD)  
> **Target Codebase:** `/Users/jigar/Downloads/CBT/test-android` (Single-Source Web, Desktop macOS/Windows, Android, iOS)

---

## 1. Executive Summary

This master plan synthesizes findings from two parallel, non-interactive deep code audits conducted across the codebase using `agy --dangerously-skip-permissions`:
1. **Adversarial Systems & Bug Audit (`plan-bug.MD`):** Uncovered **7 P0 Critical Blockers**, **8 P1 Concurrency Risks**, **9 P2 Platform Edge Cases**, and **5 P3 Code Quality Flaws**. Crucially identifies the need for PKCE-based OAuth for native mobile, path traversal sanitation in Electron, LocalStorage quota starvation relief, wall-clock timer drift correction, and deletion tombstones for Google Drive sync.
2. **Principal UI/UX & TCS iON Simulator Audit (`plan ui.MD`):** Identified high-risk touch target hazards (placing terminal "Submit Test" adjacent to "Save & Next"), missing authentic TCS iON directional polygons (upward/downward pentagons), missing 4-quadrant speed-accuracy diagnostic scatter matrix, mobile gesture bar collisions, and dark/light mode theme fractures.

---

## 2. Integrated Four-Phase Execution Roadmap

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| PHASE 1: IMMEDIATE RESILIENCE & P0 BUG ELIMINATION                                                |
|                                                                                                   |
| 1. Electron Security: Sanitize path traversal in electron/main.js to prevent arbitrary file read. |
| 2. Mobile OAuth (PKCE): Implement @capacitor/browser flow for Google Drive login on Android/iOS.  |
| 3. Storage Quota Fix: Migrate 2.5MB offline test papers to IndexedDB (prevent LocalStorage full). |
| 4. Wall-Clock Timers: Anchor countdown to performance.now() / Date.now() to prevent background    |
|    drift when mobile device sleeps or receives calls.                                             |
| 5. KaTeX Type-Safety: Ensure non-string values (numbers) are safely stringified before regex.     |
| 6. Section Index Fix: Correct Question Jump index in DeepAnalyticsView (prevent out-of-bounds).    |
| 7. Button De-Clustering: Move "Submit Test" to header/palette to eliminate accidental submissions. |
+──────────────────────────────────────────────────┬────────────────────────────────────────────────+
                                                   │
                                                   v
+──────────────────────────────────────────────────┴────────────────────────────────────────────────+
| PHASE 2: TCS iON AUTHENTICITY & DISTRIBUTED CONCURRENCY (P1)                                      |
|                                                                                                   |
| 1. True TCS Status Polygons: Implement authentic CSS clip-path upward/downward pentagons.         |
| 2. Google Drive Tombstones: Add tombstones.json to prevent deleted tests from resurfacing.        |
| 3. Monotonic Revision Numbers: Eliminate clock-skew bugs when resuming in-flight exams.           |
| 4. Synchronous Telemetry Refs: Eliminate React state batching race in micro-interval telemetry.   |
| 5. Token Auto-Refresh: Prevent 60-minute token expiration from breaking 3-hour exam syncs.        |
| 6. Visual Urgency Timer: 3-stage dynamic color changes (Default Slate -> Amber <5m -> Red Pulse).  |
+──────────────────────────────────────────────────┬────────────────────────────────────────────────+
                                                   │
                                                   v
+──────────────────────────────────────────────────┴────────────────────────────────────────────────+
| PHASE 3: COGNITIVE ANALYTICS & MOBILE ERGONOMICS (P2)                                             |
|                                                                                                   |
| 1. 4-Quadrant Speed-Accuracy Matrix: Restore interactive scatter plot in DeepAnalyticsView.       |
| 2. Time-Trap Drain Bar: Visualize marks and minutes drained by time traps.                        |
| 3. Safe-Area Inset Enforcement: Add .safe-bottom and .safe-top for iOS & Android gesture bars.    |
| 4. Responsive Question Palette: Swipeable bottom sheet on mobile with dense 5-column grid.        |
| 5. Score Trajectory Sparklines: Add historical moving-average trends in AnalyticsGrowthHub.       |
+──────────────────────────────────────────────────┬────────────────────────────────────────────────+
                                                   │
                                                   v
+──────────────────────────────────────────────────┴────────────────────────────────────────────────+
| PHASE 4: PLATFORM POLISH & THEME HARMONIZATION (P3)                                               |
|                                                                                                   |
| 1. Unified Theme Architecture: Eliminate hardcoded dark/light blocks across views.                |
| 2. Touch Target Enforcements: Ensure all interactive icons meet WCAG 2.2 AA (>= 44x44px).        |
| 3. KaTeX Equation Virtualization: Prevent DOM layout lag in 100-question paper modals.            |
| 4. Remove Committed Bearer Tokens: Purge testbook_auth.json from disk and git history.           |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Reference Files & Full Reports

* **Full Bug & Concurrency Audit:** [`plan-bug.MD`](file:///Users/jigar/Downloads/CBT/test-android/plan-bug.MD) (46 KB, includes exact code snippets, vulnerability proofs, and fixes)
* **Full UI/UX Modernization Blueprint:** [`plan ui.MD`](file:///Users/jigar/Downloads/CBT/test-android/plan%20ui.MD) (48 KB, includes CSS clip-paths, wireframes, and design specs)
