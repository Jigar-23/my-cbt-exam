/**
 * Bidirectional Sync Engine (Local-First IndexedDB <-> Google Drive AppData Sandbox)
 * CBT Exam Master 2026
 * 
 * Invariants:
 * 1. Offline-First: All exam taking happens locally without network blocking.
 * 2. Additive Union: Attempts are immutable and globally unique (zero overwrite conflict).
 * 3. In-Flight Continuity: Mid-exam snapshots sync to enable resuming across devices.
 */

import { AttemptRecord } from '../analyticsEngine';
import {
  getAllAttempts,
  saveCompletedAttempt,
  deleteAttempt,
  getDeletedTombstones,
  recordTombstones,
  getAllInFlightSnapshots,
  saveInFlightSnapshot,
  clearInFlightSnapshot,
  InFlightExamSnapshot,
} from '../analyticsStorage';
import { getStoredAccessToken, getStoredUser } from './gdriveAuth';
import {
  listAppDataFiles,
  downloadAppDataFile,
  uploadAppDataFile,
  ensureAppDataFolder,
  deleteAppDataFile,
  upsertAppDataFile,
  findAppDataFileByName,
  DriveFileMetadata,
} from './gdriveClient';
import { SyncReport, UserProfileRecord } from './types';

const FOLDER_ATTEMPTS = 'attempts';
const FOLDER_IN_FLIGHT = 'in_flight';
const FILE_USER_PROFILE = 'user_profile.json';
const FILE_TOMBSTONES = 'tombstones.json';
const STORAGE_KEY_LAST_SYNC = 'cbt_gdrive_last_sync_time';

/**
 * Returns the timestamp of the last successful sync.
 */
export function getLastSyncTime(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  return raw ? parseInt(raw, 10) : null;
}

/**
 * Uploads a single newly completed exam attempt to Google Drive in the background.
 */
export async function syncAttemptToDrive(attempt: AttemptRecord): Promise<boolean> {
  const token = getStoredAccessToken();
  if (!token) return false;

  try {
    const attemptsFolderId = await ensureAppDataFolder(FOLDER_ATTEMPTS);
    const fileName = `attempt_${attempt.attemptId}.json`;
    await uploadAppDataFile(fileName, attempt, attemptsFolderId);
    return true;
  } catch (err) {
    console.warn('Background sync of attempt to Google Drive failed:', err);
    return false;
  }
}

/**
 * Uploads an in-flight exam snapshot to Google Drive for cross-device resume.
 */
export async function syncInFlightToDrive(snapshot: InFlightExamSnapshot): Promise<boolean> {
  const token = getStoredAccessToken();
  if (!token) return false;

  try {
    const inFlightFolderId = await ensureAppDataFolder(FOLDER_IN_FLIGHT);
    const fileName = `in_flight_${snapshot.testId}.json`;
    await upsertAppDataFile(fileName, snapshot, inFlightFolderId);
    return true;
  } catch (err) {
    console.warn('Sync of in-flight snapshot to Google Drive failed:', err);
    return false;
  }
}

/**
 * Clears an in-flight snapshot from Google Drive once submitted or discarded.
 */
export async function clearInFlightFromDrive(testId: string): Promise<void> {
  const token = getStoredAccessToken();
  if (!token) return;

  try {
    const fileName = `in_flight_${testId}.json`;
    const existing = await findAppDataFileByName(fileName);
    if (existing) {
      await deleteAppDataFile(existing.id);
    }
  } catch (err) {
    console.warn('Clearing in-flight snapshot from Google Drive failed:', err);
  }
}

/**
 * Full bi-directional synchronization between local storage and Google Drive AppData.
 */
