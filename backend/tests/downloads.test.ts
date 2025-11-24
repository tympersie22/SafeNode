/**
 * Downloads API Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import Fastify from 'fastify'
import { registerDownloadRoutes } from '../src/routes/downloads'

describe('Downloads API', () => {
  let server: any

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerDownloadRoutes(server)
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('GET /api/downloads/latest', () => {
    it('should return all platforms without filter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/downloads/latest'
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.platforms).toBeDefined()
      expect(Array.isArray(data.platforms)).toBe(true)
      expect(data.platforms.length).toBeGreaterThan(0)
    })

    it('should return specific platform when requested', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/downloads/latest?platform=macos'
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.platform).toBeDefined()
      expect(data.platform.platform).toBe('macos')
    })

    it('should return 400 for invalid platform', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/downloads/latest?platform=invalid'
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('invalid_platform')
    })
  })

  describe('GET /api/downloads/:platform', () => {
    it('should return platform info', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/downloads/windows'
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.platform).toBe('windows')
    })

    it('should return 404 for non-existent platform', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/downloads/invalid'
      })

      expect(response.statusCode).toBe(404)
    })
  })
})

