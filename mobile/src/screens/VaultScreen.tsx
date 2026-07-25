import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getVaultStatus, type VaultStatus } from '../api/resources'
import { Button, Card, IconTile, PageHeader, Screen, SectionTitle, StatusPill } from '../components/ui'
import { colors, spacing, typography } from '../theme/tokens'
import { useVault } from '../vault/VaultContext'

export function VaultScreen() {
  const { entries, unlocked, unlocking, error: unlockError, unlock, lock } = useVault()
  const [vault, setVault] = useState<VaultStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { void getVaultStatus().then(setVault).catch((cause) => setError(cause instanceof Error ? cause.message : 'Vault status unavailable')) }, [])

  return (
    <Screen>
      <PageHeader eyebrow="Private vault" title={unlocked ? 'Your secure items' : 'Secrets stay sealed.'} body="Encrypted before they leave this device. Safenode stores ciphertext, never the key." action={unlocked ? <Button label="Lock" variant="quiet" onPress={lock} style={styles.lockButton} /> : undefined} />
      {!unlocked ? <Card style={styles.lockCard}>
        <View style={styles.lockVisual}><View style={styles.lockHalo}><Ionicons name="lock-closed" size={34} color={colors.signal} /></View></View>
        <StatusPill label={vault?.exists ? 'Encrypted vault found' : error ? 'Connection required' : 'Checking vault'} tone={error ? 'warn' : 'good'} />
        <Text style={styles.lockTitle}>{vault?.exists ? 'Vault locked' : 'Secure vault setup'}</Text>
        <Text style={styles.lockBody}>{unlockError || error || (vault?.exists ? 'Use a PRF-capable passkey to derive the key-encryption key. The raw vault key remains only in memory.' : 'Create an encrypted vault from the web client after your recovery kit is ready.')}</Text>
        <Button label={vault?.exists ? 'Unlock with passkey' : 'Vault setup required'} icon="key-outline" loading={unlocking} disabled={!vault?.exists} onPress={() => void unlock().catch(() => undefined)} />
        <Text style={styles.availability}>Native PRF unlock requires Android Credential Manager or iOS 18+ and a verified app-domain association.</Text>
      </Card> : (
        <>
          <Card style={styles.unlockedSummary}>
            <StatusPill label="Decrypted in memory" />
            <Text style={styles.unlockedCount}>{entries.length}</Text>
            <Text style={styles.unlockedLabel}>secure items available on this device</Text>
          </Card>
          <SectionTitle title="Vault items" action={`${entries.length} items`} />
          {entries.map((entry) => (
            <Card key={entry.id} style={styles.entryCard}>
              <IconTile icon={entry.category === 'card' ? 'card-outline' : 'key-outline'} />
              <View style={styles.entryCopy}><Text style={styles.entryTitle}>{entry.title || entry.name || 'Secure item'}</Text><Text style={styles.entryMeta}>{entry.username || entry.url || entry.category || 'Encrypted record'}</Text></View>
              {entry.favorite ? <Ionicons name="star" size={16} color={colors.warning} /> : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Card>
          ))}
          {entries.length === 0 ? <Card><Text style={styles.empty}>This vault is unlocked and currently contains no entries.</Text></Card> : null}
        </>
      )}

      <SectionTitle title="Encryption boundary" />
      <Card>
        <BoundaryRow icon="phone-portrait-outline" title="This device" body="Derives and holds the vault key in volatile memory." />
        <View style={styles.divider} />
        <BoundaryRow icon="cloud-outline" title="Safenode cloud" body="Receives versioned encrypted blobs and wrapped keys only." />
        <View style={styles.divider} />
        <BoundaryRow icon="eye-off-outline" title="Zero knowledge" body="No server-side decryption or key escrow." />
      </Card>
    </Screen>
  )
}

function BoundaryRow({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View style={styles.row}><IconTile icon={icon} /><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{body}</Text></View></View>
}

const styles = StyleSheet.create({
  lockCard: { alignItems: 'center', paddingVertical: spacing.xl },
  lockButton: { minHeight: 42, paddingHorizontal: spacing.md },
  lockVisual: { width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  lockHalo: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.signalDeep, borderWidth: 1, borderColor: colors.lineBright, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { color: colors.text, fontFamily: typography.display, fontSize: 27, marginTop: spacing.md },
  lockBody: { color: colors.textMuted, fontFamily: typography.body, textAlign: 'center', fontSize: 14, lineHeight: 21, marginVertical: spacing.md, maxWidth: 320 },
  availability: { color: colors.textFaint, fontFamily: typography.body, textAlign: 'center', fontSize: 10, lineHeight: 16, marginTop: spacing.md, maxWidth: 300 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  rowBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.md },
  unlockedSummary: { alignItems: 'flex-start', backgroundColor: '#10251F' },
  unlockedCount: { color: colors.text, fontFamily: typography.display, fontSize: 44, marginTop: spacing.md },
  unlockedLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  entryCopy: { flex: 1 },
  entryTitle: { color: colors.text, fontFamily: typography.strong, fontSize: 14 },
  entryMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, marginTop: 4 },
  empty: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
})
