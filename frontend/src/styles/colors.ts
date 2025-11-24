/**
 * Color System - Logo-based palette
 * Designed to work with the SafeNode logo and support light/dark modes
 */

export const colors = {
  // Secondary colors (teal - from logo)
  secondary: {
    50: '#ECFDFB',
    100: '#C8F9F3',
    200: '#93F0E4',
    300: '#5FE4D2',
    400: '#3EC6A8',
    500: '#26A387',  // Primary secondary
    600: '#1B7C66',
    700: '#125947',
    800: '#0A372B',
    900: '#041B15',
  },
  
  // Light mode colors
  light: {
    background: '#ffffff',
    surface: '#ffffff',
    surfaceHover: '#f8fafc',
    border: '#e2e8f0',
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
    },
  },
  
  // Dark mode colors
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    border: '#334155',
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
    },
  },
} as const

/**
 * Get color class names for light/dark mode
 */
export const colorClasses = {
  // Backgrounds
  bg: {
    primary: 'bg-white dark:bg-slate-900',
    surface: 'bg-white dark:bg-slate-800',
    surfaceHover: 'bg-slate-50 dark:bg-slate-700',
    secondary: 'bg-secondary-600 dark:bg-secondary-500',
    secondaryHover: 'hover:bg-secondary-700 dark:hover:bg-secondary-600',
  },
  
  // Text
  text: {
    primary: 'text-slate-900 dark:text-slate-100',
    secondary: 'text-secondary-600 dark:text-secondary-400',
    muted: 'text-slate-500 dark:text-slate-500',
    white: 'text-white',
  },
  
  // Borders
  border: {
    default: 'border-slate-200 dark:border-slate-700',
    hover: 'border-slate-300 dark:border-slate-600',
    secondary: 'border-secondary-500 dark:border-secondary-400',
  },
  
  // Gradients
  gradient: {
    secondary: 'bg-gradient-to-r from-secondary-600 to-secondary-500',
    secondaryHover: 'hover:from-secondary-700 hover:to-secondary-600',
    text: 'bg-gradient-to-r from-secondary-600 to-secondary-500 bg-clip-text text-transparent',
    subtle: 'bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-950/20 dark:to-secondary-900/20',
  },
} as const

