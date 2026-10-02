'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Cloud,
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Key,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  User,
} from 'lucide-react';
import {
  signInWithGoogle,
  getActiveClientId,
  setCustomClientId,
} from '@/lib/gdrive/gdriveAuth';
import { syncAllWithDrive } from '@/lib/gdrive/gdriveSync';
import { GoogleUser } from '@/lib/gdrive/types';
import { getActiveCandidateInfo, setGuestCandidateName } from '@/lib/candidateProfile';

interface GoogleDriveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: GoogleUser) => void;
}

export default function GoogleDriveLinkModal({
  isOpen,
  onClose,
  onSuccess,
}: GoogleDriveLinkModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customClientId, setCustomClientIdState] = useState(getActiveClientId());
  const [mounted, setMounted] = useState(false);
  const [isEnteringGuestName, setIsEnteringGuestName] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const info = getActiveCandidateInfo();
      setGuestNameInput(info.isGoogleUser ? '' : info.name === 'Candidate' ? '' : info.name);
      setIsEnteringGuestName(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSaveGuestName = () => {
    const finalName = guestNameInput.trim() || 'Candidate';
    setGuestCandidateName(finalName);
    handleDismiss();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (customClientId && customClientId.trim()) {
        setCustomClientId(customClientId.trim());
      }

      const { user } = await signInWithGoogle({
        customClientId: customClientId.trim() || undefined,
        prompt: 'select_account',
      });
      
      // Run initial sync in background
      syncAllWithDrive().catch(console.warn);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cbt_gdrive_auth_changed'));
      }

      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('cbt_gdrive_modal_dismissed', 'true');
    onClose();
  };

  return createPortal(
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-zinc-100 my-auto max-h-[92vh] overflow-y-auto"
      >
        {isEnteringGuestName ? (
          <div className="space-y-4 py-1 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">Candidate Details</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Personalize Your CBT Exam Profile</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Enter your candidate name. This name will appear on your examination header, question palette, and detailed performance scorecards.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Candidate Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Rahul Sharma"
                value={guestNameInput}
                onChange={(e) => setGuestNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveGuestName();
                }}
                className="w-full bg-zinc-50 dark:bg-[#27272a] border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setIsEnteringGuestName(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleSaveGuestName}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Save &amp; Continue</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0858f7]/10 dark:bg-[#0858f7]/20 text-[#0858f7] dark:text-[#60a5fa] flex items-center justify-center shrink-0 border border-[#0858f7]/20 shadow-xs">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Cloud Sync & Backup</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Bring Your Own Storage (Google Drive)</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 text-xs">
          <div className="flex items-start space-x-2.5">
            <Smartphone className="w-4 h-4 text-[#0858f7] dark:text-[#60a5fa] shrink-0 mt-0.5" />
            <span className="text-zinc-700 dark:text-zinc-300">
              <strong>Seamless Concurrency:</strong> Take an exam on Android, resume or review results on your Desktop.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-zinc-700 dark:text-zinc-300">
              <strong>Zero Data Loss:</strong> In-flight exam timers, answers, and weak-area analytics back up automatically.
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <span className="text-zinc-700 dark:text-zinc-300">
              <strong>100% Private Sandbox:</strong> Stored in your isolated Google Drive AppData folder. The app cannot see your personal files.
            </span>
          </div>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start space-x-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 space-y-1.5">
              <p className="font-bold">Authentication Notice</p>
              <p className="text-[11px] leading-relaxed opacity-95">{error}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSignIn()}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/50 dark:hover:bg-rose-800/60 text-rose-800 dark:text-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Retry Sign-In
                </button>
                {!showConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfig(true);
                      setError(null);
                    }}
                    className="text-[11px] underline font-bold hover:opacity-80 cursor-pointer"
                  >
                    Configure Client ID
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Configuration Toggle */}
        {showConfig && (
          <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl space-y-2 border border-zinc-200 dark:border-zinc-700/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-[#0858f7]" />
                <span>Google OAuth Configuration</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-zinc-400 hover:text-zinc-600 text-[10px] cursor-pointer"
              >
                Hide
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Google Client ID
              </label>
              <input
                type="text"
                value={customClientId}
                onChange={(e) => {
                  setCustomClientIdState(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:border-[#0858f7]"
              />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                From Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => handleSignIn()}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#0858f7] hover:bg-[#0747c7] active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0858f7]/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting to Google Drive...</span>
              </>
            ) : (
              <>
                {/* Google 'G' icon */}
                <svg className="w-4 h-4 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {isLoading && (
            <button
              onClick={() => setIsLoading(false)}
              className="w-full text-center text-[11px] text-zinc-400 hover:text-rose-500 py-1 font-medium transition-colors cursor-pointer"
            >
              ✕ Cancel / Retry
            </button>
          )}

          <button
            onClick={() => setIsEnteringGuestName(true)}
            className="w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <User size={13} />
            <span>Continue as Guest (Offline Only)</span>
          </button>
        </div>

        {/* Footer info link */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <span>Google Drive AppData Sandbox</span>
          {!showConfig && (
            <button
              onClick={() => setShowConfig(true)}
              className="hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center space-x-1 cursor-pointer"
            >
              <Key size={10} />
              <span>OAuth Settings</span>
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