export async function syncAllWithDrive(): Promise<SyncReport> {
  const token = getStoredAccessToken();
  const user = getStoredUser();

  if (!token || !user) {
    return {
      success: false,
      uploadedAttempts: 0,
      downloadedAttempts: 0,
      inFlightSynced: false,
      profileSynced: false,
      error: 'Not signed in with Google',
    };
  }

  let uploadedCount = 0;
  let downloadedCount = 0;

  try {
    // 1. Ensure folder structure
    const attemptsFolderId = await ensureAppDataFolder(FOLDER_ATTEMPTS);
    const inFlightFolderId = await ensureAppDataFolder(FOLDER_IN_FLIGHT);

    // 2. Sync User Profile & Preferences
    let profileSynced = false;
    try {
      const localPrefsRaw = localStorage.getItem('cbt_user_preferences');
      const localPrefs = localPrefsRaw ? JSON.parse(localPrefsRaw) : null;

      const currentTheme = (localStorage.getItem('cbt_theme_mode') || localStorage.getItem('cbt_theme') || 'system') as any;
      const profileRecord: UserProfileRecord = {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        targetDomains: localPrefs?.selectedDomains || ['banking'],
        targetSubdomains: localPrefs?.selectedSubdomains || ['ibps_so_it'],
        theme: currentTheme,
        fontSizeOffset: parseInt(localStorage.getItem('cbt_font_size_offset') || '0', 10),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncedAt: Date.now(),
      };

      const existingProfileFile = await findAppDataFileByName(FILE_USER_PROFILE);
      if (existingProfileFile && !localPrefsRaw) {
        try {
          const remoteProfile = await downloadAppDataFile<UserProfileRecord>(existingProfileFile.id);
          if (remoteProfile) {
            if (remoteProfile.theme) {
              localStorage.setItem('cbt_theme_mode', remoteProfile.theme);
              localStorage.setItem('cbt_theme', remoteProfile.theme);
            }
            if (remoteProfile.targetDomains) {
              localStorage.setItem(
                'cbt_user_preferences',
                JSON.stringify({
                  selectedDomains: remoteProfile.targetDomains,
                  selectedSubdomains: remoteProfile.targetSubdomains || [],
                })
              );
            }
          }
        } catch {}
      }

      await upsertAppDataFile(FILE_USER_PROFILE, profileRecord);
      profileSynced = true;
    } catch (e) {
      console.warn('Profile sync warning:', e);
    }

    // 2.5 Sync Deletion Tombstones (Prevents resurrection of deleted attempts)
    const localTombstones = getDeletedTombstones();
    const tombstoneSet = new Set<string>(localTombstones);
    try {
      const remoteTombstoneFile = await findAppDataFileByName(FILE_TOMBSTONES);
      if (remoteTombstoneFile) {
        const remoteTombstones = await downloadAppDataFile<string[]>(remoteTombstoneFile.id);
        if (Array.isArray(remoteTombstones)) {
          remoteTombstones.forEach((id) => tombstoneSet.add(id));
        }
      }
      const mergedTombstones = Array.from(tombstoneSet);
      recordTombstones(mergedTombstones);
      if (mergedTombstones.length > 0) {
        await upsertAppDataFile(FILE_TOMBSTONES, mergedTombstones);
      }
    } catch (e) {
      console.warn('Tombstones sync warning:', e);
    }

    // 3. Sync Test Attempts (Additive Union minus Tombstoned records)
    const localAttempts = await getAllAttempts();
    const localAttemptMap = new Map(localAttempts.map((a) => [a.attemptId, a]));

    const remoteAttemptFiles = await listAppDataFiles(`'${attemptsFolderId}' in parents and trashed = false`);
    const remoteAttemptFileMap = new Map<string, DriveFileMetadata>();

    for (const file of remoteAttemptFiles) {
      // Filename format: attempt_{attemptId}.json
      if (file.name.startsWith('attempt_') && file.name.endsWith('.json')) {
        const attemptId = file.name.replace(/^attempt_/, '').replace(/\.json$/, '');
        if (tombstoneSet.has(attemptId)) {
          // Attempt was deleted: purge the file from Google Drive permanently!
          try {
            await deleteAppDataFile(file.id);
          } catch (delErr) {
            console.warn(`Failed to purge tombstoned attempt ${attemptId} from Drive:`, delErr);
          }
          continue;
        }
        remoteAttemptFileMap.set(attemptId, file);
      }
    }

    // A. Upload local attempts not on Drive (skip tombstones)
    for (const [attemptId, attempt] of localAttemptMap.entries()) {
      if (tombstoneSet.has(attemptId)) {
        // Was deleted on another device: remove locally
        await deleteAttempt(attemptId);
        continue;
      }
      if (!remoteAttemptFileMap.has(attemptId)) {
        try {
          const fileName = `attempt_${attemptId}.json`;
          await uploadAppDataFile(fileName, attempt, attemptsFolderId);
          uploadedCount++;
        } catch (err) {
          console.warn(`Failed to upload attempt ${attemptId}:`, err);
        }
      }
    }

    // B. Download remote attempts not in local IndexedDB (skip tombstones)
    for (const [attemptId, file] of remoteAttemptFileMap.entries()) {
      if (tombstoneSet.has(attemptId)) continue;
      if (!localAttemptMap.has(attemptId)) {
        try {
          const remoteAttempt = await downloadAppDataFile<AttemptRecord>(file.id);
          if (remoteAttempt && remoteAttempt.attemptId) {
            await saveCompletedAttempt(remoteAttempt);
            downloadedCount++;
          }
        } catch (err) {
          console.warn(`Failed to download attempt ${attemptId}:`, err);
        }
      }
    }

    // 4. Sync In-Flight Snapshots
    let inFlightSynced = false;
    try {
      const localSnapshots = getAllInFlightSnapshots();
      const remoteSnapshotFiles = await listAppDataFiles(`'${inFlightFolderId}' in parents and trashed = false`);

      // Upload local in-flight snapshots
      for (const [testId, snapshot] of Object.entries(localSnapshots)) {
        const fileName = `in_flight_${testId}.json`;
        await upsertAppDataFile(fileName, snapshot, inFlightFolderId);
      }

      // Download remote snapshots if newer than local
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
      inFlightSynced = true;
    } catch (e) {
      console.warn('In-flight sync warning:', e);
    }

    // Update last sync timestamp
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(now));

    return {
      success: true,
      uploadedAttempts: uploadedCount,
      downloadedAttempts: downloadedCount,
      inFlightSynced,
      profileSynced,
    };
  } catch (err: any) {
    return {
      success: false,
      uploadedAttempts: uploadedCount,
      downloadedAttempts: downloadedCount,
      inFlightSynced: false,
      profileSynced: false,
      error: err.message || 'Sync failed',
    };
  }
}

/**
 * Immediately deletes an attempt from Google Drive AppData if online.
 */
export async function deleteAttemptFromDrive(attemptId: string): Promise<void> {
  const token = getStoredAccessToken();
  if (!token) return;

  try {
    const fileName = `attempt_${attemptId}.json`;
    const existing = await findAppDataFileByName(fileName);
    if (existing) {
      await deleteAppDataFile(existing.id);
    }
  } catch (err) {
    console.warn('Deleting attempt from Drive failed:', err);
  }
}
