# CBT Exam Master 2026: Comprehensive UI/UX Design Critique & Modernization Blueprint

**Document Version:** 1.0.0  
**Author:** Principal Product & UI/UX Design Architect (Educational Testing Engines & TCS iON Simulators)  
**Date:** September 28, 2026  
**Target Codebase:** `/Users/jigar/Downloads/CBT/test-android`  
**Supported Platforms:** Android (Capacitor), iOS (Capacitor), Desktop macOS (Electron), Desktop Windows (Electron), and Responsive Web (Next.js 16 / React 19 / Tailwind CSS v4)

---

## Executive Summary & Architectural Vision

Educational testing simulators face a unique, dual-mandate design challenge:
1. **Exam Mode (High Fidelity & Cognitive Realism):** Must replicate the exact spatial ergonomics, visual cues, color psychology, and strict operational constraints of authentic Indian government CBT engines—predominantly **TCS iON** (which powers IBPS PO/SO/Clerk, SBI, SSC CGL/CHSL, RRB NTPC/Group D, and GATE). Candidates rely on muscle memory and cognitive familiarity with question status shapes, countdown timer placements, and palette layouts.
2. **Growth & Analytics Mode (Consumer-Grade Delight & Diagnostic Clarity):** Beyond the test room, candidates require an ultra-modern, responsive, high-contrast analytics dashboard (inspired by Linear, Raycast, and Apple Health) to diagnose weaknesses, identify "time traps," uncover behavioral pacing flaws, and monitor score trajectory over time.

Following an exhaustive, code-level forensic inspection of `src/`, this report delivers:
- An unsparing, component-by-component ergonomic and visual critique across all five target operating environments.
- Identification of critical UX antipatterns, touch target violations (WCAG 2.2 AA), layout shifting (CLS), and thematic inconsistencies ("The Jekyll & Hyde Theme Fracture").
- Precise mathematical, geometric, and visual specifications for authentic TCS iON compliance.
- A phased, prioritized technical modernization blueprint with production-ready architectural patterns and CSS/React specifications.

---

## 1. Deep Component-by-Component Ergonomic & Visual Critique

### 1.1 `CBTExamPlayer.tsx`

The core exam simulator interface is responsible for candidate confidence, focus, and rapid question navigation.

```
+---------------------------------------------------------------------------------------------------+
| Top Header: [<- Dashboard]   Exam Title: IBPS SO IT Officer 2026    [Mode] [Paper] [Instructions] |
+---------------------------------------------------------------------------------------------------+
| Sub-Header: [Sec 1: Reasoning] [Sec 2: English] [Sec 3: Quant]  | [Pause] [Timer: 19:42] [Palette] |
+-------------------------------------------------------------+-------------------------------------+
| Question Workspace (Left ~70%)                              | Question Palette (Right ~30%)       |
| Q.No: 14 | MCQ Single | Text: [A+] [A-] | Marks: +1.00 / -0.25 | Status Legend (5 Geometric Shapes)  |
|                                                             | [Answered: 12]   [Not Answered: 8]  |
| Direction / Passage Container (if present)                  | [Not Visited: 30] [Marked: 2]       |
|                                                             |                                     |
| Question Text with KaTeX formulas                           | Section: Professional Knowledge     |
| (A) Option 1                                                | [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ]           |
| (B) Option 2                                                | [ 6 ][ 7 ][ 8 ][ 9 ][ 10]           |
| (C) Option 3                                                | ...                                 |
| (D) Option 4                                                | [ Submit Entire Test ]              |
+-------------------------------------------------------------+-------------------------------------+
| Action Footer:                                                                                    |
| [Mark for Review & Next] [Clear Response]               | [Palette] [Save & Next] [Submit Test]   |
+---------------------------------------------------------------------------------------------------+
```

#### A. Authentic TCS iON Question Palette Layout & Geometry
- **Current Code Inspection (`lines 475-490`, `lines 500-537`):**
  The current implementation attempts to mimic TCS iON status badges using CSS border radii:
  - `answered`: `bg-emerald-600 text-white rounded-t-lg shadow-xs` (rounded top).
  - `not_answered`: `bg-rose-600 text-white rounded-b-lg shadow-xs` (rounded bottom).
  - `marked_review`: `bg-purple-700 text-white rounded-full shadow-xs` (circle).
  - `answered_marked`: `bg-purple-700 text-white rounded-full relative border-2 border-emerald-400`.
  - `not_visited`: `bg-slate-200 text-slate-700 border border-slate-300 rounded-md` (rectangle).
- **Critique & Psychological Impact:**
  - *Shape Inaccuracy:* Real TCS iON does not use rounded rectangles. Authentic TCS iON uses **distinct geometric polygons with directional arrowheads**:
    - **Answered:** An upward-pointing pentagon (green `#27ae60`).
    - **Not Answered:** A downward-pointing pentagon (red `#e74c3c`).
    - **Marked for Review:** A perfect circle (deep violet `#7b2cbf`).
    - **Answered & Marked for Review:** A violet circle with a prominent green circular indicator in the bottom-right quadrant, accompanied by the vital legal notice: *"will be considered for evaluation"*.
    - **Not Visited:** A crisp, flat square with rounded corners of 2px max (neutral grey `#e2e8f0` with dark charcoal `#334155` text).
  - *Legend Counter Confusion (`lines 507-535`):*
    In the legend, the status counter values (`{totalAnswered}`) are rendered *inside* the miniature geometric icon. For example, if 12 questions are answered, the legend box displays `"12"`. Candidates taking quick glances confuse this with Question #12! In official TCS iON, legend icons display a sample question number (e.g., `1`, `2`, `3`) or are blank, with the counter displayed as plain tabular text beside the label: `Answered (12)`.
  - *Active Question State (`line 558`):*
    Uses `ring-3 ring-blue-500 ring-offset-1 scale-105`. While visible, on dense 50-question grids on mobile, scaling by 105% clips the button boundary against adjacent grid items and causes visual jitter on touch devices.

