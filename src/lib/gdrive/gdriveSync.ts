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
import {
  getAllBookmarks,
  importBookmarksFromJson,
  BookmarkedQuestion,
} from '../bookmarkStorage';
import { getDevicePhysicalId, getUserMobileNumber, getDevicePlatformName } from '../deviceIdentity';
import { registerDeviceToSecurityCloud } from '../securityManager';
import { DeviceRecord } from './types';

const FOLDER_ATTEMPTS = 'attempts';
const FOLDER_IN_FLIGHT = 'in_flight';
const FILE_USER_PROFILE = 'user_profile.json';
const FILE_DEVICES = 'devices.json';
const FILE_TOMBSTONES = 'tombstones.json';
const FILE_BOOKMARKS = 'bookmarks.json';
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

const SECURITY_FILE_ID = process.env.NEXT_PUBLIC_SECURITY_FILE_ID || '1PsRWWJ8GCfVtOEc3nKL-xrMr-xAzM1Mt';
const GDRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GDRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Directly writes device & user registration into the central app_security.json
 * in the admin's CBT_EXAM_MASTER Google Drive folder using the user's OAuth access token.
 */
export async function syncDeviceToCentralSecurityDrive(
  token: string,
  email: string,
  mobileNumber?: string,
  deviceId?: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const devId = deviceId || (await getDevicePhysicalId());
    const customDriveFileId = (typeof window !== 'undefined' ? localStorage.getItem('cbt_custom_security_file_id') : null) || SECURITY_FILE_ID;
    const now = new Date().toISOString();
    const platform = getDevicePlatformName();

    // 1. Fetch current content of app_security.json
    let currentConfig: any = {
      status: 'allow',
      VALIDITYCODE: '000000',
      workCode: '000000',
      updatedAt: now,
      message: 'Authorized access',
      devices: {},
      users: {},
    };

    let fetchSuccessful = false;
    try {
      const getRes = await fetch(`${GDRIVE_API_BASE}/files/${customDriveFileId}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (getRes.ok) {
        const parsed = await getRes.json();
        if (parsed && typeof parsed === 'object') {
          currentConfig = { ...parsed };
          fetchSuccessful = true;
        }
      } else {
        const apiKey = process.env.NEXT_PUBLIC_GDRIVE_API_KEY || 'AIzaSyAjVpdPsETQs_iW1lB-XOYacVdN7-U8gL4';
        const altRes = await fetch(`${GDRIVE_API_BASE}/files/${customDriveFileId}?alt=media&key=${apiKey}&supportsAllDrives=true`, {
          cache: 'no-store',
        });
        if (altRes.ok) {
          const parsed = await altRes.json();
          if (parsed && typeof parsed === 'object') {
            currentConfig = { ...parsed };
            fetchSuccessful = true;
          }
        }
      }
    } catch (e) {
      console.warn('[GDriveSync] Failed to read central app_security.json with Bearer:', e);
    }

    if (!fetchSuccessful) {
      console.warn('[GDriveSync] Skipping central security sync: unable to verify existing app_security.json');
      return false;
    }

    if (!currentConfig.devices) currentConfig.devices = {};
    if (!currentConfig.users) currentConfig.users = {};

    // 2. Append or update device record
    const existingDevice = currentConfig.devices[devId] || {};
    currentConfig.devices[devId] = {
      device_id: devId,
      latest_email: email || existingDevice.latest_email || '',
      mobile_number: mobileNumber || existingDevice.mobile_number || '',
      platform: platform,
      blocked: existingDevice.blocked === true,
      last_sync_date: now,
    };

    // 3. Append or update user record if email is available
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existingUser = currentConfig.users[cleanEmail] || {};
      const devList = Array.isArray(existingUser.devices) ? [...existingUser.devices] : [];
      if (!devList.includes(devId)) {
        devList.push(devId);
      }
      currentConfig.users[cleanEmail] = {
        email: cleanEmail,
        mobile_number: mobileNumber || existingUser.mobile_number || '',
        devices: devList,
        registered_at: existingUser.registered_at || now,
        last_active: now,
      };
    }

    currentConfig.updatedAt = now;

    // 4. Directly update app_security.json via Google Drive upload PATCH
    const patchUrl = `${GDRIVE_UPLOAD_BASE}/files/${customDriveFileId}?uploadType=media&supportsAllDrives=true`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentConfig, null, 2),
    });

    if (patchRes.ok) {
      console.log(`[GDriveSync] Successfully registered device ${devId} directly into central app_security.json on Drive!`);
      return true;
    } else {
      const errTxt = await patchRes.text();
      console.warn(`[GDriveSync] Central app_security.json direct write returned HTTP ${patchRes.status}:`, errTxt);
      return false;
    }
  } catch (err) {
    console.warn('[GDriveSync] Direct central security sync error:', err);
    return false;
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
    // 0. Eagerly register device and user into admin's central app_security.json
    getDevicePhysicalId()
      .then((devId) => {
        const userMobile = getUserMobileNumber() || undefined;
        syncDeviceToCentralSecurityDrive(token, user.email, userMobile, devId).catch(() => {});
      })
      .catch(() => {});

    // 1. Ensure folder structure
    const attemptsFolderId = await ensureAppDataFolder(FOLDER_ATTEMPTS);
    const inFlightFolderId = await ensureAppDataFolder(FOLDER_IN_FLIGHT);

    // 2. Sync User Profile & Preferences
    let profileSynced = false;
    try {
      const localPrefsRaw = localStorage.getItem('cbt_user_preferences');
      let localPrefs = localPrefsRaw ? JSON.parse(localPrefsRaw) : null;

      // Cleanse legacy hardcoded single-domain fallback if present
      if (
        localPrefs?.selectedDomains?.length === 1 &&
        localPrefs.selectedDomains[0] === 'banking' &&
        localPrefs.selectedSubdomains?.length === 1 &&
        localPrefs.selectedSubdomains[0] === 'ibps_so_it'
      ) {
        localStorage.removeItem('cbt_user_preferences');
        localPrefs = null;
      }

      const currentTheme = (localStorage.getItem('cbt_theme_mode') || localStorage.getItem('cbt_theme') || 'system') as any;
      const deviceId = await getDevicePhysicalId();
      const userMobile = getUserMobileNumber() || undefined;
      const profileRecord: UserProfileRecord = {
        userId: user.userId,
        email: user.email,
        mobileNumber: userMobile,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        targetDomains: localPrefs?.selectedDomains || [],
        targetSubdomains: localPrefs?.selectedSubdomains || [],
        theme: currentTheme,
        fontSizeOffset: parseInt(localStorage.getItem('cbt_font_size_offset') || '0', 10),
        deviceId: deviceId,
        devicePhysicalId: deviceId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncedAt: Date.now(),
      };

      const existingProfileFile = await findAppDataFileByName(FILE_USER_PROFILE);
      if (existingProfileFile) {
        try {
          const remoteProfile = await downloadAppDataFile<UserProfileRecord>(existingProfileFile.id);
          if (remoteProfile) {
            if (remoteProfile.theme) {
              localStorage.setItem('cbt_theme_mode', remoteProfile.theme);
              localStorage.setItem('cbt_theme', remoteProfile.theme);
            }
            if (remoteProfile.targetDomains) {
              const isLegacyFallback =
                remoteProfile.targetDomains.length === 1 &&
                remoteProfile.targetDomains[0] === 'banking' &&
                remoteProfile.targetSubdomains?.length === 1 &&
                remoteProfile.targetSubdomains[0] === 'ibps_so_it';

              if (!isLegacyFallback && remoteProfile.targetDomains.length > 0) {
                if (!localPrefs) {
                  localStorage.setItem(
                    'cbt_user_preferences',
                    JSON.stringify({
                      selectedDomains: remoteProfile.targetDomains,
                      selectedSubdomains: remoteProfile.targetSubdomains || [],
                    })
                  );
                  profileRecord.targetDomains = remoteProfile.targetDomains;
                  profileRecord.targetSubdomains = remoteProfile.targetSubdomains || [];
                }
              } else if (isLegacyFallback) {
                // Wipe away the unintended single-category filter
                localStorage.removeItem('cbt_user_preferences');
                profileRecord.targetDomains = [];
                profileRecord.targetSubdomains = [];
              }
            }
          }
        } catch {}
      }

      await upsertAppDataFile(FILE_USER_PROFILE, profileRecord);

      // 2b. Sync Devices Table entry (Primary key: Hardware MAC/Physical Device ID)
      const deviceRecord: DeviceRecord = {
        deviceId,
        email: user.email,
        mobileNumber: userMobile,
        lastSyncDate: new Date().toISOString(),
        platform: getDevicePlatformName(),
      };
      await upsertAppDataFile(FILE_DEVICES, deviceRecord);

      // Direct write to admin's central app_security.json on Google Drive
      syncDeviceToCentralSecurityDrive(token, user.email, userMobile, deviceId).catch(() => {});

      // Register device and user to cloud security registry via fallback webhook
      registerDeviceToSecurityCloud(true).catch(() => {});

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

      // Deduplicate unique local snapshots by canonical testId
      const uniqueSnapshots = new Map<string, InFlightExamSnapshot>();
      for (const snap of Object.values(localSnapshots)) {
        if (snap && snap.testId) {
          const canonicalId = snap.testId;
          const existing = uniqueSnapshots.get(canonicalId);
          if (!existing || snap.lastSavedAt > existing.lastSavedAt) {
            uniqueSnapshots.set(canonicalId, snap);
          }
        }
      }

      // Upload unique local in-flight snapshots
      for (const [canonicalId, snapshot] of uniqueSnapshots.entries()) {
        const fileName = `in_flight_${canonicalId}.json`;
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

    // 5. Sync Bookmarked Questions (bookmarks.json)
    let bookmarksSynced = false;
    try {
      const existingBookmarkFile = await findAppDataFileByName(FILE_BOOKMARKS);
      if (existingBookmarkFile) {
        const remoteBookmarks = await downloadAppDataFile<BookmarkedQuestion[]>(existingBookmarkFile.id);
        if (Array.isArray(remoteBookmarks)) {
          importBookmarksFromJson(remoteBookmarks);
        }
      }

      // Upsert merged bookmarks to Google Drive AppData
      const finalBookmarks = getAllBookmarks();
      if (finalBookmarks.length > 0 || existingBookmarkFile) {
        await upsertAppDataFile(FILE_BOOKMARKS, finalBookmarks);
      }
      bookmarksSynced = true;
    } catch (e) {
      console.warn('Bookmarks sync warning:', e);
    }

    // Update last sync timestamp
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(now));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cbt_gdrive_auth_changed'));
      window.dispatchEvent(new Event('cbt_sync_completed'));
      window.dispatchEvent(new Event('cbt_snapshot_updated'));
    }

    return {
      success: true,
      uploadedAttempts: uploadedCount,
      downloadedAttempts: downloadedCount,
      inFlightSynced,
      profileSynced,
      bookmarksSynced,
    };
  } catch (err: any) {
    return {
      success: false,
      uploadedAttempts: uploadedCount,
      downloadedAttempts: downloadedCount,
      inFlightSynced: false,
      profileSynced: false,
      bookmarksSynced: false,
      error: err.message || 'Sync failed',
    };
  }
}

/**
 * Silently syncs all bookmarks to Google Drive AppData sandbox in the background.
 */
export async function syncBookmarksToDrive(): Promise<boolean> {
  const token = getStoredAccessToken();
  if (!token) return false;

  try {
    const current = getAllBookmarks();
    await upsertAppDataFile(FILE_BOOKMARKS, current);
    return true;
  } catch (err) {
    console.warn('Sync of bookmarks to Drive failed:', err);
    return false;
  }
}

// Background auto-sync on bookmark change if authenticated
if (typeof window !== 'undefined') {
  let bookmarkSyncTimeout: NodeJS.Timeout | null = null;
  window.addEventListener('cbt_bookmarks_changed', () => {
    if (bookmarkSyncTimeout) clearTimeout(bookmarkSyncTimeout);
    bookmarkSyncTimeout = setTimeout(() => {
      syncBookmarksToDrive();
    }, 1500);
  });
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
