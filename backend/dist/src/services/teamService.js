"use strict";
/**
 * Team Service
 * Handles team vault operations with RBAC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermissionsForRole = getPermissionsForRole;
exports.createTeam = createTeam;
exports.createTeamVault = createTeamVault;
exports.inviteTeamMember = inviteTeamMember;
exports.removeTeamMember = removeTeamMember;
exports.updateTeamMemberRole = updateTeamMemberRole;
const prisma_1 = require("../db/prisma");
const auditLogService_1 = require("./auditLogService");
const stripeService_1 = require("./stripeService");
function getPermissionsForRole(role) {
    switch (role) {
        case 'owner':
        case 'admin':
            return {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canShare: true,
                canViewAuditLogs: true
            };
        case 'manager':
            return {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canShare: true,
                canViewAuditLogs: false
            };
        case 'member':
            return {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canShare: false,
                canViewAuditLogs: false
            };
        case 'viewer':
            return {
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canShare: false,
                canViewAuditLogs: false
            };
        default:
            return {
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canShare: false,
                canViewAuditLogs: false
            };
    }
}
/**
 * Create a new team
 */
async function createTeam(userId, name, description) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Check team limits
    const teamLimit = await (0, stripeService_1.checkSubscriptionLimits)(userId, 'teamMembers');
    if (!teamLimit.allowed && teamLimit.limit !== -1) {
        throw new Error(`Team limit exceeded. Your plan allows ${teamLimit.limit} team members.`);
    }
    // Generate slug from name
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();
    // Create team
    const team = await prisma.team.create({
        data: {
            name,
            slug,
            description: description || null
        }
    });
    // Add creator as owner
    await prisma.teamMember.create({
        data: {
            teamId: team.id,
            userId,
            role: 'owner',
            joinedAt: new Date()
        }
    });
    // Log team creation
    (0, auditLogService_1.createAuditLog)({
        userId,
        action: 'team_created',
        resourceType: 'team',
        resourceId: team.id,
        metadata: { teamName: name }
    }).catch(() => { });
    return team;
}
/**
 * Create a team vault
 */
async function createTeamVault(teamId, userId, name, encryptedVault, iv, description) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Check if user is member of team
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId,
                userId
            }
        }
    });
    if (!membership) {
        throw new Error('User is not a member of this team');
    }
    const permissions = getPermissionsForRole(membership.role);
    if (!permissions.canCreate) {
        throw new Error('You do not have permission to create vaults in this team');
    }
    // Check vault limits for team owner
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            members: {
                where: { role: 'owner' },
                take: 1
            }
        }
    });
    if (team && team.members.length > 0) {
        const ownerId = team.members[0].userId;
        const vaultLimit = await (0, stripeService_1.checkSubscriptionLimits)(ownerId, 'vaults');
        if (!vaultLimit.allowed && vaultLimit.limit !== -1) {
            throw new Error(`Vault limit exceeded. Your plan allows ${vaultLimit.limit} vaults.`);
        }
    }
    // Create team vault
    const teamVault = await prisma.teamVault.create({
        data: {
            teamId,
            name,
            description: description || null,
            encryptedVault,
            iv,
            version: 1
        }
    });
    // Log vault creation
    (0, auditLogService_1.createAuditLog)({
        userId,
        action: 'entry_created',
        resourceType: 'vault',
        resourceId: teamVault.id,
        metadata: { teamId, vaultName: name }
    }).catch(() => { });
    return teamVault;
}
/**
 * Invite a user to a team
 */
