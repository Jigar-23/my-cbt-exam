# CBT Exam Master 2026: Unified Cross-Platform Platform

> **Authentic TCS iON Computer-Based Test (CBT) Simulator & Cognitive Analytics Engine**
> Single-source architecture supporting **Android, iOS, macOS, Windows, and Web** with zero-server personal cloud database sync via Google Drive (`appDataFolder`).

---

## Key Capabilities

1. **True Multi-Platform Single Codebase:**
   - **Web:** Next.js 16.3 (Turbopack) static export.
   - **Desktop (macOS / Windows):** Electron shell with native menu bar, hardware acceleration, and auto-updater.
   - **Mobile (Android / iOS):** Capacitor 8 with native haptic engines, status bar theming, and hardware back-gesture interception.
2. **Bring Your Own Storage (BYOS via Google Drive):**
   - **Zero Database Hosting Costs:** All test attempts, time intelligence telemetry, and topic mastery matrices persist to the student's personal Google Drive.
   - **100% Private Sandbox:** Uses `https://www.googleapis.com/auth/drive.appdata` (`appDataFolder`). The app has zero visibility into personal documents, photos, or emails.
   - **Cross-Device Concurrency:** Start a mock exam on Android, pause, and resume on Desktop without losing answered questions or remaining timer seconds.
   - **Additive Union Sync:** Offline test attempts never collide or overwrite each other when reconnecting to Wi-Fi.
3. **Official 2026 TCS iON Exam Simulation:**
   - 20-minute strict sectional timer locks (`NEW_PATTERN_2026`).
   - 5-state TCS question palette (Not Visited, Not Answered, Answered, Marked for Review, Answered & Marked).
   - Dynamic scientific formula rendering via KaTeX.
   - Sub-second micro-telemetry tracking (hesitation index, time traps, answer-change counter).

---

## Project Structure

```
CBT/test-android/
├── src/
│   ├── app/                      # Next.js 16 App Router & Entry Pages
│   │   ├── page.tsx              # Main Exam Catalog, Stage Filters, and Search
│   │   ├── layout.tsx            # Responsive Frame & Safe-Area Wrappers
│   │   └── globals.css           # Tailwind CSS v4 Theme Design Tokens
│   ├── components/
│   │   ├── CBTExamPlayer.tsx     # TCS iON Exam Runtime & Micro-Telemetry Tracker
│   │   ├── DeepAnalyticsView.tsx # Speed-Accuracy Matrix, Sectional Deep-Dive
│   │   ├── AnalyticsGrowthHub.tsx# Multi-Test Historical Trends & Clear Confirmations
│   │   ├── GoogleDriveLinkModal.tsx # On-Launch Cloud Attachment Modal
│   │   ├── GoogleDriveStatusPill.tsx# Live Sync Status Indicator & Account Drawer
│   │   └── UserPreferencesView.tsx  # Domain Goal Focus & Exam Filtering
│   └── lib/
│       ├── gdrive/               # Google Drive AppData Sync Engine & OAuth Client
│       │   ├── types.ts          # 7 Relational Schemas & Contracts
│       │   ├── gdriveAuth.ts     # GSI OAuth 2.0 Token Client (appDataFolder scope)
│       │   ├── gdriveClient.ts   # Google Drive REST API v3 Sandbox Client
│       │   └── gdriveSync.ts     # Local-First <-> Cloud Bidirectional Reconciler
│       ├── platform/
│       │   └── platformBridge.ts # Unified Haptics, Hardware Back Button, and Status Bar
│       ├── analyticsEngine.ts    # Evaluates Attempt, Time Traps, and Sectional Scores
│       ├── analyticsStorage.ts   # IndexedDB & LocalStorage Local-First Persistence
│       └── contentProvider.ts   # Cloud & Local Question Paper Normalizer
├── electron/
│   └── main.js                   # Desktop Window Wrapper & Static Local Server
├── android/                      # Native Android Gradle Project (Capacitor)
├── ios/                          # Native iOS Xcode Project (Capacitor)
├── public/data/                  # 33 MB Bundled Mock Tests & Manifests
└── package.json                  # Unified Build & Release Orchestrator
```

---

## Build & Run Commands

### 1. Web Application
```bash
# Run local dev server (Turbopack)
npm run dev

# Build production static export (outputs to out/)
npm run build
```

### 2. Desktop Application (macOS & Windows)
```bash
# Run live desktop app in development
npm run desktop

# Package macOS Desktop Application (Outputs to dist/mac-arm64/CBT Exam Master 2026.app)
npm run desktop:build
```

### 3. Mobile Android
```bash
# Sync web assets to Android
npm run android:sync

# Build production debug APK (Outputs to android/app/build/outputs/apk/debug/app-debug.apk)
npm run android:build

# Open in Android Studio
npm run android:open
```

### 4. Mobile iOS
```bash
# Sync web assets to iOS
npm run ios:sync

# Open in Xcode
npm run ios:open
```

---

## Data Schemas in Google Drive AppData

Inside the student's isolated `appDataFolder` sandbox:
1. **`user_profile.json`**: Student goals, target domains, theme, and font size.
2. **`attempts/attempt_{id}.json`**: Full evaluation records with sectional breakdowns, accuracy, and per-question telemetry.
3. **`in_flight/in_flight_{testId}.json`**: Mid-exam snapshots (`timeLeft`, `userAnswers`, `questionStatus`) for crash protection and cross-device hand-off.
4. **`topic_mastery.json`**: Materialized proficiency rollups across all historical tests.

---

## License & Distribution
Proprietary & Confidential. Built for CBT Exam Master 2026.
