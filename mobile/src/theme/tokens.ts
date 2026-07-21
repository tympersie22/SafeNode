import { Platform } from 'react-native'

export const colors = {
  ink: '#06100E',
  inkRaised: '#0A1714',
  panel: '#0E1D19',
  panelStrong: '#132621',
  line: '#203A33',
  lineBright: '#31554B',
  text: '#F3F7F5',
  textMuted: '#93A69F',
  textFaint: '#647A72',
  signal: '#52E3B2',
  signalDeep: '#163D32',
  cyan: '#62D8F5',
  warning: '#F3C86A',
  danger: '#FF7A7A',
  white: '#FFFFFF',
  black: '#020806',
} as const

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 42,
} as const

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const

export const typography = {
  display: 'Manrope_700Bold',
  strong: 'Manrope_600SemiBold',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  mono: 'IBMPlexMono_500Medium',
} as const

export const shadow = Platform.select({
  ios: {
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 8 },
  default: {},
})
