/**
 * Authentication Middleware
 * JWT-based authentication for protecting API routes
 * 
 * SECURITY NOTES:
 * - JWT_SECRET must be a strong random string (32+ bytes) in production
 * - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * - Tokens expire after 24 hours by default (configurable)
 * - Rotate JWT_SECRET periodically and invalidate old tokens
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Issues a JWT token for a user
 * @param user - User object with id and email
 * @returns JWT token string
 */
export function issueToken(user: { id: string; email: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email
  }
  
  // Token expires in 24 hours (configurable via JWT_EXPIRES_IN env var)
  const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '24h'
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn as string,
    issuer: 'safenode',
    audience: 'safenode-api'
  } as jwt.SignOptions)
}

/**
 * Verifies a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'safenode',
      audience: 'safenode-api'
    }) as JWTPayload
    
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Authentication middleware for Fastify
 * Verifies JWT token from Authorization header
 * 
 * Usage:
 * server.get('/protected', { preHandler: requireAuth }, handler)
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.log.warn({ path: request.url }, 'Missing or invalid Authorization header')
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      })
    }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const payload = verifyToken(token)
    
    if (!payload) {
      request.log.warn({ path: request.url }, 'Invalid or expired token')
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Invalid or expired token'
      })
    }
    
    // Attach user info to request for use in handlers
    ;(request as any).user = {
      id: payload.userId,
      email: payload.email
    }
    
    request.log.debug({ userId: payload.userId, path: request.url }, 'Authentication successful')
  } catch (error: any) {
    request.log.error({ error: error?.message, path: request.url }, 'Authentication error')
    return reply.code(401).send({
      error: 'unauthorized',
      message: 'Authentication failed',
      details: error?.message
    })
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      
      if (payload) {
        ;(request as any).user = {
          id: payload.userId,
          email: payload.email
        }
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
}

