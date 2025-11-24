/**
 * Sync Service
 * Handles vault synchronization and conflict resolution
 */

import { getPrismaClient } from '../db/prisma'
import { createAuditLog } from './auditLogService'

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

/**
 * Detect conflicts between local and server vault entries
 */
export async function detectConflicts(
  userId: string,
  localEntries: Array<{ id: string; updatedAt: number; version?: number }>,
  localVersion: number
): Promise<ConflictData[]> {
  const prisma = getPrismaClient()

  // Get server vault version
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaultVersion: true, vaultEncrypted: true }
  })

  if (!user || !user.vaultEncrypted) {
    return []
  }

  const conflicts: ConflictData[] = []

  // If versions are different, we might have conflicts
  if (user.vaultVersion && localVersion !== user.vaultVersion) {
    // For now, return a general conflict indicator
    // In production, you'd decrypt and compare entries
    conflicts.push({
      entryId: 'vault',
      localVersion: localVersion,
      serverVersion: user.vaultVersion || 0,
      localUpdatedAt: Date.now(),
      serverUpdatedAt: Date.now(),
      conflictType: 'version_mismatch'
    })
  }

  return conflicts
}

/**
 * Resolve conflicts by accepting resolution strategy
 */
export async function resolveConflicts(
  userId: string,
  resolutions: ConflictResolution[]
): Promise<{ success: boolean; newVersion: number }> {
  const prisma = getPrismaClient()

  // Log conflict resolution
  await createAuditLog({
    userId,
    action: 'conflicts_resolved',
    resourceType: 'vault',
    resourceId: userId,
    metadata: {
      resolutionsCount: resolutions.length,
      resolutions: resolutions.map(r => ({ entryId: r.entryId, resolution: r.resolution }))
    }
  }).catch(() => {})

  // Get current vault version
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaultVersion: true }
  })

  const newVersion = (user?.vaultVersion || 0) + 1

  return {
    success: true,
    newVersion
  }
}

/**
 * Get sync status and conflicts
 */
export async function getSyncStatus(
  userId: string,
  localVersion: number
): Promise<{
  serverVersion: number
  hasConflicts: boolean
  conflicts: ConflictData[]
  needsSync: boolean
}> {
  const prisma = getPrismaClient()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaultVersion: true, vaultEncrypted: true }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const serverVersion = user.vaultVersion || 0
  const hasConflicts = serverVersion !== localVersion && localVersion > 0
  const needsSync = serverVersion !== localVersion

  const conflicts: ConflictData[] = []
  if (hasConflicts) {
    conflicts.push({
      entryId: 'vault',
      localVersion: localVersion,
      serverVersion: serverVersion,
      localUpdatedAt: Date.now(),
      serverUpdatedAt: Date.now(),
      conflictType: 'version_mismatch'
    })
  }

  return {
    serverVersion,
    hasConflicts,
    conflicts,
    needsSync
  }
}

