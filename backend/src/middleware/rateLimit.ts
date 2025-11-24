/**
 * Rate Limiting Middleware
 * Prevents abuse and DDoS attacks
 */

import { FastifyInstance, FastifyRequest } from 'fastify'
import rateLimit from '@fastify/rate-limit'

export interface RateLimitOptions {
  max?: number
  timeWindow?: number // in milliseconds
  cache?: number
  skipOnError?: boolean
}

const defaultOptions: RateLimitOptions = {
  max: 100, // requests
  timeWindow: 60 * 1000, // 1 minute
  cache: 10000,
  skipOnError: false
}

/**
 * Register rate limiting plugin
 */
export async function registerRateLimit(
  server: FastifyInstance,
  options: RateLimitOptions = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options }

  await server.register(rateLimit, {
    max: opts.max,
    timeWindow: opts.timeWindow,
    cache: opts.cache,
    skipOnError: opts.skipOnError,
    keyGenerator: (request: FastifyRequest) => {
      // Use IP address or user ID if authenticated
      const user = (request as any).user
      return user?.id || request.ip || request.headers['x-forwarded-for'] as string || 'unknown'
    },
    errorResponseBuilder: (request, context) => {
      return {
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Maximum ${context.max} requests per ${Math.floor((opts.timeWindow || 60000) / 1000)} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000) // seconds
      }
    },
    enableDraftSpec: true
  })
}

/**
 * Create rate limiter for specific routes
 */
export function createRouteRateLimit(options: RateLimitOptions) {
  return async (server: FastifyInstance) => {
    await registerRateLimit(server, options)
  }
}

