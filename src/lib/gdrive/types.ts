/**
 * Types & Contracts for Google Drive Cloud Storage & Cross-Device Sync
 * CBT Exam Master 2026
 */

import { AttemptRecord } from '../analyticsEngine';
import { InFlightExamSnapshot } from '../analyticsStorage';

export interface GoogleUser {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

export interface UserProfileRecord {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  targetDomains: string[];
  targetSubdomains: string[];
  theme: 'system' | 'light' | 'dark';
  fontSizeOffset: number;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
}

export interface TopicMasteryItem {
  topicId: string;
  subjectId: string;
  totalQuestionsSeen: number;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracyPercentage: number;
  avgSpeedSeconds: number;
  timeTrapFrequency: number;
  masteryScore: number;
  diagnosticStatus: 'STRENGTH' | 'NEUTRAL' | 'CRITICAL_WEAKNESS';
  lastEvaluatedAt: number;
}

export interface BookmarkRecord {
  bookmarkId: string;
  userId: string;
  questionId: string;
  testId: string;
  tag: 'FORMULA' | 'REVISION' | 'DOUBT' | 'HIGH_YIELD';
  personalNote: string;
  createdAt: number;
}

export interface GDriveSyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  currentUser: GoogleUser | null;
  error: string | null;
}

export interface SyncReport {
  success: boolean;
  uploadedAttempts: number;
  downloadedAttempts: number;
  inFlightSynced: boolean;
  profileSynced: boolean;
  error?: string;
}
