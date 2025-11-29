/**
 * Complete Authentication Flow E2E Tests
 * Tests the full authentication flow: register → login → getCurrentUser → token persistence
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import Fastify from 'fastify'
import { registerAuthRoutes } from '../../src/routes/auth'
// Note: Vault routes are optional for auth flow tests
// import { registerVaultRoutes } from '../../src/routes/vault'

describe('Complete Authentication Flow E2E', () => {
  let server: any
  const API_BASE = 'http://localhost:4000'

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerAuthRoutes(server)
    // Vault routes not needed for auth flow tests
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('Full Authentication Flow', () => {
    it('should complete: register → login → getCurrentUser → persist token', async () => {
      const email = `e2e-${Date.now()}@example.com`
      const password = 'TestPassword123!'
      const displayName = 'E2E Test User'

      // Step 1: Register
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email,
          password,
          displayName
        }
      })

      expect(registerResponse.statusCode).toBe(200)
      const registerBody = JSON.parse(registerResponse.body)
      expect(registerBody.success).toBe(true)
      expect(registerBody.token).toBeDefined()
      expect(typeof registerBody.token).toBe('string')
      expect(registerBody.token.length).toBeGreaterThan(0)
      expect(registerBody.user).toBeDefined()
      expect(registerBody.user.email).toBe(email)
      expect(registerBody.user.displayName).toBe(displayName)
      expect(registerBody.user.id).toBeDefined()

      const registerToken = registerBody.token
      const userId = registerBody.user.id

      // Step 2: Verify token works with getCurrentUser
      const meResponse1 = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${registerToken}`
        }
      })

      expect(meResponse1.statusCode).toBe(200)
      const meBody1 = JSON.parse(meResponse1.body)
      expect(meBody1.id).toBe(userId)
      expect(meBody1.email).toBe(email)
      expect(meBody1.displayName).toBe(displayName)

      // Step 3: Login with same credentials
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email,
          password
        }
      })

      expect(loginResponse.statusCode).toBe(200)
      const loginBody = JSON.parse(loginResponse.body)
      expect(loginBody.success).toBe(true)
      expect(loginBody.token).toBeDefined()
      expect(typeof loginBody.token).toBe('string')
      expect(loginBody.token.length).toBeGreaterThan(0)
      expect(loginBody.user).toBeDefined()
      expect(loginBody.user.email).toBe(email)
      expect(loginBody.user.id).toBe(userId)

      const loginToken = loginBody.token

      // Step 4: Verify login token works
      const meResponse2 = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${loginToken}`
        }
      })

      expect(meResponse2.statusCode).toBe(200)
      const meBody2 = JSON.parse(meResponse2.body)
      expect(meBody2.id).toBe(userId)
      expect(meBody2.email).toBe(email)

      // Step 5: Verify tokens are different (new session)
      expect(registerToken).not.toBe(loginToken)
    })

    it('should handle invalid credentials', async () => {
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        }
      })

      expect(loginResponse.statusCode).toBe(401)
      const body = JSON.parse(loginResponse.body)
      expect(body.error).toBeDefined()
      expect(body.message).toBeDefined()
    })

    it('should reject invalid token', async () => {
      const meResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: 'Bearer invalid-token-12345'
        }
      })

      expect(meResponse.statusCode).toBe(401)
      const body = JSON.parse(meResponse.body)
      expect(body.error).toBe('unauthorized')
    })

    it('should reject missing Authorization header', async () => {
      const meResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/me'
      })

      expect(meResponse.statusCode).toBe(401)
      const body = JSON.parse(meResponse.body)
      expect(body.error).toBe('unauthorized')
      expect(body.message).toContain('Authorization header')
    })

    it('should reject expired token format', async () => {
      const meResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: 'InvalidFormat token-123'
        }
      })

      expect(meResponse.statusCode).toBe(401)
      const body = JSON.parse(meResponse.body)
      expect(body.error).toBe('unauthorized')
    })
  })

  describe('Token Persistence', () => {
    it('should allow multiple requests with same token', async () => {
      const email = `persist-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Register
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password }
      })

      const { token } = JSON.parse(registerResponse.body)

      // Make multiple requests with same token
      for (let i = 0; i < 5; i++) {
        const meResponse = await server.inject({
          method: 'GET',
          url: '/api/auth/me',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        expect(meResponse.statusCode).toBe(200)
        const body = JSON.parse(meResponse.body)
        expect(body.email).toBe(email)
      }
    })
  })

  describe('Response Format Validation', () => {
    it('should return correct register response format', async () => {
      const email = `format-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password }
      })

      const body = JSON.parse(response.body)
      
      // Verify structure
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('token')
      expect(body).toHaveProperty('user')
      expect(body.success).toBe(true)
      expect(typeof body.token).toBe('string')
      
      // Verify user object structure
      expect(body.user).toHaveProperty('id')
      expect(body.user).toHaveProperty('email')
      expect(body.user).toHaveProperty('emailVerified')
      expect(body.user).toHaveProperty('subscriptionTier')
      expect(body.user).toHaveProperty('subscriptionStatus')
      expect(body.user).toHaveProperty('twoFactorEnabled')
      expect(body.user).toHaveProperty('biometricEnabled')
      expect(body.user).toHaveProperty('createdAt')
    })

    it('should return correct login response format', async () => {
      const email = `login-format-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Register first
      await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password }
      })

      // Then login
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password }
      })

      const body = JSON.parse(response.body)
      
      // Verify structure
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('token')
      expect(body).toHaveProperty('user')
      expect(body.success).toBe(true)
      expect(typeof body.token).toBe('string')
      
      // Verify user object has all required fields
      expect(body.user).toHaveProperty('id')
      expect(body.user).toHaveProperty('email')
      expect(body.user).toHaveProperty('lastLoginAt')
    })

    it('should return correct getCurrentUser response format', async () => {
      const email = `me-format-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Register
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password }
      })

      const { token } = JSON.parse(registerResponse.body)

      // Get current user
      const meResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const body = JSON.parse(meResponse.body)
      
      // Verify structure matches frontend expectations
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('email')
      expect(body).toHaveProperty('displayName')
      expect(body).toHaveProperty('emailVerified')
      expect(body).toHaveProperty('subscriptionTier')
      expect(body).toHaveProperty('subscriptionStatus')
      expect(body).toHaveProperty('twoFactorEnabled')
      expect(body).toHaveProperty('biometricEnabled')
      expect(body).toHaveProperty('createdAt')
      expect(body).toHaveProperty('lastLoginAt')
    })
  })
})

