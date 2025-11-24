/**
 * Sync Service Tests
 */

import { detectConflicts, resolveConflicts, getSyncStatus } from '../src/services/syncService'
import { getPrismaClient } from '../src/db/prisma'

jest.mock('../src/db/prisma')
jest.mock('../src/services/auditLogService')

describe('SyncService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getPrismaClient as jest.Mock).mockReturnValue(mockPrisma)
  })

  describe('detectConflicts', () => {
    it('should return empty array when no conflicts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        vaultVersion: 1,
        vaultEncrypted: 'test'
      })

      const conflicts = await detectConflicts('user-id', [], 1)
      expect(conflicts).toEqual([])
    })

    it('should detect version mismatch conflicts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        vaultVersion: 2,
        vaultEncrypted: 'test'
      })

      const conflicts = await detectConflicts('user-id', [], 1)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].conflictType).toBe('version_mismatch')
    })

    it('should return empty array when vault does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const conflicts = await detectConflicts('user-id', [], 1)
      expect(conflicts).toEqual([])
    })
  })

  describe('resolveConflicts', () => {
    it('should resolve conflicts and increment version', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        vaultVersion: 1
      })

      const result = await resolveConflicts('user-id', [
        { entryId: '1', resolution: 'accept_server' }
      ])

      expect(result.success).toBe(true)
      expect(result.newVersion).toBe(2)
    })
  })

  describe('getSyncStatus', () => {
    it('should return sync status when versions match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        vaultVersion: 1,
        vaultEncrypted: 'test'
      })

      const status = await getSyncStatus('user-id', 1)

      expect(status.serverVersion).toBe(1)
      expect(status.hasConflicts).toBe(false)
      expect(status.needsSync).toBe(false)
    })

    it('should detect conflicts when versions differ', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        vaultVersion: 2,
        vaultEncrypted: 'test'
      })

      const status = await getSyncStatus('user-id', 1)

      expect(status.serverVersion).toBe(2)
      expect(status.hasConflicts).toBe(true)
      expect(status.needsSync).toBe(true)
      expect(status.conflicts).toHaveLength(1)
    })
  })
})

