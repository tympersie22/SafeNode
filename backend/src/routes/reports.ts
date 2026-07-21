import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRegisteredDevice } from '../middleware/deviceAccess'
import { getPrismaClient } from '../db/prisma'
import { createAuditLog } from '../services/auditLogService'
import { config } from '../config'

type ReportSeverity = 'high' | 'medium' | 'info'
const booleanQuery = z.string().optional().default('false').transform((val) => val === 'true')

const reportQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 30
      return Number.isNaN(parsed) ? 30 : Math.min(365, Math.max(1, parsed))
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 50
      return Number.isNaN(parsed) ? 50 : Math.min(500, Math.max(1, parsed))
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 0
      return Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    }),
  action: z.string().optional(),
  severity: z.enum(['all', 'high', 'medium', 'info']).optional().default('all'),
  includeSystem: booleanQuery,
  includeSessionActivity: booleanQuery,
  includeInformational: booleanQuery,
  source: z.enum(['manual', 'auto']).optional().default('manual')
})

function getSeverity(action: string, metadata: Record<string, any> | null | undefined): ReportSeverity {
  if (action === 'device_access_denied') {
    const code = String(metadata?.code || '')
    if (code === 'SESSION_DEVICE_MISMATCH' || code === 'DEVICE_REAPPROVAL_REQUIRED') return 'high'
    return 'medium'
  }
  if (action === 'session_replaced' || action === 'session_revoked') return 'high'
  if (action === '2fa_disabled' || action === 'vault_exported' || action === 'password_changed') return 'medium'
  return 'info'
}

function isSecurityAction(action: string): boolean {
  return [
    'device_access_denied',
    'session_replaced',
    'session_revoked',
    'device_reapproval_required',
    'device_reapproved',
    '2fa_enabled',
    '2fa_disabled',
    'password_changed',
    'vault_exported',
    'vault_imported',
    'vault_locked',
    'vault_unlocked'
  ].includes(action)
}

function isSystemAction(action: string): boolean {
  return action.startsWith('report_')
}

function isSessionHeartbeatAction(action: string): boolean {
  return action === 'vault_locked' || action === 'vault_unlocked'
}

function toCsvRow(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
    .join(',')
}

function filterAndMapEvents(
  rawEvents: Array<{
    id: string
    action: string
    resourceType: string | null
    resourceId: string | null
    metadata: any
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
  }>,
  options: {
    includeSystem: boolean
    includeSessionActivity: boolean
    includeInformational: boolean
    severity: 'all' | 'high' | 'medium' | 'info'
  }
) {
  return rawEvents
    .map((event) => ({
      id: event.id,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata as Record<string, any> | null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt.getTime(),
      severity: getSeverity(event.action, event.metadata as Record<string, any> | null)
    }))
    .filter((event) => {
      if (!options.includeSystem && isSystemAction(event.action)) return false
      if (!options.includeSessionActivity && isSessionHeartbeatAction(event.action)) return false
      if (!options.includeInformational && event.severity === 'info') return false
      if (options.severity !== 'all' && event.severity !== options.severity) return false
      return true
    })
}

async function writeReportAudit(
  userId: string,
  action: 'report_viewed' | 'report_exported' | 'report_filter_applied',
  metadata: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  await createAuditLog({
    userId,
    action,
    resourceType: 'report',
    metadata,
    ipAddress,
    userAgent
  })
}

