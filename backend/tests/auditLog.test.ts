/**
 * Audit Log Tests
 * Unit tests for audit logging service
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { createAuditLog, getUserAuditLogs, exportAuditLogsCSV, getAuditLogStats } from '../src/services/auditLogService'
import { createUser } from '../src/services/userService'
import { getPrismaClient } from '../src/db/prisma'

describe('Audit Log Service', () => {
  let userId: string

  beforeEach(async () => {
    // Create a test user
    const user = await createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: 'Test User'
    })
    userId = user.id
  })

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      await createAuditLog({
        userId,
        action: 'login',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      })

      const logs = await getUserAuditLogs(userId, { limit: 10 })
      expect(logs.length).toBe(1)
      expect(logs[0].action).toBe('login')
      expect(logs[0].userId).toBe(userId)
    })

    it('should create audit log with metadata', async () => {
      await createAuditLog({
        userId,
        action: 'entry_created',
        resourceType: 'vault_entry',
        resourceId: 'entry-123',
        metadata: { entryName: 'Test Entry' }
      })

      const logs = await getUserAuditLogs(userId, { limit: 10 })
      expect(logs.length).toBe(1)
      expect(logs[0].metadata).toEqual({ entryName: 'Test Entry' })
      expect(logs[0].resourceType).toBe('vault_entry')
      expect(logs[0].resourceId).toBe('entry-123')
    })

    it('should create audit log with all action types', async () => {
      const actions = [
        'login',
        'logout',
        'entry_created',
        'entry_updated',
        'entry_deleted',
        'vault_unlocked',
        'vault_locked',
        'device_registered',
        '2fa_enabled',
        'subscription_created'
      ]

      for (const action of actions) {
        await createAuditLog({
          userId,
          action: action as any
        })
      }

      const logs = await getAuditLogsByUser(userId, { limit: 20 })
      expect(logs.length).toBe(actions.length)
    })
  })

  describe('getUserAuditLogs', () => {
    it('should retrieve audit logs for a user', async () => {
      await createAuditLog({ userId, action: 'login' })
      await createAuditLog({ userId, action: 'vault_unlocked' })
      await createAuditLog({ userId, action: 'entry_created' })

      const logs = await getUserAuditLogs(userId, { limit: 10 })
      expect(logs.length).toBe(3)
    })

    it('should respect limit parameter', async () => {
      // Create 5 logs
      for (let i = 0; i < 5; i++) {
        await createAuditLog({ userId, action: 'login' })
      }

      const logs = await getAuditLogsByUser(userId, { limit: 3 })
      expect(logs.length).toBe(3)
    })

    it('should filter by action type', async () => {
      await createAuditLog({ userId, action: 'login' })
      await createAuditLog({ userId, action: 'vault_unlocked' })
      await createAuditLog({ userId, action: 'login' })

      const logs = await getAuditLogsByUser(userId, { 
        limit: 10,
        action: 'login'
      })
      expect(logs.length).toBe(2)
      expect(logs.every(log => log.action === 'login')).toBe(true)
    })

    it('should return empty array for user with no logs', async () => {
      const newUser = await createUser({
        email: `new-${Date.now()}@example.com`,
        password: 'TestPassword123!'
      })

      const logs = await getAuditLogsByUser(newUser.id, { limit: 10 })
      expect(logs.length).toBe(0)
    })
  })

  describe('exportAuditLogsCSV', () => {
    it('should export audit logs as CSV', async () => {
      await createAuditLog({ userId, action: 'login' })
      await createAuditLog({ userId, action: 'vault_unlocked' })

      const csv = await exportAuditLogsCSV(userId)
      expect(csv).toContain('Date,Action')
      expect(csv).toContain('login')
      expect(csv).toContain('vault_unlocked')
    })

    it('should filter CSV export by date range', async () => {
      await createAuditLog({ userId, action: 'login' })

      const csv = await exportAuditLogsCSV(userId, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      })

      expect(csv).toBeTruthy()
    })
  })

  describe('getAuditLogStats', () => {
    it('should return audit log statistics', async () => {
      await createAuditLog({ userId, action: 'login' })
      await createAuditLog({ userId, action: 'login' })
      await createAuditLog({ userId, action: 'vault_unlocked' })

      const stats = await getAuditLogStats(userId, 30)
      expect(stats.totalLogs).toBeGreaterThanOrEqual(3)
      expect(stats.actionsByType.login).toBeGreaterThanOrEqual(2)
      expect(stats.actionsByType.vault_unlocked).toBeGreaterThanOrEqual(1)
    })
  })
})

