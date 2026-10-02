/**
 * Google Drive REST API v3 Client for Application Data Folder (appDataFolder)
 * CBT Exam Master 2026
 * 
 * Interacts exclusively with the isolated appDataFolder sandbox.
 */

import { getStoredAccessToken } from './gdriveAuth';

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

const GDRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GDRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

class GDriveClientError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GDriveClientError';
    this.status = status;
  }
}

function formatDriveApiError(action: string, errorText: string, status?: number): string {
  try {
    const parsed = JSON.parse(errorText);
    const msg = parsed?.error?.message || (Array.isArray(parsed?.error?.details) ? parsed.error.details[0]?.message : null);
    if (
      errorText.includes('SERVICE_DISABLED') ||
      errorText.includes('Google Drive API has not been used') ||
      errorText.includes('accessNotConfigured')
    ) {
      return 'Google Drive API is disabled in your Google Cloud project. Please click the link to enable it, then try syncing again.';
    }
    if (msg) return `${action}: ${msg}`;
  } catch {}
  return `${action}: ${errorText.slice(0, 150)}`;
}

/**
 * Executes an authenticated fetch request against Google Drive REST API.
 */
async function driveFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new GDriveClientError('Not authenticated with Google Drive', 401);
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    throw new GDriveClientError('Google Drive session expired. Please sign in again.', 401);
  }

  return response;
}

/**
 * Lists files stored in the private AppData sandbox.
 */
export async function listAppDataFiles(query?: string): Promise<DriveFileMetadata[]> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id, name, mimeType, modifiedTime, size, parents)',
    pageSize: '1000',
  });

  if (query) {
    params.set('q', query);
  }

  const url = `${GDRIVE_API_BASE}/files?${params.toString()}`;
  const res = await driveFetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new GDriveClientError(formatDriveApiError('Failed to list AppData files', errorText, res.status), res.status);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads the text/JSON content of a file from AppData sandbox by fileId.
 */
export async function downloadAppDataFile<T = any>(fileId: string): Promise<T> {
  const url = `${GDRIVE_API_BASE}/files/${fileId}?alt=media`;
  const res = await driveFetch(url);

  if (!res.ok) {
    const errorText = await res.text();
    throw new GDriveClientError(formatDriveApiError(`Failed to download AppData file (${fileId})`, errorText, res.status), res.status);
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Finds a specific file in the AppData sandbox by exact name.
 */
export async function findAppDataFileByName(fileName: string, parentFolderId?: string): Promise<DriveFileMetadata | null> {
  let q = `name = '${fileName}' and trashed = false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }
  const files = await listAppDataFiles(q);
  return files.length > 0 ? files[0] : null;
}

/**
 * Uploads a new JSON document or text file into the AppData sandbox using multipart upload.
 */
export async function uploadAppDataFile(
  fileName: string,
  content: any,
  parentFolderId: string = 'appDataFolder',
  mimeType: string = 'application/json'
): Promise<DriveFileMetadata> {
  const stringContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const metadata = {
    name: fileName,
    parents: [parentFolderId],
    mimeType,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    stringContent +
    closeDelimiter;

  const url = `${GDRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,parents`;
  const res = await driveFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new GDriveClientError(formatDriveApiError(`Failed to upload AppData file (${fileName})`, errorText, res.status), res.status);
  }

  return await res.json();
}

/**
 * Updates an existing file's contents in the AppData sandbox.
 */
export async function updateAppDataFile(
  fileId: string,
  content: any,
  mimeType: string = 'application/json'
): Promise<DriveFileMetadata> {
  const stringContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const url = `${GDRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime,size,parents`;
  const res = await driveFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': mimeType,
    },
    body: stringContent,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new GDriveClientError(formatDriveApiError(`Failed to update AppData file (${fileId})`, errorText, res.status), res.status);
  }

  return await res.json();
}

/**
 * Upserts a file by name: updates if already exists in parent, creates new if not.
 */
export async function upsertAppDataFile(
  fileName: string,
  content: any,
  parentFolderId: string = 'appDataFolder',
  mimeType: string = 'application/json'
): Promise<DriveFileMetadata> {
  const existing = await findAppDataFileByName(fileName, parentFolderId === 'appDataFolder' ? undefined : parentFolderId);
  if (existing) {
    return await updateAppDataFile(existing.id, content, mimeType);
  }
  return await uploadAppDataFile(fileName, content, parentFolderId, mimeType);
}

/**
 * Deletes a file from AppData sandbox by fileId.
 */
export async function deleteAppDataFile(fileId: string): Promise<boolean> {
  const url = `${GDRIVE_API_BASE}/files/${fileId}`;
  const res = await driveFetch(url, { method: 'DELETE' });
  return res.ok || res.status === 204;
}

const folderPromiseCache: Record<string, Promise<string> | undefined> = {};

/**
 * Ensures a subfolder exists in the AppData sandbox.
 * Deduplicates concurrent creation calls via an in-memory promise cache.
 */
export async function ensureAppDataFolder(folderName: string): Promise<string> {
  const cachedPromise = folderPromiseCache[folderName];
  if (cachedPromise) {
    return cachedPromise;
  }

  folderPromiseCache[folderName] = (async () => {
    try {
      const existing = await findAppDataFileByName(folderName);
      if (existing && existing.mimeType === 'application/vnd.google-apps.folder') {
        return existing.id;
      }

      // Create folder inside appDataFolder
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['appDataFolder'],
      };

      const url = `${GDRIVE_API_BASE}/files?fields=id,name`;
      const res = await driveFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new GDriveClientError(formatDriveApiError(`Failed to create AppData folder (${folderName})`, errorText, res.status), res.status);
      }

      const folder = await res.json();
      return folder.id;
    } catch (err) {
      delete folderPromiseCache[folderName];
      throw err;
    }
  })();

  return folderPromiseCache[folderName];
}

