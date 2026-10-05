'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Smartphone,
  Settings2,
  LogOut,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import {
  checkDevicePhonePermission,
  requestDevicePhoneNumber,
  openDeviceAppSettings,
  exitDeviceApp,
} from '@/lib/deviceIdentity';

interface AndroidPermissionGateProps {
  isOpen: boolean;
  onPermissionGranted: () => void;
}

export default function AndroidPermissionGate({
  isOpen,
  onPermissionGranted,
}: AndroidPermissionGateProps) {
  const [isDenied, setIsDenied] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [denialCount, setDenialCount] = useState<number>(0);

  // Re-check permission automatically whenever app gains focus or becomes visible (e.g. returning from Settings)
  const verifyPermission = useCallback(async () => {
    try {
      setIsChecking(true);
      const status = await checkDevicePhonePermission();
      if (status.granted) {
        onPermissionGranted();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [onPermissionGranted]);

  useEffect(() => {
    if (!isOpen) return;

    verifyPermission();

    const handleFocus = () => {
      verifyPermission();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifyPermission();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, verifyPermission]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsChecking(true);
    try {
      const res = await requestDevicePhoneNumber();
      if (res.permissionGranted) {
        onPermissionGranted();
        return;
      }

      // If not granted, re-check state
      const check = await checkDevicePhonePermission();
      if (check.granted) {
        onPermissionGranted();
        return;
      }

      // Permission was denied
      setIsDenied(true);
      setDenialCount((prev) => prev + 1);
    } catch (e) {
      setIsDenied(true);
      setDenialCount((prev) => prev + 1);
    } finally {
      setIsChecking(false);
    }
  };

  const handleOpenSettings = async () => {
    await openDeviceAppSettings();
  };

  const handleExitApp = async () => {
    await exitDeviceApp();
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#12131a] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-amber-500/10 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Top Glowing Icon */}
        <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-b from-amber-500/20 to-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400">
            {isDenied ? <ShieldAlert size={40} /> : <Lock size={38} />}
          </div>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-wide uppercase mb-3">
          <Smartphone size={13} />
          <span>Mandatory Android Permission</span>
        </div>

        {/* Header */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          {isDenied ? 'Permission Action Required' : 'Device Verification Required'}
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-5">
          To ensure exam security and prevent unauthorized multi-device sharing, CBT Exam Master requires{' '}
          <span className="text-amber-300 font-semibold">Phone & Device</span> permission to run on this Android device.
        </p>

        {/* Security Requirement Points */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-left space-y-2.5 mb-5 text-xs text-zinc-300">
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span><strong className="text-zinc-200">Hardware ID Binding:</strong> Ties exam attempts to this physical device.</span>
          </div>
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span><strong className="text-zinc-200">Candidate Identity:</strong> Verifies registered phone number for progress sync.</span>
          </div>
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span><strong className="text-zinc-200">Anti-Piracy Security:</strong> Locks out duplicate unauthorized sessions.</span>
          </div>
        </div>

        {/* Denied Warning Box (When Android limits prompts or user pressed deny) */}
        {isDenied && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 mb-5 text-left flex items-start space-x-3 text-xs text-amber-200/90 animate-in fade-in">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="text-amber-300 block mb-1">Android Prompt Limit Reached:</strong>
              Android prevents apps from asking more than twice. Tap{' '}
              <span className="text-white font-bold underline">Open App Settings</span> below, go to{' '}
              <strong className="text-white">Permissions ➔ Phone</strong>, select{' '}
              <strong className="text-emerald-400">Allow</strong>, and return to this app.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Primary Action Button */}
          {isDenied || denialCount > 0 ? (
            <button
              onClick={handleOpenSettings}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98"
            >
              <Settings2 size={18} />
              <span>Open App Settings</span>
            </button>
          ) : (
            <button
              onClick={handleRequestPermission}
              disabled={isChecking}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Smartphone size={18} />
              <span>{isChecking ? 'Checking...' : 'Grant Phone Permission'}</span>
            </button>
          )}

          {/* Secondary Actions: Recheck & Exit */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={verifyPermission}
              disabled={isChecking}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-98"
            >
              <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
              <span>Check Status</span>
            </button>

            <button
              onClick={handleExitApp}
              className="py-3 px-4 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer active:scale-98"
            >
              <LogOut size={14} />
              <span>Exit App</span>
            </button>
          </div>
        </div>

        <p className="mt-4 text-[10px] text-zinc-500">
          This permission is strictly used for device hardware authorization and will never access personal contacts or messages.
        </p>
      </div>
    </div>
  );
}
