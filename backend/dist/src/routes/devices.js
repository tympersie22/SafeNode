"use strict";
/**
 * Device Routes
 * Handles device registration and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeviceRoutes = registerDeviceRoutes;
const auth_1 = require("../middleware/auth");
const deviceAccess_1 = require("../middleware/deviceAccess");
const prisma_1 = require("../db/prisma");
const stripeService_1 = require("../services/stripeService");
const auditLogService_1 = require("../services/auditLogService");
const userService_1 = require("../services/userService");
const deviceSessionService_1 = require("../services/deviceSessionService");
const zod_1 = require("zod");
const PLAN_NAMES = {
    free: 'Free',
    individual: 'Personal',
    family: 'Family',
    teams: 'Teams'
};
const NEXT_PLAN = {
    free: 'individual',
    individual: 'family',
    family: 'teams',
    teams: null
};
function getPlanUpgradeGuidance(plan, current, limit) {
    const recommendedPlan = NEXT_PLAN[plan];
    if (!recommendedPlan) {
        return {
            recommendedPlan: null,
            recommendedPlanName: null,
            message: `${PLAN_NAMES[plan]} allows up to ${limit} registered devices and your account is already at ${current}/${limit}. Remove an existing device to register this one.`
        };
    }
    return {
        recommendedPlan,
        recommendedPlanName: PLAN_NAMES[recommendedPlan],
        message: `${PLAN_NAMES[plan]} allows up to ${limit} registered device${limit === 1 ? '' : 's'}. Your account is already at ${current}/${limit}. Upgrade to ${PLAN_NAMES[recommendedPlan]} to add more devices.`
    };
}
async function resolveEffectivePlan(userId, subscriptionTier) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const activeSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: {
                in: ['active', 'trialing', 'past_due']
            }
        },
        orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }]
    });
    const priceId = activeSubscription?.stripePriceId || '';
    const byPlan = [
        ['individual', [process.env.PADDLE_PRICE_INDIVIDUAL_MONTHLY || '', process.env.PADDLE_PRICE_INDIVIDUAL_ANNUAL || '', process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || '', process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL || '', process.env.STRIPE_PRICE_INDIVIDUAL || ''].filter(Boolean)],
        ['family', [process.env.PADDLE_PRICE_FAMILY_MONTHLY || '', process.env.PADDLE_PRICE_FAMILY_ANNUAL || '', process.env.STRIPE_PRICE_FAMILY_MONTHLY || '', process.env.STRIPE_PRICE_FAMILY_ANNUAL || '', process.env.STRIPE_PRICE_FAMILY || ''].filter(Boolean)],
        ['teams', [process.env.PADDLE_PRICE_TEAMS_MONTHLY || '', process.env.PADDLE_PRICE_TEAMS_ANNUAL || '', process.env.STRIPE_PRICE_TEAMS_MONTHLY || '', process.env.STRIPE_PRICE_TEAMS_ANNUAL || '', process.env.STRIPE_PRICE_TEAMS || ''].filter(Boolean)]
    ];
    for (const [plan, ids] of byPlan) {
        if (ids.includes(priceId))
            return plan;
    }
    if (subscriptionTier === 'enterprise')
        return 'teams';
    if (subscriptionTier === 'pro')
        return 'individual';
    return 'free';
}
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
                if (existing.requiresReapproval) {
                    (0, auditLogService_1.createAuditLog)({
                        userId: user.id,
                        action: 'device_reapproval_required',
                        resourceType: 'device',
                        resourceId: existing.id,
                        metadata: { deviceId: existing.deviceId, deviceName: existing.name },
                        ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                        userAgent: request.headers['user-agent'] || undefined
                    }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
                    return reply.code(403).send({
                        error: 'device_reapproval_required',
                        code: 'DEVICE_REAPPROVAL_REQUIRED',
                        message: 'This device was previously removed and must be re-approved from a trusted device before it can be used again.'
                    });
                }
                // Update last seen
                const updated = await prisma.device.update({
                    where: { id: existing.id },
                    data: {
                        lastSeen: new Date(),
                        isActive: true,
                        name: name || existing.name,
                        removedAt: null
                    }
                });
                if (user.sessionId) {
                    await (0, deviceSessionService_1.bindSessionToDevice)(user.sessionId, user.id, updated.deviceId);
                }
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
            // Only enforce the subscription cap when creating a new device record.
            const deviceLimit = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'devices');
            if (!deviceLimit.allowed && deviceLimit.limit !== -1) {
                // Safety migration path:
                // If user is on a strict single-device plan (1/1), allow replacing the lone active web device.
                // This prevents lockouts when browser origin changes (e.g. www -> apex) but user remains on same machine.
                if (deviceLimit.limit === 1 && platform === 'web') {
                    const activeDevices = await prisma.device.findMany({
                        where: {
                            userId: user.id,
                            isActive: true
                        },
                        orderBy: {
                            lastSeen: 'desc'
                        },
                        take: 2
                    });
                    const lone = activeDevices.length === 1 ? activeDevices[0] : null;
                    if (lone && lone.platform === 'web' && !lone.requiresReapproval) {
                        const oldDeviceId = lone.deviceId;
                        const migrated = await prisma.device.update({
                            where: { id: lone.id },
                            data: {
                                deviceId,
                                name,
                                platform,
                                isActive: true,
                                requiresReapproval: false,
                                removedAt: null,
                                lastSeen: new Date()
                            }
                        });
                        await (0, deviceSessionService_1.revokeDeviceSessions)(user.id, oldDeviceId, 'device_id_migrated');
                        if (user.sessionId) {
                            await (0, deviceSessionService_1.bindSessionToDevice)(user.sessionId, user.id, migrated.deviceId);
                        }
                        (0, auditLogService_1.createAuditLog)({
                            userId: user.id,
                            action: 'device_registered',
                            resourceType: 'device',
                            resourceId: migrated.id,
                            metadata: {
                                migratedFromDeviceId: oldDeviceId,
                                migratedToDeviceId: migrated.deviceId,
                                migrationReason: 'single_device_origin_change',
                                platform
                            },
                            ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                            userAgent: request.headers['user-agent'] || undefined
                        }).catch(err => request.log.warn({ error: err }, 'Failed to create device migration audit log'));
                        return {
                            success: true,
                            migrated: true,
                            device: {
                                id: migrated.id,
                                deviceId: migrated.deviceId,
                                name: migrated.name,
                                platform: migrated.platform,
                                lastSeen: migrated.lastSeen.getTime(),
                                registeredAt: migrated.registeredAt.getTime()
                            }
                        };
                    }
                }
                const userRecord = await (0, userService_1.findUserById)(user.id);
                const currentPlan = await resolveEffectivePlan(user.id, userRecord?.subscriptionTier || 'free');
                const guidance = getPlanUpgradeGuidance(currentPlan, deviceLimit.current, deviceLimit.limit);
                return reply.code(403).send({
                    error: 'device_limit_exceeded',
                    message: guidance.message,
                    currentPlan,
                    currentPlanName: PLAN_NAMES[currentPlan],
                    recommendedPlan: guidance.recommendedPlan,
                    recommendedPlanName: guidance.recommendedPlanName,
                    current: deviceLimit.current,
                    limit: deviceLimit.limit
                });
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
                    isActive: true,
                    requiresReapproval: false,
                    removedAt: null
                }
            });
            if (user.sessionId) {
                await (0, deviceSessionService_1.bindSessionToDevice)(user.sessionId, user.id, device.deviceId);
            }
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
        preHandler: [auth_1.requireAuth, deviceAccess_1.requireRegisteredDevice]
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
            const pendingApprovals = await prisma.device.findMany({
                where: {
                    userId: user.id,
                    isActive: false,
                    requiresReapproval: true
                },
                orderBy: {
                    removedAt: 'desc'
                },
                take: 20
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
                    registeredAt: device.registeredAt.getTime(),
                    requiresReapproval: device.requiresReapproval
                })),
                pendingApprovals: pendingApprovals.map(device => ({
                    id: device.id,
                    deviceId: device.deviceId,
                    name: device.name,
                    platform: device.platform,
                    lastSeen: device.lastSeen.getTime(),
                    registeredAt: device.registeredAt.getTime(),
                    removedAt: device.removedAt?.getTime() || null,
                    requiresReapproval: device.requiresReapproval
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
        preHandler: [auth_1.requireAuth, deviceAccess_1.requireRegisteredDevice]
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
            if (device.deviceId === user.sessionDeviceId) {
                return reply.code(400).send({
                    error: 'cannot_remove_current_device',
                    message: 'You cannot remove the device tied to your current active session. Sign in from another device first if you need to revoke this one.'
                });
            }
            // Deactivate device (soft delete)
            await prisma.device.update({
                where: { id },
                data: {
                    isActive: false,
                    requiresReapproval: true,
                    removedAt: new Date()
                }
            });
            const revokedSessions = await (0, deviceSessionService_1.revokeDeviceSessions)(user.id, device.deviceId, 'device_removed');
            // Log device removal
            (0, auditLogService_1.createAuditLog)({
                userId: user.id,
                action: 'device_removed',
                resourceType: 'device',
                resourceId: device.id,
                metadata: { deviceName: device.name, revokedSessions },
                ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                userAgent: request.headers['user-agent'] || undefined
            }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
            if (revokedSessions > 0) {
                (0, auditLogService_1.createAuditLog)({
                    userId: user.id,
                    action: 'session_revoked',
                    resourceType: 'session',
                    resourceId: device.deviceId,
                    metadata: {
                        reason: 'device_removed',
                        revokedSessions,
                        deviceId: device.deviceId
                    },
                    ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                    userAgent: request.headers['user-agent'] || undefined
                }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
            }
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
        preHandler: [auth_1.requireAuth, deviceAccess_1.requireRegisteredDevice]
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
    server.post('/api/devices/:id/approve', {
        preHandler: [auth_1.requireAuth, deviceAccess_1.requireRegisteredDevice]
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const prisma = (0, prisma_1.getPrismaClient)();
            if (!user.sessionDeviceId) {
                return reply.code(403).send({
                    error: 'device_access_denied',
                    code: 'CURRENT_SESSION_NOT_TRUSTED',
                    message: 'Approve this device from a currently trusted session.'
                });
            }
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
            if (!device.requiresReapproval) {
                return {
                    success: true,
                    message: 'Device is already approved'
                };
            }
            await prisma.device.update({
                where: { id: device.id },
                data: {
                    isActive: true,
                    requiresReapproval: false,
                    removedAt: null,
                    lastSeen: new Date()
                }
            });
            (0, auditLogService_1.createAuditLog)({
                userId: user.id,
                action: 'device_reapproved',
                resourceType: 'device',
                resourceId: device.id,
                metadata: {
                    approvedFromDeviceId: user.sessionDeviceId,
                    reapprovedDeviceId: device.deviceId,
                    reapprovedDeviceName: device.name
                },
                ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                userAgent: request.headers['user-agent'] || undefined
            }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
            return {
                success: true,
                message: 'Device approved successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to approve device'
            });
        }
    });
}