#### B. Responsive Side Drawer (Mobile) vs. Persistent Sidebar (Desktop)
- **Current Code Inspection (`lines 64-71`, `lines 962-1027`):**
  - Desktop uses a flex child `<aside>` (`w-80 lg:w-96 bg-slate-100 flex-col border-l border-slate-300`).
  - Mobile uses a fixed overlay drawer (`w-[85vw] max-w-sm h-full bg-slate-100 fixed inset-0 z-50 flex`).
- **Critique & Architectural Flaws:**
  - *Hydration Layout Shift (Desktop):*
    `isPaletteOpen` is initialized with `useState(false)`. A `useEffect` then checks `window.innerWidth >= 1024` and updates it to `true`. This causes a noticeable Flash of Unstyled Content (FOUC) and layout reflow on desktop startup: the question area first renders at 100% width, then suddenly shrinks to 70% as the sidebar snaps into existence.
  - *Desktop Collapse Re-Open Button (`lines 985-994`):*
    When collapsed, a floating vertical tab button appears at `right-0 top-1/2 -translate-y-1/2` with vertical text writing mode. While creative, this floating tab permanently covers question text, equations, or diagrams on 13" laptop screens (MacBook Air / Surface Pro) running at 1280x800 resolution!
  - *Mobile Drawer Grid Density (`line 549`):*
    The grid renders with `grid-cols-4 sm:grid-cols-5`. In a 100-question exam (e.g. IBPS SO / SBI PO), 4 columns results in **25 vertically stacked rows**. The user must perform 4 to 6 vigorous thumb swipes inside an 85vw drawer just to reach Question 80.
  - *Mobile Drawer Dismissal:*
    The drawer lacks a horizontal swipe-to-dismiss gesture (standard iOS/Android bottom sheet or edge-swipe). The only dismissal mechanisms are tapping the backdrop or a tiny `18px` close icon.

#### C. Action Bar Ergonomics (Bottom Toolbar)
- **Current Code Inspection (`lines 915-959`):**
  ```tsx
  <footer className="bg-slate-100 border-t border-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
    <div className="flex items-center space-x-3">
      <button onClick={handleMarkForReviewAndNext}>Mark for Review & Next</button>
      <button onClick={handleClearResponse}>Clear Response</button>
    </div>
    <div className="flex items-center space-x-2 md:space-x-3">
      <button onClick={() => setIsPaletteOpen(true)} className="lg:hidden">Palette</button>
      <button onClick={handleSaveAndNext}>Save & Next</button>
      <button onClick={() => setIsSubmitModalOpen(true)}>Submit Test</button>
    </div>
  </footer>
  ```
- **Severe Ergonomic Hazards:**
  1. **Catastrophic Proximity of "Save & Next" and "Submit Test":**
     On both mobile and desktop, the primary, high-frequency button **"Save & Next"** (blue) is placed directly adjacent to the terminal, irreversible action **"Submit Test"** (cyan). During high-stakes timed exams, candidates tap "Save & Next" 100 to 200 times under extreme time pressure. A 4mm thumb deviation on mobile triggers the Submit dialog, inducing immediate panic and disrupting candidate momentum.
  2. **Mobile Multi-Row Wrapping Nightmare:**
     On mobile displays (<400px width), `flex-wrap` causes these 5 buttons to wrap into two or three unbalanced rows. The verbose label `"Mark for Review & Next"` (24 characters) consumes almost the entire top row, pushing `"Palette"`, `"Save & Next"`, and `"Submit Test"` down, occupying 110px to 135px of vertical screen height.
  3. **Violation of Thumb Zone Ergonomics:**
     On handheld mobile devices (Android & iOS), the bottom-right corner is the primary natural thumb zone. Having "Submit Test" occupy this prime zone instead of "Save & Next" violates fundamental Fitts's Law principles.
  4. **Official TCS iON Action Hierarchy Missing:**
     In genuine TCS iON exam consoles:
     - Left edge: **Previous** (optional/gray), **Mark for Review & Next** (orange/blue outline), **Clear Response** (white/neutral).
     - Right edge: **Save & Next** (dominant green or deep blue).
     - Bottom-right palette footer: **Submit** is *only* placed at the bottom of the Question Palette sidebar, NOT in the primary question progression bar!

#### D. Timer Badge Visibility & Urgency Cues
- **Current Code Inspection (`lines 727-733`):**
  ```tsx
  <div className="flex items-center space-x-1.5 md:space-x-2 bg-slate-900 text-white px-2.5 md:px-3.5 py-1 rounded-md shadow-inner">
    <Clock size={15} className={`text-amber-400 ${isPaused ? '' : 'animate-pulse'}`} />
    <span className="hidden sm:inline text-xs font-medium text-slate-300">Time Left:</span>
    <span className="font-mono text-xs sm:text-sm md:text-base font-bold text-amber-400 tracking-wider">
      {formatTime(timeLeft)}
    </span>
  </div>
  ```
- **Critique:**
  - *Lack of Dynamic Urgency Stages:*
    The timer remains permanently styled in `text-amber-400` from minute 120 down to second 0. Cognitive psychology in testing shows that visual feedback at critical intervals (e.g. 5 minutes remaining, 1 minute remaining) prevents panic:
    - Normal (>10 mins): Calm slate/neutral white or subtle cyan.
    - Warning (<5 mins): Warm amber `#f59e0b` with a steady border highlight.
    - Critical (<1 min): High-urgency crimson `#ef4444` with subtle pulse animation to alert the candidate of impending auto-submission.
  - *Header Stacking Overhead on Mobile:*
    The sub-header contains Section Tabs + Pause Button + Timer + Palette Button + Candidate ID. On mobile, this bar wraps into two thick bars beneath the top header, consuming over **120px** of vertical space before the question content even begins!

