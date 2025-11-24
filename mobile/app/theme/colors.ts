/**
 * SafeNode Mobile Theme - Colors
 * Light & dark mode color system
 */

export const colors = {
  light: {
    // Brand colors
    primary: '#9333ea',
    primaryLight: '#a855f7',
    primaryDark: '#7e22ce',
    accent: '#ec4899',
    accentLight: '#f472b6',
    accentDark: '#db2777',
    
    // Backgrounds
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceHover: '#f1f5f9',
    
    // Text
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8',
      inverse: '#ffffff',
    },
    
    // Borders
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    borderDark: '#cbd5e1',
    
    // Semantic
    success: '#22c55e',
    successLight: '#4ade80',
    error: '#ef4444',
    errorLight: '#f87171',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    info: '#0ea5e9',
    infoLight: '#38bdf8',
    
    // Gray scale
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  
  dark: {
    // Brand colors
    primary: '#a855f7',
    primaryLight: '#c084fc',
    primaryDark: '#9333ea',
    accent: '#f472b6',
    accentLight: '#f9a8d4',
    accentDark: '#ec4899',
    
    // Backgrounds
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    
    // Text
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      inverse: '#1e293b',
    },
    
    // Borders
    border: '#334155',
    borderLight: '#475569',
    borderDark: '#1e293b',
    
    // Semantic
    success: '#22c55e',
    successLight: '#4ade80',
    error: '#ef4444',
    errorLight: '#f87171',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    info: '#0ea5e9',
    infoLight: '#38bdf8',
    
    // Gray scale
    gray: {
      50: '#030712',
      100: '#111827',
      200: '#1f2937',
      300: '#374151',
      400: '#4b5563',
      500: '#6b7280',
      600: '#9ca3af',
      700: '#cbd5e1',
      800: '#e5e7eb',
      900: '#f3f4f6',
    },
  },
} as const

export type ColorMode = 'light' | 'dark'
export type ColorPalette = typeof colors.light

