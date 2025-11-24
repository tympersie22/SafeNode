/**
 * SafeNode Mobile Theme - Shadows
 */

import { Platform, ShadowStyleIOS, ViewStyle } from 'react-native'

export const shadows = {
  none: {},
  
  sm: Platform.select<ViewStyle | ShadowStyleIOS>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }),
  
  md: Platform.select<ViewStyle | ShadowStyleIOS>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
  
  lg: Platform.select<ViewStyle | ShadowStyleIOS>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  
  xl: Platform.select<ViewStyle | ShadowStyleIOS>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
  
  '2xl': Platform.select<ViewStyle | ShadowStyleIOS>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
    },
    android: {
      elevation: 12,
    },
  }),
  
  // Brand-specific shadows
  primary: Platform.select<ViewStyle | ShadowStyleIOS>({
    ios: {
      shadowColor: '#9333ea',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
} as const

export type ShadowSize = keyof typeof shadows

