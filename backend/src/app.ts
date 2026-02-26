/**
 * Fastify App Configuration
 * Sets up middleware, rate limiting, security headers, and routes
 */

import Fastify from 'fastify'
import { webcrypto } from 'crypto'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import compress from '@fastify/compress'
import rawBody from 'fastify-raw-body'
import { config } from './config'

import { registerAuthRoutes } from './routes/auth'
import { registerBillingRoutes } from './routes/billing'
import { registerSyncRoutes } from './routes/sync'
import { registerSSORoutes } from './routes/sso'
import { registerHealthRoutes } from './routes/health'
import { registerDownloadRoutes } from './routes/downloads'
import { registerDeviceRoutes } from './routes/devices'
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

  // Register raw body support for Stripe webhook signature verification
  await server.register(rawBody, {
    field: 'rawBody',
    global: false,
    runFirst: true,
    encoding: false
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

  // Register device routes
  await registerDeviceRoutes(server)

  // Biometric Authentication endpoints (WebAuthn)
  // Temporary in-memory credential map for platform authenticators.
  // Persist in DB for full production-grade passkey management.
  const biometricCredentials: Map<string, any[]> = new Map()

  server.post('/api/biometric/register/options', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const challenge = webcrypto.getRandomValues(new Uint8Array(32))
      const challengeB64 = Buffer.from(challenge).toString('base64url')
      const rpId = process.env.SSO_CALLBACK_BASE_URL
        ? new URL(process.env.SSO_CALLBACK_BASE_URL).hostname
        : 'safe-node.app'

      return {
        challenge: challengeB64,
        rp: {
          name: 'SafeNode',
          id: rpId
        },
        user: {
          id: Buffer.from(user.id).toString('base64url'),
          name: user.email,
          displayName: user.email
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate biometric registration options' })
    }
  })

  server.post('/api/biometric/register/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { credentialId, rawId, transports } = request.body as any

      if (!credentialId) {
        return reply.code(400).send({ error: 'invalid_payload', message: 'Credential ID is required' })
      }

      const credentials = biometricCredentials.get(user.id) || []
      const withoutOld = credentials.filter((cred: any) => cred.id !== credentialId)
      withoutOld.push({
        id: credentialId,
        rawId,
        transports: transports || [],
        createdAt: Date.now()
      })
      biometricCredentials.set(user.id, withoutOld)

      return { success: true, credentialId }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify biometric registration' })
    }
  })

  server.post('/api/biometric/authenticate/options', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const credentials = (biometricCredentials.get(user.id) || []).map((cred: any) => ({
        id: cred.id,
        type: 'public-key',
        transports: cred.transports
      }))
      const challenge = webcrypto.getRandomValues(new Uint8Array(32))
      const challengeB64 = Buffer.from(challenge).toString('base64url')
      const rpId = process.env.SSO_CALLBACK_BASE_URL
        ? new URL(process.env.SSO_CALLBACK_BASE_URL).hostname
        : 'safe-node.app'

      return {
        challenge: challengeB64,
        rpId,
        allowCredentials: credentials,
        timeout: 60000,
        userVerification: 'required'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate biometric authentication options' })
    }
  })

  server.post('/api/biometric/authenticate/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { credentialId } = request.body as any

      if (!credentialId) {
        return reply.code(400).send({ error: 'invalid_payload', message: 'Credential ID is required' })
      }

      const credentials = biometricCredentials.get(user.id) || []
      const credentialExists = credentials.some((cred: any) => cred.id === credentialId)
      if (!credentialExists) {
        return reply.code(401).send({ success: false, error: 'credential_not_found', message: 'Credential not found' })
      }

      return { success: true, credentialId }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify biometric authentication' })
    }
  })

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

    // Root health check route
    server.get('/', async (request, reply) => {
          return { status: 'ok', message: 'SafeNode API is running' }
    })

  return server
}
