/**
 * SafeNode Theme System
 * Centralized theme configuration
 */

export const theme = {
  colors: {
    primary: {
      50: '#ffffff',
      100: '#f8fafc',
      200: '#f1f5f9',
      300: '#e2e8f0',
      400: '#cbd5e1',
      500: '#ffffff',
      600: '#f8fafc',
      700: '#f1f5f9',
      800: '#e2e8f0',
      900: '#cbd5e1',
    },
    secondary: {
      50: '#ECFDFB',
      100: '#C8F9F3',
      200: '#93F0E4',
      300: '#5FE4D2',
      400: '#3EC6A8',
      500: '#26A387',
      600: '#1B7C66',
      700: '#125947',
      800: '#0A372B',
      900: '#041B15',
    },
    success: {
      500: '#22c55e',
      600: '#16a34a',
    },
    error: {
      500: '#ef4444',
      600: '#dc2626',
    },
    warning: {
      500: '#f59e0b',
      600: '#d97706',
    },
    info: {
      500: '#0ea5e9',
      600: '#0284c7',
    },
  },
  shadows: {
    safenode: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    'safenode-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    'safenode-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    'safenode-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    'safenode-secondary': '0 4px 14px 0 rgba(38, 163, 135, 0.15)',
    'safenode-secondary-lg': '0 10px 30px 0 rgba(38, 163, 135, 0.2)',
  },
  borderRadius: {
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
} as const

export type ThemeColor = keyof typeof theme.colors
export type ThemeShadow = keyof typeof theme.shadows