export async function registerReportRoutes(server: FastifyInstance) {
  server.get('/api/reports/overview', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const validation = reportQuerySchema.safeParse(request.query as any)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid query parameters',
          details: validation.error.errors
        })
      }

      const { days, includeSystem, includeSessionActivity, includeInformational } = validation.data
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const prisma = getPrismaClient()

      const [events, deviceCount, pendingReapprovals] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: startDate }
          },
          select: {
            action: true,
            metadata: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 2000
        }),
        prisma.device.count({
          where: {
            userId: user.id,
            isActive: true
          }
        }),
        prisma.device.count({
          where: {
            userId: user.id,
            requiresReapproval: true
          }
        })
      ])

      const securityEvents = events.filter((event) => {
        if (!isSecurityAction(event.action)) return false
        if (!includeSystem && isSystemAction(event.action)) return false
        if (!includeSessionActivity && isSessionHeartbeatAction(event.action)) return false
        if (!includeInformational && getSeverity(event.action, (event.metadata as any) || {}) === 'info') return false
        return true
      })
      const blockedDeviceAttempts = securityEvents.filter((event) => event.action === 'device_access_denied').length
      const sessionTakeovers = securityEvents.filter((event) => event.action === 'session_replaced').length
      const vaultAccessEvents = securityEvents.filter((event) => event.action === 'vault_unlocked' || event.action === 'vault_locked').length

      const actionsBreakdown = securityEvents.reduce<Record<string, number>>((acc, event) => {
        acc[event.action] = (acc[event.action] || 0) + 1
        return acc
      }, {})

      const dailyMap = new Map<string, number>()
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        dailyMap.set(date, 0)
      }
      securityEvents.forEach((event) => {
        const key = event.createdAt.toISOString().slice(0, 10)
        if (dailyMap.has(key)) {
          dailyMap.set(key, (dailyMap.get(key) || 0) + 1)
        }
      })

      const activitySeries = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const topActions = Object.entries(actionsBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([action, count]) => ({ action, count }))

      const recentAlerts = securityEvents
        .map((event) => ({
          action: event.action,
          severity: getSeverity(event.action, (event.metadata as any) || {}),
          message: String((event.metadata as any)?.message || (event.metadata as any)?.code || event.action),
          createdAt: event.createdAt.getTime()
        }))
        .filter((event) => event.severity !== 'info')
        .slice(0, 10)

      await writeReportAudit(
        user.id,
        'report_viewed',
        {
          report: 'overview',
          days,
          includeSystem,
          includeSessionActivity,
          includeInformational
        },
        request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
        request.headers['user-agent'] || undefined
      )

      return {
        generatedAt: Date.now(),
        periodDays: days,
        summary: {
          securityEventCount: securityEvents.length,
          blockedDeviceAttempts,
          sessionTakeovers,
          vaultAccessEvents,
          activeDeviceCount: deviceCount,
          pendingReapprovals
        },
        topActions,
        activitySeries,
        recentAlerts
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to build report overview'
      })
    }
  })

  server.get('/api/reports/events', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const validation = reportQuerySchema.safeParse(request.query as any)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid query parameters',
          details: validation.error.errors
        })
      }

      const { days, limit, offset, action, severity, includeSystem, includeSessionActivity, includeInformational, source } = validation.data
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const prisma = getPrismaClient()

      const where: any = {
        userId: user.id,
        createdAt: { gte: startDate }
      }
      if (action) where.action = action

      const [rawEvents, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Math.min(limit * 10, 2000),
          skip: offset
        }),
        prisma.auditLog.count({ where })
      ])

      const mapped = rawEvents
        .map((event) => ({
          id: event.id,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          metadata: event.metadata as Record<string, any> | null,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          createdAt: event.createdAt.getTime(),
          severity: getSeverity(event.action, event.metadata as Record<string, any> | null)
        }))
        .filter((event) => {
          if (!includeSystem && isSystemAction(event.action)) return false
          if (!includeSessionActivity && isSessionHeartbeatAction(event.action)) return false
          if (!includeInformational && event.severity === 'info') return false
          if (severity !== 'all' && event.severity !== severity) return false
          return true
        })
        .slice(0, limit)

      if (source !== 'auto') {
        await writeReportAudit(
          user.id,
          'report_filter_applied',
          {
            report: 'events',
            days,
            action: action || null,
            severity,
            includeSystem,
            includeSessionActivity,
            includeInformational,
            limit,
            offset
          },
          request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
          request.headers['user-agent'] || undefined
        )
      }

      return {
        events: mapped,
        count: mapped.length,
        pagination: {
          limit,
          offset,
          total
        }
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to load report events'
      })
    }
  })

  server.get('/api/reports/stream', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request, reply) => {
    const user = (request as any).user
    const validation = reportQuerySchema.safeParse(request.query as any)
    if (!validation.success) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Invalid query parameters',
        details: validation.error.errors
      })
    }

    const { days, action, severity, includeSystem, includeSessionActivity, includeInformational } = validation.data
    const prisma = getPrismaClient()

    // Writing to reply.raw and flushing headers bypasses Fastify's onSend hook,
    // where @fastify/cors normally injects the CORS headers — so they must be set
    // manually here, mirroring the app-level CORS config (echo an allowed origin
    // + credentials). Without this the browser blocks the SSE stream.
    const requestOrigin = request.headers.origin
    if (requestOrigin) {
      const allowedOrigins = Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin]
      const originAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(requestOrigin) : allowed === requestOrigin
      )
      if (originAllowed) {
        reply.raw.setHeader('Access-Control-Allow-Origin', requestOrigin)
        reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
        reply.raw.setHeader('Vary', 'Origin')
      }
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.flushHeaders?.()

    let closed = false
    let lastSignature = ''

    const send = (type: string, payload: any) => {
      if (closed) return
      reply.raw.write(`event: ${type}\n`)
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    const emitSnapshot = async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const where: any = {
        userId: user.id,
        createdAt: { gte: startDate }
      }
      if (action) where.action = action

      const [rawEvents, deviceCount, pendingReapprovals] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 300
        }),
        prisma.device.count({
          where: {
            userId: user.id,
            isActive: true
          }
        }),
        prisma.device.count({
          where: {
            userId: user.id,
            requiresReapproval: true
          }
        })
      ])

      const mapped = filterAndMapEvents(rawEvents, {
        includeSystem,
        includeSessionActivity,
        includeInformational,
        severity
      })

      const securityEventCount = mapped.length
      const blockedDeviceAttempts = mapped.filter((event) => event.action === 'device_access_denied').length
      const sessionTakeovers = mapped.filter((event) => event.action === 'session_replaced').length
      const vaultAccessEvents = mapped.filter((event) => event.action === 'vault_unlocked' || event.action === 'vault_locked').length

      const summary = {
        securityEventCount,
        blockedDeviceAttempts,
        sessionTakeovers,
        vaultAccessEvents,
        activeDeviceCount: deviceCount,
        pendingReapprovals
      }

      const signature = `${mapped[0]?.id || 'none'}:${mapped.length}:${summary.securityEventCount}:${summary.blockedDeviceAttempts}:${summary.sessionTakeovers}:${summary.vaultAccessEvents}`
      if (signature !== lastSignature) {
        lastSignature = signature
        send('snapshot', {
          generatedAt: Date.now(),
          periodDays: days,
          summary,
          events: mapped.slice(0, 100)
        })
      }
    }

    const intervalId = setInterval(() => {
      void emitSnapshot().catch((error) => {
        request.log.error(error)
        send('error', { message: 'Stream refresh failed' })
      })
    }, 2000)

    const hardStop = setTimeout(() => {
      if (!closed) {
        send('end', { reason: 'refresh_window_complete' })
        closed = true
        clearInterval(intervalId)
        reply.raw.end()
      }
    }, 25000)

    request.raw.on('close', () => {
      closed = true
      clearInterval(intervalId)
      clearTimeout(hardStop)
    })

    send('ready', { connectedAt: Date.now() })
    void emitSnapshot().catch((error) => {
      request.log.error(error)
      send('error', { message: 'Initial stream snapshot failed' })
    })
  })

  server.get('/api/reports/export', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const validation = reportQuerySchema.safeParse(request.query as any)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid query parameters',
          details: validation.error.errors
        })
      }

      const { days, action, severity, includeSystem, includeSessionActivity, includeInformational } = validation.data
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const prisma = getPrismaClient()
      const where: any = {
        userId: user.id,
        createdAt: { gte: startDate }
      }
      if (action) where.action = action

      const rawEvents = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000
      })

      const filtered = rawEvents.filter((event) => {
        const eventSeverity = getSeverity(event.action, event.metadata as Record<string, any> | null)
        if (!includeSystem && isSystemAction(event.action)) return false
        if (!includeSessionActivity && isSessionHeartbeatAction(event.action)) return false
        if (!includeInformational && eventSeverity === 'info') return false
        return severity === 'all' ? true : eventSeverity === severity
      })

      const lines = [
        toCsvRow(['Date', 'Action', 'Severity', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Metadata']),
        ...filtered.map((event) =>
          toCsvRow([
            new Date(event.createdAt).toISOString(),
            event.action,
            getSeverity(event.action, event.metadata as Record<string, any> | null),
            event.resourceType || '',
            event.resourceId || '',
            event.ipAddress || '',
            event.userAgent || '',
            JSON.stringify(event.metadata || {})
          ])
        )
      ]

      await writeReportAudit(
        user.id,
        'report_exported',
        {
          report: 'events',
          days,
          action: action || null,
          severity,
          includeSystem,
          includeSessionActivity,
          includeInformational,
          rows: filtered.length
        },
        request.ip || (request.headers['x-forwarded-for'] as string) || undefined,
        request.headers['user-agent'] || undefined
      )

      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="safenode-report-${Date.now()}.csv"`)
      return reply.send(lines.join('\n'))
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to export report data'
      })
    }
  })
}
