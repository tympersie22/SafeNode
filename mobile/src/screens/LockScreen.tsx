import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../auth/AuthContext'
import { Button, StatusPill } from '../components/ui'
import { colors, spacing, typography } from '../theme/tokens'

export function LockScreen() {
  const { unlockApp, signOut } = useAuth()
  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.ink, '#0B211B', colors.ink]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <StatusPill label="Session protected" />
        <View style={styles.lock}><Ionicons name="shield-checkmark" size={40} color={colors.signal} /></View>
        <Text style={styles.title}>Safenode is locked.</Text>
        <Text style={styles.body}>Confirm your device identity to restore this secure session.</Text>
        <Button label="Unlock Safenode" icon="scan-outline" onPress={() => void unlockApp()} />
        <Button label="Sign out" variant="quiet" onPress={() => void signOut()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  lock: { width: 90, height: 90, borderRadius: 32, backgroundColor: colors.signalDeep, borderWidth: 1, borderColor: colors.lineBright, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 34, letterSpacing: -1.2, marginTop: spacing.md },
  body: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 22, marginBottom: spacing.md },
})
