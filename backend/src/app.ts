/**
 * Fastify App Configuration
 * Sets up middleware, rate limiting, security headers, and routes
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import compress from '@fastify/compress'
import { config } from './config'
import { registerAuthRoutes } from './routes/auth'
import { registerBillingRoutes } from './routes/billing'
import { registerSyncRoutes } from './routes/sync'
import { registerSSORoutes } from './routes/sso'
import { registerHealthRoutes } from './routes/health'
import { registerDownloadRoutes } from './routes/downloads'
import { requireAuth } from './middleware/auth'
import { getLatestVault, saveVault, saveVaultAlias } from './controllers/vaultController'
import { getBreachRange, getCacheStats } from './controllers/breachController'
import { updateVault } from './services/userService'

/**
 * Creates and configures the Fastify server instance
 */
export async function createApp() {
  const server = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport: config.nodeEnv === 'development' 
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
        : undefined
    }
  })

  // Register CORS
  await server.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })

  // Register compression (gzip)
  await server.register(compress, {
    encodings: ['gzip', 'deflate']
  })

  // Security headers are registered via registerSecurityHeaders middleware
  // This ensures consistent CSP configuration across the application

  // Register rate limiting
  await server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMinutes * 60 * 1000, // Convert minutes to ms
    errorResponseBuilder: (request, context) => {
      return {
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Maximum ${context.max} requests per ${config.rateLimitWindowMinutes} minutes.`,
        retryAfter: Math.ceil(context.ttl / 1000) // seconds
      }
    }
  })

  // Security headers hook
  server.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Permissions-Policy', 'camera=(), microphone=()')
    return payload
  })

  // Register authentication routes (public)
  await registerAuthRoutes(server)

  // Register billing routes
  await registerBillingRoutes(server)

  // Register sync routes
  await registerSyncRoutes(server)

  // Register SSO routes
  await registerSSORoutes(server)

  // Register health check routes
  await registerHealthRoutes(server)

  // Register download routes
  await registerDownloadRoutes(server)

  // Vault routes
  // NOTE: For backward compatibility, these are NOT protected by default
  // To enable JWT auth, uncomment the preHandler lines
  server.get('/api/vault/latest', 
    // { preHandler: requireAuth }, // Uncomment to enable JWT auth
    getLatestVault
  )

  server.post('/api/vault', 
    // { preHandler: requireAuth }, // Uncomment to enable JWT auth
    saveVault
  )

  server.post('/api/vault/save', 
    // { preHandler: requireAuth }, // Uncomment to enable JWT auth
    saveVaultAlias
  )

  // Vault entry CRUD routes (required by frontend)
  // These work with the full encrypted vault blob
  // The frontend handles encryption/decryption locally
  server.post('/api/vault/entry', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any
      const { encryptedVault, iv, version } = body || {}
      
      if (typeof encryptedVault !== 'string' || typeof iv !== 'string') {
        return reply.code(400).send({ 
          error: 'invalid_payload', 
          message: 'encryptedVault and iv are required and must be strings' 
        })
      }
      
      // Update vault
      const updated = await updateVault(user.id, encryptedVault, iv, typeof version === 'number' ? version : Date.now())
      
      if (!updated) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }
      
      return { 
        ok: true, 
        version: updated.vaultVersion,
        message: 'Entry created successfully' 
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ 
        error: error?.message || 'server_error', 
        message: 'Failed to create vault entry' 
      })
    }
  })

  server.put('/api/vault/entry/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const body = request.body as any
      const { encryptedVault, iv, version } = body || {}
      
      if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
        return reply.code(400).send({ 
          error: 'invalid_payload', 
          message: 'ID, encryptedVault, and iv are required' 
        })
      }
      
      // Update vault
      const updated = await updateVault(user.id, encryptedVault, iv, typeof version === 'number' ? version : Date.now())
      
      if (!updated) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }
      
      return { 
        ok: true, 
        version: updated.vaultVersion,
        message: `Entry ${id} updated successfully` 
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ 
        error: error?.message || 'server_error', 
        message: 'Failed to update vault entry' 
      })
    }
  })

  server.delete('/api/vault/entry/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const body = request.body as any
      const { encryptedVault, iv, version } = body || {}
      
      if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
        return reply.code(400).send({ 
          error: 'invalid_payload', 
          message: 'ID, encryptedVault, and iv are required' 
        })
      }
      
      // Update vault
      const updated = await updateVault(user.id, encryptedVault, iv, typeof version === 'number' ? version : Date.now())
      
      if (!updated) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }
      
      return { 
        ok: true, 
        version: updated.vaultVersion,
        message: `Entry ${id} deleted successfully` 
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ 
        error: error?.message || 'server_error', 
        message: 'Failed to delete vault entry' 
      })
    }
  })

  // Breach check routes (public, but rate limited)
  server.get('/api/breach/range/:prefix', getBreachRange)
  server.get('/api/breach/cache/stats', getCacheStats)

  return server
}

