/**
 * Stricter Rate Limiting for Authentication Endpoints
 * Prevents brute force attacks
 */

import { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'

/**
 * Register strict rate limiting for auth endpoints
 */
export async function registerAuthRateLimit(server: FastifyInstance): Promise<void> {
  // Stricter rate limit for login/register endpoints
  await server.register(rateLimit, {
    max: 5, // Only 5 requests
    timeWindow: 15 * 60 * 1000, // per 15 minutes
    cache: 5000,
    skipOnError: false,
    keyGenerator: (request) => {
      // Rate limit by IP address
      return request.ip || request.headers['x-forwarded-for'] as string || 'unknown'
    },
    errorResponseBuilder: (request, context) => {
      return {
        error: 'rate_limit_exceeded',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: Math.ceil(context.ttl / 1000) // seconds
      }
    },
    enableDraftSpec: true
  })
}

