"use strict";
/**
 * Log Aggregation Routes
 * Handles system and application log retrieval (admin-only)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogRoutes = registerLogRoutes;
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// In-memory log buffer (in production, use a proper logging service like CloudWatch, DataDog, etc.)
const logBuffer = [];
const logQuerySchema = zod_1.z.object({
    level: zod_1.z.enum(['error', 'warn', 'info', 'debug']).optional(),
    startDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    limit: zod_1.z.string().optional().transform(val => {
        const parsed = val ? parseInt(val, 10) : 100;
        return Math.min(1000, Math.max(1, parsed));
    })
});
/**
 * Check if user is admin
 * In production, implement proper admin check based on your auth system
 */
async function requireAdmin(request) {
    const user = request.user;
    if (!user) {
        throw new Error('Not authenticated');
    }
    // Check for admin privileges
    // Allow superadmin, admin, or enterprise tier users
    const isAdmin = user.role === 'superadmin' || user.role === 'admin' || user.subscriptionTier === 'enterprise';
    if (!isAdmin) {
        throw new Error('Admin access required');
    }
}
/**
 * Register log aggregation routes
 */
async function registerLogRoutes(server) {
    /**
     * GET /api/logs/system
     * Get system logs (admin-only)
     */
    server.get('/api/logs/system', {
        preHandler: [auth_1.requireAuth, requireAdmin]
    }, async (request, reply) => {
        try {
            const query = request.query;
            const validation = logQuerySchema.safeParse(query);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid query parameters',
                    details: validation.error.errors
                });
            }
            const { level, startDate, endDate, limit = 100 } = validation.data;
            // Filter logs
            let filteredLogs = [...logBuffer];
            if (level) {
                filteredLogs = filteredLogs.filter(log => log.level === level);
            }
            if (startDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate.getTime());
            }
            if (endDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate.getTime());
            }
            // Sort by timestamp (newest first) and limit
            filteredLogs = filteredLogs
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);
            return {
                logs: filteredLogs,
                count: filteredLogs.length,
                total: logBuffer.length
            };
        }
        catch (error) {
            if (error.message === 'Admin access required') {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: 'Admin access required'
                });
            }
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch system logs'
            });
        }
    });
    /**
     * GET /api/logs/application
     * Get application logs (admin-only)
     * This could read from log files or a logging service
     */
    server.get('/api/logs/application', {
        preHandler: [auth_1.requireAuth, requireAdmin]
    }, async (request, reply) => {
        try {
            const query = request.query;
            const validation = logQuerySchema.safeParse(query);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid query parameters',
                    details: validation.error.errors
                });
            }
            const { level, startDate, endDate, limit = 100 } = validation.data;
            // In production, this would query from a logging service
            // For now, return a placeholder response
            const applicationLogs = [];
            // Try to read from log file if it exists
            const logFile = path.join(process.cwd(), 'logs', 'application.log');
            if (fs.existsSync(logFile)) {
                try {
                    const logContent = fs.readFileSync(logFile, 'utf-8');
                    const lines = logContent.split('\n').filter(line => line.trim());
                    // Parse log lines (simplified - adjust based on your log format)
                    lines.forEach((line, index) => {
                        if (index >= limit)
                            return;
                        try {
                            const parsed = JSON.parse(line);
                            applicationLogs.push({
                                timestamp: parsed.time || Date.now(),
                                level: parsed.level || 'info',
                                message: parsed.msg || line,
                                component: parsed.component,
                                metadata: parsed
                            });
                        }
                        catch {
                            // If not JSON, treat as plain text
                            applicationLogs.push({
                                timestamp: Date.now(),
                                level: 'info',
                                message: line
                            });
                        }
                    });
                }
                catch (error) {
                    request.log.warn({ error }, 'Failed to read log file');
                }
            }
            // Filter logs
            let filteredLogs = applicationLogs;
            if (level) {
                filteredLogs = filteredLogs.filter(log => log.level === level);
            }
            if (startDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate.getTime());
            }
            if (endDate) {
                filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate.getTime());
            }
            // Sort by timestamp (newest first) and limit
            filteredLogs = filteredLogs
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);
            return {
                logs: filteredLogs,
                count: filteredLogs.length,
                total: applicationLogs.length,
                note: 'Log aggregation requires proper logging infrastructure. Consider integrating with CloudWatch, DataDog, or similar.'
            };
        }
        catch (error) {
            if (error.message === 'Admin access required') {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: 'Admin access required'
                });
            }
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch application logs'
            });
        }
    });
}
