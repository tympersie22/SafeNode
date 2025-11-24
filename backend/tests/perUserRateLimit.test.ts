/**
 * Per-User Rate Limiting Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  getUserRateLimitStatus,
  clearUserRateLimit
} from '../src/middleware/perUserRateLimit'
import { findUserById } from '../src/services/userService'

jest.mock('../src/services/userService')

describe('Per-User Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserRateLimitStatus', () => {
    it('should return rate limit status for free tier', async () => {
      const mockUser = {
        id: 'user-1',
        subscriptionTier: 'free'
      }
      ;(findUserById as jest.Mock).mockResolvedValue(mockUser)

      const status = await getUserRateLimitStatus('user-1')
      
      expect(status.tier).toBe('free')
      expect(status.limit).toBe(100)
      expect(status.current).toBe(0)
      expect(status.remaining).toBe(100)
    })

    it('should return rate limit status for enterprise tier', async () => {
      const mockUser = {
        id: 'user-2',
        subscriptionTier: 'enterprise'
      }
      ;(findUserById as jest.Mock).mockResolvedValue(mockUser)

      const status = await getUserRateLimitStatus('user-2')
      
      expect(status.tier).toBe('enterprise')
      expect(status.limit).toBe(-1) // unlimited
      expect(status.remaining).toBe(-1)
    })

    it('should throw error for non-existent user', async () => {
      ;(findUserById as jest.Mock).mockResolvedValue(null)

      await expect(
        getUserRateLimitStatus('invalid-user')
      ).rejects.toThrow('User not found')
    })
  })

  describe('clearUserRateLimit', () => {
    it('should clear rate limit for user', () => {
      expect(() => {
        clearUserRateLimit('user-1')
      }).not.toThrow()
    })
  })
})

