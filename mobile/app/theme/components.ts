/**
 * SafeNode Mobile Theme - Component Styles
 */

import { ViewStyle, TextStyle } from 'react-native'
import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'
import { shadows } from './shadows'

export const components = {
  button: {
    primary: {
      backgroundColor: colors.light.primary,
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadows.md,
    } as ViewStyle,
    secondary: {
      backgroundColor: colors.light.surface,
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.light.border,
    } as ViewStyle,
    text: {
      ...typography.styles.button,
      color: colors.light.text.inverse,
    } as TextStyle,
  },
  
  input: {
    container: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.light.border,
      backgroundColor: colors.light.background,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
    } as ViewStyle,
    text: {
      ...typography.styles.body,
      color: colors.light.text.primary,
    } as TextStyle,
    placeholder: {
      color: colors.light.text.muted,
    } as TextStyle,
  },
  
  card: {
    container: {
      backgroundColor: colors.light.surface,
      borderRadius: 16,
      padding: spacing.base,
      ...shadows.md,
    } as ViewStyle,
  },
  
  modal: {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    } as ViewStyle,
    container: {
      backgroundColor: colors.light.background,
      borderRadius: 24,
      padding: spacing.lg,
      ...shadows.xl,
    } as ViewStyle,
  },
  
  header: {
    container: {
      backgroundColor: colors.light.background,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.light.border,
      ...shadows.sm,
    } as ViewStyle,
    title: {
      ...typography.styles.h3,
      color: colors.light.text.primary,
    } as TextStyle,
  },
  
  tab: {
    container: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    } as ViewStyle,
    active: {
      backgroundColor: colors.light.primary + '20',
    } as ViewStyle,
    text: {
      ...typography.styles.bodySmall,
      color: colors.light.text.secondary,
    } as TextStyle,
    activeText: {
      color: colors.light.primary,
      fontWeight: typography.fontWeight.semibold,
    } as TextStyle,
  },
} as const

