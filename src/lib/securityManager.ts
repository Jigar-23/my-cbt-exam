/**
 * CBT Security & Licensing Manager
 * 
 * Features:
 * 1. Hardware MAC / Physical Device ID Tracking
 * 2. Remote App Kill-Switch (devices[deviceId].blocked === true or status: "blocked")
 * 3. Remote Degraded Version Invalidation (degraded: [1] in Google Drive security JSON)
 *    - Permanently marks outdated versions as degraded across all devices once online.
 *    - Completely locks exam playback & timers while preserving 100% of user attempt DB and bookmarks.
 *    - Automatic safe upgrade: newer versions (e.g. v2) automatically unlock and access the same local DB.
 * 4. Organization / Access Work Code with 30-day silent grace period
 * 5. Multi-tier Remote Sync (Google Drive REST API -> Local Manifest -> Offline Cache)
 */

import { getDevicePhysicalId } from './deviceIdentity';

// Constant build version of this client package (1 = v1.0.0)
export const CURRENT_APP_VERSION = 1;

export interface DeviceEntry {
  device_id?: string;
  latest_email?: string;
  blocked?: boolean;
  last_sync_date?: string;
  code?: string;
  updatedAt?: string;
}

export interface AppSecurityConfig {
  status: 'allow' | 'blocked';
  workCode: string;
  VALIDITYCODE?: string;
  updatedAt: string;
  message?: string;
  minVersion?: string | number;
  degraded?: (number | string)[];
  degradedVersions?: (number | string)[];
  degradedMessage?: string;
  downloadUrl?: string;
  devices?: Record<string, DeviceEntry>;
  users?: Record<string, any>;
}

export interface SecurityCheckResult {
  isBlocked: boolean;
  isDegraded: boolean;
  degradedMessage?: string;
  downloadUrl?: string;
  appVersion: number;
  blockMessage?: string;
  isValidCode: boolean;
  gracePeriodExpired: boolean;
  canTakeExams: boolean;
  daysRemainingInGrace: number;
  userWorkCode: string;
  remoteWorkCode: string;
  deviceId: string;
  updatedAt: string;
  lastCheckedAt: string;
  source: 'cloud_drive' | 'local_manifest' | 'cached' | 'fallback';
}

const GDRIVE_API_KEY = process.env.NEXT_PUBLIC_GDRIVE_API_KEY || 'AIzaSyAjVpdPsETQs_iW1lB-XOYacVdN7-U8gL4';
const SECURITY_FILE_ID = process.env.NEXT_PUBLIC_SECURITY_FILE_ID || '1PsRWWJ8GCfVtOEc3nKL-xrMr-xAzM1Mt';
const STORAGE_KEY_USER_CODE = 'cbt_user_work_code';
const STORAGE_KEY_MISMATCH_PREFIX = 'cbt_mismatch_first_seen_';

// Permanent Local Storage Keys for Version Invalidation
const STORAGE_KEY_DEGRADED = 'cbt_app_degraded';
const STORAGE_KEY_DEGRADED_VERSION = 'cbt_degraded_version';
const STORAGE_KEY_DEGRADED_REASON = 'cbt_degraded_reason';
const STORAGE_KEY_CACHED_CONFIG = 'cbt_cached_security_config';