#### E. Formula and Text Legibility
- **Text Selection Bug (`line 830` vs `globals.css line 42`):**
  `globals.css` applies `user-select: none` to `html, body`, and defines `.selectable-text { user-select: text !important; }`. However, in `CBTExamPlayer.tsx` (line 830), the question text wrapper is rendered as:
  `<div className="text-slate-900 font-medium leading-relaxed" style={{ fontSize: `${15 + fontSizeOffset}px` }}>`
  It **omits** `.selectable-text`! Candidates attempting to select a line of a passage or copy a mathematical formula to an external scratchpad or on-screen calculator find the text completely locked.
- **Font Zoom Asymmetry:**
  `fontSizeOffset` adjusts between `-2px` and `+6px`. However, this offset is only applied to question text and options. It does not scale the radio buttons (`w-4 h-4`), section passage labels, or KaTeX mathematical exponents proportionately, resulting in misaligned equations at `+4px` and `+6px`.

---

### 1.2 `DeepAnalyticsView.tsx`

This component is the diagnostic powerhouse of the platform, transforming post-exam telemetry into actionable score improvement.

```
+---------------------------------------------------------------------------------------------------+
| Top Bar: [<- Back to Solutions]   IBPS SO IT 2026   Submitted Sep 28   [Dashboard]                |
+---------------------------------------------------------------------------------------------------+
| Nav Tabs: [ Sectional Mastery & Topics ]  [ Speed & Time Intelligence ]  [ Question Matrix (100) ]|
+---------------------------------------------------------------------------------------------------+
| [Final Net Score: 84.50]  [Overall Accuracy: 82%]  [Attempted: 92/100]  [Active Time: 1h 48m]     |
+---------------------------------------------------------------------------------------------------+
| Active Tab Content:                                                                               |
| (Current: Grid of section cards OR 3 Speed cards OR horizontal-scrolling 9-column HTML Table)     |
|                                                                                                   |
| MISSING:                                                                                          |
| 1. Speed-Accuracy 4-Quadrant Scatter Matrix                                                       |
| 2. Visual Time-Trap Drain Bar Graph                                                               |
| 3. Question Difficulty Classification (Easy / Moderate / Hard)                                    |
| 4. Sectional Comparative Radar / Grouped Bar Charts                                               |
+---------------------------------------------------------------------------------------------------+
```

#### A. Speed-Accuracy Matrix Deficiency
- **Current Code Inspection (`lines 909-952`, `lines 1031-1170`):**
  Tab 2 ("Speed & Time Intelligence") features three static summary cards (Time on Correct, Time on Incorrect, Time Wasted), a fastest/slowest callout, and a list of time traps. Tab 3 is an HTML table of questions.
- **Critical Architectural Void:**
  There is **no 2D Speed-Accuracy Matrix**. In competitive exam analytics (IBPS, CAT, GATE), questions must be plotted across a 2-dimensional Cartesian grid:
  - **X-Axis:** Cumulative Time Spent (seconds) vs Section Average.
  - **Y-Axis:** Accuracy / Correctness (Correct vs Incorrect).
  This defines the legendary **Four Diagnostic Quadrants**:
  1. **Quadrant I (High Mastery / Velocity Zone):** Fast & Correct (<60s, +1.0). The candidate's scoring engine.
  2. **Quadrant II (Careless / Overconfident Zone):** Fast & Incorrect (<30s, -0.25). Rushed reading, missed keywords ("NOT", "EXCEPT"), silly calculation blunders.
  3. **Quadrant III (Inefficient / Over-deliberation Zone):** Slow & Correct (>120s, +1.0). Correct answer, but ruined the test's time budget.
  4. **Quadrant IV (Time Traps / Concept Gaps):** Slow & Incorrect (>120s, -0.25). The most dangerous candidate behavior: sunk cost fallacy leading to negative marks.

#### B. Time-Trap Visualizations
- **Current State (`lines 991-1025`):**
  Identified time traps are rendered as simple text cards in a 3-column grid showing Question number, Section, and Time.
- **Critique:**
  A time trap is not merely a stat—it is a **theft of minutes** that starved other questions. The visualization should graphically contrast:
  - Total Time Wasted on Traps vs Total Productive Time in Section.
  - Sunk Cost Analysis: How many Easy/Moderate unattempted questions in the same section could have been answered with the time wasted on those 3 traps.

#### C. Question Difficulty Indicators Missing
- **Current Table Inspection (`lines 1084-1166`):**
  The table includes `Q.#`, `Section`, `Your Answer`, `Correct Answer`, `Marks`, `Time Spent`, `Visits`, `Speed Class`, and `Action`.
- **Defect:**
  There is **zero indication of Question Difficulty** (Easy / Medium / Hard). Spending 80 seconds on an Easy reasoning question is an operational failure; spending 80 seconds on an Extreme multi-layered Data Interpretation caselet is exemplary pacing. Without difficulty context, speed classifications (`FAST` / `SLOW`) provide distorted feedback.

#### D. Sectional Comparison Charts
- **Current State (`lines 227-288`):**
  Section performance is displayed in isolated cards (one card per section).
- **Critique:**
  To understand balance (e.g. did the candidate spend 50 minutes on Quant and leave only 12 minutes for General Awareness?), candidates require a **Comparative Visual Benchmark**:
  - A normalized, side-by-side comparative bar chart or radar chart plotting:
    - Attempt Rate %
    - Accuracy %
    - Time Allocation % vs Ideal Allocation %

