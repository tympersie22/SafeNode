/**
 * Sentry Middleware
 * Error tracking middleware for Fastify
 * Note: Install @sentry/node to enable error tracking
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

let Sentry: any = null

// Try to import Sentry, but don't fail if not installed
try {
  Sentry = require('@sentry/node')
} catch {
  // Sentry not installed, will skip initialization
  console.warn('⚠️  @sentry/node not installed. Error tracking middleware is disabled.')
}

/**
 * Register Sentry error tracking middleware
 */
export async function registerSentryMiddleware(server: FastifyInstance): Promise<void> {
  // Skip if Sentry is not installed
  if (!Sentry) {
    return
  }

  // Error handler for Sentry
  server.setErrorHandler(async (error, request, reply) => {
    // Log error to Sentry
    Sentry.withScope((scope: any) => {
      scope.setContext('request', {
        method: request.method,
        url: request.url,
        headers: {
          'user-agent': request.headers['user-agent'],
          'referer': request.headers['referer']
        },
        ip: request.ip
      })

      // Add user context if authenticated
      const user = (request as any).user
      if (user) {
        scope.setUser({
          id: user.id,
          email: user.email
        })
      }

      Sentry.captureException(error)
    })

    // Continue with default error handler
    reply.send(error)
  })

  // Request tracking
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Start transaction for performance monitoring
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${request.method} ${request.url}`
    })

    // Store transaction in request for later use
    ;(request as any).__sentryTransaction = transaction
  })

  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const transaction = (request as any).__sentryTransaction
    if (transaction && typeof transaction.setHttpStatus === 'function') {
      transaction.setHttpStatus(reply.statusCode)
      if (typeof transaction.finish === 'function') {
        transaction.finish()
      }
    }
  })
}

