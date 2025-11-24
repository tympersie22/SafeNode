/**
 * Subscription Limits Tests
 * Unit tests for subscription limit enforcement
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { SUBSCRIPTION_LIMITS, checkSubscriptionLimits } from '../src/services/stripeService'
import { createUser } from '../src/services/userService'

describe('Subscription Limits', () => {
  describe('SUBSCRIPTION_LIMITS', () => {
    it('should have correct limits for free tier', () => {
      expect(SUBSCRIPTION_LIMITS.free.devices).toBe(1)
      expect(SUBSCRIPTION_LIMITS.free.vaults).toBe(1)
      expect(SUBSCRIPTION_LIMITS.free.teamMembers).toBe(0)
      expect(SUBSCRIPTION_LIMITS.free.storageMB).toBe(100)
    })

    it('should have correct limits for individual tier', () => {
      expect(SUBSCRIPTION_LIMITS.individual.devices).toBe(3)
      expect(SUBSCRIPTION_LIMITS.individual.vaults).toBe(5)
      expect(SUBSCRIPTION_LIMITS.individual.teamMembers).toBe(0)
      expect(SUBSCRIPTION_LIMITS.individual.storageMB).toBe(1024)
    })

    it('should have correct limits for family tier', () => {
      expect(SUBSCRIPTION_LIMITS.family.devices).toBe(10)
      expect(SUBSCRIPTION_LIMITS.family.vaults).toBe(20)
      expect(SUBSCRIPTION_LIMITS.family.teamMembers).toBe(0)
      expect(SUBSCRIPTION_LIMITS.family.storageMB).toBe(5120)
    })

    it('should have correct limits for teams tier', () => {
      expect(SUBSCRIPTION_LIMITS.teams.devices).toBe(50)
      expect(SUBSCRIPTION_LIMITS.teams.vaults).toBe(100)
      expect(SUBSCRIPTION_LIMITS.teams.teamMembers).toBe(50)
      expect(SUBSCRIPTION_LIMITS.teams.storageMB).toBe(10240)
    })

    it('should have correct limits for business tier', () => {
      expect(SUBSCRIPTION_LIMITS.business.devices).toBe(200)
      expect(SUBSCRIPTION_LIMITS.business.vaults).toBe(500)
      expect(SUBSCRIPTION_LIMITS.business.teamMembers).toBe(200)
      expect(SUBSCRIPTION_LIMITS.business.storageMB).toBe(51200)
    })

    it('should have unlimited limits for enterprise tier', () => {
      expect(SUBSCRIPTION_LIMITS.enterprise.devices).toBe(-1)
      expect(SUBSCRIPTION_LIMITS.enterprise.vaults).toBe(-1)
      expect(SUBSCRIPTION_LIMITS.enterprise.teamMembers).toBe(-1)
      expect(SUBSCRIPTION_LIMITS.enterprise.storageMB).toBe(-1)
    })
  })

  describe('checkSubscriptionLimits', () => {
    let userId: string

    beforeEach(async () => {
      const user = await createUser({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        displayName: 'Test User'
      })
      userId = user.id
    })

    it('should check device limits for free tier', async () => {
      const result = await checkSubscriptionLimits(userId, 'devices')
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('limit')
      expect(result.limit).toBe(1) // Free tier limit
    })

    it('should check vault limits', async () => {
      const result = await checkSubscriptionLimits(userId, 'vaults')
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('limit')
    })

    it('should check team member limits', async () => {
      const result = await checkSubscriptionLimits(userId, 'teamMembers')
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('limit')
    })

    it('should check storage limits', async () => {
      const result = await checkSubscriptionLimits(userId, 'storage')
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('limit')
    })

    it('should return false for non-existent user', async () => {
      const result = await checkSubscriptionLimits('non-existent-id', 'devices')
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(0)
      expect(result.limit).toBe(0)
    })
  })
})

