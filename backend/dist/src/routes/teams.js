"use strict";
/**
 * Team Routes
 * Handles team vault and member management with RBAC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTeamRoutes = registerTeamRoutes;
const auth_1 = require("../middleware/auth");
const auditLogService_1 = require("../services/auditLogService");
const teamService_1 = require("../services/teamService");
const prisma_1 = require("../db/prisma");
const zod_1 = require("zod");
const createTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Team name is required').max(100, 'Team name is too long'),
    description: zod_1.z.string().optional()
});
const createTeamVaultSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Vault name is required'),
    encryptedVault: zod_1.z.string().min(1, 'Encrypted vault is required'),
    iv: zod_1.z.string().min(1, 'IV is required'),
    description: zod_1.z.string().optional()
});
const inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    role: zod_1.z.enum(['owner', 'admin', 'manager', 'member', 'viewer']).optional(),
    name: zod_1.z.string().optional()
});
const updateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['owner', 'admin', 'manager', 'member', 'viewer'])
});
/**
 * Register team routes
 */
async function registerTeamRoutes(server) {
    /**
     * POST /api/teams
     * Create a new team (requires authentication)
     */
    server.post('/api/teams', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            const validation = createTeamSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { name, description } = validation.data;
            const team = await (0, teamService_1.createTeam)(user.id, name, description);
            return {
                success: true,
                team
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to create team'
            });
        }
    });
    /**
     * GET /api/teams
     * Get all teams for current user (requires authentication)
     * Supports pagination with ?page=1&limit=20
     */
    server.get('/api/teams', {
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
            const total = await prisma.teamMember.count({
                where: { userId: user.id }
            });
            // Get paginated memberships
            const memberships = await prisma.teamMember.findMany({
                where: { userId: user.id },
                include: {
                    team: {
                        include: {
                            _count: {
                                select: {
                                    members: true,
                                    vaults: true
                                }
                            }
                        }
                    }
                },
                skip,
                take: limitNum,
                orderBy: {
                    joinedAt: 'desc'
                }
            });
            const teams = memberships.map(m => ({
                id: m.team.id,
                name: m.team.name,
                slug: m.team.slug,
                description: m.team.description,
                role: m.role,
                permissions: (0, teamService_1.getPermissionsForRole)(m.role),
                memberCount: m.team._count.members,
                vaultCount: m.team._count.vaults,
                createdAt: m.team.createdAt.getTime()
            }));
            // Add pagination headers
            const totalPages = Math.ceil(total / limitNum);
            reply.header('X-Pagination-Page', pageNum.toString());
            reply.header('X-Pagination-Limit', limitNum.toString());
            reply.header('X-Pagination-Total', total.toString());
            reply.header('X-Pagination-Total-Pages', totalPages.toString());
            reply.header('X-Pagination-Has-Next', (pageNum < totalPages).toString());
            reply.header('X-Pagination-Has-Prev', (pageNum > 1).toString());
            return {
                teams,
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
                message: 'Failed to fetch teams'
            });
        }
    });
    /**
     * GET /api/teams/:id
     * Get team details (requires authentication)
     */
    server.get('/api/teams/:id', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const prisma = (0, prisma_1.getPrismaClient)();
            // Check if user is member
            const membership = await prisma.teamMember.findUnique({
                where: {
                    teamId_userId: {
                        teamId: id,
                        userId: user.id
                    }
                },
                include: {
                    team: {
                        include: {
                            members: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            displayName: true
                                        }
                                    }
                                }
                            },
                            vaults: true
                        }
                    }
                }
            });
            if (!membership) {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: 'You are not a member of this team'
                });
            }
            const team = membership.team;
            return {
                id: team.id,
                name: team.name,
                slug: team.slug,
                description: team.description,
                role: membership.role,
                permissions: (0, teamService_1.getPermissionsForRole)(membership.role),
                members: team.members.map(m => ({
                    id: m.id,
                    userId: m.userId,
                    email: m.user.email,
                    name: m.user.displayName,
                    role: m.role,
                    joinedAt: m.joinedAt.getTime()
                })),
                vaults: team.vaults.map(v => ({
                    id: v.id,
                    name: v.name,
                    description: v.description,
                    version: v.version,
                    createdAt: v.createdAt.getTime(),
                    updatedAt: v.updatedAt.getTime()
                })),
                createdAt: team.createdAt.getTime()
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch team'
            });
        }
    });
    /**
     * POST /api/teams/:id/vaults
     * Create a team vault (requires authentication)
     */
    server.post('/api/teams/:id/vaults', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const body = request.body;
            const validation = createTeamVaultSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { name, encryptedVault, iv, description } = validation.data;
            const vault = await (0, teamService_1.createTeamVault)(id, user.id, name, encryptedVault, iv, description);
            return {
                success: true,
                vault: {
                    id: vault.id,
                    name: vault.name,
                    description: vault.description,
                    version: vault.version,
                    createdAt: vault.createdAt.getTime()
                }
            };
        }
        catch (error) {
            request.log.error(error);
            if (error.message?.includes('not a member') || error.message?.includes('permission')) {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: error.message
                });
            }
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to create team vault'
            });
        }
    });
    /**
     * POST /api/teams/:id/members
     * Invite a member to team (requires authentication)
     */
    server.post('/api/teams/:id/members', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const body = request.body;
            const validation = inviteMemberSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { email, role, name } = validation.data;
            const member = await (0, teamService_1.inviteTeamMember)(id, user.id, email, role || 'member', name);
            return {
                success: true,
                member
            };
        }
        catch (error) {
            request.log.error(error);
            if (error.message?.includes('not a member') || error.message?.includes('permission')) {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: error.message
                });
            }
            if (error.message?.includes('already a member')) {
                return reply.code(409).send({
                    error: 'duplicate',
                    message: error.message
                });
            }
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to invite team member'
            });
        }
    });
    /**
     * PUT /api/teams/:id/members/:memberId
     * Update team member role (requires authentication)
     */
    server.put('/api/teams/:id/members/:memberId', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id, memberId } = request.params;
            const body = request.body;
            const validation = updateRoleSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { role } = validation.data;
            const member = await (0, teamService_1.updateTeamMemberRole)(id, user.id, memberId, role);
            return {
                success: true,
                member
            };
        }
        catch (error) {
            request.log.error(error);
            if (error.message?.includes('not a member') || error.message?.includes('permission')) {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: error.message
                });
            }
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to update team member'
            });
        }
    });
    /**
     * DELETE /api/teams/:id/members/:memberId
     * Remove team member (requires authentication)
     */
    server.delete('/api/teams/:id/members/:memberId', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { id, memberId } = request.params;
            await (0, teamService_1.removeTeamMember)(id, user.id, memberId);
            return {
                success: true,
                message: 'Team member removed successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            if (error.message?.includes('not a member') || error.message?.includes('permission')) {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: error.message
                });
            }
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to remove team member'
            });
        }
    });
    /**
     * POST /api/teams/:teamId/vaults/:vaultId/share
     * Share a team vault with additional members or update permissions (requires authentication)
     */
    server.post('/api/teams/:teamId/vaults/:vaultId/share', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { teamId, vaultId } = request.params;
            const body = request.body;
            // Validate input
            const validation = zod_1.z.object({
                memberIds: zod_1.z.array(zod_1.z.string()).optional(),
                permissions: zod_1.z.object({
                    canView: zod_1.z.boolean().optional(),
                    canEdit: zod_1.z.boolean().optional(),
                    canDelete: zod_1.z.boolean().optional()
                }).optional()
            }).safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            // TODO: Implement vault sharing logic
            // This would involve creating vault permission entries
            return reply.code(501).send({
                error: 'not_implemented',
                message: 'Vault sharing is not yet implemented. Team vaults are accessible to all team members by default.'
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to share team vault'
            });
        }
    });
    /**
     * PUT /api/teams/:teamId/vaults/:vaultId/permissions
     * Update vault permissions for team members (requires authentication)
     */
    server.put('/api/teams/:teamId/vaults/:vaultId/permissions', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { teamId, vaultId } = request.params;
            const body = request.body;
            // Validate input
            const validation = zod_1.z.object({
                memberId: zod_1.z.string(),
                permissions: zod_1.z.object({
                    canView: zod_1.z.boolean(),
                    canEdit: zod_1.z.boolean(),
                    canDelete: zod_1.z.boolean()
                })
            }).safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            // TODO: Implement permission updates
            return reply.code(501).send({
                error: 'not_implemented',
                message: 'Vault permission updates are not yet implemented. Permissions are based on team member roles.'
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to update vault permissions'
            });
        }
    });
    /**
     * DELETE /api/teams/:teamId/vaults/:vaultId
     * Remove/delete a team vault (requires authentication)
     */
    server.delete('/api/teams/:teamId/vaults/:vaultId', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const { teamId, vaultId } = request.params;
            const prisma = (0, prisma_1.getPrismaClient)();
            // Check if user is member of team
            const membership = await prisma.teamMember.findUnique({
                where: {
                    teamId_userId: {
                        teamId,
                        userId: user.id
                    }
                }
            });
            if (!membership) {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: 'You are not a member of this team'
                });
            }
            // Only owner and admin can delete vaults
            if (membership.role !== 'owner' && membership.role !== 'admin') {
                return reply.code(403).send({
                    error: 'forbidden',
                    message: 'Only owners and admins can delete team vaults'
                });
            }
            // Check if vault exists
            const vault = await prisma.teamVault.findFirst({
                where: {
                    id: vaultId,
                    teamId
                }
            });
            if (!vault) {
                return reply.code(404).send({
                    error: 'vault_not_found',
                    message: 'Team vault not found'
                });
            }
            // Delete vault
            await prisma.teamVault.delete({
                where: { id: vaultId }
            });
            // Log vault deletion
            await (0, auditLogService_1.createAuditLog)({
                userId: user.id,
                action: 'entry_deleted',
                resourceType: 'vault',
                resourceId: vaultId,
                metadata: { teamId, vaultName: vault.name }
            }).catch(() => { });
            return {
                success: true,
                message: 'Team vault deleted successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to delete team vault'
            });
        }
    });
}
