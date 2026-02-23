'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'auth-theme';

export function useAuthTheme() {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') setThemeState(stored);
    } catch (_) {}
  }, []);

  const setTheme = useCallback((next) => {
    const value = next === 'dark' ? 'dark' : 'light';
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
    setThemeState(value);
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

  return [theme, setTheme, toggleTheme];
}
