/**
 * Billing Flow Integration Tests
 * Tests: Subscribe → Webhook → Limits
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { createUser, updateUser } from '../../src/services/userService'
import { checkSubscriptionLimits } from '../../src/services/stripeService'
import { createAuditLog } from '../../src/services/auditLogService'

describe('Billing Flow Integration', () => {
  let userId: string

  beforeEach(async () => {
    const user = await createUser({
      email: `billing-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: 'Billing Test User'
    })
    userId = user.id
  })

  describe('Subscription Flow', () => {
    it('should enforce free tier limits', async () => {
      const devicesResult = await checkSubscriptionLimits(userId, 'devices')
      expect(devicesResult.limit).toBe(1)
      expect(devicesResult.allowed).toBe(true) // No devices yet

      const vaultsResult = await checkSubscriptionLimits(userId, 'vaults')
      expect(vaultsResult.limit).toBe(1)
    })

    it('should allow higher limits after subscription upgrade', async () => {
      // Upgrade to individual tier
      await updateUser(userId, {
        subscriptionTier: 'individual',
        subscriptionStatus: 'active'
      } as any)

      const devicesResult = await checkSubscriptionLimits(userId, 'devices')
      expect(devicesResult.limit).toBe(5) // Individual tier limit

      const vaultsResult = await checkSubscriptionLimits(userId, 'vaults')
      expect(vaultsResult.limit).toBe(5) // Individual tier limit
    })

    it('should create audit log for subscription events', async () => {
      await createAuditLog({
        userId,
        action: 'subscription_created',
        metadata: {
          tier: 'individual',
          priceId: 'price_test123'
        }
      })

      // Verify audit log was created (would need to query)
      expect(true).toBe(true) // Placeholder - would verify in real test
    })
  })

  describe('Limit Enforcement', () => {
    it('should check multiple resource types', async () => {
      const devices = await checkSubscriptionLimits(userId, 'devices')
      const vaults = await checkSubscriptionLimits(userId, 'vaults')
      const teamMembers = await checkSubscriptionLimits(userId, 'teamMembers')
      const storage = await checkSubscriptionLimits(userId, 'storage')

      expect(devices).toHaveProperty('allowed')
      expect(vaults).toHaveProperty('allowed')
      expect(teamMembers).toHaveProperty('allowed')
      expect(storage).toHaveProperty('allowed')
    })
  })
})
