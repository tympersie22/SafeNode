/**
 * SafeNode Mobile Theme - Spacing
 * Base unit: 4px
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const

export type SpacingSize = keyof typeof spacing