// 30 days in milliseconds
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: AppSecurityConfig = {
  status: 'allow',
  VALIDITYCODE: '000000',
  workCode: '000000',
  degraded: [],
  updatedAt: '2026-10-01T00:00:00.000Z',
  message: 'All systems operational',
  devices: {
    VALIDITYCODE: {
      code: '000000',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  },
};

let inMemoryCache: { config: AppSecurityConfig; timestamp: number; source: SecurityCheckResult['source'] } | null = null;

/**
 * Fetch latest security configuration from Drive or local bundled endpoint
 */
export async function fetchRemoteSecurityConfig(forceRefresh: boolean = false): Promise<{ config: AppSecurityConfig; source: SecurityCheckResult['source'] }> {
  if (!forceRefresh && inMemoryCache && Date.now() - inMemoryCache.timestamp < 10000) {
    return { config: inMemoryCache.config, source: inMemoryCache.source };
  }

  const customDriveFileId = (typeof window !== 'undefined' ? localStorage.getItem('cbt_custom_security_file_id') : null) || SECURITY_FILE_ID;

  // 1. If a Google Drive File ID is configured, fetch directly from Google Drive Cloud API
  if (customDriveFileId) {
    try {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${customDriveFileId}?alt=media&key=${GDRIVE_API_KEY}&t=${Date.now()}`;
      const res = await fetch(driveUrl, { cache: 'no-store' });
      if (res.ok) {
        const driveData = await res.json();
        if (driveData && (driveData.workCode || driveData.status || driveData.VALIDITYCODE || driveData.devices || driveData.degraded)) {
          const config: AppSecurityConfig = {
            status: driveData.status === 'blocked' ? 'blocked' : 'allow',
            workCode: (driveData.VALIDITYCODE || driveData.workCode || '000000').trim().toUpperCase(),
            VALIDITYCODE: driveData.VALIDITYCODE || '000000',
            updatedAt: driveData.updatedAt || new Date().toISOString(),
            message: driveData.message || '',
            minVersion: driveData.minVersion,
            degraded: Array.isArray(driveData.degraded) ? driveData.degraded : (Array.isArray(driveData.degradedVersions) ? driveData.degradedVersions : []),
            degradedVersions: driveData.degradedVersions || driveData.degraded || [],
            degradedMessage: driveData.degradedMessage || driveData.message || '',
            downloadUrl: driveData.downloadUrl || '/download',
            devices: driveData.devices || {},
            users: driveData.users || {},
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY_CACHED_CONFIG, JSON.stringify(config));
            } catch (e) {}
          }
          inMemoryCache = { config, timestamp: Date.now(), source: 'cloud_drive' };
          return { config, source: 'cloud_drive' };
        }
      }
    } catch (e) {
      console.warn('[SecurityManager] Google Drive remote fetch failed:', e);
    }
  }

  // 1b. Check if Google Drive Manifest file contains security config
  const MANIFEST_FILE_ID = process.env.NEXT_PUBLIC_MANIFEST_FILE_ID || '14PeByz2hgAQfdVDKddrfqXhmDpA0lQR8';
  try {
    const manifestUrl = `https://www.googleapis.com/drive/v3/files/${MANIFEST_FILE_ID}?alt=media&key=${GDRIVE_API_KEY}&t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const mRes = await fetch(manifestUrl, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (mRes.ok) {
      const mData = await mRes.json();
      const secData = mData?.security || (mData?.workCode ? mData : null);
      if (secData && (secData.workCode || secData.status || secData.VALIDITYCODE || secData.devices || secData.degraded)) {
        const config: AppSecurityConfig = {
          status: secData.status === 'blocked' ? 'blocked' : 'allow',
          workCode: (secData.VALIDITYCODE || secData.workCode || '000000').trim().toUpperCase(),
          VALIDITYCODE: secData.VALIDITYCODE || '000000',
          updatedAt: secData.updatedAt || mData.lastUpdated || new Date().toISOString(),
          message: secData.message || '',
          minVersion: secData.minVersion,
          degraded: Array.isArray(secData.degraded) ? secData.degraded : (Array.isArray(secData.degradedVersions) ? secData.degradedVersions : []),
          degradedVersions: secData.degradedVersions || secData.degraded || [],
          degradedMessage: secData.degradedMessage || secData.message || '',
          downloadUrl: secData.downloadUrl || '/download',
          devices: secData.devices || {},
          users: secData.users || {},
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY_CACHED_CONFIG, JSON.stringify(config));
          } catch (e) {}
        }
        inMemoryCache = { config, timestamp: Date.now(), source: 'cloud_drive' };
        return { config, source: 'cloud_drive' };
      }
    }
  } catch (e) {}

  // 2. Check offline cached security config from localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CACHED_CONFIG);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return { config: parsed, source: 'cached' };
        }
      }
    } catch (e) {}
  }

  // 3. If Drive cannot be reached and no cache exists, use safe default allowing offline practice
  return { config: DEFAULT_CONFIG, source: 'fallback' };
}

/**
 * Evaluates current security state: block status, degraded version, work code validity, and grace period
 */
