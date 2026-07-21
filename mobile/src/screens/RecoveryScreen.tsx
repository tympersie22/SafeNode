import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, IconTile, PageHeader, Screen, SectionTitle, StatusPill } from '../components/ui'
import { colors, spacing, typography } from '../theme/tokens'

export function RecoveryScreen() {
  const { user } = useAuth()
  const configured = Boolean(user?.recoveryKitConfigured)
  return (
    <Screen>
      <PageHeader eyebrow="Resilience" title="Recovery, without escrow." body="A deliberate path back into your encrypted data when every trusted device is gone." />
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.rescue}><Ionicons name="help-buoy" size={31} color={configured ? colors.signal : colors.warning} /></View>
          <StatusPill label={configured ? 'Recovery ready' : 'Action required'} tone={configured ? 'good' : 'warn'} />
        </View>
        <Text style={styles.title}>{configured ? 'Your recovery path is active.' : 'One failure mode remains.'}</Text>
        <Text style={styles.body}>{configured ? 'Your recovery kit wraps the vault key independently from your passkeys. Keep the offline copy separate.' : 'If all passkeys are lost before a recovery kit is created, Safenode cannot decrypt the vault for you.'}</Text>
        <Button label={configured ? 'Review recovery status' : 'Create recovery kit'} icon="document-lock-outline" disabled />
      </Card>

      <SectionTitle title="Recovery model" />
      <Card>
        <Step number="01" title="Generate locally" body="Recovery material is created on this device, never by the server." />
        <View style={styles.line} />
        <Step number="02" title="Store offline" body="Print or save it away from your normal devices and cloud account." />
        <View style={styles.line} />
        <Step number="03" title="Recover privately" body="The kit unwraps the same random vault key without server escrow." />
      </Card>
    </Screen>
  )
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return <View style={styles.step}><Text style={styles.number}>{number}</Text><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View></View>
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rescue: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.signalDeep, borderWidth: 1, borderColor: colors.lineBright },
  title: { color: colors.text, fontFamily: typography.display, fontSize: 25, lineHeight: 31, marginTop: spacing.lg },
  body: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 21, marginVertical: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md },
  number: { color: colors.signal, fontFamily: typography.mono, fontSize: 12, paddingTop: 2 },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  stepBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
  line: { width: 1, height: 22, backgroundColor: colors.lineBright, marginLeft: 8, marginVertical: 5 },
})
