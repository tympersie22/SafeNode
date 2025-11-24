/**
 * SafeNode Mobile Theme - Typography
 */

import { TextStyle } from 'react-native'

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 48,
  },
  
  fontWeight: {
    light: '300' as TextStyle['fontWeight'],
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },
  
  // Predefined text styles
  styles: {
    h1: {
      fontSize: 36,
      lineHeight: 40,
      fontWeight: '700' as TextStyle['fontWeight'],
    },
    h2: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    h3: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    h4: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
  },
} as const

export type TypographySize = keyof typeof typography.fontSize
export type TypographyWeight = keyof typeof typography.fontWeight

