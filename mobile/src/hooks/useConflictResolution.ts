/**
 * Conflict Resolution Hook
 * Handles vault sync conflicts and resolution logic
 */

import { useState, useCallback, useMemo } from 'react'
import { Alert } from 'react-native'
import type { VaultEntry } from '@shared/types'
import type { ConflictData } from '../components/ConflictResolutionModal'

export interface ConflictResolution {
  conflictId: string
  resolution: 'local' | 'server' | 'merge' | 'both'
}

interface UseConflictResolutionOptions {
  onResolved: (resolutions: ConflictResolution[]) => void
}

/**
 * Detect conflicts between local and server vaults
 */
export function detectConflicts(
  localEntries: VaultEntry[],
  serverEntries: VaultEntry[]
): ConflictData[] {
  const conflicts: ConflictData[] = []
  const localMap = new Map(localEntries.map(e => [e.id, e]))
  const serverMap = new Map(serverEntries.map(e => [e.id, e]))

  // Find entries that exist in both but were modified
  for (const [id, localEntry] of localMap) {
    const serverEntry = serverMap.get(id)
    
    if (serverEntry) {
      // Both modified - check timestamps or content differences
      const localUpdated = (localEntry as any).updatedAt || (localEntry as any).createdAt || localEntry.passwordUpdatedAt || 0
      const serverUpdated = (serverEntry as any).updatedAt || (serverEntry as any).createdAt || serverEntry.passwordUpdatedAt || 0
      
      // Check if entries are different (by timestamp or content)
      const isDifferent = localUpdated !== serverUpdated || 
        localEntry.name !== serverEntry.name ||
        localEntry.username !== serverEntry.username ||
        localEntry.password !== serverEntry.password ||
        localEntry.url !== serverEntry.url ||
        localEntry.notes !== serverEntry.notes
      
      if (isDifferent) {
        // Different versions - conflict!
        conflicts.push({
          localEntry,
          serverEntry,
          conflictType: 'both_modified'
        })
      }
    }
  }

  // Find entries deleted locally but modified on server
  for (const [id, serverEntry] of serverMap) {
    if (!localMap.has(id)) {
      // Entry exists on server but not locally
      // Check if it was recently modified on server
      const serverUpdated = (serverEntry as any).updatedAt || (serverEntry as any).createdAt || serverEntry.passwordUpdatedAt || 0
      const timeDiff = Date.now() - serverUpdated
      
      // If modified within last 24 hours, consider it a conflict
      if (timeDiff < 24 * 60 * 60 * 1000) {
        conflicts.push({
          localEntry: serverEntry, // Use server entry as placeholder
          serverEntry,
          conflictType: 'deleted_locally'
        })
      }
    }
  }

  // Find entries deleted on server but modified locally
  for (const [id, localEntry] of localMap) {
    if (!serverMap.has(id)) {
      // Entry exists locally but not on server
      const localUpdated = (localEntry as any).updatedAt || (localEntry as any).createdAt || localEntry.passwordUpdatedAt || 0
      const timeDiff = Date.now() - localUpdated
      
      // If modified within last 24 hours, consider it a conflict
      if (timeDiff < 24 * 60 * 60 * 1000) {
        conflicts.push({
          localEntry,
          serverEntry: localEntry, // Use local entry as placeholder
          conflictType: 'deleted_server'
        })
      }
    }
  }

  return conflicts
}

/**
 * Merge two vault entries intelligently
 */
export function mergeEntries(local: VaultEntry, server: VaultEntry): VaultEntry {
  // Prefer non-empty values, then newer values
  return {
    ...local,
    name: server.name || local.name,
    username: server.username || local.username,
    password: server.password || local.password,
    url: server.url || local.url,
    notes: server.notes || local.notes,
    tags: [...new Set([...(local.tags || []), ...(server.tags || [])])],
    category: server.category || local.category,
    passwordUpdatedAt: Math.max(
      (local as any).updatedAt || (local as any).createdAt || local.passwordUpdatedAt || 0,
      (server as any).updatedAt || (server as any).createdAt || server.passwordUpdatedAt || 0
    )
  }
}

/**
 * Hook for managing conflict resolution
 */
export function useConflictResolution({ onResolved }: UseConflictResolutionOptions) {
  const [conflicts, setConflicts] = useState<ConflictData[]>([])
  const [showModal, setShowModal] = useState(false)

  const hasConflicts = useMemo(() => conflicts.length > 0, [conflicts.length])

  const detectAndShowConflicts = useCallback((
    localEntries: VaultEntry[],
    serverEntries: VaultEntry[]
  ) => {
    const detected = detectConflicts(localEntries, serverEntries)
    
    if (detected.length > 0) {
      setConflicts(detected)
      setShowModal(true)
    } else {
      setConflicts([])
      setShowModal(false)
    }
    
    return detected
  }, [])

  const resolveConflicts = useCallback((resolutions: ConflictResolution[]) => {
    try {
      onResolved(resolutions)
      setConflicts([])
      setShowModal(false)
      
      Alert.alert(
        'Conflicts Resolved',
        `Successfully resolved ${resolutions.length} conflict${resolutions.length === 1 ? '' : 's'}.`
      )
    } catch (error) {
      Alert.alert(
        'Resolution Failed',
        'Failed to resolve conflicts. Please try again.',
        [{ text: 'OK' }]
      )
    }
  }, [onResolved])

  const dismissConflicts = useCallback(() => {
    setShowModal(false)
    // Keep conflicts for later resolution
  }, [])

  return {
    conflicts,
    hasConflicts,
    showModal,
    setShowModal,
    detectAndShowConflicts,
    resolveConflicts,
    dismissConflicts
  }
}

