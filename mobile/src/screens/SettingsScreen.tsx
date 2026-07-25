import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../auth/AuthContext'
import { getDevices, type DeviceSummary } from '../api/resources'
import { Button, Card, IconTile, PageHeader, Screen, SectionTitle, StatusPill } from '../components/ui'
import { colors, spacing, typography } from '../theme/tokens'

export function SettingsScreen() {
  const { user, signOut, localLockEnabled, setLocalLockEnabled } = useAuth()
  const [devices, setDevices] = useState<DeviceSummary[]>([])
  useEffect(() => { void getDevices().then((result) => setDevices(result.devices)).catch(() => undefined) }, [])

  const toggleLocalLock = async (enabled: boolean) => {
    const changed = await setLocalLockEnabled(enabled)
    if (!changed) Alert.alert('Device lock unavailable', 'Configure Face ID, Touch ID, or a device screen lock first.')
  }

  return (
    <Screen>
      <PageHeader eyebrow="Control plane" title="Account & devices" body="Manage the native client boundary around your Safenode identity." />
      <Card style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.displayName || user?.email || 'S').slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.profileCopy}><Text style={styles.name}>{user?.displayName || 'Safenode account'}</Text><Text style={styles.email}>{user?.email}</Text></View>
        <StatusPill label={user?.subscriptionTier || 'Personal'} />
      </Card>

      <SectionTitle title="App protection" />
      <Card>
        <View style={styles.settingRow}>
          <IconTile icon="scan-outline" />
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>Device re-authentication</Text><Text style={styles.settingBody}>Require local biometrics before reopening the app.</Text></View>
          <Switch value={localLockEnabled} onValueChange={(value) => void toggleLocalLock(value)} trackColor={{ false: colors.line, true: colors.signalDeep }} thumbColor={localLockEnabled ? colors.signal : colors.textFaint} />
        </View>
      </Card>

      <SectionTitle title="Trusted devices" action={`${devices.length} active`} />
      <Card>
        {devices.length === 0 ? <Text style={styles.empty}>No device directory is available yet.</Text> : devices.slice(0, 4).map((device, index) => (
          <View key={device.id || device.deviceId || index} style={[styles.device, index > 0 && styles.deviceBorder]}>
            <Ionicons name={device.platform?.toLowerCase().includes('ios') ? 'logo-apple' : 'phone-portrait-outline'} size={20} color={colors.signal} />
            <View style={styles.deviceCopy}><Text style={styles.deviceName}>{device.name || 'Trusted mobile device'}</Text><Text style={styles.deviceMeta}>{device.platform || 'Native client'}</Text></View>
            <StatusPill label={device.isActive === false ? 'Review' : 'Active'} tone={device.isActive === false ? 'warn' : 'good'} />
          </View>
        ))}
      </Card>

      <SectionTitle title="Session" />
      <Button label="Sign out of this device" icon="log-out-outline" variant="danger" onPress={() => void signOut()} />
      <Text style={styles.version}>SAFENODE MOBILE · NATIVE CLIENT 1.0.0</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.signal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontFamily: typography.display, fontSize: 19 },
  profileCopy: { flex: 1 },
  name: { color: colors.text, fontFamily: typography.strong, fontSize: 15 },
  email: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, marginTop: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingCopy: { flex: 1 },
  settingTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 13 },
  settingBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, lineHeight: 16, marginTop: 3 },
  device: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  deviceBorder: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.sm, paddingTop: spacing.md },
  deviceCopy: { flex: 1 },
  deviceName: { color: colors.text, fontFamily: typography.strong, fontSize: 13 },
  deviceMeta: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 9, marginTop: 3 },
  empty: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12 },
  version: { color: colors.textFaint, fontFamily: typography.mono, fontSize: 9, letterSpacing: 1.2, textAlign: 'center', marginTop: spacing.xl },
})
