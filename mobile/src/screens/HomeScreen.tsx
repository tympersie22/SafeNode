import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../auth/AuthContext'
import { getDevices, getTeams, getVaultStatus, type VaultStatus } from '../api/resources'
import { Card, IconTile, PageHeader, Screen, SectionTitle, StatusPill } from '../components/ui'
import { colors, radii, spacing, typography } from '../theme/tokens'

export function HomeScreen() {
  const { user } = useAuth()
  const [vault, setVault] = useState<VaultStatus | null>(null)
  const [teamCount, setTeamCount] = useState(0)
  const [deviceCount, setDeviceCount] = useState(0)

  useEffect(() => {
    void Promise.allSettled([getVaultStatus(), getTeams(), getDevices()]).then(([vaultResult, teamResult, deviceResult]) => {
      if (vaultResult.status === 'fulfilled') setVault(vaultResult.value)
      if (teamResult.status === 'fulfilled') setTeamCount(teamResult.value.teams.length)
      if (deviceResult.status === 'fulfilled') setDeviceCount(deviceResult.value.devices.length)
    })
  }, [])

  const score = Math.min(100, 55 + (user?.recoveryKitConfigured ? 20 : 0) + (vault?.exists ? 15 : 0) + (deviceCount > 0 ? 10 : 0))

  return (
    <Screen>
      <PageHeader eyebrow="Security command" title={`Good ${new Date().getHours() < 12 ? 'morning' : 'evening'}, ${user?.displayName?.split(' ')[0] || 'operator'}.`} body="Your identity, recovery posture, and shared secrets in one native control plane." action={<View style={styles.avatar}><Text style={styles.avatarText}>{(user?.displayName || user?.email || 'S').slice(0, 1).toUpperCase()}</Text></View>} />

      <Card style={styles.postureCard}>
        <View style={styles.postureTop}>
          <View><StatusPill label="Protected" /><Text style={styles.postureTitle}>Security posture</Text></View>
          <View style={styles.scoreRing}><Text style={styles.score}>{score}</Text><Text style={styles.scoreUnit}>/100</Text></View>
        </View>
        <View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${score}%` }]} /></View>
        <Text style={styles.postureBody}>{score >= 90 ? 'Strong protection. Your critical recovery controls are in place.' : 'Complete recovery setup and review trusted devices to harden this account.'}</Text>
      </Card>

      <SectionTitle title="Security signals" action="Live" />
      <View style={styles.metricGrid}>
        <Metric icon="key-outline" label="Identity" value="Passkey" detail="Phishing resistant" />
        <Metric icon="server-outline" label="Vault" value={vault?.exists ? 'Ready' : 'Setup'} detail="Zero knowledge" />
        <Metric icon="people-outline" label="Teams" value={String(teamCount)} detail="Shared spaces" />
        <Metric icon="phone-portrait-outline" label="Devices" value={String(deviceCount)} detail="Trusted clients" />
      </View>

      <SectionTitle title="Priority action" />
      <Card style={styles.actionCard}>
        <IconTile icon={user?.recoveryKitConfigured ? 'shield-checkmark-outline' : 'help-buoy-outline'} color={user?.recoveryKitConfigured ? colors.signal : colors.warning} />
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>{user?.recoveryKitConfigured ? 'Recovery is configured' : 'Create your recovery kit'}</Text>
          <Text style={styles.actionBody}>{user?.recoveryKitConfigured ? 'Keep the offline copy somewhere separate from this device.' : 'A recovery kit is the only fallback if every passkey is lost.'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </Card>
    </Screen>
  )
}

function Metric({ icon, label, value, detail }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; detail: string }) {
  return <Card style={styles.metric}><IconTile icon={icon} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricDetail}>{detail}</Text></Card>
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: colors.lineBright, backgroundColor: colors.panelStrong, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.signal, fontFamily: typography.display, fontSize: 17 },
  postureCard: { backgroundColor: '#10251F' },
  postureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postureTitle: { color: colors.text, fontFamily: typography.display, fontSize: 23, marginTop: spacing.md },
  scoreRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: colors.signal, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', paddingTop: 19 },
  score: { color: colors.text, fontFamily: typography.display, fontSize: 24 },
  scoreUnit: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 8 },
  scoreTrack: { height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: spacing.lg, overflow: 'hidden' },
  scoreFill: { height: '100%', backgroundColor: colors.signal, borderRadius: 2 },
  postureBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 20, marginTop: spacing.md },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48.5%', minHeight: 166, padding: spacing.md },
  metricLabel: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.md },
  metricValue: { color: colors.text, fontFamily: typography.display, fontSize: 22, marginTop: spacing.xs },
  metricDetail: { color: colors.textFaint, fontFamily: typography.body, fontSize: 11, marginTop: 4 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg },
  actionCopy: { flex: 1 },
  actionTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  actionBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
})
