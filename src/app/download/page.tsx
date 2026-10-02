'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Play,
  FileDown,
  Layers,
  Award,
  Clock,
  HardDrive,
  Cpu,
  Flame,
  ArrowLeft
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type PlatformKey = 'android' | 'windows' | 'mac' | 'web' | 'ios';

export default function DownloadPage() {
  const [detectedOS, setDetectedOS] = useState<PlatformKey>('web');
  const [osName, setOsName] = useState<string>('Web Browser');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();

    if (ua.includes('android')) {
      setDetectedOS('android');
      setOsName('Android');
    } else if (ua.includes('win')) {
      setDetectedOS('windows');
      setOsName('Windows');
    } else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) {
      setDetectedOS('mac');
      setOsName('macOS');
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      setDetectedOS('ios');
      setOsName('iOS / iPadOS');
    } else {
      setDetectedOS('web');
      setOsName('Web Browser');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0c10] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#12131a]/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0858f7] to-[#00a6ff] flex items-center justify-center text-white shadow-md shadow-[#0858f7]/25 group-hover:scale-105 transition-transform">
              <Award size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
                CBT Exam Master
              </span>
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                2026
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <Play size={14} />
              <span>Launch Simulator</span>
            </Link>
            <ThemeToggle variant="icon" />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-zinc-200/60 dark:border-zinc-800/60">
        {/* Glow ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#0858f7]/15 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 shadow-xs">
            <Sparkles size={14} className="text-blue-600 dark:text-blue-400 animate-pulse" />
            <span>Official Computer Based Test (CBT) Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] mb-6">
            Practice Real Exam Mocks <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#0858f7] via-[#0088ff] to-[#00d2ff] bg-clip-text text-transparent">
              On Any Device, 100% Offline
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The authentic TCS iON & IBPS interface for SSC, Banking, Railways, and Defense exams. 
            Full previous year papers, step-by-step verified solutions, and real-time scorecards.
          </p>

          {/* Primary Dynamic Download CTA (Chrome style) */}
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
            {detectedOS === 'android' ? (
              <a
                href="/downloads/CBT_Exam_Master_2026.apk"
                download="CBT_Exam_Master_2026.apk"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0858f7] hover:bg-[#0747cb] text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-lg shadow-[#0858f7]/30 hover:shadow-xl hover:shadow-[#0858f7]/40 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Smartphone size={20} />
                <span>Download for Android (APK)</span>
              </a>
            ) : detectedOS === 'windows' ? (
              <a
                href="#windows-downloads"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0858f7] hover:bg-[#0747cb] text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-lg shadow-[#0858f7]/30 hover:shadow-xl hover:shadow-[#0858f7]/40 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Monitor size={20} />
                <span>Download for Windows (64-bit)</span>
              </a>
            ) : detectedOS === 'mac' ? (
              <a
                href="#mac-downloads"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0858f7] hover:bg-[#0747cb] text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-lg shadow-[#0858f7]/30 hover:shadow-xl hover:shadow-[#0858f7]/40 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Laptop size={20} />
                <span>Download for macOS (.dmg)</span>
              </a>
            ) : (
              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0858f7] hover:bg-[#0747cb] text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-lg shadow-[#0858f7]/30 hover:shadow-xl hover:shadow-[#0858f7]/40 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play size={18} className="fill-white" />
                <span>Open Web Simulator Now</span>
              </Link>
            )}

            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold text-sm sm:text-base flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              <Globe size={18} className="text-zinc-500" />
              <span>Use in Browser (Zero Install)</span>
            </Link>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-4">
            Detected OS: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{osName}</span> • Version 1.0.0 (2026 Edition) • Free & Open
          </p>
        </div>
      </section>

      {/* Multi-Platform Download Matrix (Cards Grid) */}
      <section className="py-16 md:py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Choose Your Platform
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Download the native desktop or mobile app for full offline support, or launch directly in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. ANDROID */}
          <div className="bg-white dark:bg-[#13141c] border-2 border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-200/50 dark:border-emerald-800/40">
                <Smartphone size={24} />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Android</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  10 MB
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Phones & Tablets (Android 8.0+)
              </p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 mb-6">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>100% Offline test taking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Smooth mobile touch keypad</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>Google Drive vault sync</span>
                </li>
              </ul>
            </div>

            <a
              href="/downloads/CBT_Exam_Master_2026.apk"
              download="CBT_Exam_Master_2026.apk"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs text-center flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Download size={14} />
              <span>Download .APK (v1.0.0)</span>
            </a>
          </div>

          {/* 2. WINDOWS */}
          <div id="windows-downloads" className="bg-white dark:bg-[#13141c] border-2 border-blue-500/20 dark:border-blue-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 border border-blue-200/50 dark:border-blue-800/40">
                <Monitor size={24} />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Windows</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                  Win 10/11
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                PC & Laptop (64-bit / ARM64)
              </p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 mb-6">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  <span>Portable .exe (Runs from USB)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  <span>No installation / admin required</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  <span>Exact TCS iON fullscreen mode</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <a
                href="/downloads/CBT_Exam_Master_2026_Portable.exe"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs text-center flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <Download size={14} />
                <span>Portable .exe (Standalone)</span>
              </a>
            </div>
          </div>

          {/* 3. MACOS */}
          <div id="mac-downloads" className="bg-white dark:bg-[#13141c] border-2 border-purple-500/20 dark:border-purple-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-purple-500/50 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 border border-purple-200/50 dark:border-purple-800/40">
                <Laptop size={24} />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">macOS</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                  Apple Silicon
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                MacBook, Mac Mini, iMac (M1–M4)
              </p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 mb-6">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                  <span>Native Apple Silicon M-Series</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                  <span>Direct Google Drive mounting</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-purple-500 shrink-0" />
                  <span>Hardware accelerated KaTeX math</span>
                </li>
              </ul>
            </div>

            <a
              href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT_Exam_Master_2026_Mac.dmg"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs text-center flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Download size={14} />
              <span>Download .DMG (Mac)</span>
            </a>
          </div>

          {/* 4. WEB SIMULATOR */}
          <div className="bg-white dark:bg-[#13141c] border-2 border-amber-500/20 dark:border-amber-500/30 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 border border-amber-200/50 dark:border-amber-800/40">
                <Globe size={24} />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Web Browser</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                  Zero Install
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Chrome, Safari, Edge, Firefox, iOS
              </p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 mb-6">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                  <span>Instant access in 1 click</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                  <span>Works on iPhone, iPad & Linux</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
                  <span>Automatic cloud score syncing</span>
                </li>
              </ul>
            </div>

            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs text-center flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Play size={14} className="fill-white" />
              <span>Launch Simulator</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Banner */}
      <section className="py-12 bg-zinc-100/70 dark:bg-[#12131a]/60 border-y border-zinc-200 dark:border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-[#0858f7] mb-1">29,817+</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">Official Exam Papers</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">SSC, Banking, Railways, Defense</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-500 mb-1">100%</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">Offline Study Mode</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">No internet required to practice</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-purple-500 mb-1">TCS iON</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">Exact Interface</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Official question palette & timers</div>
            </div>
            <div className="p-4">
              <div className="text-2xl sm:text-3xl font-black text-amber-500 mb-1">Step-by-Step</div>
              <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">Verified Solutions</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Detailed formulas & shortcut tricks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple 3-Step Setup Guide */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center mb-8">
          Quick 3-Step Installation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#13141c] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-sm mb-3">
              1
            </div>
            <h4 className="font-bold text-sm mb-1">Download Package</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Choose the .APK for Android, .exe for Windows, or .dmg for Mac.
            </p>
          </div>
          <div className="bg-white dark:bg-[#13141c] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-sm mb-3">
              2
            </div>
            <h4 className="font-bold text-sm mb-1">Open or Install</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Tap open on mobile or double click on PC. Zero setup or configurations required.
            </p>
          </div>
          <div className="bg-white dark:bg-[#13141c] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-sm mb-3">
              3
            </div>
            <h4 className="font-bold text-sm mb-1">Practice & Review</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Take full real-time mock tests, analyze weak areas, and master step-by-step solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <p>© 2026 CBT Exam Master. Built for serious exam aspirants.</p>
        <p className="mt-1">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2">
            Launch Simulator
          </Link>
          {' • '}
          <Link href="/download" className="hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2">
            Download Page
          </Link>
        </p>
      </footer>
    </div>
  );
}
