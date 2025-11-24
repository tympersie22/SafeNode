/**
 * Audit Log Service
 * Handles audit logging for security and compliance
 */

import { getPrismaClient } from '../db/prisma'

export interface AuditLogEntry {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'entry_created'
  | 'entry_updated'
  | 'entry_deleted'
  | 'vault_unlocked'
  | 'vault_locked'
  | 'vault_exported'
  | 'vault_imported'
  | 'device_registered'
  | 'device_removed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'password_changed'
  | 'email_verified'
  | 'backup_created'
  | 'backup_restored'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'team_created'
  | 'team_member_added'
  | 'team_member_removed'

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  const prisma = getPrismaClient()

  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType || null,
        resourceId: entry.resourceId || null,
        metadata: entry.metadata || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        createdAt: new Date()
      }
    })
  } catch (error) {
    // Don't throw - audit logging should not break the application
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Get audit logs for a user
 * Returns logs with total count for pagination
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    action?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<{ logs: any[]; total: number }> {
  const prisma = getPrismaClient()

  const where: any = {
    userId
  }

  if (options?.action) {
    where.action = options.action
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {}
    if (options.startDate) {
      where.createdAt.gte = options.startDate
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate
    }
  }

  // Get total count for pagination
  const total = await prisma.auditLog.count({ where })

  // Get paginated logs
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    take: options?.limit || 100,
    skip: options?.offset || 0
  })

  return {
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.getTime()
    })),
    total
  }
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsCSV(
  userId: string,
  options?: {
    startDate?: Date
    endDate?: Date
    action?: string
  }
): Promise<string> {
  const result = await getUserAuditLogs(userId, {
    ...options,
    limit: 10000 // Large limit for export
  })
  const logs = result.logs

  // CSV headers
  const headers = ['Date', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Metadata']
  
  // CSV rows
  const rows = logs.map(log => [
    new Date(log.createdAt).toISOString(),
    log.action,
    log.resourceType || '',
    log.resourceId || '',
    log.ipAddress || '',
    log.userAgent || '',
    JSON.stringify(log.metadata || {})
  ])

  // Combine headers and rows
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ]

  return csvRows.join('\n')
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(userId: string, days: number = 30): Promise<{
  totalLogs: number
  actionsByType: Record<string, number>
  logsByDate: Array<{ date: string; count: number }>
}> {
  const prisma = getPrismaClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Count by action type
  const actionsByType: Record<string, number> = {}
  logs.forEach(log => {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
  })

  // Count by date
  const logsByDateMap: Record<string, number> = {}
  logs.forEach(log => {
    const date = log.createdAt.toISOString().split('T')[0]
    logsByDateMap[date] = (logsByDateMap[date] || 0) + 1
  })

  const logsByDate = Object.entries(logsByDateMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalLogs: logs.length,
    actionsByType,
    logsByDate
  }
}

