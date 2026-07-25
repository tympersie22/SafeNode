import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, radii, shadow, spacing, typography } from '../theme/tokens'

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const content = <View style={styles.screenContent}>{children}</View>
  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.ink, '#081612', colors.ink]} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </View>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>
}

export function PageHeader({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      {action}
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>
}

type ButtonProps = PressableProps & {
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  loading?: boolean
}

export function Button({ label, icon, variant = 'primary', loading, disabled, style, ...props }: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [styles.button, styles[`button_${variant}`], isDisabled && styles.disabled, pressed && styles.pressed, style as ViewStyle]}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.ink : colors.text} /> : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={variant === 'primary' ? colors.ink : variant === 'danger' ? colors.danger : colors.text} /> : null}
          <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

export function StatusPill({ label, tone = 'good' }: { label: string; tone?: 'good' | 'warn' | 'neutral' }) {
  const color = tone === 'good' ? colors.signal : tone === 'warn' ? colors.warning : colors.textMuted
  return (
    <View style={[styles.pill, { borderColor: `${color}55` }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  )
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionText}>{title}</Text>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>
}

export function IconTile({ icon, color = colors.signal }: { icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  return <View style={styles.iconTile}><Ionicons name={icon} size={20} color={color} /></View>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1 },
  screenContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  glow: { position: 'absolute', top: -110, right: -130, width: 300, height: 300, borderRadius: 150, backgroundColor: '#19483A', opacity: 0.25 },
  eyebrow: { color: colors.signal, fontFamily: typography.mono, fontSize: 11, letterSpacing: 1.7, textTransform: 'uppercase' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xl },
  headerCopy: { flex: 1, paddingRight: spacing.md },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 32, lineHeight: 38, letterSpacing: -1.1, marginTop: spacing.sm },
  body: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, padding: spacing.lg, ...shadow },
  button: { minHeight: 54, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, borderWidth: 1 },
  button_primary: { backgroundColor: colors.signal, borderColor: colors.signal },
  button_secondary: { backgroundColor: colors.panelStrong, borderColor: colors.lineBright },
  button_quiet: { backgroundColor: 'transparent', borderColor: colors.line },
  button_danger: { backgroundColor: '#2A1718', borderColor: '#663638' },
  buttonText: { fontFamily: typography.strong, fontSize: 15 },
  buttonText_primary: { color: colors.ink },
  buttonText_secondary: { color: colors.text },
  buttonText_quiet: { color: colors.text },
  buttonText_danger: { color: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  pill: { alignSelf: 'flex-start', minHeight: 30, borderRadius: radii.pill, paddingHorizontal: 11, borderWidth: 1, backgroundColor: colors.inkRaised, flexDirection: 'row', alignItems: 'center', gap: 7 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: typography.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionText: { color: colors.text, fontFamily: typography.strong, fontSize: 17 },
  sectionAction: { color: colors.signal, fontFamily: typography.medium, fontSize: 13 },
  iconTile: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.signalDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineBright },
})
