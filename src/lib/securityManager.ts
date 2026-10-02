/**
 * CBT Security & Licensing Manager
 * 
 * Features:
 * 1. Hardware MAC / Physical Device ID Tracking
 * 2. Remote App Kill-Switch (devices[deviceId].blocked === true or status: "blocked")
 * 3. Organization / Access Work Code with 30-day (1-month) silent grace period
 * 4. Grace Period Expiration enforcement:
 *    - Allows viewing assessment analytics, bookmarks, and scorecards.
 *    - Completely locks exam player and solutions once grace period expires until valid code is entered.
 * 5. Multi-tier Remote Sync:
 *    - Google Drive REST API (via NEXT_PUBLIC_SECURITY_FILE_ID or manifest.security)
 *    - Local/Hosted /data/app_security.json
 *    - Offline localStorage fallback
 */

import { getDevicePhysicalId } from './deviceIdentity';

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
  minVersion?: string;
  devices?: Record<string, DeviceEntry>;
  users?: Record<string, any>;
}

export interface SecurityCheckResult {
  isBlocked: boolean;
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

// 30 days in milliseconds
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: AppSecurityConfig = {
  status: 'allow',
  VALIDITYCODE: '000000',
  workCode: '000000',
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
        if (driveData && (driveData.workCode || driveData.status || driveData.VALIDITYCODE || driveData.devices)) {
          const config: AppSecurityConfig = {
            status: driveData.status === 'blocked' ? 'blocked' : 'allow',
            workCode: (driveData.VALIDITYCODE || driveData.workCode || '000000').trim().toUpperCase(),
            VALIDITYCODE: driveData.VALIDITYCODE || '000000',
            updatedAt: driveData.updatedAt || new Date().toISOString(),
            message: driveData.message || '',
            minVersion: driveData.minVersion,
            devices: driveData.devices || {},
            users: driveData.users || {},
          };
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
      if (secData && (secData.workCode || secData.status || secData.VALIDITYCODE || secData.devices)) {
        const config: AppSecurityConfig = {
          status: secData.status === 'blocked' ? 'blocked' : 'allow',
          workCode: (secData.VALIDITYCODE || secData.workCode || '000000').trim().toUpperCase(),
          VALIDITYCODE: secData.VALIDITYCODE || '000000',
          updatedAt: secData.updatedAt || mData.lastUpdated || new Date().toISOString(),
          message: secData.message || '',
          minVersion: secData.minVersion,
          devices: secData.devices || {},
          users: secData.users || {},
        };
        inMemoryCache = { config, timestamp: Date.now(), source: 'cloud_drive' };
        return { config, source: 'cloud_drive' };
      }
    }
  } catch (e) {}

  // 2. If Google Drive cloud cannot be reached, strictly require active connection to Google Drive
  const unverifiedConfig: AppSecurityConfig = {
    status: 'blocked',
    workCode: '',
    VALIDITYCODE: '',
    updatedAt: new Date().toISOString(),
    message: 'Active internet connection required to verify device authorization with Google Drive. Please connect to the internet to continue.',
  };
  return { config: unverifiedConfig, source: 'fallback' };
}

/**
 * Evaluates current security state: block status, work code validity, and grace period
 */
export async function getSecurityStatus(forceRefresh: boolean = false): Promise<SecurityCheckResult> {
  const { config, source } = await fetchRemoteSecurityConfig(forceRefresh);
  const deviceId = await getDevicePhysicalId();

  // 1. Hardware-level block check & global block check
  const deviceEntry = config.devices?.[deviceId];
  const isDeviceBlocked = deviceEntry?.blocked === true;
  const isGlobalBlocked = config.status === 'blocked';
  const isBlocked = isDeviceBlocked || isGlobalBlocked;

  // 2. Resolve Master Work Code (VALIDITYCODE)
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

    // Parse ISO-8601 UTC timestamps (format: 2026-10-01T16:15:00.000Z)
    const syncDateTime = deviceEntry?.last_sync_date ? new Date(deviceEntry.last_sync_date).getTime() : 0;
    const updatedAtTime = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;
    const validityCodeTime = validityDevice?.updatedAt ? new Date(validityDevice.updatedAt).getTime() : 0;
    const firstSeenTime = new Date(firstSeen).getTime() || Date.now();

    // 30 days (1 month) grace period from ISO-8601 sync timestamp
    const referenceTime = syncDateTime || validityCodeTime || updatedAtTime || firstSeenTime;
    const elapsedMs = Math.max(0, Date.now() - referenceTime);

    gracePeriodExpired = elapsedMs > GRACE_PERIOD_MS;
    daysRemainingInGrace = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsedMs) / (24 * 60 * 60 * 1000)));
  }

  const canTakeExams = !isBlocked && (isValidCode || !gracePeriodExpired);

  const blockMessage = isDeviceBlocked
    ? "You have been blocked from using the app."
    : (config.message || "You have been blocked from using the app.");

  return {
    isBlocked,
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