async function inviteTeamMember(teamId, inviterUserId, email, role = 'member', name) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Check if inviter is member of team
    const inviter = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId,
                userId: inviterUserId
            }
        }
    });
    if (!inviter) {
        throw new Error('You are not a member of this team');
    }
    // Only owner and admin can invite
    if (inviter.role !== 'owner' && inviter.role !== 'admin') {
        throw new Error('Only owners and admins can invite members');
    }
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
    });
    if (!user) {
        throw new Error('User not found. They must have a SafeNode account first.');
    }
    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId,
                userId: user.id
            }
        }
    });
    if (existing) {
        throw new Error('User is already a member of this team');
    }
    // Check team member limit
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            members: {
                where: { role: 'owner' },
                take: 1
            }
        }
    });
    if (team && team.members.length > 0) {
        const ownerId = team.members[0].userId;
        const memberLimit = await (0, stripeService_1.checkSubscriptionLimits)(ownerId, 'teamMembers');
        const currentMembers = await prisma.teamMember.count({
            where: { teamId }
        });
        if (memberLimit.limit !== -1 && currentMembers >= memberLimit.limit) {
            throw new Error(`Team member limit exceeded. Your plan allows ${memberLimit.limit} team members.`);
        }
    }
    // Create team membership
    const membership = await prisma.teamMember.create({
        data: {
            teamId,
            userId: user.id,
            role,
            invitedBy: inviterUserId
        }
    });
    // Log team member invitation
    (0, auditLogService_1.createAuditLog)({
        userId: inviterUserId,
        action: 'team_member_added',
        resourceType: 'team',
        resourceId: teamId,
        metadata: { memberEmail: email, role }
    }).catch(() => { });
    return {
        id: membership.id,
        userId: user.id,
        email: user.email,
        name: user.displayName || name,
        role: membership.role,
        invitedAt: membership.joinedAt.getTime()
    };
}
/**
 * Remove a team member
 */
async function removeTeamMember(teamId, removerUserId, memberId) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Check if remover is member of team
    const remover = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId,
                userId: removerUserId
            }
        }
    });
    if (!remover) {
        throw new Error('You are not a member of this team');
    }
    // Get member to remove
    const member = await prisma.teamMember.findUnique({
        where: { id: memberId },
        include: { user: true }
    });
    if (!member || member.teamId !== teamId) {
        throw new Error('Team member not found');
    }
    // Cannot remove owner
    if (member.role === 'owner') {
        const ownerCount = await prisma.teamMember.count({
            where: {
                teamId,
                role: 'owner'
            }
        });
        if (ownerCount === 1) {
            throw new Error('Cannot remove the last owner');
        }
    }
    // Only owner and admin can remove members
    if (remover.role !== 'owner' && remover.role !== 'admin') {
        throw new Error('Only owners and admins can remove members');
    }
    // Remove member
    await prisma.teamMember.delete({
        where: { id: memberId }
    });
    // Log team member removal
    (0, auditLogService_1.createAuditLog)({
        userId: removerUserId,
        action: 'team_member_removed',
        resourceType: 'team',
        resourceId: teamId,
        metadata: { memberEmail: member.user.email }
    }).catch(() => { });
}
/**
 * Update team member role
 */
async function updateTeamMemberRole(teamId, updaterUserId, memberId, newRole) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Check if updater is member of team
    const updater = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: {
                teamId,
                userId: updaterUserId
            }
        }
    });
    if (!updater) {
        throw new Error('You are not a member of this team');
    }
    // Only owner and admin can update roles
    if (updater.role !== 'owner' && updater.role !== 'admin') {
        throw new Error('Only owners and admins can update member roles');
    }
    // Get member to update
    const member = await prisma.teamMember.findUnique({
        where: { id: memberId }
    });
    if (!member || member.teamId !== teamId) {
        throw new Error('Team member not found');
    }
    // Cannot change owner role
    if (member.role === 'owner' && newRole !== 'owner') {
        const ownerCount = await prisma.teamMember.count({
            where: {
                teamId,
                role: 'owner'
            }
        });
        if (ownerCount === 1) {
            throw new Error('Cannot change the last owner role');
        }
    }
    // Update role
    const updated = await prisma.teamMember.update({
        where: { id: memberId },
        data: { role: newRole },
        include: { user: true }
    });
    // Log role update
    (0, auditLogService_1.createAuditLog)({
        userId: updaterUserId,
        action: 'team_member_updated',
        resourceType: 'team',
        resourceId: teamId,
        metadata: { memberEmail: updated.user.email, oldRole: member.role, newRole }
    }).catch(() => { });
    return {
        id: updated.id,
        userId: updated.userId,
        email: updated.user.email,
        role: updated.role
    };
}