#### E. Commented-Out Architectural Goldmine (`lines 293-886`)
- In `DeepAnalyticsView.tsx`, **nearly 600 lines of high-value analytics code are commented out**. This includes:
  - Topic-wise syllabus coverage matrices (`lines 417-568`).
  - An interactive histogram of cumulative time spent per question with revisit badges (`🔁`) (`lines 601-652`).
  - Iteration and answer change tracking (`pencil ✏️ 2 changes`) (`lines 826-830`).
  This code must be salvaged, refactored, and integrated cleanly into modern interactive sub-views.

#### F. Mobile Ergonomics & Table Truncation
- Tab 3's HTML table requires horizontal scrolling across 9 columns on mobile screens (375px viewport). The critical CTA `"View Solution"` is buried on the extreme right, requiring manual horizontal panning on every single row. On mobile, this table must transform into responsive diagnostic question cards.

---

### 1.3 `AnalyticsGrowthHub.tsx`

The hub aggregates historical mock test performance across days, weeks, and months.

```
+---------------------------------------------------------------------------------------------------+
| Top Bar: [<- Catalog]   Test History (14 Exams)                 [Refresh] [Goals] [Clear All 🗑️] |
+---------------------------------------------------------------------------------------------------+
| Search & Filter: [ 🔍 Search history by title... ] [ Sort: Latest v ]                             |
+---------------------------------------------------------------------------------------------------+
| List of Attempt Cards:                                                                            |
| +-----------------------------------------------------------------------------------------------+ |
| | [NEW_PATTERN_2026]   Sep 26, 2026, 10:45 AM                                      [Trash 🗑️]   | |
| | IBPS SO IT Officer 2026 Full Mock #4                                                          | |
| | [ Net Score: 88.5/100 ]   [ Accuracy: 84% ]   [ Time Spent: 1h 45m ]                           | |
| | 94/100 Solved • 2 Traps                                           Deep Report ->              | |
| +-----------------------------------------------------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+
```

#### A. Historical Test Listings & Missing Score Trends
- **Major Omission:**
  While individual test cards are listed, there is **no Score Progression Visualization**. Candidates taking 10 mock tests cannot see if their scores are trending upward or stagnating.
  - Missing: An SVG/Canvas Sparkline or multi-test trend graph showing:
    - Net Score vs Mock Number.
    - Rolling 3-Test Moving Average Accuracy.
    - Benchmark Cutoff Reference Line (e.g., Target 75.0 marks).

#### B. Filter Bug (Dead Code in Filter Pipeline)
- **Code Inspection (`lines 36`, `lines 100-103`, `lines 246-270`):**
  - Line 36 defines: `const [selectedPattern, setSelectedPattern] = useState<string>('all');`
  - Lines 100-103 filter:
    ```tsx
    if (selectedPattern !== 'all') {
      result = result.filter((a) => a.pattern === selectedPattern);
    }
    ```
  - **The Bug:** In the JSX render (`lines 246-270`), there is **no dropdown or filter button to select `selectedPattern`**. Only `searchQuery` and `sortBy` exist in the UI. Consequently, candidates cannot filter between `NEW_PATTERN_2026`, `PRELIMS`, `MAINS`, or `PYQ_SHIFT`.

#### C. Mobile Touch Targets & Dangerous Click Targets
- **WCAG 2.2 AA Violation in Card Actions (`lines 344-353`):**
  ```tsx
  <button
    onClick={(e) => {
      e.stopPropagation();
      setAttemptToDelete(attempt);
    }}
    className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
  >
    <Trash2 size={13} />
  </button>
  ```
  - The Trash icon is styled with `p-1` and a `13px` icon. Its total touch target is barely **21x21px** (far below the 44x44px minimum required by Apple HIG and Google Material Design).
  - Worse, this tiny button sits inside the parent card wrapper which has its own `onClick={() => onSelectAttempt(attempt)}`. On mobile touchscreens, attempting to tap the 21px trash button frequently triggers the parent card click, inadvertently navigating the user away to the test report!
- **Header Action Button Sizing:**
  The Back, Refresh, and Trash buttons in the header use `p-1.5` with `14px` icons (~28px total bounding box), creating frustrating "near-miss" taps on mobile.

#### D. Clear All Confirmation Safeguards
- The "Clear All" modal lacks a two-step verification (such as typing "DELETE" or displaying a 5-second countdown timer). One accidental double-tap on mobile wipes months of IndexedDB performance telemetry permanently.

---

### 1.4 `GoogleDriveLinkModal.tsx` & `GoogleDriveStatusPill.tsx`

This subsystem provides cross-device persistence (e.g. taking a test on an Android phone on the train, then reviewing analytics on macOS/Windows desktop).

```
+-------------------------------------------------------------------+
| Cloud Sync & Backup                         [ Bring Your Own Drive ] |
| [Cloud Icon]                                                      |
+-------------------------------------------------------------------+
| Feature Highlights:                                               |
| - Seamless Concurrency: Phone to Desktop resume                   |
| - Zero Data Loss: In-flight timers and telemetry backed up        |
| - 100% Private Sandbox: Isolated appDataFolder sandbox            |
+-------------------------------------------------------------------+
| [ Sign in with Google ]                                           |
| [ Continue as Guest (Offline Only) ]                              |
+-------------------------------------------------------------------+
| Google Drive AppData Sandbox                  [ OAuth Settings ]  |
+-------------------------------------------------------------------+
```