export async function getSecurityStatus(forceRefresh: boolean = false): Promise<SecurityCheckResult> {
  const { config, source } = await fetchRemoteSecurityConfig(forceRefresh);
  const deviceId = await getDevicePhysicalId();

  // 1. Hardware-level block check & global block check
  const deviceEntry = config.devices?.[deviceId];
  const isDeviceBlocked = deviceEntry?.blocked === true;
  const isGlobalBlocked = config.status === 'blocked';
  const isBlocked = isDeviceBlocked || isGlobalBlocked;

  // 2. Degraded Version Invalidation Logic (Option A - Hard Lockout Gate without DB damage)
  const storedDegraded = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DEGRADED) === 'true' : false;
  const storedDegradedVersion = typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEY_DEGRADED_VERSION)) : null;

  // App is degraded if previously permanently flagged for THIS specific running version
  let isDegraded = storedDegraded && storedDegradedVersion === CURRENT_APP_VERSION;
  let degradedMessage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DEGRADED_REASON) || '' : '';

  // Extract remote degraded list from security JSON
  const degradedList: (number | string)[] = Array.isArray(config.degraded)
    ? config.degraded
    : Array.isArray(config.degradedVersions)
    ? config.degradedVersions
    : [];

  // Check if current version is in remote degraded list or below minVersion
  const minVerNum = config.minVersion !== undefined ? Number(config.minVersion) : null;
  const isBelowMin = minVerNum !== null && !isNaN(minVerNum) && CURRENT_APP_VERSION < minVerNum;

  const isInDegradedList = degradedList.some(
    (v) => Number(v) === CURRENT_APP_VERSION || String(v).trim().toLowerCase() === String(CURRENT_APP_VERSION).toLowerCase()
  );

  if (isInDegradedList || isBelowMin) {
    isDegraded = true;
    degradedMessage =
      config.degradedMessage ||
      config.message ||
      `Version ${CURRENT_APP_VERSION}.0 has been retired for security and stability. Please update to the latest release to continue.`;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DEGRADED, 'true');
      localStorage.setItem(STORAGE_KEY_DEGRADED_VERSION, String(CURRENT_APP_VERSION));
      localStorage.setItem(STORAGE_KEY_DEGRADED_REASON, degradedMessage);
    }
  } else if (
    storedDegraded &&
    storedDegradedVersion === CURRENT_APP_VERSION &&
    (source === 'cloud_drive' || source === 'local_manifest')
  ) {
    // Remote connection verified that this version is NOT degraded anymore! Clear local lock safely
    isDegraded = false;
    degradedMessage = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_DEGRADED);
      localStorage.removeItem(STORAGE_KEY_DEGRADED_VERSION);
      localStorage.removeItem(STORAGE_KEY_DEGRADED_REASON);
    }
  } else if (storedDegraded && storedDegradedVersion !== null && storedDegradedVersion !== CURRENT_APP_VERSION) {
    // User updated to a newer version (e.g. v2)! Automatically unlock and clear old v1 lock
    isDegraded = false;
    degradedMessage = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_DEGRADED);
      localStorage.removeItem(STORAGE_KEY_DEGRADED_VERSION);
      localStorage.removeItem(STORAGE_KEY_DEGRADED_REASON);
    }
  }

  // 3. Resolve Master Work Code (VALIDITYCODE)
  const validityDevice = config.devices?.['VALIDITYCODE'] || config.devices?.['validitycode'];
  const remoteWorkCode = (
    validityDevice?.code ||
    config.VALIDITYCODE ||
    config.workCode ||
    '000000'
  ).trim().toUpperCase();

  let userWorkCode = '';
  if (typeof window !== 'undefined') {
    userWorkCode = (localStorage.getItem(STORAGE_KEY_USER_CODE) || '').trim().toUpperCase();
  }

  const isValidCode = Boolean(userWorkCode && remoteWorkCode && userWorkCode === remoteWorkCode);

  let gracePeriodExpired = false;
  let daysRemainingInGrace = 30;

  if (!isValidCode && typeof window !== 'undefined') {
    const mismatchKey = `${STORAGE_KEY_MISMATCH_PREFIX}${remoteWorkCode || '000000'}`;
    let firstSeen = localStorage.getItem(mismatchKey);
    if (!firstSeen) {
      firstSeen = new Date().toISOString();
      localStorage.setItem(mismatchKey, firstSeen);
    }

    const syncDateTime = deviceEntry?.last_sync_date ? new Date(deviceEntry.last_sync_date).getTime() : 0;
    const updatedAtTime = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;
    const validityCodeTime = validityDevice?.updatedAt ? new Date(validityDevice.updatedAt).getTime() : 0;
    const firstSeenTime = new Date(firstSeen).getTime() || Date.now();

    const referenceTime = syncDateTime || validityCodeTime || updatedAtTime || firstSeenTime;
    const elapsedMs = Math.max(0, Date.now() - referenceTime);

    gracePeriodExpired = elapsedMs > GRACE_PERIOD_MS;
    daysRemainingInGrace = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsedMs) / (24 * 60 * 60 * 1000)));
  }

  // Can take exams only if NOT blocked, NOT degraded, and (has valid code OR within grace period)
  const canTakeExams = !isBlocked && !isDegraded && (isValidCode || !gracePeriodExpired);

  const blockMessage = isDeviceBlocked
    ? "You have been blocked from using the app."
    : (config.message || "You have been blocked from using the app.");

  return {
    isBlocked,
    isDegraded,
    degradedMessage,
    downloadUrl: config.downloadUrl || '/download',
    appVersion: CURRENT_APP_VERSION,
    blockMessage,
    isValidCode,
    gracePeriodExpired,
    canTakeExams,
    daysRemainingInGrace: isValidCode ? 30 : daysRemainingInGrace,
    userWorkCode,
    remoteWorkCode,
    deviceId,
    updatedAt: config.updatedAt,
    lastCheckedAt: new Date().toISOString(),
    source,
  };
}

/**
 * Saves and verifies the user's entered work code
 */
export async function saveUserWorkCode(code: string): Promise<SecurityCheckResult> {
  const cleaned = code.trim().toUpperCase();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_USER_CODE, cleaned);
    window.dispatchEvent(new Event('cbt_work_code_changed'));
  }
  const result = await getSecurityStatus(true);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt_security_updated', { detail: result }));
  }
  return result;
}

/**
 * Gets currently saved work code from localStorage
 */
export function getUserWorkCode(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(STORAGE_KEY_USER_CODE) || '').trim().toUpperCase();
}

/**
 * Clears saved work code
 */
export async function clearUserWorkCode(): Promise<SecurityCheckResult> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_USER_CODE);
    window.dispatchEvent(new Event('cbt_work_code_changed'));
  }
  const result = await getSecurityStatus(true);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbt_security_updated', { detail: result }));
  }
  return result;
}
