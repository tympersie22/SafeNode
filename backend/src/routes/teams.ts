/**
 * Team Routes
 * Handles team vault and member management with RBAC
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth'
import {
  createTeam,
  createTeamVault,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  getPermissionsForRole
} from '../services/teamService'
import { getPrismaClient } from '../db/prisma'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name is too long'),
  description: z.string().optional()
})

const createTeamVaultSchema = z.object({
  name: z.string().min(1, 'Vault name is required'),
  encryptedVault: z.string().min(1, 'Encrypted vault is required'),
  iv: z.string().min(1, 'IV is required'),
  description: z.string().optional()
})

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']).optional(),
  name: z.string().optional()
})

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer'])
})

/**
 * Register team routes
 */
export async function registerTeamRoutes(server: FastifyInstance) {
  /**
   * POST /api/teams
   * Create a new team (requires authentication)
   */
  server.post('/api/teams', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      const validation = createTeamSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { name, description } = validation.data

      const team = await createTeam(user.id, name, description)

      return {
        success: true,
        team
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to create team'
      })
    }
  })

  /**
   * GET /api/teams
   * Get all teams for current user (requires authentication)
   * Supports pagination with ?page=1&limit=20
   */
  server.get('/api/teams', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const prisma = getPrismaClient()

      // Parse pagination
      const { page = 1, limit = 20 } = request.query as { page?: string; limit?: string }
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
      const skip = (pageNum - 1) * limitNum

      // Get total count
      const total = await prisma.teamMember.count({
        where: { userId: user.id }
      })

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
      })

      const teams = memberships.map(m => ({
        id: m.team.id,
        name: m.team.name,
        slug: m.team.slug,
        description: m.team.description,
        role: m.role,
        permissions: getPermissionsForRole(m.role as any),
        memberCount: m.team._count.members,
        vaultCount: m.team._count.vaults,
        createdAt: m.team.createdAt.getTime()
      }))

      // Add pagination headers
      const totalPages = Math.ceil(total / limitNum)
      reply.header('X-Pagination-Page', pageNum.toString())
      reply.header('X-Pagination-Limit', limitNum.toString())
      reply.header('X-Pagination-Total', total.toString())
      reply.header('X-Pagination-Total-Pages', totalPages.toString())
      reply.header('X-Pagination-Has-Next', (pageNum < totalPages).toString())
      reply.header('X-Pagination-Has-Prev', (pageNum > 1).toString())

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
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch teams'
      })
    }
  })

  /**
   * GET /api/teams/:id
   * Get team details (requires authentication)
   */
  server.get('/api/teams/:id', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const prisma = getPrismaClient()

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
      })

      if (!membership) {
        return reply.code(403).send({
          error: 'forbidden',
          message: 'You are not a member of this team'
        })
      }

      const team = membership.team
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        role: membership.role,
        permissions: getPermissionsForRole(membership.role as any),
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
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch team'
      })
    }
  })

  /**
   * POST /api/teams/:id/vaults
   * Create a team vault (requires authentication)
   */
  server.post('/api/teams/:id/vaults', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const body = request.body as any

      const validation = createTeamVaultSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { name, encryptedVault, iv, description } = validation.data

      const vault = await createTeamVault(id, user.id, name, encryptedVault, iv, description)

      return {
        success: true,
        vault: {
          id: vault.id,
          name: vault.name,
          description: vault.description,
          version: vault.version,
          createdAt: vault.createdAt.getTime()
        }
      }
    } catch (error: any) {
      request.log.error(error)
      
      if (error.message?.includes('not a member') || error.message?.includes('permission')) {
        return reply.code(403).send({
          error: 'forbidden',
          message: error.message
        })
      }

      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to create team vault'
      })
    }
  })

  /**
   * POST /api/teams/:id/members
   * Invite a member to team (requires authentication)
   */
  server.post('/api/teams/:id/members', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const body = request.body as any

      const validation = inviteMemberSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { email, role, name } = validation.data

      const member = await inviteTeamMember(id, user.id, email, role || 'member', name)

      return {
        success: true,
        member
      }
    } catch (error: any) {
      request.log.error(error)
      
      if (error.message?.includes('not a member') || error.message?.includes('permission')) {
        return reply.code(403).send({
          error: 'forbidden',
          message: error.message
        })
      }

      if (error.message?.includes('already a member')) {
        return reply.code(409).send({
          error: 'duplicate',
          message: error.message
        })
      }

      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to invite team member'
      })
    }
  })

  /**
   * PUT /api/teams/:id/members/:memberId
   * Update team member role (requires authentication)
   */
  server.put('/api/teams/:id/members/:memberId', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id, memberId } = request.params as { id: string; memberId: string }
      const body = request.body as any

      const validation = updateRoleSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { role } = validation.data

      const member = await updateTeamMemberRole(id, user.id, memberId, role)

      return {
        success: true,
        member
      }
    } catch (error: any) {
      request.log.error(error)
      
      if (error.message?.includes('not a member') || error.message?.includes('permission')) {
        return reply.code(403).send({
          error: 'forbidden',
          message: error.message
        })
      }

      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to update team member'
      })
    }
  })

  /**
   * DELETE /api/teams/:id/members/:memberId
   * Remove team member (requires authentication)
   */
  server.delete('/api/teams/:id/members/:memberId', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id, memberId } = request.params as { id: string; memberId: string }

      await removeTeamMember(id, user.id, memberId)

      return {
        success: true,
        message: 'Team member removed successfully'
      }
    } catch (error: any) {
      request.log.error(error)
      
      if (error.message?.includes('not a member') || error.message?.includes('permission')) {
        return reply.code(403).send({
          error: 'forbidden',
          message: error.message
        })
      }

      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to remove team member'
      })
    }
  })

  /**
   * POST /api/teams/:teamId/vaults/:vaultId/share
   * Share a team vault with additional members or update permissions (requires authentication)
   */
  server.post('/api/teams/:teamId/vaults/:vaultId/share', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { teamId, vaultId } = request.params as { teamId: string; vaultId: string }
      const body = request.body as any

      // Validate input
      const validation = z.object({
        memberIds: z.array(z.string()).optional(),
        permissions: z.object({
          canView: z.boolean().optional(),
          canEdit: z.boolean().optional(),
          canDelete: z.boolean().optional()
        }).optional()
      }).safeParse(body)

      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      // TODO: Implement vault sharing logic
      // This would involve creating vault permission entries
      return reply.code(501).send({
        error: 'not_implemented',
        message: 'Vault sharing is not yet implemented. Team vaults are accessible to all team members by default.'
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to share team vault'
      })
    }
  })

  /**
   * PUT /api/teams/:teamId/vaults/:vaultId/permissions
   * Update vault permissions for team members (requires authentication)
   */
  server.put('/api/teams/:teamId/vaults/:vaultId/permissions', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { teamId, vaultId } = request.params as { teamId: string; vaultId: string }
      const body = request.body as any

      // Validate input
      const validation = z.object({
        memberId: z.string(),
        permissions: z.object({
          canView: z.boolean(),
          canEdit: z.boolean(),
          canDelete: z.boolean()
        })
      }).safeParse(body)

      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      // TODO: Implement permission updates
      return reply.code(501).send({
        error: 'not_implemented',
        message: 'Vault permission updates are not yet implemented. Permissions are based on team member roles.'
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to update vault permissions'
      })
    }
  })

  /**
   * DELETE /api/teams/:teamId/vaults/:vaultId
   * Remove/delete a team vault (requires authentication)
   */
  server.delete('/api/teams/:teamId/vaults/:vaultId', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { teamId, vaultId } = request.params as { teamId: string; vaultId: string }
      const prisma = getPrismaClient()

      // Check if user is member of team
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id
          }
        }
      })

      if (!membership) {
        return reply.code(403).send({
          error: 'forbidden',
          message: 'You are not a member of this team'
        })
      }

      // Only owner and admin can delete vaults
      if (membership.role !== 'owner' && membership.role !== 'admin') {
        return reply.code(403).send({
          error: 'forbidden',
          message: 'Only owners and admins can delete team vaults'
        })
      }

      // Check if vault exists
      const vault = await prisma.teamVault.findFirst({
        where: {
          id: vaultId,
          teamId
        }
      })

      if (!vault) {
        return reply.code(404).send({
          error: 'vault_not_found',
          message: 'Team vault not found'
        })
      }

      // Delete vault
      await prisma.teamVault.delete({
        where: { id: vaultId }
      })

      // Log vault deletion
      await createAuditLog({
        userId: user.id,
        action: 'entry_deleted',
        resourceType: 'vault',
        resourceId: vaultId,
        metadata: { teamId, vaultName: vault.name }
      }).catch(() => {})

      return {
        success: true,
        message: 'Team vault deleted successfully'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to delete team vault'
      })
    }
  })
}

