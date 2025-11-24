/**
 * Sync Service
 * Handles vault synchronization and conflict resolution
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export interface ConflictData {
  entryId: string
  localVersion: number
  serverVersion: number
  localUpdatedAt: number
  serverUpdatedAt: number
  conflictType: 'both_modified' | 'local_deleted' | 'server_deleted' | 'version_mismatch'
  localSnapshot?: any
  serverSnapshot?: any
}

export interface ConflictResolution {
  entryId: string
  resolution: 'accept_local' | 'accept_server' | 'merge' | 'keep_both'
  mergedData?: any
}

export interface SyncStatus {
  serverVersion: number
  hasConflicts: boolean
  conflicts: ConflictData[]
  needsSync: boolean
}

/**
 * Get sync status
 */
export async function getSyncStatus(localVersion: number): Promise<SyncStatus> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/sync/status?localVersion=${localVersion}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to get sync status')
  }

  return await response.json()
}

/**
 * Detect conflicts between local and server vault
 */
export async function detectConflicts(
  localVersion: number,
  localEntries?: Array<{ id: string; updatedAt: number; version?: number }>
): Promise<{ conflicts: ConflictData[]; hasConflicts: boolean }> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/sync/conflicts`, {
    method: localEntries ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: localEntries ? JSON.stringify({
      localVersion,
      localEntries
    }) : undefined
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to detect conflicts')
  }

  return await response.json()
}

/**
 * Resolve conflicts
 */
export async function resolveConflicts(
  resolutions: ConflictResolution[]
): Promise<{ success: boolean; newVersion: number }> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/sync/resolve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ resolutions })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to resolve conflicts')
  }

  return await response.json()
}

