'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  LogOut,
  X,
  Database,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { getStoredUser, getStoredAccessToken, signOutFromGoogle } from '@/lib/gdrive/gdriveAuth';
import { syncAllWithDrive, getLastSyncTime } from '@/lib/gdrive/gdriveSync';
import { GoogleUser, SyncReport } from '@/lib/gdrive/types';

interface GoogleDriveStatusPillProps {
  onOpenConnectModal: () => void;
  onSyncComplete?: () => void;
}

export default function GoogleDriveStatusPill({
  onOpenConnectModal,
  onSyncComplete,
}: GoogleDriveStatusPillProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);

  const checkStatus = () => {
    const storedUser = getStoredUser();
    const token = getStoredAccessToken();
    if (storedUser && token) {
      setUser(storedUser);
      setLastSync(getLastSyncTime());
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncReport(null);
    try {
      const report = await syncAllWithDrive();
      setSyncReport(report);
      setLastSync(getLastSyncTime());
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setSyncReport({
        success: false,
        uploadedAttempts: 0,
        downloadedAttempts: 0,
        inFlightSynced: false,
        profileSynced: false,
        error: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    signOutFromGoogle();
    setUser(null);
    setIsDrawerOpen(false);
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  // If user is not logged in, render the Link Drive button
  if (!user) {
    return (
      <button
        onClick={onOpenConnectModal}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#0858f7]/10 dark:bg-[#0858f7]/15 hover:bg-[#0858f7]/20 dark:hover:bg-[#0858f7]/25 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
        title="Link Google Drive for Cloud Backup"
      >
        <Cloud size={13} className="text-[#0858f7] dark:text-[#60a5fa]" />
        <span className="hidden sm:inline">Link Drive</span>
      </button>
    );
  }

  // If logged in, render the status pill
  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="flex items-center space-x-2 px-2.5 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
        title={`Google Drive: ${user.email}`}
      >
        {isSyncing ? (
          <RefreshCw size={13} className="animate-spin text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Cloud size={13} className="text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="hidden sm:inline font-mono text-[11px]">
          {isSyncing ? 'Syncing...' : formatLastSync(lastSync)}
        </span>
      </button>

      {/* Detail Slide-over / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-zinc-900 dark:text-zinc-100">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Cloud className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold">Cloud Sync Status</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex items-center space-x-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0858f7]/20 text-[#0858f7] flex items-center justify-center font-bold text-sm">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">
                  {user.displayName}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Sync Metadata */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-400">
                <span>Storage Container</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-200">Google Drive AppData</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-400">
                <span>Last Cloud Sync</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-200">{formatLastSync(lastSync)}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-purple-600 dark:text-purple-400 pt-1">
                <ShieldCheck size={14} />
                <span>Isolated sandbox (appDataFolder)</span>
              </div>
            </div>

            {/* Sync Result Banner */}
            {syncReport && (
              <div className={`p-2.5 rounded-xl border text-xs ${syncReport.success ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700 dark:text-rose-300'}`}>
                {syncReport.success ? (
                  <p>
                    ✓ Sync completed: {syncReport.uploadedAttempts} uploaded, {syncReport.downloadedAttempts} downloaded.
                  </p>
                ) : (
                  <p>⚠️ {syncReport.error || 'Sync encountered an error'}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full py-2 px-3 bg-[#0858f7] hover:bg-[#0747c7] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full py-2 px-3 bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800/80 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Disconnect Google Drive</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
