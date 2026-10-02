/**
 * Candidate Profile & Identity Management
 * CBT Exam Master 2026
 * 
 * Supports:
 * 1. Google Account identity (when Google Drive is linked)
 * 2. Custom Guest Candidate Name (entered when choosing "Continue as Guest")
 * 3. Reactive event-driven updates across CBTExamPlayer, headers, and scorecards
 */

import { getStoredUser } from './gdrive/gdriveAuth';

export interface CandidateInfo {
  name: string;
  id: string;
  avatarUrl?: string | null;
  isGoogleUser: boolean;
}

const STORAGE_KEY_GUEST_NAME = 'cbt_guest_candidate_name';

/**
 * Retrieves the currently active candidate info.
 * Priority: Google Account > Saved Guest Name > Default "Candidate"
 */
export function getActiveCandidateInfo(): CandidateInfo {
  if (typeof window === 'undefined') {
    return { name: 'Candidate', id: '2026-IT', isGoogleUser: false };
  }

  // 1. If Google Drive is attached and authenticated
  const googleUser = getStoredUser();
  if (googleUser && googleUser.displayName && googleUser.displayName.trim()) {
    const rawId = googleUser.email ? googleUser.email.split('@')[0] : '2026-GOOGLE';
    return {
      name: googleUser.displayName.trim(),
      id: rawId.toUpperCase(),
      avatarUrl: googleUser.avatarUrl || null,
      isGoogleUser: true,
    };
  }

  // 2. Custom guest name
  const guestName = localStorage.getItem(STORAGE_KEY_GUEST_NAME) || localStorage.getItem('cbt_candidate_name');
  if (guestName && guestName.trim()) {
    return {
      name: guestName.trim(),
      id: '2026-GUEST',
      avatarUrl: null,
      isGoogleUser: false,
    };
  }

  // 3. Fallback default
  return {
    name: 'Candidate',
    id: '2026-CBT',
    avatarUrl: null,
    isGoogleUser: false,
  };
}

/**
 * Saves a guest candidate name and notifies all listening UI components.
 */
export function setGuestCandidateName(name: string): void {
  if (typeof window === 'undefined') return;
  const clean = name.trim() || 'Candidate';
  localStorage.setItem(STORAGE_KEY_GUEST_NAME, clean);
  localStorage.setItem('cbt_candidate_name', clean);
  window.dispatchEvent(new Event('cbt_candidate_changed'));
}