#### A. On-Launch Modal Friction vs. Discovery
- **Current Code Inspection (`page.tsx lines 126-133`):**
  ```tsx
  const token = getStoredAccessToken();
  const dismissed = localStorage.getItem('cbt_gdrive_modal_dismissed');
  if (!token && !dismissed) {
    const timer = setTimeout(() => {
      setIsDriveModalOpen(true);
    }, 700);
    return () => clearTimeout(timer);
  }
  ```
- **UX Critique:**
  Triggering an aggressive centered popup after only **700ms** on the user's very first launch creates immediate onboarding friction before they have even seen a single test paper. In modern mobile UX, cloud backup prompts should appear contextually (e.g., after completing their first test or as a clean notification banner).
- **Secondary CTA Copy:**
  `"Continue as Guest (Offline Only)"` sounds like a penalty state. It should be reframed positively: `"Explore Offline"` or `"Maybe Later"`.

#### B. Trust & Privacy Badges
- The privacy callout (*"100% Private Sandbox: Stored in your isolated Google Drive AppData folder"*) is excellent. However, it lacks a visual diagram or badge demonstrating that the app *cannot* read user photos, emails, or personal Drive documents. Adding an explicit permission scope badge (`drive.appdata` only) will dramatically improve authorization conversion.

#### C. Mobile Drawer vs. Modal
- In `GoogleDriveStatusPill.tsx`, clicking the pill opens an overlay named `isDrawerOpen`, but it is coded as a fixed centered modal (`max-w-sm`). On mobile devices, centered modals place key buttons in the upper-middle area, outside the natural thumb zone. On mobile, this should be rendered as a **Bottom Sheet Drawer** sliding up from the bottom with a drag handle.

#### D. Account Status Pill Visual Feedback
- On mobile screens, the pill text `formatLastSync(lastSync)` is hidden (`hidden sm:inline`). Only the 13px cloud icon remains visible. The user cannot tell whether sync succeeded, failed, or is idle. Adding a 6px status dot (green = synced, amber = syncing, red = error) next to the cloud icon solves this.

---

### 1.5 `UserPreferencesView.tsx`

This component lets candidates tailor the vast multi-exam catalog (Banking, SSC, Railways, Defense, Civil Services) to their target goals.

```
+---------------------------------------------------------------------------------------------------+
| Top Bar: [<- Dashboard]   Target Exam Goals (3/8 Active)                               [ All ]    |
+---------------------------------------------------------------------------------------------------+
| 2-Column Grid of Domain Cards:                                                                    |
| +---------------------------------------------------+ +-----------------------------------------+ |
| | [Landmark] Banking & Insurance                    | | [Award] SSC Exams                       | |
| | 6 Exams • 185 Tests                        [ ✓ ]  | | 4 Exams • 120 Tests               [ ✓ ] | |
| | [ Sliders ] 4/6 papers selected       [ ^ ]       | | (Collapsed)                             | |
| | ------------------------------------------------- | +-----------------------------------------+ |
| | Sub-Exam Pills:                                   |                                             |
| | [✓ IBPS PO] [✓ IBPS SO IT] [✓ SBI PO] [  RRB PO]  |                                             |
| +---------------------------------------------------+                                             |
+---------------------------------------------------------------------------------------------------+
| Sticky Bottom Bar:                                                                                |
| 305 Tests Available • 3 categories active                         [ Save & Apply Goals ]          |
+---------------------------------------------------------------------------------------------------+
```

#### A. Domain Goal Selectors & Grid Layout Jitter
- **Code Inspection (`line 242`):**
  The domain cards are laid out in a 2-column grid: `grid grid-cols-1 md:grid-cols-2 gap-2.5`.
- **The Jitter Flaw:**
  When a candidate clicks `"4/6 papers selected"` to expand the sub-exam pills on one card, that card's height expands from 80px to 220px. Because it is a CSS grid row, the adjacent card in the same row does not expand its content, creating an awkward, empty whitespace gap underneath the neighboring card!
- **Solution:**
  Switch to a CSS column layout (`columns-1 md:columns-2 gap-3`) or convert sub-selection into an inline drawer / accordion that does not disrupt sibling alignments.

