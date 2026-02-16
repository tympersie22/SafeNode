"use strict";
/**
 * Sync Routes
 * Handles vault synchronization and conflict resolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSyncRoutes = registerSyncRoutes;
const auth_1 = require("../middleware/auth");
const syncService_1 = require("../services/syncService");
const zod_1 = require("zod");
const conflictDetectionSchema = zod_1.z.object({
    localVersion: zod_1.z.number().int().min(0),
    localEntries: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        updatedAt: zod_1.z.number(),
        version: zod_1.z.number().optional()
    })).optional()
});
const conflictResolutionSchema = zod_1.z.object({
    resolutions: zod_1.z.array(zod_1.z.object({
        entryId: zod_1.z.string(),
        resolution: zod_1.z.enum(['accept_local', 'accept_server', 'merge', 'keep_both']),
        mergedData: zod_1.z.any().optional()
    }))
});
/**
 * Register sync routes
 */
async function registerSyncRoutes(server) {
    /**
     * GET /api/sync/status
     * Get sync status and check for conflicts (requires authentication)
     */
    server.get('/api/sync/status', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { localVersion } = request.query;
            const localVersionNum = localVersion ? parseInt(localVersion, 10) : 0;
            const status = await (0, syncService_1.getSyncStatus)(user.id, localVersionNum);
            return status;
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to get sync status'
            });
        }
    });
    /**
     * GET /api/sync/conflicts
     * Detect conflicts between local and server vault (requires authentication)
     */
    server.get('/api/sync/conflicts', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const query = request.query;
            const localVersion = query.localVersion ? parseInt(query.localVersion, 10) : 0;
            const conflicts = await (0, syncService_1.detectConflicts)(user.id, [], localVersion);
            return {
                conflicts,
                hasConflicts: conflicts.length > 0
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to detect conflicts'
            });
        }
    });
    /**
     * POST /api/sync/conflicts
     * Detect conflicts with detailed local entries (requires authentication)
     */
    server.post('/api/sync/conflicts', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            const validation = conflictDetectionSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { localVersion, localEntries = [] } = validation.data;
            // Ensure all entries have required fields
            const validEntries = localEntries.filter((entry) => typeof entry.id === 'string' && typeof entry.updatedAt === 'number');
            const conflicts = await (0, syncService_1.detectConflicts)(user.id, validEntries, localVersion);
            return {
                conflicts,
                hasConflicts: conflicts.length > 0
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to detect conflicts'
            });
        }
    });
    /**
     * POST /api/sync/resolve
     * Resolve conflicts with specified resolution strategy (requires authentication)
     */
    server.post('/api/sync/resolve', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            const validation = conflictResolutionSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { resolutions } = validation.data;
            // Ensure all resolutions have required fields
            const validResolutions = resolutions.filter((res) => typeof res.entryId === 'string' && typeof res.resolution === 'string');
            const result = await (0, syncService_1.resolveConflicts)(user.id, validResolutions);
            return {
                success: result.success,
                newVersion: result.newVersion
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to resolve conflicts'
            });
        }
    });
}
