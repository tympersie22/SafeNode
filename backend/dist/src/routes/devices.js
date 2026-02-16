"use strict";
/**
 * Device Routes
 * Handles device registration and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeviceRoutes = registerDeviceRoutes;
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../db/prisma");
const stripeService_1 = require("../services/stripeService");
const auditLogService_1 = require("../services/auditLogService");
const zod_1 = require("zod");
const registerDeviceSchema = zod_1.z.object({
    deviceId: zod_1.z.string().min(1, 'Device ID is required'),
    name: zod_1.z.string().min(1, 'Device name is required'),
    platform: zod_1.z.enum(['web', 'desktop', 'mobile'], {
        errorMap: () => ({ message: 'Platform must be web, desktop, or mobile' })
    })
});
/**
 * Register device routes
 */
async function registerDeviceRoutes(server) {
    /**
     * POST /api/devices/register
     * Register a new device (requires authentication)
     */
    server.post('/api/devices/register', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            // Validate input
            const validation = registerDeviceSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { deviceId, name, platform } = validation.data;
            // Check device limit
            const deviceLimit = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'devices');
            if (!deviceLimit.allowed && deviceLimit.limit !== -1) {
                return reply.code(403).send({
                    error: 'device_limit_exceeded',
                    message: `Device limit exceeded. Your plan allows ${deviceLimit.limit} devices.`,
                    current: deviceLimit.current,
                    limit: deviceLimit.limit
                });
            }
            const prisma = (0, prisma_1.getPrismaClient)();
            // Check if device already exists
            const existing = await prisma.device.findUnique({
                where: {
                    userId_deviceId: {
                        userId: user.id,
                        deviceId
                    }
                }
            });
            if (existing) {
                // Update last seen
                const updated = await prisma.device.update({
                    where: { id: existing.id },
                    data: {
                        lastSeen: new Date(),
                        isActive: true,
                        name: name || existing.name
                    }
                });
                return {
                    success: true,
                    device: {
                        id: updated.id,
                        deviceId: updated.deviceId,
                        name: updated.name,
                        platform: updated.platform,
                        lastSeen: updated.lastSeen.getTime(),
                        registeredAt: updated.registeredAt.getTime()
                    }
                };
            }
            // Create new device
            const device = await prisma.device.create({
                data: {
                    userId: user.id,
                    deviceId,
                    name,
                    platform,
                    lastSeen: new Date(),
                    registeredAt: new Date(),
                    isActive: true
                }
            });
            // Log device registration
            (0, auditLogService_1.createAuditLog)({
                userId: user.id,
                action: 'device_registered',
                resourceType: 'device',
                resourceId: device.id,
                metadata: { deviceName: name, platform },
                ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                userAgent: request.headers['user-agent'] || undefined
            }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
            return {
                success: true,
                device: {
                    id: device.id,
                    deviceId: device.deviceId,
                    name: device.name,
                    platform: device.platform,
                    lastSeen: device.lastSeen.getTime(),
                    registeredAt: device.registeredAt.getTime()
                }
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to register device'
            });
        }
    });
    /**
     * GET /api/devices
     * Get all devices for current user (requires authentication)
     * Supports pagination with ?page=1&limit=20
     */
    server.get('/api/devices', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const prisma = (0, prisma_1.getPrismaClient)();
            // Parse pagination
            const { page = 1, limit = 20 } = request.query;
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
            const skip = (pageNum - 1) * limitNum;
            // Get total count
            const total = await prisma.device.count({
                where: {
                    userId: user.id,
                    isActive: true
                }
            });
            // Get paginated devices
            const devices = await prisma.device.findMany({
                where: {
                    userId: user.id,
                    isActive: true
                },
                orderBy: {
                    lastSeen: 'desc'
                },
                skip,
                take: limitNum
            });
            // Add pagination headers
            const totalPages = Math.ceil(total / limitNum);
            reply.header('X-Pagination-Page', pageNum.toString());
            reply.header('X-Pagination-Limit', limitNum.toString());
            reply.header('X-Pagination-Total', total.toString());
            reply.header('X-Pagination-Total-Pages', totalPages.toString());
            reply.header('X-Pagination-Has-Next', (pageNum < totalPages).toString());
            reply.header('X-Pagination-Has-Prev', (pageNum > 1).toString());
            return {
                devices: devices.map(device => ({
                    id: device.id,
                    deviceId: device.deviceId,
                    name: device.name,
                    platform: device.platform,
                    lastSeen: device.lastSeen.getTime(),
                    registeredAt: device.registeredAt.getTime()
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch devices'
            });
        }
    });
    /**
     * DELETE /api/devices/:id
     * Remove a device (requires authentication)
     */
    server.delete('/api/devices/:id', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const prisma = (0, prisma_1.getPrismaClient)();
            // Check if device belongs to user
            const device = await prisma.device.findFirst({
                where: {
                    id,
                    userId: user.id
                }
            });
            if (!device) {
                return reply.code(404).send({
                    error: 'device_not_found',
                    message: 'Device not found'
                });
            }
            // Deactivate device (soft delete)
            await prisma.device.update({
                where: { id },
                data: {
                    isActive: false
                }
            });
            // Log device removal
            (0, auditLogService_1.createAuditLog)({
                userId: user.id,
                action: 'device_removed',
                resourceType: 'device',
                resourceId: device.id,
                metadata: { deviceName: device.name },
                ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                userAgent: request.headers['user-agent'] || undefined
            }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
            return {
                success: true,
                message: 'Device removed successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to remove device'
            });
        }
    });
    /**
     * GET /api/devices/check-limit
     * Check device limit for current user (requires authentication)
     */
    server.get('/api/devices/check-limit', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const prisma = (0, prisma_1.getPrismaClient)();
            // Check device limit
            const deviceLimit = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'devices');
            // Get current device count
            const currentCount = await prisma.device.count({
                where: {
                    userId: user.id,
                    isActive: true
                }
            });
            return {
                allowed: deviceLimit.allowed,
                current: currentCount,
                limit: deviceLimit.limit,
                canAddMore: deviceLimit.allowed || deviceLimit.limit === -1,
                remaining: deviceLimit.limit === -1 ? -1 : Math.max(0, deviceLimit.limit - currentCount)
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to check device limit'
            });
        }
    });
}
