/**
 * Sync Status Bar Component
 * Displays sync status, pending operations, and retry indicators
 */

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'

export interface SyncStatusBarProps {
  isSyncing: boolean
  isOnline: boolean
  pendingCount: number
  syncError: string | null
  onRetry?: () => void
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  isSyncing,
  isOnline,
  pendingCount,
  syncError,
  onRetry
}) => {
  if (!isOnline) {
    return (
      <View style={[styles.container, styles.offline]}>
        <FontAwesome5 name="wifi" size={14} color="#f59e0b" />
        <Text style={styles.offlineText}>Offline - Changes will sync when online</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>
    )
  }

  if (syncError) {
    return (
      <View style={[styles.container, styles.error]}>
        <FontAwesome5 name="exclamation-circle" size={14} color="#ef4444" />
        <Text style={styles.errorText}>Sync failed: {syncError}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (isSyncing) {
    return (
      <View style={[styles.container, styles.syncing]}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.syncingText}>Syncing...</Text>
      </View>
    )
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.container, styles.pending]}>
        <FontAwesome5 name="clock" size={14} color="#f59e0b" />
        <Text style={styles.pendingText}>
          {pendingCount} change{pendingCount === 1 ? '' : 's'} pending sync
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, styles.synced]}>
      <FontAwesome5 name="check-circle" size={14} color="#10b981" />
      <Text style={styles.syncedText}>All synced</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8
  },
  offline: {
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderTopColor: '#fbbf24'
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500'
  },
  error: {
    backgroundColor: '#fee2e2',
    borderTopWidth: 1,
    borderTopColor: '#ef4444'
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    fontWeight: '500'
  },
  syncing: {
    backgroundColor: '#dbeafe',
    borderTopWidth: 1,
    borderTopColor: '#3b82f6'
  },
  syncingText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500'
  },
  pending: {
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderTopColor: '#f59e0b'
  },
  pendingText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500'
  },
  synced: {
    backgroundColor: '#d1fae5',
    borderTopWidth: 1,
    borderTopColor: '#10b981'
  },
  syncedText: {
    flex: 1,
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500'
  },
  badge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600'
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  }
})

export default SyncStatusBar

