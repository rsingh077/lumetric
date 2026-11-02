'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  const applyResolvedTheme = useCallback((mode: ThemeMode) => {
    let effective: ResolvedTheme = 'dark';
    if (mode === 'light' || mode === 'dark') {
      effective = mode;
    } else if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setResolvedTheme(effective);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.classList.toggle('dark', effective === 'dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('lumetric_theme') as ThemeMode | null;
      const initialMode: ThemeMode =
        stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
      setThemeModeState(initialMode);
      applyResolvedTheme(initialMode);

      if (typeof window.matchMedia === 'function') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = () => {
          const currentStored = localStorage.getItem('lumetric_theme') as ThemeMode | null;
          if (currentStored === 'system' || !currentStored) {
            applyResolvedTheme('system');
          }
        };

        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', handleSystemChange);
          return () => mediaQuery.removeEventListener('change', handleSystemChange);
        } else {
          const legacyMq = mediaQuery as MediaQueryList & {
            addListener?: (fn: () => void) => void;
            removeListener?: (fn: () => void) => void;
          };
          if (typeof legacyMq.addListener === 'function') {
            legacyMq.addListener(handleSystemChange);
            return () => legacyMq.removeListener?.(handleSystemChange);
          }
        }
      }
    } catch {}
  }, [applyResolvedTheme]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      applyResolvedTheme(mode);
      try {
        localStorage.setItem('lumetric_theme', mode);
      } catch {}
    },
    [applyResolvedTheme]
  );

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme: resolvedTheme,
      themeMode,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, themeMode, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
