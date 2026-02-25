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

// Log batching
interface BatchedLog {
  log: StructuredLog
  timestamp: number
}

const logBatch: BatchedLog[] = []
const BATCH_SIZE = 50
const BATCH_INTERVAL = 5000 // 5 seconds

// Sanitize sensitive fields from logs
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken', 'authorization']
  const sanitized = { ...data }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key])
    }
  }

  return sanitized
}

// Process batched logs
function processBatchedLogs(server: FastifyInstance): void {
  if (logBatch.length === 0) return

  const logsToProcess = logBatch.splice(0, BATCH_SIZE)
  
  for (const batchedLog of logsToProcess) {
    const sanitizedLog = {
      ...batchedLog.log,
      metadata: sanitizeLogData(batchedLog.log.metadata),
      error: batchedLog.log.error ? {
        ...batchedLog.log.error,
        stack: batchedLog.log.error.stack ? '[REDACTED]' : undefined
      } : undefined
    }

    if (sanitizedLog.level === 'error') {
      server.log.error(sanitizedLog)
    } else if (sanitizedLog.level === 'warn') {
      server.log.warn(sanitizedLog)
    } else {
      server.log.info(sanitizedLog)
    }
  }
}

// Start batch processing interval
let batchInterval: NodeJS.Timeout | null = null
function startBatchProcessing(server: FastifyInstance): void {
  if (batchInterval) return
  
  batchInterval = setInterval(() => {
    processBatchedLogs(server)
  }, BATCH_INTERVAL)
}

function stopBatchProcessing(): void {
  if (batchInterval) {
    clearInterval(batchInterval)
    batchInterval = null
  }
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

  // Sanitize sensitive data
  const sanitizedLog = {
    ...log,
    metadata: sanitizeLogData((request as any).logMetadata || {}),
    error: log.error ? {
      ...log.error,
      stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : log.error.stack
    } : undefined
  }

  // Log using Fastify's logger
  if (sanitizedLog.level === 'error') {
    request.log.error(sanitizedLog)
  } else if (sanitizedLog.level === 'warn') {
    request.log.warn(sanitizedLog)
  } else {
    request.log.info(sanitizedLog)
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

  // Log errors (with sanitization)
  server.setErrorHandler((error, request, reply) => {
    const err = error instanceof Error ? error : new Error('An unexpected error occurred')
    const sanitizedError = Object.assign(err, {
      stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : err.stack
    })
    logError(sanitizedError, request, reply)
    
    // Return error response
    reply.code((error as any)?.statusCode || 500).send({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
      correlationId: (request as any).correlationId
    })
  })

  // Start batch processing
  startBatchProcessing(server)

  // Cleanup on shutdown
  process.on('SIGTERM', () => {
    stopBatchProcessing()
    // Process remaining logs
    processBatchedLogs(server)
  })
  
  process.on('SIGINT', () => {
    stopBatchProcessing()
    // Process remaining logs
    processBatchedLogs(server)
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
      metadata: sanitizeLogData({
        action: activity.action,
        resourceType: activity.resourceType,
        resourceId: activity.resourceId,
        ...activity.metadata
      }),
      timestamp: new Date().toISOString()
    }

    // Add to batch for processing
    logBatch.push({
      log: activityLog,
      timestamp: Date.now()
    })

    // Process immediately if batch is full
    if (logBatch.length >= BATCH_SIZE) {
      processBatchedLogs(server)
    }
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