#### B. Category Icons & Contrast
- `getDomainIcon` uses colored Lucide icons (`emerald-400`, `amber-400`, `purple-400`, `cyan-400`).
- **Contrast Failure:** In light mode (`bg-white` or `bg-zinc-100`), `amber-400` (#fbbf24) and `cyan-400` (#22d3ee) against white backgrounds have contrast ratios of **1.6:1** and **1.8:1**, completely failing WCAG AA (minimum 3:1 for graphical UI objects). These icons become nearly invisible washed-out ghosts in daylight!

#### C. Sticky Bottom Bar Ergonomics
- The sticky bar properly uses `.safe-bottom`. However, on mobile, the primary CTA `"Save & Apply Goals"` is placed beside the counter text. When the counter text wraps on narrow screens (e.g. 320px iPhone SE), the button shrinks and text truncates.

---

### 1.6 Theming, Typography & Cross-Platform Engine

#### A. "The Jekyll & Hyde Theme Fracture"
The codebase has a severe design fracture between views:
- `page.tsx`, `AnalyticsGrowthHub.tsx`, `UserPreferencesView.tsx`, and `ThemeToggle.tsx` fully support **both Light Mode and Dark Mode** using Tailwind CSS dark classes (`dark:bg-[#0f1015]`, `bg-[#f4f5f8]`).
- **`CBTExamPlayer.tsx`** is **100% hardcoded in Light Mode** (`bg-slate-50`, `bg-white`, `border-slate-200`, `text-slate-900`).
- **`DeepAnalyticsView.tsx`** is **100% hardcoded in Dark Mode** (`bg-slate-950`, `bg-slate-900`, `text-slate-100`).
- **`ScorecardModal.tsx`** is **100% hardcoded in Dark Mode**.
- **`InstructionsModal.tsx`** & **`QuestionPaperModal.tsx`** are **100% hardcoded in Light Mode**.

**User Experience Disaster:**
A user who selects Dark Mode in the catalog clicks "Start Exam" and is immediately blinded by a stark white exam player. Upon finishing the test, the Scorecard snaps back to pitch black. Clicking "Question Paper" inside the exam opens a blinding white modal, but clicking "Deep Analytics" plunges them back into pitch black!

#### B. KaTeX Math Typography & Delimiter Parser Defect
- **Code Inspection (`MathRenderer.tsx lines 23-40`):**
  ```tsx
  // Handle block math: $$...$$ or \[...\]
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => { ... });

  // Handle inline math: $...$ or \(...\)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => { ... });
  ```
- **The Bug:**
  The code comments claim to support `\[...\]` and `\(...\)`, but the regular expressions **strictly match dollar signs only (`\$\$` and `\$`)**! Any question JSON using official LaTeX standard delimiters (`\[` or `\(`) is never parsed and renders as raw, ugly LaTeX code (e.g., `\[ \sum_{i=1}^{n} x_i \]`).
- **Multi-line Math Breakdown:**
  The inline regex is `\$([^\$\n]+?)\$`. If an inline LaTeX formula contains a line break or formatting newline (common in multi-step equations), the regex fails to match and leaves the formula unrendered!

#### C. Mobile Safe-Area Inset Vulnerabilities
- `globals.css` defines `.safe-top` and `.safe-bottom`.
- However, **`CBTExamPlayer.tsx` does NOT apply `.safe-bottom` to its bottom toolbar (`line 915`)**!
- On modern devices with home indicator bars (iPhone X through 16, and modern Android gesture navigation), the bottom toolbar sits flush against the bottom bezel. When candidates tap "Clear Response" or "Save & Next", their thumbs accidentally trigger the operating system's home swipe or app switcher!
- Similarly, the top header in `CBTExamPlayer.tsx` (`line 601`) lacks `.safe-top`, causing the Dashboard back button and title to collide with the camera cutout / Dynamic Island on iOS and Android.

---

## 2. Touch Target & Ergonomic Compliance Matrix (WCAG 2.2 AA)

| Component | Target Element | Current Size | WCAG 2.2 AA Requirement | Status | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CBTExamPlayer` | Options Radio Label | Full width x ~48px | >= 44x44px | Pass | Low |
| `CBTExamPlayer` | Action Bar Buttons (Mobile) | Dynamic (~32px height) | >= 44x44px | **FAIL** | **High** |
| `CBTExamPlayer` | Palette Question Badges | 36x36px to 40x40px | >= 44x44px (or >=24px with spacing) | Warning | Medium |
| `CBTExamPlayer` | Re-Open Palette Floating Tab | 28px width x 60px | >= 44x44px | Warning | Medium |
| `CBTExamPlayer` | Font Size Zoom Buttons (A+/A-) | ~24x22px | >= 44x44px | **FAIL** | **High** |
| `AnalyticsGrowthHub` | Header Back Button | 28x28px (`p-1.5`) | >= 44x44px | **FAIL** | **High** |
| `AnalyticsGrowthHub` | Card Delete Icon Button | 21x21px (`p-1`) | >= 44x44px | **CRITICAL FAIL** | **Critical** |
| `AnalyticsGrowthHub` | Header Trash Icon Button | 26x26px (`p-1.5`) | >= 44x44px | **FAIL** | **High** |
| `GoogleDriveStatusPill` | Pill Button (Mobile) | 26x26px icon only | >= 44x44px | **FAIL** | Medium |
| `UserPreferencesView` | Sub-Exam Selection Pills | ~26px height (`py-1`) | >= 44x44px | Warning | Medium |

---

## 3. Authentic TCS iON Exam Engine Specification (2026 Guidelines)

To eliminate the visual disparity between this simulator and the real examination halls (IBPS CRP SPL-XVI, SSC CGL Tier 1/2, RRB), the question palette must implement the **true TCS iON geometric polygon standard**.

### 3.1 CSS Clip-Path Polygon Architecture

```
   1. ANSWERED             2. NOT ANSWERED          3. NOT VISITED
   (Pointed Top)           (Pointed Bottom)         (Flat Rounded Rect)
       /\                       +----+                   +----+
      /  \                      |    |                   |    |
     |    |                     |    |                   |    |
     +----+                      \  /                    +----+
                                  \/
   #27ae60 Green            #d90429 Red             #e2e8f0 Light Slate

   4. MARKED FOR REVIEW    5. ANSWERED & MARKED FOR REVIEW
   (Perfect Circle)        (Circle with Green Evaluation Dot)
        __                       __
      /    \                   /    \
     |      |                 |      |
      \ __ /                   \ __ (*) <- #27ae60 Dot (Evaluated)
   #7b2cbf Violet           #7b2cbf Violet + Green Badge
```

#### Production CSS Clip-Paths for TCS iON Polygons:
```css
/* 1. Answered: Upward Pointed Pentagon */
.tcs-badge-answered {
  clip-path: polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%);
  background-color: #27ae60;
  color: #ffffff;
}

/* 2. Not Answered: Downward Pointed Pentagon */
.tcs-badge-not-answered {
  clip-path: polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%);
  background-color: #d90429;
  color: #ffffff;
}

/* 3. Not Visited: Clean Rounded Box */
.tcs-badge-not-visited {
  border-radius: 4px;
  background-color: #e2e8f0;
  border: 1px solid #cbd5e1;
  color: #334155;
}

/* 4. Marked for Review: Perfect Circle */
.tcs-badge-marked {
  border-radius: 9999px;
  background-color: #7b2cbf;
  color: #ffffff;
}

