import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { arePasskeysSupported } from '../api/passkeys'
import { useAuth } from '../auth/AuthContext'
import { Button, StatusPill } from '../components/ui'
import { colors, radii, spacing, typography } from '../theme/tokens'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supported = useMemo(arePasskeysSupported, [])

  const submit = async () => {
    setError(null)
    if (!email.trim().includes('@')) return setError('Enter a valid email address.')
    if (mode === 'signup' && name.trim().length < 2) return setError('Enter the name you want shown on this account.')
    if (!supported) return setError('Passkeys are not available on this device or build.')
    setLoading(true)
    try {
      if (mode === 'signin') await signIn(email.trim().toLowerCase())
      else await signUp(email.trim().toLowerCase(), name.trim())
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The passkey request could not be completed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#06100E', '#0B211B', '#06100E']} style={StyleSheet.absoluteFill} />
      <View style={styles.orbitOne} /><View style={styles.orbitTwo} />
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.mark}><Ionicons name="shield-checkmark" size={22} color={colors.ink} /></View>
          <Text style={styles.brand}>SAFENODE</Text>
          <StatusPill label="Native secure client" />
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>IDENTITY IS THE KEY</Text>
          <Text style={styles.title}>{mode === 'signin' ? 'Enter without a password.' : 'Create your secure identity.'}</Text>
          <Text style={styles.subtitle}>Your passkey stays in your device security hardware. Safenode never receives or stores it.</Text>
        </View>

        <View style={styles.formCard}>
          {mode === 'signup' ? (
            <View style={styles.field}>
              <Text style={styles.label}>DISPLAY NAME</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textFaint} style={styles.input} autoCapitalize="words" />
            </View>
          ) : null}
          <View style={styles.field}>
            <Text style={styles.label}>ACCOUNT EMAIL</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@company.com" placeholderTextColor={colors.textFaint} style={styles.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          </View>
          {error ? <View style={styles.error}><Ionicons name="alert-circle" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
          <Button label={mode === 'signin' ? 'Continue with passkey' : 'Create account with passkey'} icon="key-outline" loading={loading} onPress={submit} />
          <View style={styles.trustRow}>
            <Ionicons name="hardware-chip-outline" size={16} color={colors.textMuted} />
            <Text style={styles.trustText}>Protected by Face ID, Touch ID, or Android screen lock</Text>
          </View>
        </View>

        <Pressable style={styles.switcher} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}>
          <Text style={styles.switchText}>{mode === 'signin' ? 'New to Safenode?' : 'Already secured?'}</Text>
          <Text style={styles.switchAction}>{mode === 'signin' ? 'Create an identity' : 'Sign in'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 62, paddingBottom: 30, justifyContent: 'space-between' },
  orbitOne: { position: 'absolute', width: 360, height: 360, borderRadius: 180, borderWidth: 1, borderColor: '#295247', top: -190, right: -120, opacity: 0.7 },
  orbitTwo: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: '#1A3A32', bottom: -150, left: -140 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  mark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.signal, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.text, fontFamily: typography.display, letterSpacing: 2.2, fontSize: 14, marginRight: 'auto' },
  hero: { marginTop: 52, marginBottom: spacing.xl },
  kicker: { color: colors.signal, fontFamily: typography.mono, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 42, lineHeight: 47, letterSpacing: -1.8, marginTop: spacing.md, maxWidth: 370 },
  subtitle: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 23, marginTop: spacing.md, maxWidth: 360 },
  formCard: { backgroundColor: '#0C1B17EE', borderWidth: 1, borderColor: colors.lineBright, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  field: { gap: 8 },
  label: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.4 },
  input: { height: 54, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.inkRaised, color: colors.text, paddingHorizontal: spacing.md, fontFamily: typography.medium, fontSize: 15 },
  error: { flexDirection: 'row', gap: spacing.sm, backgroundColor: '#2A1718', borderRadius: radii.sm, padding: 12, alignItems: 'flex-start' },
  errorText: { flex: 1, color: '#FFC1C1', fontFamily: typography.body, fontSize: 12, lineHeight: 18 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  trustText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11 },
  switcher: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: spacing.lg },
  switchText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
  switchAction: { color: colors.signal, fontFamily: typography.strong, fontSize: 13 },
})
