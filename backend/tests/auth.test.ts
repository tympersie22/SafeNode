/**
 * Authentication Tests
 * Unit tests for authentication endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import Fastify from 'fastify'
import { registerAuthRoutes } from '../src/routes/auth'

describe('Authentication', () => {
  let server: any

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerAuthRoutes(server)
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'TestPassword123!',
          displayName: 'Test User'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.token).toBeDefined()
      expect(body.user.email).toBe('test@example.com')
    })

    it('should reject invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'TestPassword123!'
        }
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject weak password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test2@example.com',
          password: '123'
        }
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register
      await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'login@example.com',
          password: 'TestPassword123!'
        }
      })

      // Then login
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'TestPassword123!'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.token).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })
})

