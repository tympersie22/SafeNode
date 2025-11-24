/**
 * Structured Logging Middleware
 * Enhanced logging with correlation IDs and structured data
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomBytes } from 'crypto'

// Generate correlation ID
function generateCorrelationId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Structured logging interface
 */
export interface StructuredLog {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  correlationId?: string
  userId?: string
  requestId?: string
  method?: string
  url?: string
  statusCode?: number
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
  timestamp: string
}

/**
 * Add correlation ID to requests
 */
export function addCorrelationId(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const correlationId = request.headers['x-correlation-id'] as string || generateCorrelationId()
  
  // Store in request for use in handlers
  ;(request as any).correlationId = correlationId
  
  // Add to response headers
  reply.header('X-Correlation-ID', correlationId)
}

/**
 * Structured request logging
 */
export function logRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: any
): void {
  const correlationId = (request as any).correlationId
  const userId = (request as any).user?.id
  const startTime = (request as any).startTime || Date.now()
  const duration = Date.now() - startTime

  const log: StructuredLog = {
    level: reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info',
    message: `${request.method} ${request.url} - ${reply.statusCode}`,
    correlationId,
    userId,
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration,
    timestamp: new Date().toISOString()
  }

  // Add error details if status is error
  if (reply.statusCode >= 400) {
    const error = (reply as any).error
    if (error) {
      log.error = {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack
      }
    }
  }

  // Log using Fastify's logger
  if (log.level === 'error') {
    request.log.error(log)
  } else if (log.level === 'warn') {
    request.log.warn(log)
  } else {
    request.log.info(log)
  }

  return payload
}

/**
 * Log errors with full context
 */
export function logError(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const correlationId = (request as any).correlationId
  const userId = (request as any).user?.id

  const errorLog: StructuredLog = {
    level: 'error',
    message: error.message || 'Unhandled error',
    correlationId,
    userId,
    requestId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode || 500,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    metadata: {
      headers: request.headers,
      query: request.query,
      params: request.params,
      body: request.body // Be careful not to log sensitive data
    },
    timestamp: new Date().toISOString()
  }

  request.log.error(errorLog)
}

/**
 * Register structured logging middleware
 */
export function registerStructuredLogging(server: FastifyInstance): void {
  // Add correlation ID to requests
  server.addHook('onRequest', (request, reply) => {
    (request as any).startTime = Date.now()
    addCorrelationId(request, reply)
  })

  // Log requests
  server.addHook('onSend', logRequest)

  // Log errors
  server.setErrorHandler((error, request, reply) => {
    logError(error, request, reply)
    
    // Return error response
    reply.code(error.statusCode || 500).send({
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
      correlationId: (request as any).correlationId
    })
  })

  // Activity logging helper
  server.decorate('logActivity', (activity: {
    action: string
    resourceType?: string
    resourceId?: string
    userId?: string
    metadata?: Record<string, any>
  }) => {
    const request = (server as any).requestContext?.request
    const correlationId = request?.correlationId || generateCorrelationId()
    const userId = activity.userId || request?.user?.id

    const activityLog: StructuredLog = {
      level: 'info',
      message: `Activity: ${activity.action}`,
      correlationId,
      userId,
      metadata: {
        action: activity.action,
        resourceType: activity.resourceType,
        resourceId: activity.resourceId,
        ...activity.metadata
      },
      timestamp: new Date().toISOString()
    }

    server.log.info(activityLog)
  })
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    logActivity(activity: {
      action: string
      resourceType?: string
      resourceId?: string
      userId?: string
      metadata?: Record<string, any>
    }): void
  }
  
  interface FastifyRequest {
    correlationId?: string
    startTime?: number
  }
}

