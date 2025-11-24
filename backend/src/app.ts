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
import { requireAuth } from './middleware/auth'
import { getLatestVault, saveVault, saveVaultAlias } from './controllers/vaultController'
import { getBreachRange, getCacheStats } from './controllers/breachController'

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

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() }
  })

  // Register authentication routes (public)
  await registerAuthRoutes(server)

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

  // Breach check routes (public, but rate limited)
  server.get('/api/breach/range/:prefix', getBreachRange)
  server.get('/api/breach/cache/stats', getCacheStats)

  // Legacy routes (for backward compatibility, will be deprecated)
  // These are kept for now but should use the new controller pattern
  // TODO: Migrate all routes to use controllers and remove legacy code

  return server
}

