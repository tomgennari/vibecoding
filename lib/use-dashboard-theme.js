'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'auth-theme';

export function useDashboardTheme() {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        setThemeState(stored);
        return;
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setThemeState(initial);
      window.localStorage.setItem(STORAGE_KEY, initial);
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
      } catch (_) {}
      return next;
    });
  }, []);

  return [theme, toggleTheme];
}
