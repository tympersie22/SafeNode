"use strict";
/**
 * Audit Log Service
 * Handles audit logging for security and compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.bulkCreateAuditLogs = bulkCreateAuditLogs;
exports.getUserAuditLogs = getUserAuditLogs;
exports.getBulkAuditLogs = getBulkAuditLogs;
exports.exportAuditLogsCSV = exportAuditLogsCSV;
exports.getAuditLogStats = getAuditLogStats;
const prisma_1 = require("../db/prisma");
/**
 * Create an audit log entry
 * Includes structured logging with DB context for debugging
 */
async function createAuditLog(entry) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const dbUrl = process.env.DATABASE_URL || 'not_set';
    const dbUrlHash = dbUrl ? require('crypto').createHash('sha256').update(dbUrl).digest('hex').substring(0, 8) : 'unknown';
    try {
        // Check if user exists before creating audit log (prevents foreign key errors)
        // This can happen if database is reseeded and old tokens reference deleted users
        if (entry.userId && entry.userId !== 'anonymous') {
            const userExists = await prisma.user.findUnique({
                where: { id: entry.userId },
                select: { id: true }
            });
            // If user doesn't exist, log structured error with context
            if (!userExists) {
                const errorContext = {
                    tokenSub: entry.userId,
                    dbUrlHash,
                    schema: 'public',
                    action: entry.action,
                    reason: 'user_not_found'
                };
                console.error('Skipping audit log - user not found:', JSON.stringify(errorContext));
                return;
            }
        }
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
        });
    }
    catch (error) {
        // Don't throw - audit logging should not break the application
        // Log structured error with DB context
        const errorContext = {
            error: error?.message,
            code: error?.code,
            tokenSub: entry.userId,
            dbUrlHash,
            schema: 'public',
            action: entry.action
        };
        console.error('Failed to create audit log:', JSON.stringify(errorContext));
    }
}
/**
 * Bulk create audit logs (for batch operations)
 */
async function bulkCreateAuditLogs(entries) {
    const prisma = (0, prisma_1.getPrismaClient)();
    try {
        await prisma.auditLog.createMany({
            data: entries.map(entry => ({
                userId: entry.userId,
                action: entry.action,
                resourceType: entry.resourceType || null,
                resourceId: entry.resourceId || null,
                metadata: entry.metadata || null,
                ipAddress: entry.ipAddress || null,
                userAgent: entry.userAgent || null,
                createdAt: new Date()
            })),
            skipDuplicates: true
        });
    }
    catch (error) {
        // Don't throw - audit logging should not break the application
        console.error('Failed to bulk create audit logs:', error);
    }
}
/**
 * Get audit logs for a user
 * Returns logs with total count for pagination
 */
async function getUserAuditLogs(userId, options) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const where = {
        userId
    };
    if (options?.action) {
        where.action = options.action;
    }
    if (options?.startDate || options?.endDate) {
        where.createdAt = {};
        if (options.startDate) {
            where.createdAt.gte = options.startDate;
        }
        if (options.endDate) {
            where.createdAt.lte = options.endDate;
        }
    }
    // Get total count for pagination
    const total = await prisma.auditLog.count({ where });
    // Get paginated logs
    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        take: options?.limit || 100,
        skip: options?.offset || 0
    });
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
    };
}
/**
 * Bulk query audit logs for multiple users (admin only)
 * Useful for team-wide audit reports
 */
async function getBulkAuditLogs(userIds, options) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const where = {
        userId: {
            in: userIds
        }
    };
    if (options?.action) {
        where.action = options.action;
    }
    if (options?.startDate || options?.endDate) {
        where.createdAt = {};
        if (options.startDate) {
            where.createdAt.gte = options.startDate;
        }
        if (options.endDate) {
            where.createdAt.lte = options.endDate;
        }
    }
    // Get total count
    const total = await prisma.auditLog.count({ where });
    // Get paginated logs
    const logs = await prisma.auditLog.findMany({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        take: options?.limit || 100,
        skip: options?.offset || 0
    });
    return {
        logs: logs.map(log => ({
            id: log.id,
            userId: log.userId,
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            metadata: log.metadata,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            createdAt: log.createdAt.getTime()
        })),
        total
    };
}
/**
 * Export audit logs as CSV
 */
async function exportAuditLogsCSV(userId, options) {
    const result = await getUserAuditLogs(userId, {
        ...options,
        limit: 10000 // Large limit for export
    });
    const logs = result.logs;
    // CSV headers
    const headers = ['Date', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Metadata'];
    // CSV rows
    const rows = logs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.resourceType || '',
        log.resourceId || '',
        log.ipAddress || '',
        log.userAgent || '',
        JSON.stringify(log.metadata || {})
    ]);
    // Combine headers and rows
    const csvRows = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ];
    return csvRows.join('\n');
}
/**
 * Get audit log statistics
 */
async function getAuditLogStats(userId, days = 30) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
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
    });
    // Count by action type
    const actionsByType = {};
    logs.forEach(log => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
    });
    // Count by date
    const logsByDateMap = {};
    logs.forEach(log => {
        const date = log.createdAt.toISOString().split('T')[0];
        logsByDateMap[date] = (logsByDateMap[date] || 0) + 1;
    });
    const logsByDate = Object.entries(logsByDateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    return {
        totalLogs: logs.length,
        actionsByType,
        logsByDate
    };
}
