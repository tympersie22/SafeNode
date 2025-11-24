/**
 * Team Service Tests
 * Unit tests for team management and RBAC
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { 
  createTeam, 
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  getPermissionsForRole
} from '../src/services/teamService'
import { getPrismaClient } from '../src/db/prisma'
import { createUser } from '../src/services/userService'

describe('Team Service', () => {
  let ownerId: string
  let memberId: string

  beforeEach(async () => {
    ownerId = (await createUser({
      email: `owner-${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Team Owner'
    })).id

    memberId = (await createUser({
      email: `member-${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Team Member'
    })).id
  })

  describe('getPermissionsForRole', () => {
    it('should return correct permissions for owner', () => {
      const perms = getPermissionsForRole('owner')
      expect(perms.canCreate).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canDelete).toBe(true)
      expect(perms.canShare).toBe(true)
      expect(perms.canViewAuditLogs).toBe(true)
    })

    it('should return correct permissions for admin', () => {
      const perms = getPermissionsForRole('admin')
      expect(perms.canCreate).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canDelete).toBe(true)
      expect(perms.canShare).toBe(true)
      expect(perms.canViewAuditLogs).toBe(true)
    })

    it('should return correct permissions for manager', () => {
      const perms = getPermissionsForRole('manager')
      expect(perms.canCreate).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canDelete).toBe(false)
      expect(perms.canShare).toBe(true)
      expect(perms.canViewAuditLogs).toBe(false)
    })

    it('should return correct permissions for member', () => {
      const perms = getPermissionsForRole('member')
      expect(perms.canCreate).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canDelete).toBe(false)
      expect(perms.canShare).toBe(false)
      expect(perms.canViewAuditLogs).toBe(false)
    })

    it('should return correct permissions for viewer', () => {
      const perms = getPermissionsForRole('viewer')
      expect(perms.canCreate).toBe(false)
      expect(perms.canEdit).toBe(false)
      expect(perms.canDelete).toBe(false)
      expect(perms.canShare).toBe(false)
      expect(perms.canViewAuditLogs).toBe(false)
    })
  })

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      const team = await createTeam(ownerId, 'Test Team', 'Test Description')
      
      expect(team).toHaveProperty('id')
      expect(team.name).toBe('Test Team')
      expect(team.description).toBe('Test Description')
      expect(team.slug).toBeDefined()
    })

    it('should add creator as owner', async () => {
      const team = await createTeam(ownerId, 'Test Team')
      const prisma = getPrismaClient()
      const members = await prisma.teamMember.findMany({
        where: { teamId: team.id }
      })
      
      const owner = members.find(m => m.userId === ownerId)
      expect(owner).toBeDefined()
      expect(owner?.role).toBe('owner')
    })

    it('should generate unique slug', async () => {
      const team1 = await createTeam(ownerId, 'Test Team')
      const team2 = await createTeam(ownerId, 'Test Team')
      
      expect(team1.slug).not.toBe(team2.slug)
    })
  })

  describe('getTeam', () => {
    it('should retrieve team by ID', async () => {
      const team = await createTeam(ownerId, 'Test Team')
      const prisma = getPrismaClient()
      const retrieved = await prisma.team.findUnique({
        where: { id: team.id }
      })
      
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(team.id)
      expect(retrieved?.name).toBe('Test Team')
    })
  })

  describe('inviteTeamMember', () => {
    it('should invite a member to team', async () => {
      const team = await createTeam(ownerId, 'Test Team')
      const memberUser = await createUser({
        email: `invite-${Date.now()}@example.com`,
        password: 'Password123!'
      })
      
      const member = await inviteTeamMember(team.id, ownerId, memberUser.email, 'member')
      
      expect(member).toHaveProperty('id')
      expect(member.userId).toBe(memberUser.id)
      expect(member.role).toBe('member')
    })

    it('should not allow duplicate members', async () => {
      const team = await createTeam(ownerId, 'Test Team')
      const memberUser = await createUser({
        email: `duplicate-${Date.now()}@example.com`,
        password: 'Password123!'
      })
      
      await inviteTeamMember(team.id, ownerId, memberUser.email, 'member')
      
      await expect(
        inviteTeamMember(team.id, ownerId, memberUser.email, 'member')
      ).rejects.toThrow()
    })
  })

  describe('updateTeamMemberRole', () => {
    it('should update member role', async () => {
      const team = await createTeam(ownerId, 'Test Team')
      const memberUser = await createUser({
        email: `updaterole-${Date.now()}@example.com`,
        password: 'Password123!'
      })
      
      await inviteTeamMember(team.id, ownerId, memberUser.email, 'member')
      
      const prisma = getPrismaClient()
      const member = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: memberUser.id }
      })
      
      const updated = await updateTeamMemberRole(team.id, member!.id, 'manager', ownerId)
      
      expect(updated.role).toBe('manager')
    })
  })

  describe('removeTeamMember', () => {
    it('should remove member from team', async () => {
      const team = await createTeam(ownerId, 'Test Team')
      const memberUser = await createUser({
        email: `remove-${Date.now()}@example.com`,
        password: 'Password123!'
      })
      
      await inviteTeamMember(team.id, ownerId, memberUser.email, 'member')
      
      const prisma = getPrismaClient()
      const member = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: memberUser.id }
      })
      
      await removeTeamMember(team.id, ownerId, member!.id)
      
      const remaining = await prisma.teamMember.findUnique({
        where: { id: member!.id }
      })
      expect(remaining).toBeNull()
    })
  })
})

