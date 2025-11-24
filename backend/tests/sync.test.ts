/**
 * Sync API Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import Fastify from 'fastify'
import { registerSyncRoutes } from '../src/routes/sync'

describe('Sync API', () => {
  let server: any

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerSyncRoutes(server)
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('GET /api/sync/status', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/sync/status'
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/sync/conflicts', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/sync/conflicts'
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/sync/conflicts', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/sync/conflicts',
        payload: {
          localVersion: 1,
          localEntries: []
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/sync/resolve', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/sync/resolve',
        payload: {
          resolutions: []
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })
})

