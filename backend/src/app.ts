/**
 * Fastify App Configuration
 * Sets up middleware, rate limiting, security headers, and routes
 */

import Fastify from 'fastify'
import { parse as parseQueryString } from 'node:querystring'
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
import { registerPasskeyRoutes } from './routes/passkeys'
import { registerResendWebhookRoutes } from './routes/resendWebhook'
import { requireAuth } from './middleware/auth'
import { requireRegisteredDevice } from './middleware/deviceAccess'
import { getLatestVault, saveVault, saveVaultAlias } from './controllers/vaultController'
import { getBreachRange, getCacheStats } from './controllers/breachController'
import { updateVault } from './services/userService'
import {
  createAuthenticationOptions,
  createRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from './services/webauthnService'

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

  server.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (request, body, done) => {
      try {
        const raw = typeof body === 'string' ? body : body.toString('utf8')
        done(null, parseQueryString(raw))
      } catch (error) {
        done(error as Error)
      }
    }
  )

  // Register CORS
  await server.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })

  // Vercel handles response compression at the edge. Enabling Fastify compression
  // inside the inject()-based serverless adapter can corrupt encoded responses.
  if (!process.env.VERCEL) {
    await server.register(compress, {
      encodings: ['gzip', 'deflate']
    })
  }

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

  // Register passkey routes
  await registerPasskeyRoutes(server)

  // Register Resend webhook route
  await registerResendWebhookRoutes(server)

  server.post('/api/biometric/register/options', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      return await createRegistrationOptions(user.id, user.email)
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate biometric registration options' })
    }
  })

  server.post('/api/biometric/register/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any
      const registrationResponse = body?.type
        ? body
        : {
            id: body?.credentialId,
            rawId: body?.rawId,
            type: 'public-key',
            response: {
              clientDataJSON: body?.clientDataJSON,
              attestationObject: body?.attestationObject,
              transports: body?.transports || [],
            },
            clientExtensionResults: body?.clientExtensionResults || {},
          }
      const result = await verifyRegistration(user.id, registrationResponse)
      return { success: result.verified, message: result.message }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify biometric registration' })
    }
  })

  server.post('/api/biometric/authenticate/options', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      return await createAuthenticationOptions(user.id)
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate biometric authentication options' })
    }
  })

  server.post('/api/biometric/authenticate/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any
      const authenticationResponse = body?.type
        ? body
        : {
            id: body?.credentialId,
            rawId: body?.rawId,
            type: 'public-key',
            response: {
              clientDataJSON: body?.clientDataJSON,
              authenticatorData: body?.authenticatorData,
              signature: body?.signature,
              userHandle: body?.userHandle,
            },
            clientExtensionResults: body?.clientExtensionResults || {},
          }
      const result = await verifyAuthentication(user.id, authenticationResponse)
      return { success: result.verified, message: result.message }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify biometric authentication' })
    }
  })

  // Vault routes (strictly authenticated)
  server.get('/api/vault/latest', { preHandler: [requireAuth, requireRegisteredDevice] }, getLatestVault)

  server.post('/api/vault', { preHandler: [requireAuth, requireRegisteredDevice] }, saveVault)

  server.post('/api/vault/save', { preHandler: [requireAuth, requireRegisteredDevice] }, saveVaultAlias)

  // Vault entry CRUD routes (required by frontend)
  // These work with the full encrypted vault blob
  // The frontend handles encryption/decryption locally
  server.post('/api/vault/entry', { preHandler: [requireAuth, requireRegisteredDevice] }, async (request, reply) => {
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

  server.put('/api/vault/entry/:id', { preHandler: [requireAuth, requireRegisteredDevice] }, async (request, reply) => {
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

  server.delete('/api/vault/entry/:id', { preHandler: [requireAuth, requireRegisteredDevice] }, async (request, reply) => {
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
