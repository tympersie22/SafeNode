/**
 * SSO Service Tests
 * Tests for OAuth2 and SSO integration
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  getSSOLoginUrl,
  handleSSOCallback,
  initializeSSOProvider,
  cleanupExpiredStates
} from '../src/services/ssoService'
import type { SSOConfig } from '../src/services/ssoService'
import fetch from 'node-fetch'

// Mock node-fetch
jest.mock('node-fetch')
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>

describe('SSO Service', () => {
  const mockConfig: SSOConfig = {
    google: {
      clientId: 'test-google-client-id',
      clientSecret: 'test-google-secret'
    },
    microsoft: {
      clientId: 'test-microsoft-client-id',
      clientSecret: 'test-microsoft-secret',
      tenantId: 'test-tenant'
    },
    github: {
      clientId: 'test-github-client-id',
      clientSecret: 'test-github-secret'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSSOLoginUrl', () => {
    it('should generate Google OAuth login URL', async () => {
      const url = await getSSOLoginUrl('google', 'http://localhost:5173/callback', mockConfig)
      
      expect(url).toContain('accounts.google.com')
      expect(url).toContain('test-google-client-id')
      expect(url).toContain('state=')
      expect(url).toContain('code_challenge=')
    })

    it('should generate Microsoft OAuth login URL with tenant', async () => {
      const url = await getSSOLoginUrl('microsoft', 'http://localhost:5173/callback', mockConfig)
      
      expect(url).toContain('login.microsoftonline.com')
      expect(url).toContain('test-tenant')
      expect(url).toContain('test-microsoft-client-id')
      expect(url).toContain('state=')
    })

    it('should generate GitHub OAuth login URL', async () => {
      const url = await getSSOLoginUrl('github', 'http://localhost:5173/callback', mockConfig)
      
      expect(url).toContain('github.com/login/oauth/authorize')
      expect(url).toContain('test-github-client-id')
      expect(url).toContain('state=')
    })

    it('should throw error for missing config', async () => {
      await expect(
        getSSOLoginUrl('google', 'http://localhost:5173/callback', {})
      ).rejects.toThrow('Configuration missing')
    })
  })

  describe('initializeSSOProvider', () => {
    it('should initialize Google provider', async () => {
      const provider = await initializeSSOProvider('google', {
        clientId: 'test-id',
        clientSecret: 'test-secret'
      })
      
      expect(provider.type).toBe('oauth')
      expect(provider.enabled).toBe(true)
      expect(provider.name).toContain('Google')
    })

    it('should initialize Microsoft provider', async () => {
      const provider = await initializeSSOProvider('microsoft', {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        tenantId: 'test-tenant'
      })
      
      expect(provider.type).toBe('oauth')
      expect(provider.enabled).toBe(true)
    })

    it('should validate required configuration', async () => {
      await expect(
        initializeSSOProvider('google', { clientId: 'test-id' })
      ).rejects.toThrow('requires clientId and clientSecret')
    })
  })
})

