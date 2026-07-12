/**
 * Stripe Service Tests
 * Unit tests for Stripe integration (mocked)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { SUBSCRIPTION_LIMITS, checkSubscriptionLimits } from '../src/services/stripeService'
import { createUser, updateUser } from '../src/services/userService'

// Mock Stripe
jest.mock('stripe', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      customers: {
        create: jest.fn().mockImplementation(async () => ({
          id: 'cus_test123',
          email: 'test@example.com'
        }))
      },
      checkout: {
        sessions: {
          create: jest.fn().mockImplementation(async () => ({
            id: 'cs_test123',
            url: 'https://checkout.stripe.com/test'
          }))
        }
      },
      billingPortal: {
        sessions: {
          create: jest.fn().mockImplementation(async () => ({
            url: 'https://billing.stripe.com/test'
          }))
        }
      },
      subscriptions: {
        retrieve: jest.fn().mockImplementation(async () => ({
          id: 'sub_test123',
          status: 'active',
          items: {
            data: [{
              price: {
                id: 'price_test123'
              }
            }]
          },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          cancel_at_period_end: false
        }))
      }
    }))
  }
})

describe('Stripe Service', () => {
  let userId: string

  beforeEach(async () => {
    // Create test user
    const user = await createUser({
      email: `stripe-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: 'Stripe Test User'
    })
    userId = user.id
  })

  describe('SUBSCRIPTION_LIMITS', () => {
    it('should have correct limits for all tiers', () => {
      expect(SUBSCRIPTION_LIMITS.free.devices).toBe(1)
      expect(SUBSCRIPTION_LIMITS.individual.devices).toBe(5)
      expect(SUBSCRIPTION_LIMITS.family.devices).toBe(10)
      expect(SUBSCRIPTION_LIMITS.teams.devices).toBe(50)
      expect(SUBSCRIPTION_LIMITS.pro.devices).toBe(5)
      expect(SUBSCRIPTION_LIMITS.enterprise.devices).toBe(50)
    })
  })

  describe('checkSubscriptionLimits', () => {
    it('should check device limits for free tier user', async () => {
      const result = await checkSubscriptionLimits(userId, 'devices')
      
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('current')
      expect(result).toHaveProperty('limit')
      expect(result.limit).toBe(1) // Free tier
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

    it('should map enterprise tier to teams limits', async () => {
      await updateUser(userId, {
        subscriptionTier: 'enterprise'
      } as any)

      const result = await checkSubscriptionLimits(userId, 'devices')
      
      expect(result.limit).toBe(50)
      expect(result.allowed).toBe(true)
    })

    it('should return false for non-existent user', async () => {
      const result = await checkSubscriptionLimits('non-existent-id', 'devices')
      
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(0)
      expect(result.limit).toBe(0)
    })
  })
})