/* 5. Answered & Marked for Review: Circle with Evaluated Dot */
.tcs-badge-answered-marked {
  border-radius: 9999px;
  background-color: #7b2cbf;
  color: #ffffff;
  position: relative;
}
.tcs-badge-answered-marked::after {
  content: '';
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background-color: #22c55e;
  border: 2px solid #ffffff;
}
```

### 3.2 Action Bar Re-Architecture for Exam Mode
The bottom action toolbar must be separated into a **dual-zone ergonomic layout**:

- **Candidate Workflow Ergonomics (Left to Right):**
  1. `[ Mark for Review & Next ]` (Secondary violet/amber outline button)
  2. `[ Clear Response ]` (Subtle white/neutral slate button)
  3. `[ < Previous ]` (Allows fast navigation backwards without opening palette)
  4. `[ Save & Next > ]` (Dominant, high-contrast primary CTA)
- **Submit Test Location:**
  - On Desktop: Moved to the **footer of the Question Palette sidebar**.
  - On Mobile: Placed inside the mobile Question Palette drawer header/footer, with an explicit secondary confirmation. **NEVER** placed directly next to "Save & Next" on the primary bar!

---

## 4. Prioritized Modernization Plan & Technical Roadmap

```
+----------------------------------------------------------------------------------------------------+
|                                MODERNIZATION ROADMAP                                               |
+------------------------------------+---------------------------------------------------------------+
| PHASE 1: Critical Usability & Safety | - Eliminate Save/Submit button proximity hazard              |
| (Immediate Milestone)               | - Add safe-area insets (iOS/Android gesture bars & notches)   |
|                                     | - Enforce >=44px touch targets on all mobile buttons          |
|                                     | - Fix LaTeX KaTeX multi-line and delimiter parser bugs        |
|                                     | - Fix dead pattern filter in AnalyticsGrowthHub               |
+------------------------------------+---------------------------------------------------------------+
| PHASE 2: TCS iON Fidelity & Theme   | - Implement authentic CSS polygon clip-paths                  |
| Overhaul                           | - Resolve "Jekyll & Hyde" theme fracture (support dual theme) |
|                                     | - Add 3-stage dynamic timer urgency cues                      |
|                                     | - Implement mobile edge-swipeable Question Palette drawer     |
+------------------------------------+---------------------------------------------------------------+
| PHASE 3: Diagnostics & Data Viz    | - Build 4-Quadrant Speed-Accuracy Matrix scatter plot         |
| Evolution                           | - Implement Time-Trap Sunk Cost drain bar chart               |
|                                     | - Add Score Trend Sparklines to AnalyticsGrowthHub            |
|                                     | - Salvage and refactor 600 lines of commented analytics code  |
|                                     | - Add Question Difficulty indicators (Easy/Med/Hard)          |
+------------------------------------+---------------------------------------------------------------+
| PHASE 4: Cross-Platform Polish     | - Convert centered modals to Mobile Bottom Sheets             |
|                                     | - Implement haptic micro-interactions (Android/iOS)           |
|                                     | - Responsive Table-to-Card transformations for mobile         |
|                                     | - WCAG AA accessible contrast adjustments for category icons  |
+------------------------------------+---------------------------------------------------------------+
```

---

## 5. Architectural Specifications & Code Templates

### 5.1 MathRenderer.tsx Enhanced Parser
Fixes the delimiter bug and multi-line parsing failures:

```tsx
// Enhanced MathRenderer.tsx regex engine
export function processMathContent(content: string): string {
  if (!content) return '';

  let processed = content
    .replace(/src=["']\/\/([^"']+)["']/g, 'src="https://$1"')
    .replace(/src=\/\/([^\s>]+)/g, 'src="https://$1"');

  // 1. Standard Display Math: \[ ... \] or $$ ... $$
  processed = processed.replace(/(\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$)/g, (_, __, math1, math2) => {
    const formula = (math1 || math2 || '').trim();
    try {
      return katex.renderToString(formula, { displayMode: true, throwOnError: false });
    } catch {
      return `$$${formula}$$`;
    }
  });

  // 2. Standard Inline Math: \( ... \) or $ ... $
  processed = processed.replace(/(\\\(([\s\S]*?)\\\)|\$([^\$\n\r]+?)\$)/g, (_, __, math1, math2) => {
    const formula = (math1 || math2 || '').trim();
    try {
      return katex.renderToString(formula, { displayMode: false, throwOnError: false });
    } catch {
      return `$${formula}$`;
    }
  });

  return processed;
}
```

### 5.2 Mobile Safe Bottom Action Bar Architecture
Prevents gesture bar overlap and isolates "Submit Test":

```tsx
{/* Ergonomic Mobile Action Bar for CBTExamPlayer.tsx */}
<footer className="bg-white dark:bg-[#18181b] border-t border-slate-200 dark:border-zinc-800 px-3 md:px-6 py-2.5 md:py-3.5 flex items-center justify-between gap-2 shrink-0 select-none safe-bottom shadow-lg z-30">
  {/* Left Utility Actions */}
  <div className="flex items-center space-x-1.5 md:space-x-3">
    <button
      onClick={handleMarkForReviewAndNext}
      className="min-h-[44px] px-3 md:px-4 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl font-semibold text-xs md:text-sm active:scale-95 transition-all"
    >
      <span className="hidden sm:inline">Mark for Review & Next</span>
      <span className="sm:hidden">Review</span>
    </button>
    <button
      onClick={handleClearResponse}
      className="min-h-[44px] px-3 md:px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 rounded-xl font-semibold text-xs md:text-sm active:scale-95 transition-all"
    >
      Clear
    </button>
  </div>

  {/* Right Navigation & Progression */}
  <div className="flex items-center space-x-2">
    <button
      onClick={() => setIsPaletteOpen(true)}
      className="lg:hidden min-h-[44px] px-3 py-2 bg-slate-800 dark:bg-zinc-700 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 active:scale-95 transition-all"
    >
      <LayoutGrid size={15} className="text-amber-400" />
      <span>Palette</span>
    </button>

    <button
      onClick={handleSaveAndNext}
      className="min-h-[44px] px-5 md:px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs md:text-sm shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 active:scale-95 transition-all"
    >
      <span>Save & Next</span>
      <ChevronRight size={16} />
    </button>
  </div>
