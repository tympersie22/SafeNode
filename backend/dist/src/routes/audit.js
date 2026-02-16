"use strict";
/**
 * Audit Log Routes
 * Handles audit log retrieval and export
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuditRoutes = registerAuditRoutes;
const auth_1 = require("../middleware/auth");
const auditLogService_1 = require("../services/auditLogService");
const zod_1 = require("zod");
const auditQuerySchema = zod_1.z.object({
    limit: zod_1.z.string().optional().transform(val => {
        const parsed = val ? parseInt(val, 10) : 100;
        return Math.min(1000, Math.max(1, parsed)); // Max 1000 items per page
    }),
    offset: zod_1.z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
    page: zod_1.z.string().optional().transform(val => {
        const parsed = val ? parseInt(val, 10) : 1;
        return Math.max(1, parsed);
    }),
    action: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined)
});
/**
 * Register audit log routes
 */
async function registerAuditRoutes(server) {
    /**
     * GET /api/audit/logs
     * Get audit logs for current user (requires authentication)
     */
    server.get('/api/audit/logs', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const query = request.query;
            // Validate query parameters
            const validation = auditQuerySchema.safeParse(query);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid query parameters',
                    details: validation.error.errors
                });
            }
            const options = validation.data;
            const result = await (0, auditLogService_1.getUserAuditLogs)(user.id, options);
            const { logs, total } = result;
            // Calculate pagination info
            const limit = options.limit || 100;
            const offset = options.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);
            // Add pagination headers
            reply.header('X-Pagination-Page', page.toString());
            reply.header('X-Pagination-Limit', limit.toString());
            reply.header('X-Pagination-Total', total.toString());
            reply.header('X-Pagination-Total-Pages', totalPages.toString());
            reply.header('X-Pagination-Has-Next', (page < totalPages).toString());
            reply.header('X-Pagination-Has-Prev', (page > 1).toString());
            return {
                logs,
                count: logs.length,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch audit logs'
            });
        }
    });
    /**
     * GET /api/audit/export
     * Export audit logs as CSV (requires authentication)
     */
    server.get('/api/audit/export', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const query = request.query;
            const validation = auditQuerySchema.partial().safeParse(query);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid query parameters',
                    details: validation.error.errors
                });
            }
            const options = validation.data;
            const csv = await (0, auditLogService_1.exportAuditLogsCSV)(user.id, options);
            reply.header('Content-Type', 'text/csv');
            reply.header('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
            return reply.send(csv);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to export audit logs'
            });
        }
    });
    /**
     * GET /api/audit/stats
     * Get audit log statistics (requires authentication)
     */
    server.get('/api/audit/stats', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const query = request.query;
            const days = query.days ? parseInt(query.days, 10) : 30;
            if (isNaN(days) || days < 1 || days > 365) {
                return reply.code(400).send({
                    error: 'invalid_days',
                    message: 'Days must be between 1 and 365'
                });
            }
            const stats = await (0, auditLogService_1.getAuditLogStats)(user.id, days);
            return stats;
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch audit log statistics'
            });
        }
    });
}
