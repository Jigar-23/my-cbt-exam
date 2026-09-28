'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('cbt_theme_mode') || localStorage.getItem('cbt_theme')) as ThemeMode | null;
      if (saved && (saved === 'system' || saved === 'dark' || saved === 'light')) {
        setThemeModeState(saved);
      }
    } catch {
      // Ignore localStorage read errors
    }
    setMounted(true);
  }, []);

  const syncHtmlTheme = (resolved: ResolvedTheme) => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  // 2. React to System Theme Changes & Mode Changes
  useEffect(() => {
    if (!mounted && typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const computeTheme = (): ResolvedTheme => {
      if (themeMode === 'dark') return 'dark';
      if (themeMode === 'light') return 'light';
      return mediaQuery.matches ? 'dark' : 'light';
    };

    const currentResolved = computeTheme();
    setResolvedTheme(currentResolved);
    syncHtmlTheme(currentResolved);

    // Media query change listener for dynamic adaptive phone/OS theming
    const handler = () => {
      if (themeMode === 'system') {
        const sysResolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(sysResolved);
        syncHtmlTheme(sysResolved);
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode, mounted]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('cbt_theme_mode', mode);
      localStorage.setItem('cbt_theme', mode);
    } catch {
      // Ignore localStorage error
    }
  };

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setThemeMode('light');
    } else {
      setThemeMode('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
