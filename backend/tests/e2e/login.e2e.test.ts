/**
 * E2E Test: Login Flow
 * Tests complete user login journey
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import Fastify from 'fastify'
import { registerAuthRoutes } from '../../src/routes/auth'

describe('E2E: Login Flow', () => {
  let server: any
  let testEmail: string
  let testPassword: string

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerAuthRoutes(server)
    await server.ready()

    testEmail = `e2e-${Date.now()}@example.com`
    testPassword = 'E2ETestPassword123!'
  })

  afterAll(async () => {
    await server.close()
  })

  describe('Complete Login Journey', () => {
    it('should complete full login flow', async () => {
      // Step 1: Register user
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: testEmail,
          password: testPassword,
          displayName: 'E2E Test User'
        }
      })

      expect(registerResponse.statusCode).toBe(200)
      const registerData = JSON.parse(registerResponse.body)
      expect(registerData.success).toBe(true)
      expect(registerData.token).toBeDefined()

      const token = registerData.token

      // Step 2: Verify token
      const verifyResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/verify',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      expect(verifyResponse.statusCode).toBe(200)
      const verifyData = JSON.parse(verifyResponse.body)
      expect(verifyData.valid).toBe(true)

      // Step 3: Login with credentials
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: testPassword
        }
      })

      expect(loginResponse.statusCode).toBe(200)
      const loginData = JSON.parse(loginResponse.body)
      expect(loginData.success).toBe(true)
      expect(loginData.token).toBeDefined()

      // Step 4: Access protected resource
      const vaultResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/vault/latest',
        headers: {
          Authorization: `Bearer ${loginData.token}`
        }
      })

      expect(vaultResponse.statusCode).toBe(200)
    })

    it('should reject invalid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testEmail,
          password: 'WrongPassword123!'
        }
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject expired or invalid token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/verify',
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })
})

