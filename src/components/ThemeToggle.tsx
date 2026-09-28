'use client';

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, ThemeMode } from '@/context/ThemeContext';

export default function ThemeToggle({ variant = 'segmented' }: { variant?: 'segmented' | 'icon' | 'dropdown' }) {
  const { themeMode, resolvedTheme, setThemeMode, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-[#3f3f46]/60 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
        title={`Theme: ${themeMode} (${resolvedTheme}) — Click to toggle`}
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-600" />}
      </button>
    );
  }

  const options: { mode: ThemeMode; label: string; icon: any }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'Auto', icon: Laptop },
  ];

  return (
    <div className="flex items-center p-1 bg-zinc-100 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] rounded-xl text-xs select-none">
      {options.map(({ mode, label, icon: Icon }) => {
        const isActive = themeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] ${
              isActive
                ? 'bg-white dark:bg-[#27272a] text-[#0858f7] dark:text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Icon size={12} className={isActive ? (mode === 'light' ? 'text-amber-500' : mode === 'dark' ? 'text-indigo-400' : 'text-[#0858f7]') : ''} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
