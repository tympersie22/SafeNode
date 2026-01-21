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
  tokenVersion?: number // Token version for invalidation
  iat?: number
  exp?: number
}

/**
 * Issues a JWT token for a user
 * @param user - User object with id, email, and optional tokenVersion
 * @returns JWT token string
 */
export function issueToken(user: { id: string; email: string; tokenVersion?: number }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion || 1
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
 * Verifies JWT token from Authorization header or cookie
 * Validates token version against user's current tokenVersion
 * 
 * Usage:
 * server.get('/protected', { preHandler: requireAuth }, handler)
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Try to get token from Authorization header first, then from cookie
    let token: string | undefined
    
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7) // Remove 'Bearer ' prefix
    } else {
      // Try cookie - use type assertion since @fastify/cookie extends FastifyRequest
      const cookies = (request as any).cookies
      token = cookies?.safenode_token
    }
    
    if (!token) {
      request.log.warn({ path: request.url }, 'Missing or invalid Authorization header/cookie')
      return reply.code(401).send({
        error: 'unauthorized',
        code: 'MISSING_TOKEN',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      })
    }
    
    const payload = verifyToken(token)
    
    if (!payload) {
      request.log.warn({ path: request.url }, 'Invalid or expired token')
      return reply.code(401).send({
        error: 'unauthorized',
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      })
    }
    
    // Verify user exists and check token version
    const { db } = await import('../services/database')
    
    // For new users, there might be a slight delay in database propagation
    // Retry up to 3 times with exponential backoff
    let user = await db.users.findById(payload.userId)
    let retries = 0
    const maxRetries = 3
    
    while (!user && retries < maxRetries) {
      // Wait before retry (exponential backoff: 50ms, 100ms, 200ms)
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retries)))
      user = await db.users.findById(payload.userId)
      retries++
    }
    
    if (!user) {
      // User not found - token is invalid (user deleted or reseeded)
      request.log.warn({ 
        userId: payload.userId, 
        tokenSub: payload.userId,
        path: request.url,
        retries
      }, 'User not found in database after retries - token invalid')
      
      return reply.code(401).send({
        error: 'unauthorized',
        code: 'USER_NOT_FOUND',
        message: 'User not found - authentication invalid'
      })
    }
    
    // Check token version (if token has version, it must match user's current version)
    const userTokenVersion = (user as any).tokenVersion || 1
    const tokenVersion = payload.tokenVersion || 1
    
    if (tokenVersion < userTokenVersion) {
      // Token version is outdated (user's tokenVersion was bumped)
      request.log.warn({ 
        userId: payload.userId,
        tokenVersion,
        userTokenVersion,
        path: request.url 
      }, 'Token version mismatch - token invalidated')
      
      return reply.code(401).send({
        error: 'unauthorized',
        code: 'TOKEN_VERSION_MISMATCH',
        message: 'Token has been invalidated. Please log in again.'
      })
    }
    
    // Attach user info to request for use in handlers
    ;(request as any).user = {
      id: user.id,
      email: user.email
    }
    
    request.log.debug({ userId: user.id, path: request.url }, 'Authentication successful')
  } catch (error: any) {
    request.log.error({ 
      error: error?.message, 
      stack: error?.stack,
      path: request.url 
    }, 'Authentication error')
    return reply.code(401).send({
      error: 'unauthorized',
      code: 'AUTH_ERROR',
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

