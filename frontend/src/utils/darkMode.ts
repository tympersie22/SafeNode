/**
 * Dark Mode - Theme toggle between light and dark
 */

import { useState, useEffect } from 'react';

const DARK_MODE_KEY = 'safenode_dark_mode';

/**
 * Check if dark mode is enabled
 */
export function isDarkModeEnabled(): boolean {
  try {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored) {
      return stored === 'true';
    }
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Enable dark mode
 */
export function enableDarkMode(): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, 'true');
    document.documentElement.classList.add('dark');
  } catch (error) {
    console.error('Failed to enable dark mode:', error);
  }
}

/**
 * Disable dark mode
 */
export function disableDarkMode(): void {
  try {
    localStorage.setItem(DARK_MODE_KEY, 'false');
    document.documentElement.classList.remove('dark');
  } catch (error) {
    console.error('Failed to disable dark mode:', error);
  }
}

/**
 * React hook for dark mode
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isDarkModeEnabled();
  });

  useEffect(() => {
    // Apply initial theme
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(DARK_MODE_KEY)) {
        setIsDark(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDark]);

  const toggle = () => {
    if (isDark) {
      disableDarkMode();
      setIsDark(false);
    } else {
      enableDarkMode();
      setIsDark(true);
    }
  };

  const enable = () => {
    enableDarkMode();
    setIsDark(true);
  };

  const disable = () => {
    disableDarkMode();
    setIsDark(false);
  };

  return { isDark, toggle, enable, disable };
}

