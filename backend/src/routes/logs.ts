/**
 * Log Aggregation Routes
 * Handles system and application log retrieval (admin-only)
 */

import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'

// In-memory log buffer (in production, use a proper logging service like CloudWatch, DataDog, etc.)
const logBuffer: Array<{
  timestamp: number
  level: string
  message: string
  metadata?: any
  requestId?: string
}> = []

const logQuerySchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 100
    return Math.min(1000, Math.max(1, parsed))
  })
})

/**
 * Check if user is admin
 * In production, implement proper admin check based on your auth system
 */
async function requireAdmin(request: FastifyRequest): Promise<void> {
  const user = (request as any).user
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // TODO: Implement proper admin check
  // For now, allow any authenticated user (restrict in production)
  // Example: check user.role === 'admin' or user.subscriptionTier === 'enterprise'
  const isAdmin = user.role === 'admin' || user.subscriptionTier === 'enterprise'
  
  if (!isAdmin) {
    throw new Error('Admin access required')
  }
}

/**
 * Register log aggregation routes
 */
export async function registerLogRoutes(server: FastifyInstance) {
  /**
   * GET /api/logs/system
   * Get system logs (admin-only)
   */
  server.get('/api/logs/system', {
    preHandler: [requireAuth, requireAdmin]
  }, async (request, reply) => {
    try {
      const query = request.query as any

      const validation = logQuerySchema.safeParse(query)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid query parameters',
          details: validation.error.errors
        })
      }

      const { level, startDate, endDate, limit = 100 } = validation.data

      // Filter logs
      let filteredLogs = [...logBuffer]

      if (level) {
        filteredLogs = filteredLogs.filter(log => log.level === level)
      }

      if (startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate.getTime())
      }

      if (endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate.getTime())
      }

      // Sort by timestamp (newest first) and limit
      filteredLogs = filteredLogs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)

      return {
        logs: filteredLogs,
        count: filteredLogs.length,
        total: logBuffer.length
      }
    } catch (error: any) {
      if (error.message === 'Admin access required') {
        return reply.code(403).send({
          error: 'forbidden',
          message: 'Admin access required'
        })
      }
      
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch system logs'
      })
    }
  })

  /**
   * GET /api/logs/application
   * Get application logs (admin-only)
   * This could read from log files or a logging service
   */
  server.get('/api/logs/application', {
    preHandler: [requireAuth, requireAdmin]
  }, async (request, reply) => {
    try {
      const query = request.query as any

      const validation = logQuerySchema.safeParse(query)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid query parameters',
          details: validation.error.errors
        })
      }

      const { level, startDate, endDate, limit = 100 } = validation.data

      // In production, this would query from a logging service
      // For now, return a placeholder response
      const applicationLogs: Array<{
        timestamp: number
        level: string
        message: string
        component?: string
        metadata?: any
      }> = []

      // Try to read from log file if it exists
      const logFile = path.join(process.cwd(), 'logs', 'application.log')
      
      if (fs.existsSync(logFile)) {
        try {
          const logContent = fs.readFileSync(logFile, 'utf-8')
          const lines = logContent.split('\n').filter(line => line.trim())
          
          // Parse log lines (simplified - adjust based on your log format)
          lines.forEach((line, index) => {
            if (index >= limit) return
            
            try {
              const parsed = JSON.parse(line)
              applicationLogs.push({
                timestamp: parsed.time || Date.now(),
                level: parsed.level || 'info',
                message: parsed.msg || line,
                component: parsed.component,
                metadata: parsed
              })
            } catch {
              // If not JSON, treat as plain text
              applicationLogs.push({
                timestamp: Date.now(),
                level: 'info',
                message: line
              })
            }
          })
        } catch (error) {
          request.log.warn({ error }, 'Failed to read log file')
        }
      }

      // Filter logs
      let filteredLogs = applicationLogs

      if (level) {
        filteredLogs = filteredLogs.filter(log => log.level === level)
      }

      if (startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate.getTime())
      }

      if (endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate.getTime())
      }

      // Sort by timestamp (newest first) and limit
      filteredLogs = filteredLogs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)

      return {
        logs: filteredLogs,
        count: filteredLogs.length,
        total: applicationLogs.length,
        note: 'Log aggregation requires proper logging infrastructure. Consider integrating with CloudWatch, DataDog, or similar.'
      }
    } catch (error: any) {
      if (error.message === 'Admin access required') {
        return reply.code(403).send({
          error: 'forbidden',
          message: 'Admin access required'
        })
      }
      
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch application logs'
      })
    }
  })
}

