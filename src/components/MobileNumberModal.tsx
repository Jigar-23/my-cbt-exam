'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smartphone, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, X, PhoneCall } from 'lucide-react';
import {
  getUserMobileNumber,
  setUserMobileNumber,
  requestDevicePhoneNumber,
  getDevicePhysicalId,
} from '@/lib/deviceIdentity';
import { syncAllWithDrive } from '@/lib/gdrive/gdriveSync';

interface MobileNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (mobile: string) => void;
}

export default function MobileNumberModal({ isOpen, onClose, onSaved }: MobileNumberModalProps) {
  const [mobileInput, setMobileInput] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getDevicePhysicalId().then(setDeviceId).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const existing = getUserMobileNumber();
    if (existing) {
      if (existing.startsWith('+91')) {
        setCountryCode('+91');
        setMobileInput(existing.replace('+91', ''));
      } else {
        setMobileInput(existing);
      }
      return;
    }

    // Attempt auto-detect on native Android
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      setIsDetecting(true);
      requestDevicePhoneNumber()
        .then((res) => {
          if (res.phoneNumber) {
            let clean = res.phoneNumber.replace(/[^0-9+]/g, '');
            if (clean.startsWith('+91')) {
              setCountryCode('+91');
              clean = clean.replace('+91', '');
            } else if (clean.length === 12 && clean.startsWith('91')) {
              setCountryCode('+91');
              clean = clean.substring(2);
            }
            setMobileInput(clean);
            setIsAutoDetected(true);
          }
        })
        .finally(() => {
          setIsDetecting(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanDigits = mobileInput.replace(/\D/g, '');
    if (countryCode === '+91') {
      if (cleanDigits.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!/^[6-9]/.test(cleanDigits)) {
        setError('Indian mobile numbers usually start with 6, 7, 8, or 9.');
        return;
      }
    } else {
      if (cleanDigits.length < 7 || cleanDigits.length > 15) {
        setError('Please enter a valid phone number (7 to 15 digits).');
        return;
      }
    }

    const fullNumber = `${countryCode}${cleanDigits}`;
    setUserMobileNumber(fullNumber);

    // Fire background sync to update profile & device table
    syncAllWithDrive().catch(() => {});

    if (onSaved) onSaved(fullNumber);
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('cbt_mobile_modal_dismissed', 'true');
    onClose();
  };

  return createPortal(
    <div
      onClick={handleSkip}
      className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#27272a] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl text-zinc-900 dark:text-zinc-100 my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Candidate Mobile Verification</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Device Identity & Concurrency Link</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Skip for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Callout */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Authorized Hardware Binding</span>
          </div>
          <p className="leading-relaxed">
            Link your mobile number to this hardware device for account concurrency, real-time exam telemetry, and cross-device session resume.
          </p>
          {deviceId && (
            <div className="pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between font-mono text-[10px] text-zinc-400">
              <span>DEVICE ID:</span>
              <span className="truncate max-w-[200px]" title={deviceId}>{deviceId}</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Mobile Phone Number</span>
              {isAutoDetected && (
                <span className="text-[10px] font-normal text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Auto-detected from SIM
                </span>
              )}
            </label>

            <div className="flex rounded-2xl border border-zinc-300 dark:border-zinc-700 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all bg-zinc-50 dark:bg-[#121214]">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-transparent px-3 py-3 text-xs font-bold border-r border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 outline-none"
              >
                <option value="+91" className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100">🇮🇳 +91 (IN)</option>
                <option value="+1" className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100">🇺🇸 +1 (US)</option>
                <option value="+44" className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100">🇬🇧 +44 (UK)</option>
                <option value="+971" className="bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100">🇦🇪 +971 (AE)</option>
              </select>

              <input
                type="tel"
                value={mobileInput}
                onChange={(e) => {
                  setMobileInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="10-digit mobile number"
                maxLength={15}
                autoFocus
                className="w-full bg-transparent px-3 py-3 text-sm font-semibold tracking-wider placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-400 outline-none text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99]"
            >
              <span>Save & Register Device</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold text-xs transition-colors text-center"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
