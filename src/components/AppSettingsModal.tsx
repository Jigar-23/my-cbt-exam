'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  X,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Cloud,
  RefreshCw,
  LogOut,
  User,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import {
  getSecurityStatus,
  saveUserWorkCode,
  clearUserWorkCode,
  getUserWorkCode,
  registerDeviceToSecurityCloud,
  SecurityCheckResult,
} from '@/lib/securityManager';
import { getStoredUser, signOutFromGoogle } from '@/lib/gdrive/gdriveAuth';
import { syncAllWithDrive, getLastSyncTime } from '@/lib/gdrive/gdriveSync';
import { GoogleUser, SyncReport } from '@/lib/gdrive/types';
import { getActiveCandidateInfo, setGuestCandidateName } from '@/lib/candidateProfile';
import { getUserMobileNumber, setUserMobileNumber } from '@/lib/deviceIdentity';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleDriveModal: () => void;
  onSyncComplete?: () => void;
  onSyncCatalog?: () => void;
  isSyncingCatalog?: boolean;
}

export default function AppSettingsModal({
  isOpen,
  onClose,
  onOpenGoogleDriveModal,
  onSyncComplete,
  onSyncCatalog,
  isSyncingCatalog = false,
}: AppSettingsModalProps) {
  const [mounted, setMounted] = useState(false);

  // Work Code State
  const [workCodeInput, setWorkCodeInput] = useState('');
  const [securityStatus, setSecurityStatus] = useState<SecurityCheckResult | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Google Drive State
  const [gdriveUser, setGdriveUser] = useState<GoogleUser | null>(null);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [driveSyncReport, setDriveSyncReport] = useState<SyncReport | null>(null);

  // Candidate Name & Mobile State
  const [candidateNameInput, setCandidateNameInput] = useState('');
  const [isGoogleCandidate, setIsGoogleCandidate] = useState(false);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [isSavingMobile, setIsSavingMobile] = useState(false);

  // Webhook State
  const [webhookInput, setWebhookInput] = useState('');
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshAllStates = async () => {
    // 1. Security & Work Code
    const status = await getSecurityStatus();
    setSecurityStatus(status);
    setWorkCodeInput(getUserWorkCode());
    const savedWebhook = typeof window !== 'undefined'
      ? (localStorage.getItem('cbt_custom_registration_webhook') || process.env.NEXT_PUBLIC_REGISTRATION_WEBHOOK_URL || '')
      : '';
    setWebhookInput(savedWebhook);

    // 2. Google Drive
    const user = getStoredUser();
    setGdriveUser(user);
    setLastSync(getLastSyncTime());

    // 3. Candidate
    const candidate = getActiveCandidateInfo();
    setCandidateNameInput(candidate.name);
    setIsGoogleCandidate(Boolean(candidate.isGoogleUser));
    setMobileInput(getUserMobileNumber());
  };

  useEffect(() => {
    if (isOpen) {
      refreshAllStates();
      setCodeFeedback(null);
      setDriveSyncReport(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSecChange = () => {
      getSecurityStatus().then(setSecurityStatus);
    };
    const handleDriveChange = () => {
      setGdriveUser(getStoredUser());
      setLastSync(getLastSyncTime());
    };
    const handleCandidateChange = () => {
      const c = getActiveCandidateInfo();
      setCandidateNameInput(c.name);
      setIsGoogleCandidate(Boolean(c.isGoogleUser));
    };

    window.addEventListener('cbt_security_updated', handleSecChange);
    window.addEventListener('cbt_work_code_changed', handleSecChange);
    window.addEventListener('cbt_gdrive_auth_changed', handleDriveChange);
    window.addEventListener('cbt_candidate_changed', handleCandidateChange);

    return () => {
      window.removeEventListener('cbt_security_updated', handleSecChange);
      window.removeEventListener('cbt_work_code_changed', handleSecChange);
      window.removeEventListener('cbt_gdrive_auth_changed', handleDriveChange);
      window.removeEventListener('cbt_candidate_changed', handleCandidateChange);
    };
  }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleVerifyWorkCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifyingCode(true);
    setCodeFeedback(null);

    try {
      const res = await saveUserWorkCode(workCodeInput);
      setSecurityStatus(res);

      if (res.isValidCode) {
        setCodeFeedback({
          type: 'success',
          message: 'Work code verified and activated successfully! All test papers unlocked.',
        });
      } else {
        setCodeFeedback({
          type: res.gracePeriodExpired ? 'error' : 'info',
          message: res.gracePeriodExpired
            ? 'Invalid work code. Default master code is 000000.'
            : 'Work code saved (Standard access active. Master code is 000000).',
        });
      }
    } catch (err: any) {
      setCodeFeedback({
        type: 'error',
        message: err.message || 'Failed to verify work code.',
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleClearCode = async () => {
    setIsVerifyingCode(true);
    setWorkCodeInput('');
    try {
      const res = await clearUserWorkCode();
      setSecurityStatus(res);
      setCodeFeedback({
        type: 'info',
        message: 'Saved work code removed.',
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSyncCloudSecurity = async () => {
    setIsVerifyingCode(true);
    try {
      const res = await getSecurityStatus(true);
      setSecurityStatus(res);
      setCodeFeedback({
        type: 'info',
        message: `Status synced from ${res.source.replace('_', ' ')}.`,
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleManualDriveSync = async () => {
    setIsSyncingDrive(true);
    setDriveSyncReport(null);
    try {
      const report = await syncAllWithDrive();
      setDriveSyncReport(report);
      setLastSync(getLastSyncTime());
      if (onSyncComplete) onSyncComplete();
      registerDeviceToSecurityCloud(true).catch(() => {});
    } catch (err: any) {
      setDriveSyncReport({
        success: false,
        uploadedAttempts: 0,
        downloadedAttempts: 0,
        inFlightSynced: false,
        profileSynced: false,
        error: err.message || 'Drive sync failed',
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleSignOutDrive = () => {
    signOutFromGoogle();
    setGdriveUser(null);
  };

  const handleSaveCandidateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateNameInput.trim()) return;
    setIsSavingCandidate(true);
    setGuestCandidateName(candidateNameInput.trim());
    setTimeout(() => setIsSavingCandidate(false), 500);
  };

  const handleSaveMobile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserMobileNumber(mobileInput);
    setIsSavingMobile(true);
    syncAllWithDrive().catch(() => {});
    registerDeviceToSecurityCloud(true).catch(() => {});
    setTimeout(() => setIsSavingMobile(false), 500);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    if (typeof window !== 'undefined') {
      const clean = webhookInput.trim();
      if (clean) {
        localStorage.setItem('cbt_custom_registration_webhook', clean);
      } else {
        localStorage.removeItem('cbt_custom_registration_webhook');
      }
    }
    registerDeviceToSecurityCloud(true).catch(() => {});
    setTimeout(() => setIsSavingWebhook(false), 500);
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Not yet synced';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-6 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0858f7] to-[#7c3aed] flex items-center justify-center shadow-md shadow-[#0858f7]/20 shrink-0">
              <Settings size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                Application Settings
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Work code authorization, cloud sync & candidate profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* SECTION 1: TOP OPTION - ENTER WORK CODE */}
        <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound size={16} className="text-[#0858f7] dark:text-[#60a5fa]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Enter Work Code
              </h3>
            </div>
            <button
              type="button"
              onClick={handleSyncCloudSecurity}
              disabled={isVerifyingCode}
              className="text-[11px] text-zinc-500 hover:text-[#0858f7] dark:hover:text-[#60a5fa] flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              title="Refresh security configuration from cloud"
            >
              <RefreshCw size={11} className={isVerifyingCode ? 'animate-spin' : ''} />
              <span>Sync Status</span>
            </button>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Enter your institutional work code to link your account and authorize examination playback.
          </p>

          {/* Status Badge */}
          {securityStatus && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2.5 text-xs ${
                securityStatus.isValidCode
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : securityStatus.gracePeriodExpired
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  : 'bg-zinc-200/60 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {securityStatus.isValidCode ? (
                  <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                ) : securityStatus.gracePeriodExpired ? (
                  <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />
                ) : (
                  <KeyRound size={16} className="text-zinc-500 dark:text-zinc-400" />
                )}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {securityStatus.isValidCode
                      ? 'Work Code Active & Verified'
                      : securityStatus.gracePeriodExpired
                      ? 'Work Code Required'
                      : 'Standard Access Active'}
                  </span>
                  <span className="text-[10px] font-mono opacity-60">
                    {securityStatus.source.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] leading-snug opacity-90">
                  {securityStatus.isValidCode
                    ? 'Your device is authenticated. You have unrestricted access to all tests and solutions.'
                    : securityStatus.gracePeriodExpired
                    ? 'Exam playback and question papers are locked. Enter your valid work code below to unlock tests.'
                    : 'Enter your organization work code to link institutional access.'}
                </p>
              </div>
            </div>
          )}

          {/* Feedback banner */}
          {codeFeedback && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
                codeFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : codeFeedback.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300'
              }`}
            >
              {codeFeedback.type === 'success' ? (
                <CheckCircle2 size={14} className="shrink-0" />
              ) : (
                <AlertCircle size={14} className="shrink-0" />
              )}
              <span className="text-[11px] font-medium">{codeFeedback.message}</span>
            </div>
          )}

          {/* Work Code Input & Actions */}
          <form onSubmit={handleVerifyWorkCode} className="space-y-2 pt-1">
            <div className="flex space-x-2">
              <input
                type="text"
                value={workCodeInput}
                onChange={(e) => setWorkCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter Work Code (e.g. CBT2026)"
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-zinc-900 dark:text-zinc-100 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-hidden focus:ring-2 focus:ring-[#0858f7]"
              />
              <button
                type="submit"
                disabled={isVerifyingCode || !workCodeInput.trim()}
                className="px-4 py-2.5 bg-[#0858f7] hover:bg-[#0747c7] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                {isVerifyingCode ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={13} />}
                <span>Verify</span>
              </button>
            </div>

            {getUserWorkCode() && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearCode}
                  disabled={isVerifyingCode}
                  className="text-[11px] text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 underline cursor-pointer disabled:opacity-50"
                >
                  Remove saved code
                </button>
              </div>
            )}
          </form>

          {/* Advanced Cloud Security Webhook Configuration */}
          <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={() => setShowAdvancedSecurity(!showAdvancedSecurity)}
              className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <span>{showAdvancedSecurity ? '▾ Hide' : '▸ Cloud Device Intake Webhook (Apps Script)'}</span>
            </button>

            {showAdvancedSecurity && (
              <form onSubmit={handleSaveWebhook} className="space-y-2 mt-2 pt-1">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Automated intake webhook to register new devices and candidates into your central Google Drive <code className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">app_security.json</code>.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#0858f7]"
                  />
                  <button
                    type="submit"
                    disabled={isSavingWebhook}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSavingWebhook ? 'Saved' : 'Save'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* SECTION 2: CLOUD SYNCHRONIZATION & SERVICES */}
        <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <Cloud size={16} className="text-[#0858f7] dark:text-[#60a5fa]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Cloud Synchronization
            </h3>
          </div>

          {/* 2A. SYNC CLOUD CATALOG */}
          <div className="p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center space-x-1.5">
                  <Database size={14} className="text-[#0858f7] dark:text-[#60a5fa]" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Sync Cloud Catalog</h4>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Download the latest test papers, syllabi, and official exam sets from the cloud
                </p>
              </div>
              <button
                type="button"
                onClick={onSyncCatalog}
                disabled={isSyncingCatalog}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto border border-zinc-200 dark:border-zinc-600"
              >
                <RefreshCw size={12} className={isSyncingCatalog ? 'animate-spin text-[#0858f7]' : ''} />
                <span>{isSyncingCatalog ? 'Syncing...' : 'Sync Cloud'}</span>
              </button>
            </div>
          </div>

          {/* 2B. GOOGLE DRIVE BACKUP */}
          <div className="p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Google Drive Cloud Backup</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Backup test attempts, snapshots, and bookmarks
                </p>
              </div>
              {gdriveUser && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              )}
            </div>

            {gdriveUser ? (
              <div className="space-y-3 pt-1">
                {/* Account Pill */}
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center space-x-3">
                  {gdriveUser.avatarUrl ? (
                    <img
                      src={gdriveUser.avatarUrl}
                      alt={gdriveUser.displayName}
                      className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      {gdriveUser.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">
                      {gdriveUser.displayName}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                      {gdriveUser.email}
                    </p>
                  </div>
                </div>

                {/* Sync details */}
                <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Last Cloud Sync</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-medium">
                    {formatLastSync(lastSync)}
                  </span>
                </div>

                {/* Sync Result */}
                {driveSyncReport && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs ${
                      driveSyncReport.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {driveSyncReport.success ? (
                      <p className="font-medium text-[11px]">
                        ✓ Sync finished: {driveSyncReport.uploadedAttempts} uploaded, {driveSyncReport.downloadedAttempts} downloaded.
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium leading-relaxed">
                        {driveSyncReport.error || 'Failed to sync with Google Drive'}
                      </p>
                    )}
                  </div>
                )}

                {/* Drive Action buttons */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualDriveSync}
                    disabled={isSyncingDrive}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isSyncingDrive ? 'animate-spin' : ''} />
                    <span>{isSyncingDrive ? 'Syncing...' : 'Sync Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSignOutDrive();
                      onOpenGoogleDriveModal();
                    }}
                    className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-600"
                    title="Switch Google Account"
                  >
                    <User size={13} />
                    <span className="hidden sm:inline">Switch</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOutDrive}
                    className="py-2 px-3 bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-600"
                    title="Disconnect Drive"
                  >
                    <LogOut size={13} />
                    <span className="hidden sm:inline">Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenGoogleDriveModal();
                  }}
                  className="w-full py-2.5 px-4 bg-[#0858f7] hover:bg-[#0747c7] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
                >
                  <Cloud size={14} />
                  <span>Link Google Drive Cloud</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: CANDIDATE PROFILE */}
        <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <User size={16} className="text-[#7c3aed] dark:text-[#a78bfa]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Candidate Identity
            </h3>
          </div>

          <form onSubmit={handleSaveCandidateName} className="space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                value={candidateNameInput}
                onChange={(e) => setCandidateNameInput(e.target.value)}
                placeholder="Candidate Name"
                disabled={isGoogleCandidate}
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#7c3aed] disabled:opacity-60"
              />
              {!isGoogleCandidate && (
                <button
                  type="submit"
                  disabled={isSavingCandidate || !candidateNameInput.trim()}
                  className="px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingCandidate ? 'Saved' : 'Save'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {isGoogleCandidate
                ? 'Name linked automatically from your connected Google Account.'
                : 'This name appears on exam hall tickets, player headers, and scorecards.'}
            </p>
          </form>

          {/* Mobile Number Form */}
          <form onSubmit={handleSaveMobile} className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              Registered Mobile Number
            </label>
            <div className="flex space-x-2">
              <input
                type="tel"
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#7c3aed]"
              />
              <button
                type="submit"
                disabled={isSavingMobile}
                className="px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingMobile ? 'Saved' : 'Save'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Used for authorized device registration and multi-device concurrency binding.
            </p>
          </form>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>CBT Exam Master 2026 • v2026.4.0</span>
          <span>Cross-Platform Official Engine</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
