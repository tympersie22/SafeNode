import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { getTeam, type TeamDetails } from '../api/resources'
import { Button, Card, IconTile, PageHeader, Screen, SectionTitle, StatusPill } from '../components/ui'
import type { TeamStackParams } from '../navigation/RootNavigator'
import { colors, spacing, typography } from '../theme/tokens'

type Props = NativeStackScreenProps<TeamStackParams, 'TeamWorkspace'>

export function TeamWorkspaceScreen({ route }: Props) {
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTeam(await getTeam(route.params.teamId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Workspace unavailable')
    } finally {
      setLoading(false)
    }
  }, [route.params.teamId])

  useEffect(() => { void load() }, [load])

  return (
    <Screen>
      <PageHeader eyebrow="Team workspace" title={team?.name || route.params.teamName} body={team?.description || 'An isolated security boundary for shared operational secrets.'} action={team ? <StatusPill label={team.role} /> : undefined} />
      {error ? <Card style={styles.errorCard}><Ionicons name="cloud-offline-outline" size={24} color={colors.danger} /><Text style={styles.error}>{error}</Text><Button label="Try again" variant="secondary" onPress={load} /></Card> : null}
      {!error && loading ? <Text style={styles.loading}>VERIFYING WORKSPACE ACCESS...</Text> : null}
      {team ? (
        <>
          <Card style={styles.boundaryCard}>
            <IconTile icon="shield-checkmark-outline" />
            <View style={styles.boundaryCopy}><Text style={styles.boundaryTitle}>Separate encryption boundary</Text><Text style={styles.boundaryBody}>Team vaults remain isolated from your personal vault and are only delivered to authorized members.</Text></View>
          </Card>

          <SectionTitle title="Encrypted vaults" action={`${team.vaults.length} total`} />
          {team.vaults.map((vault) => (
            <Card key={vault.id} style={styles.rowCard}>
              <IconTile icon="file-tray-full-outline" />
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>{vault.name}</Text><Text style={styles.rowMeta}>Version {vault.version} · End-to-end encrypted</Text></View>
              <Ionicons name="lock-closed" size={17} color={colors.signal} />
            </Card>
          ))}
          {team.vaults.length === 0 ? <Card><Text style={styles.emptyTitle}>No encrypted team vaults</Text><Text style={styles.emptyBody}>Owners and admins can create the first workspace vault from the desktop client.</Text></Card> : null}

          <SectionTitle title="Members" action={`${team.members.length} people`} />
          {team.members.map((member) => (
            <Card key={member.id} style={styles.rowCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(member.name || member.email).slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>{member.name || member.email}</Text><Text style={styles.rowMeta}>{member.name ? member.email : 'Verified team identity'}</Text></View>
              <Text style={styles.role}>{member.role}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  boundaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#10251F' },
  boundaryCopy: { flex: 1 },
  boundaryTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  boundaryBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, lineHeight: 17, marginTop: 4 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  rowMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 10, marginTop: 4 },
  role: { color: colors.signal, fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 },
  avatar: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelStrong, borderWidth: 1, borderColor: colors.lineBright },
  avatarText: { color: colors.signal, fontFamily: typography.strong, fontSize: 15 },
  loading: { color: colors.signal, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1.3, textAlign: 'center', marginTop: spacing.xl },
  errorCard: { gap: spacing.md, alignItems: 'flex-start' },
  error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 20 },
  emptyTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  emptyBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
})
