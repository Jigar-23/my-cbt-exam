'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, RefreshCw, AlertCircle, ShieldCheck, X } from 'lucide-react';

interface VaultLoadingModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onCancel?: () => void;
}

export default function VaultLoadingModal({
  isOpen,
  title = 'Accessing Secure Test Vault',
  subtitle = 'Fetching authenticated question paper and verified keys...',
  onCancel,
}: VaultLoadingModalProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl p-6 shadow-2xl text-center space-y-5">
        {/* Cancel button if taking longer than 4s */}
        {elapsed >= 4 && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Cancel request"
          >
            <X size={18} />
          </button>
        )}

        {/* Animated Radar Cloud Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000" />
          <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/30" />
          <div className="relative w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Cloud size={28} className="animate-pulse" />
          </div>
          <RefreshCw
            size={42}
            className="absolute -top-1 text-blue-400/40 animate-spin"
            style={{ animationDuration: '3s' }}
          />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Dynamic Status Pill */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Drive Gateway</span>
            </span>
            <span>Elapsed: {elapsed}s</span>
          </div>

          {/* Progress Indication */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 rounded-full animate-indeterminate" />
          </div>

          <p className="text-[10px] text-neutral-500 text-left">
            {elapsed < 3
              ? 'Verifying cryptographic paper hash and local vault mirrors...'
              : elapsed < 6
              ? 'Streaming full paper from Google Drive (guarding API quota)...'
              : 'Google Drive rate-limit shield active. Finalizing download...'}
          </p>
        </div>

        {/* Bottom Safety Info */}
        <div className="flex items-center justify-center space-x-2 text-[11px] text-neutral-500 pt-1">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>TCS iON 2026 Sandbox • Rate-Limited Safe Access</span>
        </div>
      </div>
    </div>
  );
}
