/**
 * Vault Screen
 * Main vault list screen with offline sync and conflict resolution
 */

import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, RefreshControl, StyleSheet } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../App'
import { useVault } from '../hooks/useVault'
import VaultList from '../components/VaultList'
import { usePasskeys } from '../hooks/usePasskeys'
import { useConflictResolution, detectConflicts, mergeEntries, type ConflictResolution } from '../hooks/useConflictResolution'
import ConflictResolutionModal, { type ConflictData } from '../components/ConflictResolutionModal'
import type { VaultEntry } from '@shared/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Vault'>

const VaultScreen = ({ navigation }: Props) => {
  const {
    entries,
    isSyncing,
    syncError,
    refetchVault,
    lockVault,
    status,
    pendingOperations
  } = useVault()
  const { pendingWorkflow, beginRegistration, beginAuthentication, clearWorkflow } = usePasskeys()
  
  // Conflict resolution
  const [lastSyncedEntries, setLastSyncedEntries] = useState<VaultEntry[]>([])
  const {
    conflicts,
    hasConflicts,
    showModal,
    setShowModal,
    detectAndShowConflicts,
    resolveConflicts
  } = useConflictResolution({
    onResolved: async (resolutions: ConflictResolution[]) => {
      console.log('Resolving conflicts:', resolutions)
      await refetchVault()
    }
  })

  // Detect conflicts after sync
  useEffect(() => {
    if (entries.length > 0 && lastSyncedEntries.length > 0 && status.isOnline) {
      const detected = detectAndShowConflicts(lastSyncedEntries, entries)
      if (detected.length > 0) {
        setShowModal(true)
      }
    }
  }, [entries, lastSyncedEntries, status.isOnline, detectAndShowConflicts, setShowModal])

  // Store last synced entries for conflict detection
  useEffect(() => {
    if (!isSyncing && entries.length > 0) {
      setLastSyncedEntries([...entries])
    }
  }, [isSyncing, entries])

  const handleConflictResolve = async (resolutions: Array<{ conflictId: string; resolution: 'local' | 'server' | 'merge' | 'both' }>) => {
    const resolvedEntries: VaultEntry[] = []
    const processedIds = new Set<string>()

    for (const resolution of resolutions) {
      const conflict = conflicts.find(c => c.localEntry.id === resolution.conflictId)
      if (!conflict) continue

      processedIds.add(resolution.conflictId)

      switch (resolution.resolution) {
        case 'local':
          resolvedEntries.push(conflict.localEntry)
          break
        case 'server':
          resolvedEntries.push(conflict.serverEntry)
          break
        case 'merge':
          resolvedEntries.push(mergeEntries(conflict.localEntry, conflict.serverEntry))
          break
        case 'both':
          resolvedEntries.push(conflict.localEntry)
          resolvedEntries.push({ ...conflict.serverEntry, id: `${conflict.serverEntry.id}-merged` })
          break
      }
    }

    // Add non-conflicting entries
    for (const entry of entries) {
      if (!processedIds.has(entry.id)) {
        resolvedEntries.push(entry)
      }
    }

    await resolveConflicts(resolutions.map(r => ({ conflictId: r.conflictId, resolution: r.resolution })))
    await refetchVault()
  }

  const dismissConflicts = () => {
    setShowModal(false)
  }

  const renderEntry = ({ item }: { item: VaultEntry }) => (
    <VaultList.EntryCard entry={item} />
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerLabel}>SafeNode Vault</Text>
            <Text style={styles.headerTitle}>All items</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              lockVault()
              navigation.replace('Unlock')
            }}
            style={styles.lockButton}
          >
            <FontAwesome5 name="lock" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          {syncError ? (
            <Text style={styles.errorText}>Sync error: {syncError}</Text>
          ) : (
            <Text style={styles.statusText}>
              {isSyncing ? 'Syncing with cloud…' : `Stored entries: ${entries.length}`}
            </Text>
          )}
          <Text style={styles.statusSubtext}>
            {status.isOnline ? '🟢 Online' : '🔴 Offline – viewing cached vault'}
          </Text>
          {status.pendingCount > 0 && (
            <View style={styles.pendingContainer}>
              <FontAwesome5 name="clock" size={12} color="#f59e0b" />
              <Text style={styles.pendingText}>
                {status.pendingCount} pending update{status.pendingCount === 1 ? '' : 's'} queued
              </Text>
            </View>
          )}
          {hasConflicts && (
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={styles.conflictButton}
            >
              <Text style={styles.conflictButtonText}>
                ⚠️ {conflicts.length} sync conflict{conflicts.length === 1 ? '' : 's'} detected - Tap to resolve
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList<VaultEntry>
        data={entries}
        keyExtractor={(item: VaultEntry) => item.id}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={refetchVault} />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderEntry}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="cloud" size={32} color="#94a3b8" />
            <Text style={styles.emptyText}>
              No entries yet. Add credentials to get started.
            </Text>
          </View>
        }
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        visible={showModal}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={dismissConflicts}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statusContainer: {
    gap: 4
  },
  statusText: {
    fontSize: 14,
    color: '#64748b'
  },
  statusSubtext: {
    fontSize: 12,
    color: '#64748b'
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500'
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  pendingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500'
  },
  conflictButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b'
  },
  conflictButtonText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'center'
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  separator: {
    height: 12
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center'
  }
})

export default VaultScreen