</footer>
```

### 5.3 Speed-Accuracy 4-Quadrant Diagnostic Matrix Specification
A clean, lightweight SVG/Canvas-free React quadrant component for `DeepAnalyticsView.tsx`:

```tsx
interface MatrixItem {
  questionNumber: number;
  timeSpentSeconds: number;
  isCorrect: boolean;
  sectionName: string;
  topic: string;
}

export function SpeedAccuracyMatrix({ questions, avgTimePerQuestion }: { questions: MatrixItem[]; avgTimePerQuestion: number }) {
  // Quadrant 1: Fast & Correct (< avgTime, Correct)
  const q1 = questions.filter(q => q.timeSpentSeconds <= avgTimePerQuestion && q.isCorrect);
  // Quadrant 2: Fast & Incorrect (< avgTime, Incorrect)
  const q2 = questions.filter(q => q.timeSpentSeconds <= avgTimePerQuestion && !q.isCorrect);
  // Quadrant 3: Slow & Correct (> avgTime, Correct)
  const q3 = questions.filter(q => q.timeSpentSeconds > avgTimePerQuestion && q.isCorrect);
  // Quadrant 4: Slow & Incorrect (> avgTime, Incorrect)
  const q4 = questions.filter(q => q.timeSpentSeconds > avgTimePerQuestion && !q.isCorrect);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
      {/* Quadrant 1: Velocity & Mastery */}
      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
            <span>⚡ High Mastery Zone</span>
          </h4>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
            {q1.length} Questions
          </span>
        </div>
        <p className="text-[11px] text-slate-400">Fast pacing (&le;{avgTimePerQuestion}s) with 100% accuracy. Your scoring engine.</p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {q1.map(q => (
            <span key={q.questionNumber} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
              Q.{q.questionNumber} ({q.timeSpentSeconds}s)
            </span>
          ))}
        </div>
      </div>

      {/* Quadrant 2: Careless / Overconfident */}
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-amber-400 flex items-center space-x-1.5">
            <span>⚠️ Careless / Rushed Zone</span>
          </h4>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-300">
            {q2.length} Questions
          </span>
        </div>
        <p className="text-[11px] text-slate-400">Rushed answers (&le;{avgTimePerQuestion}s) that resulted in negative marks.</p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {q2.map(q => (
            <span key={q.questionNumber} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-700">
              Q.{q.questionNumber} ({q.timeSpentSeconds}s)
            </span>
          ))}
        </div>
      </div>

      {/* Quadrant 3: Over-deliberated / Inefficient */}
      <div className="bg-blue-950/30 border border-blue-800/60 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-blue-400 flex items-center space-x-1.5">
            <span>⏳ Inefficient Mastery Zone</span>
          </h4>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
            {q3.length} Questions
          </span>
        </div>
        <p className="text-[11px] text-slate-400">Correct answers, but took excessive time (&gt;{avgTimePerQuestion}s). Needs speed drills.</p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {q3.map(q => (
            <span key={q.questionNumber} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-700">
              Q.{q.questionNumber} ({q.timeSpentSeconds}s)
            </span>
          ))}
        </div>
      </div>

      {/* Quadrant 4: Time Traps / Critical Gaps */}
      <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-rose-400 flex items-center space-x-1.5">
            <span>🚨 Critical Time Traps</span>
          </h4>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-300">
            {q4.length} Questions
          </span>
        </div>
        <p className="text-[11px] text-slate-400">High time spent (&gt;{avgTimePerQuestion}s) leading to negative marks. Highest priority to eliminate.</p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {q4.map(q => (
            <span key={q.questionNumber} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/60 text-rose-300 border border-rose-700">
              Q.{q.questionNumber} ({q.timeSpentSeconds}s)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Verification & Usability Testing Checklist

Before deploying UI modernization changes, test against these strict cross-platform acceptance criteria:

- [ ] **TCS iON Geometric Accuracy:** Answered questions render with upward-pointing pentagons, not-answered with downward pentagons, and marked for review as circles.
- [ ] **Accidental Submission Prevention:** "Submit Test" button is separated by at least 150px or placed in an independent palette drawer on mobile devices.
- [ ] **Gesture Navigation Bar Clearance:** All footers and drawers respect `env(safe-area-inset-bottom)` with a minimum clearance of 16px.
- [ ] **Hardware Back Button Stability:** Pressing Android hardware back button gracefully closes open modals, then drawers, then pauses the exam without unceremoniously exiting to the desktop.
- [ ] **KaTeX Multi-Line Math:** Questions containing `\[ ... \]`, `\begin{aligned}`, and inline math with newlines render with zero unrendered LaTeX artifacts.
- [ ] **Touch Target Integrity:** Every clickable icon, pill, and button across all platforms satisfies the >=44x44px bounding box rule.
- [ ] **Theme Uniformity:** Either full dual-mode support is extended to `CBTExamPlayer` and `DeepAnalyticsView`, or an explicit "TCS iON Classic Mode" switch is provided that candidates can toggle.
- [ ] **Desktop Collapse Layout:** Expanding and collapsing the desktop question palette causes zero horizontal scrollbar stutter or overlapping content.
