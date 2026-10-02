'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Monitor,
  Laptop,
  Smartphone,
  Globe,
  Download,
  Play,
  Check,
  ChevronRight,
  Shield,
  Clock,
  HardDrive,
  Hash,
  ExternalLink,
  Layers,
  Terminal,
  FileCode2
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type PlatformKey = 'windows' | 'mac' | 'android' | 'web';

export default function DownloadPage() {
  const [selectedOS, setSelectedOS] = useState<PlatformKey>('windows');
  const [detectedOSName, setDetectedOSName] = useState<string>('Windows');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();

    if (ua.includes('android')) {
      setSelectedOS('android');
      setDetectedOSName('Android');
    } else if (ua.includes('win')) {
      setSelectedOS('windows');
      setDetectedOSName('Windows');
    } else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) {
      setSelectedOS('mac');
      setDetectedOSName('macOS');
    } else {
      setSelectedOS('web');
      setDetectedOSName('Web Browser');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#090a0f]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-zinc-900 dark:text-white font-bold text-sm tracking-tight">
            <div className="w-6 h-6 rounded-md bg-[#0858f7] flex items-center justify-center text-white text-xs font-mono font-bold">
              CBT
            </div>
            <span>Exam Master</span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 font-normal">v1.0.0</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Web Simulator
            </Link>
            <a
              href="https://github.com/Jigar-23/my-cbt-exam"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center space-x-1"
            >
              <span>GitHub</span>
              <ExternalLink size={12} />
            </a>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
            <ThemeToggle variant="icon" />
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-12 md:py-16 w-full">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-3 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700/60">
            <span>OFFICIAL RUNTIME</span>
            <span>/</span>
            <span>CROSS-PLATFORM BUILDS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3">
            Download CBT Exam Master
          </h1>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The standalone offline examination simulator for SSC, Banking, Railways, and Defense exams. 
            Includes 29,817 previous year papers, TCS iON parity, and step-by-step verified solutions.
          </p>
        </div>

        {/* Platform Selector Tabs */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden shadow-xs mb-12">
          {/* OS Switcher Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setSelectedOS('windows')}
              className={`px-5 py-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                selectedOS === 'windows'
                  ? 'border-[#0858f7] text-[#0858f7] bg-white dark:bg-[#0e1017] font-semibold'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Monitor size={15} />
              <span>Windows</span>
              {detectedOSName === 'Windows' && (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                  Your OS
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedOS('android')}
              className={`px-5 py-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                selectedOS === 'android'
                  ? 'border-[#0858f7] text-[#0858f7] bg-white dark:bg-[#0e1017] font-semibold'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone size={15} />
              <span>Android</span>
              {detectedOSName === 'Android' && (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                  Your OS
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedOS('mac')}
              className={`px-5 py-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                selectedOS === 'mac'
                  ? 'border-[#0858f7] text-[#0858f7] bg-white dark:bg-[#0e1017] font-semibold'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Laptop size={15} />
              <span>macOS</span>
              {detectedOSName === 'macOS' && (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                  Your OS
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedOS('web')}
              className={`px-5 py-3 flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                selectedOS === 'web'
                  ? 'border-[#0858f7] text-[#0858f7] bg-white dark:bg-[#0e1017] font-semibold'
                  : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Globe size={15} />
              <span>Web Browser</span>
              {detectedOSName === 'Web Browser' && (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Active Platform Panel */}
          <div className="p-6 md:p-8 bg-white dark:bg-[#0e1017]">
            {selectedOS === 'windows' && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">CBT Exam Master for Windows</h3>
                    <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                      x64 / ARM64
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 max-w-xl leading-relaxed">
                    Standalone portable package for Windows 10 & 11. Run directly from a folder or USB drive with zero installation or administrative privileges required.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>Target: Windows 10/11</span>
                    <span>•</span>
                    <span>Architecture: 64-bit</span>
                    <span>•</span>
                    <span>Offline: 100% Native</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <a
                    href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT_Exam_Master_2026_Windows_Portable.zip"
                    className="px-5 py-2.5 bg-[#0858f7] hover:bg-[#0647c9] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
                  >
                    <Download size={14} />
                    <span>Download Windows (.ZIP)</span>
                  </a>
                  <Link
                    href="/"
                    className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-all border border-zinc-200 dark:border-zinc-700"
                  >
                    <Play size={14} />
                    <span>Launch Web Version</span>
                  </Link>
                </div>
              </div>
            )}

            {selectedOS === 'android' && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">CBT Exam Master for Android</h3>
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                      10.0 MB
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 max-w-xl leading-relaxed">
                    Lightweight native Android package with hardware back button integration, question palette drawer, and local storage persistence.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>Package: CBT_Exam_Master_2026.apk</span>
                    <span>•</span>
                    <span>Requirement: Android 8.0+</span>
                    <span>•</span>
                    <span>Size: 10.03 MB</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <a
                    href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT_Exam_Master_2026.apk"
                    download="CBT_Exam_Master_2026.apk"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
                  >
                    <Download size={14} />
                    <span>Download APK (Direct)</span>
                  </a>
                  <a
                    href="/downloads/CBT_Exam_Master_2026.apk"
                    className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-all border border-zinc-200 dark:border-zinc-700"
                  >
                    <span>Vercel Mirror</span>
                  </a>
                </div>
              </div>
            )}

            {selectedOS === 'mac' && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">CBT Exam Master for macOS</h3>
                    <span className="text-xs font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-bold">
                      Apple Silicon
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 max-w-xl leading-relaxed">
                    Native Apple Silicon executable built for M1, M2, M3, and M4 Macs with hardware accelerated math rendering and local Google Drive mount integration.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>Target: macOS 12 Monterey+</span>
                    <span>•</span>
                    <span>Arch: arm64</span>
                    <span>•</span>
                    <span>Format: .DMG Installer</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <a
                    href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT.Exam.Master.2026-1.0.0-arm64.dmg"
                    className="px-5 py-2.5 bg-[#0858f7] hover:bg-[#0647c9] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
                  >
                    <Download size={14} />
                    <span>Download .DMG (118.9 MB)</span>
                  </a>
                  <a
                    href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT.Exam.Master.2026-1.0.0-arm64-mac.zip"
                    className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-all border border-zinc-200 dark:border-zinc-700"
                  >
                    <span>Portable .ZIP</span>
                  </a>
                </div>
              </div>
            )}

            {selectedOS === 'web' && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Cloud Web Simulator</h3>
                    <span className="text-xs font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                      Zero Install
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 max-w-xl leading-relaxed">
                    Run the full examination platform directly inside your web browser. Compatible with Chrome, Safari, Edge, Firefox, and iPadOS.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>Engine: Next.js Static Edge</span>
                    <span>•</span>
                    <span>Storage: IndexedDB</span>
                    <span>•</span>
                    <span>Parity: 100%</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <Link
                    href="/"
                    className="px-6 py-2.5 bg-[#0858f7] hover:bg-[#0647c9] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
                  >
                    <Play size={14} className="fill-white" />
                    <span>Launch Simulator Now</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real Product Simulation Interface (Proof of Quality) */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Authentic Examination Interface</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Strict fidelity with TCS iON, SSC, and IBPS test center layouts.</p>
            </div>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">TCS iON Simulation</span>
          </div>

          <div className="border border-zinc-300 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#12131a] shadow-sm font-sans">
            {/* Exam Header Bar */}
            <div className="bg-[#1f2937] text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-zinc-700">
              <div className="flex items-center space-x-4">
                <span className="font-bold text-amber-400">SSC CGL 2026 Tier-1 Mock Shift</span>
                <span className="text-zinc-400">|</span>
                <span className="text-zinc-300">System Name: <strong className="text-white">C042</strong></span>
              </div>
              <div className="flex items-center space-x-3 font-mono">
                <Clock size={14} className="text-amber-400" />
                <span className="text-amber-400 font-bold">Time Left: 00:54:19</span>
              </div>
            </div>

            {/* Exam Sub-Header: Sections */}
            <div className="bg-zinc-100 dark:bg-zinc-800/60 px-4 py-1.5 border-b border-zinc-200 dark:border-zinc-700/80 flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 bg-[#0858f7] text-white rounded font-medium text-[11px]">
                Quantitative Aptitude
              </span>
              <span className="px-2.5 py-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                General Intelligence & Reasoning
              </span>
              <span className="px-2.5 py-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                English Comprehension
              </span>
              <span className="px-2.5 py-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                General Awareness
              </span>
            </div>

            {/* Split View: Question Area & Palette */}
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 text-xs min-h-[220px]">
              {/* Question Left */}
              <div className="md:col-span-3 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-4 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>Question No. 14</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+2.0 / -0.5 Marks</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4 leading-relaxed">
                    A shopkeeper marks an article 44% above cost price and allows two successive discounts of 10% and 20%. If he subsequently reduces the discount to 15%, what is his net profit percentage?
                  </p>
                  <div className="space-y-2 max-w-md">
                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 flex items-center space-x-3 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border border-zinc-400 dark:border-zinc-600 flex items-center justify-center text-[10px]">1</div>
                      <span>50%</span>
                    </div>
                    <div className="p-2.5 rounded border-2 border-[#0858f7] bg-blue-50/50 dark:bg-blue-950/20 flex items-center space-x-3 cursor-pointer font-semibold text-blue-700 dark:text-blue-300">
                      <div className="w-4 h-4 rounded-full bg-[#0858f7] text-white flex items-center justify-center text-[10px] font-bold">2</div>
                      <span>70% (Verified Correct)</span>
                    </div>
                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 flex items-center space-x-3 cursor-pointer">
                      <div className="w-4 h-4 rounded-full border border-zinc-400 dark:border-zinc-600 flex items-center justify-center text-[10px]">3</div>
                      <span>30%</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 mt-6 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                  <div className="flex space-x-2">
                    <span className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                      Mark for Review
                    </span>
                    <span className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                      Clear Response
                    </span>
                  </div>
                  <span className="px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold">
                    Save & Next &rarr;
                  </span>
                </div>
              </div>

              {/* Palette Right */}
              <div className="p-4 bg-zinc-50 dark:bg-[#0c0d12]">
                <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-3">Question Palette (25)</div>
                <div className="grid grid-cols-5 gap-1.5 mb-4 font-mono text-[10px]">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-7 rounded flex items-center justify-center font-bold ${
                        i === 13
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : i < 8
                          ? 'bg-emerald-600 text-white'
                          : i === 9 || i === 11
                          ? 'bg-purple-600 text-white'
                          : i === 8 || i === 10
                          ? 'bg-rose-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded bg-emerald-600 shrink-0" />
                    <span>8 Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded bg-rose-600 shrink-0" />
                    <span>2 Not Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded bg-purple-600 shrink-0" />
                    <span>2 Marked for Review</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                    <span>8 Not Visited</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Specification Matrix */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-3">Build Specification</h2>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-mono text-[11px]">
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Target Architecture</th>
                  <th className="py-2.5 px-4">Format</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Smartphone size={14} className="text-emerald-500" />
                    <span>Android</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">Universal (ARM64/x86)</td>
                  <td className="py-3 px-4">.APK</td>
                  <td className="py-3 px-4">10.0 MB</td>
                  <td className="py-3 px-4">
                    <a
                      href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT_Exam_Master_2026.apk"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Download</span>
                      <ChevronRight size={12} />
                    </a>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Laptop size={14} className="text-purple-500" />
                    <span>macOS</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">Apple Silicon (M1–M4)</td>
                  <td className="py-3 px-4">.DMG / .ZIP</td>
                  <td className="py-3 px-4">118.9 MB</td>
                  <td className="py-3 px-4">
                    <a
                      href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT.Exam.Master.2026-1.0.0-arm64.dmg"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Download</span>
                      <ChevronRight size={12} />
                    </a>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Monitor size={14} className="text-blue-500" />
                    <span>Windows</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">x64 / Intel / AMD</td>
                  <td className="py-3 px-4">Portable .ZIP</td>
                  <td className="py-3 px-4">276 MB</td>
                  <td className="py-3 px-4">
                    <a
                      href="https://github.com/Jigar-23/my-cbt-exam/releases/download/v1.0.0/CBT_Exam_Master_2026_Windows_Portable.zip"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Download</span>
                      <ChevronRight size={12} />
                    </a>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Globe size={14} className="text-amber-500" />
                    <span>Web Browser</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">Any Modern Browser</td>
                  <td className="py-3 px-4">Static Web</td>
                  <td className="py-3 px-4">Zero Install</td>
                  <td className="py-3 px-4">
                    <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1">
                      <span>Launch</span>
                      <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Minimalist Engineering Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-xs text-zinc-500 dark:text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            CBT Exam Master 2026 • 29,817 Full Papers • Offline First
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Exam Simulator
            </Link>
            <Link href="/download" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Downloads
            </Link>
            <a
              href="https://github.com/Jigar-23/my-cbt-exam"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
