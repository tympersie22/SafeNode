import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getTeams, type TeamSummary } from '../api/resources'
import { Button, Card, IconTile, PageHeader, Screen, SectionTitle, StatusPill } from '../components/ui'
import { colors, spacing, typography } from '../theme/tokens'
import type { TeamStackParams } from '../navigation/RootNavigator'

export function TeamsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<TeamStackParams, 'TeamDirectory'>>()
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setTeams((await getTeams()).teams) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Team workspace unavailable') } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return (
    <Screen>
      <PageHeader eyebrow="Shared security" title="Team spaces" body="Purpose-built encrypted workspaces for credentials, infrastructure access, and operational recovery." />
      <Card style={styles.identityCard}>
        <IconTile icon="business-outline" />
        <View style={styles.identityCopy}><Text style={styles.identityTitle}>Organization boundary</Text><Text style={styles.identityBody}>Personal vault data is never mixed with team secrets.</Text></View>
        <StatusPill label="Isolated" />
      </Card>
      <SectionTitle title="Your workspaces" action={`${teams.length} total`} />
      {error ? <Card><Text style={styles.error}>{error}</Text><Button label="Try again" variant="secondary" onPress={load} /></Card> : null}
      {!error && !loading && teams.length === 0 ? (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="people-outline" size={30} color={colors.signal} /></View>
          <Text style={styles.emptyTitle}>No shared workspace yet</Text>
          <Text style={styles.emptyBody}>When you create or join a team, its encrypted vaults and members will appear here.</Text>
          <Button label="Create team" icon="add" disabled />
        </Card>
      ) : null}
      {teams.map((team) => (
        <Pressable key={team.id} accessibilityRole="button" accessibilityLabel={`Open ${team.name}`} onPress={() => navigation.navigate('TeamWorkspace', { teamId: team.id, teamName: team.name })} style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.teamCard}>
          <View style={styles.teamTop}><IconTile icon="layers-outline" /><View style={styles.teamCopy}><Text style={styles.teamName}>{team.name}</Text><Text style={styles.teamRole}>{team.role}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.textFaint} /></View>
          {team.description ? <Text style={styles.teamDescription}>{team.description}</Text> : null}
          <View style={styles.teamStats}><Text style={styles.stat}>{team.vaultCount} vaults</Text><View style={styles.dot} /><Text style={styles.stat}>{team.memberCount} members</Text></View>
        </Card>
        </Pressable>
      ))}
      {loading ? <Text style={styles.loading}>SYNCING TEAM DIRECTORY...</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityCopy: { flex: 1 },
  identityTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  identityBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, lineHeight: 17, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.signalDeep, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontFamily: typography.display, fontSize: 21, marginTop: spacing.md },
  emptyBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: spacing.md, maxWidth: 290 },
  teamCard: { marginBottom: spacing.sm },
  teamTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamCopy: { flex: 1 },
  teamName: { color: colors.text, fontFamily: typography.strong, fontSize: 16 },
  teamRole: { color: colors.signal, fontFamily: typography.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  teamDescription: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  teamStats: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  stat: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 10 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.lineBright },
  loading: { color: colors.signal, fontFamily: typography.mono, fontSize: 10, textAlign: 'center', letterSpacing: 1.4, marginTop: spacing.lg },
  error: { color: colors.danger, fontFamily: typography.body, marginBottom: spacing.md },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
})
