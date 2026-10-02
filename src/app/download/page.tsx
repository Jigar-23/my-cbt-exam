'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Monitor, Laptop, Smartphone, Globe, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function DownloadPage() {
  const [os, setOS] = useState<'windows' | 'mac' | 'android' | 'web'>('windows');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();

    if (ua.includes('android')) {
      setOS('android');
    } else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) {
      setOS('mac');
    } else if (ua.includes('win')) {
      setOS('windows');
    } else {
      setOS('web');
    }
  }, []);

  const getPrimaryDownloadInfo = () => {
    switch (os) {
      case 'android':
        return {
          title: 'Download for Android',
          url: '/download/android',
          spec: 'Android 8.0 or later · 10 MB (.apk)',
          altText: null,
          altUrl: null,
        };
      case 'mac':
        return {
          title: 'Download for Mac',
          url: '/download/mac',
          spec: 'macOS 11 or later (Apple Silicon) · 119 MB (.dmg)',
          altText: null,
          altUrl: null,
        };
      case 'windows':
        return {
          title: 'Download for Windows',
          url: '/download/windows',
          spec: 'Windows 11 / 10 (64-bit) · 218 MB (.exe)',
          altText: 'or download Portable .zip (276 MB)',
          altUrl: '/download/windows-portable',
        };
      default:
        return {
          title: 'Launch Web Simulator',
          url: '/',
          spec: 'Works in Chrome, Safari, Edge, and Firefox',
          altText: null,
          altUrl: null,
        };
    }
  };

  const primary = getPrimaryDownloadInfo();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0d11] text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900/40">
      {/* Clean Apple-style Navbar */}
      <header className="h-16 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#0c0d11]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 font-semibold text-[15px] tracking-tight hover:opacity-85 transition-opacity">
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              CBT
            </span>
            <span className="text-zinc-900 dark:text-white">CBT Exam Master</span>
          </Link>

          <nav className="flex items-center space-x-6 text-[13px] text-zinc-600 dark:text-zinc-400">
            <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">
              Web Simulator
            </Link>
            <ThemeToggle variant="icon" />
          </nav>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-20 max-w-4xl mx-auto w-full">
        {/* Simple App Icon */}
        <div className="w-20 h-20 rounded-[22px] bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-8 shadow-sm ring-1 ring-black/5">
          CBT
        </div>

        {/* Clean, Simple Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.1] mb-5">
          Real exam practice. <br />
          Built for every device.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-10 font-normal leading-relaxed">
          The authentic TCS iON simulator for SSC, Banking, Railways, and Defense exams. 
          29,800+ official previous year papers, completely offline.
        </p>

        {/* Big Single Download Button */}
        <div className="flex flex-col items-center space-y-3 mb-16">
          {os === 'web' ? (
            <Link
              href="/"
              className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-[15px] shadow-sm hover:shadow transition-all inline-flex items-center space-x-2"
            >
              <span>Launch Simulator</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <a
              href={primary.url}
              className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-[15px] shadow-sm hover:shadow transition-all inline-flex items-center space-x-2"
            >
              <Download size={16} />
              <span>{primary.title}</span>
            </a>
          )}

          <div className="text-[13px] text-zinc-500 dark:text-zinc-400 space-y-1">
            <p>
              {primary.spec}
              {primary.altText && primary.altUrl && (
                <>
                  {' '}•{' '}
                  <a href={primary.altUrl} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {primary.altText}
                  </a>
                </>
              )}
            </p>
            <p>
              Free to use •{' '}
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                Or practice online in browser
              </Link>
            </p>
          </div>
        </div>

        {/* Minimal Platform Selector */}
        <div className="w-full pt-12 border-t border-black/[0.06] dark:border-white/[0.08]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-8">
            All Available Downloads
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {/* Windows */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div>
                <Monitor size={22} className="text-zinc-700 dark:text-zinc-300 mb-3" />
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-0.5">Windows</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Windows 11 & 10 (64-bit)</p>
              </div>
              <div className="flex flex-col space-y-1.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                <a
                  href="/download/windows"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-1"
                >
                  <span>Download Installer (.exe)</span>
                  <ArrowRight size={12} />
                </a>
                <a
                  href="/download/windows-portable"
                  className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Download Portable (.zip)
                </a>
              </div>
            </div>

            {/* Mac */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div>
                <Laptop size={22} className="text-zinc-700 dark:text-zinc-300 mb-3" />
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-0.5">macOS</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Apple Silicon (M1–M4)</p>
              </div>
              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                <a
                  href="/download/mac"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-1"
                >
                  <span>Download .dmg (119 MB)</span>
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>

            {/* Android */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div>
                <Smartphone size={22} className="text-zinc-700 dark:text-zinc-300 mb-3" />
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-0.5">Android</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Phones & Tablets (8.0+)</p>
              </div>
              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                <a
                  href="/download/android"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-1"
                >
                  <span>Download .apk (10 MB)</span>
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>

            {/* Web */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div>
                <Globe size={22} className="text-zinc-700 dark:text-zinc-300 mb-3" />
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-0.5">Web Browser</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Chrome, Edge, Safari</p>
              </div>
              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                <Link
                  href="/"
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center space-x-1"
                >
                  <span>Open in browser</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Simple Product Truths */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl w-full mt-24 pt-12 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
              Exact exam interface.
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Familiar TCS iON layout, official question palettes, and accurate sectional timers so there are no surprises on exam day.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
              100% offline.
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Practice anywhere without relying on an active internet connection. All test papers and answer keys stay stored on your device.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
              Step-by-step solutions.
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Detailed formulas, derivations, and verified answer keys to help you learn and review after every mock attempt.
            </p>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.08] py-8 text-[12px] text-zinc-500 dark:text-zinc-500 bg-white/50 dark:bg-transparent">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 CBT Exam Master. Built for serious aspirants.</p>
          <div className="flex items-center space-x-6">
            <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">
              Web Simulator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
