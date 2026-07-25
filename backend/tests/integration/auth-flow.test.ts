/**
 * Auth Flow Integration Tests
 * Tests the complete flow: Register → Create vault → Unlock → Sync
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import Fastify from 'fastify'
import { registerAuthRoutes } from '../../src/routes/auth'
import { registerDeviceRoutes } from '../../src/routes/devices'
import { updateVault } from '../../src/services/userService'

describe('Auth Flow Integration', () => {
  let server: any
  let userId: string
  let authToken: string

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerAuthRoutes(server)
    await registerDeviceRoutes(server)
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('Complete Auth Flow', () => {
    it('should complete full flow: register → login → vault operations', async () => {
      const email = `flow-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Step 1: Register
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email,
          password,
          displayName: 'Flow Test User'
        }
      })

      expect(registerResponse.statusCode).toBe(200)
      const registerBody = JSON.parse(registerResponse.body)
      expect(registerBody.success).toBe(true)
      expect(registerBody.token).toBeDefined()
      expect(registerBody.user.email).toBe(email)

      userId = registerBody.user.id
      authToken = registerBody.token
      const deviceId = `device-${Date.now()}`

      // Step 2: Login
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
      authToken = loginBody.token

      const registerDeviceResponse = await server.inject({
        method: 'POST',
        url: '/api/devices/register',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-device-id': deviceId
        },
        payload: {
          deviceId,
          name: 'Flow Test Browser',
          platform: 'web'
        }
      })

      expect([200, 201]).toContain(registerDeviceResponse.statusCode)

      // Step 3: Get vault (should be empty initially)
      const vaultResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/vault/latest',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-device-id': deviceId
        }
      })

      expect(vaultResponse.statusCode).toBe(200)
      const vaultBody = JSON.parse(vaultResponse.body)
      expect(vaultBody.exists).toBe(false)

      // Step 4: Save vault
      const encryptedVault = Buffer.from('encrypted-vault-data').toString('base64')
      const iv = Buffer.from('iv-data').toString('base64')

      await updateVault(userId, encryptedVault, iv, Date.now())

      // Step 5: Get vault again (should exist now)
      const vaultResponse2 = await server.inject({
        method: 'GET',
        url: '/api/auth/vault/latest',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-device-id': deviceId
        }
      })

      expect(vaultResponse2.statusCode).toBe(200)
      const vaultBody2 = JSON.parse(vaultResponse2.body)
      expect(vaultBody2.exists).toBe(true)
      expect(vaultBody2.encryptedVault).toBe(encryptedVault)
      expect(vaultBody2.iv).toBe(iv)
    })

    it('should handle version checking', async () => {
      const email = `version-${Date.now()}@example.com`
      const password = 'TestPassword123!'

      // Register and get token
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password }
      })
      const { token, user } = JSON.parse(registerResponse.body)
      const deviceId = `device-${Date.now()}`

      const registerDeviceResponse = await server.inject({
        method: 'POST',
        url: '/api/devices/register',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-device-id': deviceId
        },
        payload: {
          deviceId,
          name: 'Version Test Browser',
          platform: 'web'
        }
      })
      expect([200, 201]).toContain(registerDeviceResponse.statusCode)

      // Save vault with version
      const version = Date.now()
      await updateVault(
        user.id,
        Buffer.from('encrypted-data').toString('base64'),
        Buffer.from('iv').toString('base64'),
        version
      )

      // Check with old version (should return vault)
      const response1 = await server.inject({
        method: 'GET',
        url: `/api/auth/vault/latest?since=${version - 1000}`,
        headers: { Authorization: `Bearer ${token}`, 'x-device-id': deviceId }
      })
      const body1 = JSON.parse(response1.body)
      expect(body1.exists).toBe(true)

      // Check with current version (should return upToDate)
      const response2 = await server.inject({
        method: 'GET',
        url: `/api/auth/vault/latest?since=${version}`,
        headers: { Authorization: `Bearer ${token}`, 'x-device-id': deviceId }
      })
      const body2 = JSON.parse(response2.body)
      expect(body2.upToDate).toBe(true)
    })
  })
})
