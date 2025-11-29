/**
 * Authentication Service Tests
 * Tests for login, register, getCurrentUser, and token management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  login, 
  register, 
  getCurrentUser, 
  getToken, 
  setToken, 
  logout,
  isAuthenticated 
} from '../src/services/authService'

// Mock fetch globally
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

// Mock Sentry
vi.mock('../src/services/sentryService', () => ({
  setUser: vi.fn(),
  clearUser: vi.fn(),
  captureException: vi.fn()
}))

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Management', () => {
    it('should store token in localStorage', () => {
      setToken('test-token-123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('safenode_token', 'test-token-123')
    })

    it('should retrieve token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('test-token-123')
      const token = getToken()
      expect(token).toBe('test-token-123')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('safenode_token')
    })

    it('should return null if no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      const token = getToken()
      expect(token).toBeNull()
    })

    it('should remove token on logout', () => {
      setToken('test-token')
      logout()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('safenode_token')
    })

    it('should correctly identify authenticated state', () => {
      localStorageMock.getItem.mockReturnValue('test-token')
      expect(isAuthenticated()).toBe(true)
      
      localStorageMock.getItem.mockReturnValue(null)
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('register', () => {
    it('should register a new user and store token', async () => {
      const mockResponse = {
        success: true,
        token: 'new-user-token-123',
        user: {
          id: 'user-123',
          email: 'newuser@example.com',
          displayName: 'New User',
          emailVerified: false,
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          twoFactorEnabled: false,
          biometricEnabled: false,
          createdAt: Date.now()
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await register({
        email: 'newuser@example.com',
        password: 'Password123!',
        displayName: 'New User'
      })

      expect(result).toEqual(mockResponse)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('safenode_token', 'new-user-token-123')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'newuser@example.com',
            password: 'Password123!',
            displayName: 'New User'
          })
        })
      )
    })

    it('should handle registration errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'email_exists', message: 'Email already exists' })
      })

      await expect(register({
        email: 'existing@example.com',
        password: 'Password123!'
      })).rejects.toThrow('Email already exists')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(register({
        email: 'test@example.com',
        password: 'Password123!'
      })).rejects.toThrow('Unable to connect to server')
    })

    it('should timeout after 10 seconds', async () => {
      vi.useFakeTimers()
      
      const fetchPromise = new Promise(() => {}) // Never resolves
      ;(global.fetch as any).mockReturnValueOnce(fetchPromise)

      const registerPromise = register({
        email: 'test@example.com',
        password: 'Password123!'
      })

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(10000)

      // Wait for the promise to reject
      await expect(registerPromise).rejects.toThrow()

      vi.useRealTimers()
    }, 15000) // Increase timeout for this test
  })

  describe('login', () => {
    it('should login user and store token', async () => {
      const mockResponse = {
        success: true,
        token: 'login-token-123',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          displayName: 'Test User',
          emailVerified: true,
          subscriptionTier: 'pro',
          subscriptionStatus: 'active',
          twoFactorEnabled: false,
          biometricEnabled: false,
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse
      })

      const result = await login({
        email: 'user@example.com',
        password: 'Password123!'
      })

      expect(result).toEqual(mockResponse)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('safenode_token', 'login-token-123')
    })

    it('should handle invalid credentials', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'invalid_credentials', message: 'Invalid email or password' })
      })

      await expect(login({
        email: 'wrong@example.com',
        password: 'WrongPassword'
      })).rejects.toThrow('Invalid email or password')
    })

    it('should handle server errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'server_error', message: 'Internal server error' })
      })

      await expect(login({
        email: 'test@example.com',
        password: 'Password123!'
      })).rejects.toThrow('Server error')
    })

    it('should timeout after 10 seconds', async () => {
      vi.useFakeTimers()
      
      const fetchPromise = new Promise(() => {}) // Never resolves
      ;(global.fetch as any).mockReturnValueOnce(fetchPromise)

      const loginPromise = login({
        email: 'test@example.com',
        password: 'Password123!'
      })

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(10000)

      // Wait for the promise to reject
      await expect(loginPromise).rejects.toThrow()

      vi.useRealTimers()
    }, 15000) // Increase timeout for this test
  })

  describe('getCurrentUser', () => {
    it('should fetch current user with valid token', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token-123')
      
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        emailVerified: true,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        twoFactorEnabled: false,
        biometricEnabled: false,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockUser
      })

      const user = await getCurrentUser()

      expect(user).toEqual(mockUser)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer valid-token-123',
            'Content-Type': 'application/json'
          }
        })
      )
    })

    it('should throw error if no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      await expect(getCurrentUser()).rejects.toThrow('Not authenticated')
    })

    it('should handle 401 unauthorized', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token')
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized', message: 'Invalid or expired token' })
      })

      await expect(getCurrentUser()).rejects.toThrow('Authentication expired')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('safenode_token')
    })

    it('should timeout after 5 seconds', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      vi.useFakeTimers()
      
      const fetchPromise = new Promise(() => {}) // Never resolves
      ;(global.fetch as any).mockReturnValueOnce(fetchPromise)

      const getUserPromise = getCurrentUser()

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(5000)

      // Wait for the promise to reject
      await expect(getUserPromise).rejects.toThrow()

      vi.useRealTimers()
    }, 10000) // Increase timeout for this test

    it('should handle network errors', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token')
      
      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(getCurrentUser()).rejects.toThrow('Unable to connect to server')
    })
  })
})

