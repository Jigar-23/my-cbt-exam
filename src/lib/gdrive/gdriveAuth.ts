/**
 * Google Drive OAuth 2.0 Authentication Provider
 * CBT Exam Master 2026
 * 
 * Uses Google Identity Services (GSI) Token Client with 'drive.appdata' scope.
 * Works seamlessly across Web, Desktop (Electron), and Mobile webviews.
 */

import { GoogleUser } from './types';

const STORAGE_KEY_TOKEN = 'cbt_gdrive_access_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'cbt_gdrive_token_expiry';
const STORAGE_KEY_USER = 'cbt_gdrive_user';
const STORAGE_KEY_CLIENT_ID = 'cbt_gdrive_custom_client_id';

// Default Scope: isolated appDataFolder sandbox (zero access to personal files)
export const GDRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

// Default or environment-provided Client ID
export const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_GDRIVE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Loads the Google Identity Services (GSI) script dynamically if not present.
 */
export async function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.accounts?.oauth2) return;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(script);
  });
}

/**
 * Returns the currently active Client ID (from localStorage or environment variable).
 */
export function getActiveClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (custom && custom.trim()) return custom.trim();
  }
  return DEFAULT_CLIENT_ID;
}

/**
 * Sets a custom Google Client ID.
 */
export function setCustomClientId(clientId: string): void {
  if (typeof window === 'undefined') return;
  if (clientId && clientId.trim()) {
    localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
  }
}

/**
 * Checks whether an active, non-expired access token exists.
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
  if (!token) return null;

  if (expiry) {
    const expNum = parseInt(expiry, 10);
    // If expired or expiring in under 60 seconds, consider invalid
    if (Date.now() > expNum - 60000) {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
      return null;
    }
  }

  return token;
}

/**
 * Retrieves the stored Google User profile.
 */
export function getStoredUser(): GoogleUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Fetches user profile from Google UserInfo endpoint using the access token.
 */
async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    userId: data.sub || data.id,
    email: data.email || 'user@gmail.com',
    displayName: data.name || data.email?.split('@')[0] || 'CBT Scholar',
    avatarUrl: data.picture || '',
  };
}

/**
 * Triggers Google OAuth 2.0 token prompt using Google Identity Services.
 */
export async function signInWithGoogle(customClientId?: string): Promise<{ user: GoogleUser; token: string }> {
  await loadGsiScript();

  const clientId = customClientId || getActiveClientId();
  if (!clientId) {
    throw new Error('Google Client ID is missing. Please configure your Google Cloud OAuth Client ID.');
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GDRIVE_APPDATA_SCOPE,
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          const accessToken = response.access_token;
          const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3600;
          const expiryTime = Date.now() + expiresIn * 1000;

          try {
            const user = await fetchGoogleUserProfile(accessToken);

            // Persist session
            localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
            localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, String(expiryTime));
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

            resolve({ user, token: accessToken });
          } catch (err: any) {
            reject(err);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e: any) {
      reject(new Error(`Failed to initialize Google Sign-In: ${e.message}`));
    }
  });
}

/**
 * Signs out from Google Drive and clears session tokens.
 */
export function signOutFromGoogle(): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);

  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // Ignore revoke errors
    }
  }

  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_USER);
}
