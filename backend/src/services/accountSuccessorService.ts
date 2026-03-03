import { createHash, randomBytes } from 'crypto'
import { getPrismaClient } from '../db/prisma'
import { findUserByEmail, findUserById } from './userService'
import { createAuditLog } from './auditLogService'
import { emailService } from './emailService'
import { hashPassword } from '../utils/password'

const DEFAULT_WAITING_DAYS = 14
const CLAIM_TOKEN_TTL_DAYS = 30

export interface SuccessorSummary {
  ownerUserId: string
  successorEmail: string
  successorName?: string | null
  relationshipLabel?: string | null
  note?: string | null
  waitingPeriodDays: number
  status: string
  claimRequestedAt?: string | null
  claimAvailableAt?: string | null
  claimedAt?: string | null
  createdAt: string
  updatedAt: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function serialize(record: any): SuccessorSummary {
  return {
    ownerUserId: record.ownerUserId,
    successorEmail: record.successorEmail,
    successorName: record.successorName,
    relationshipLabel: record.relationshipLabel,
    note: record.note,
    waitingPeriodDays: record.waitingPeriodDays,
    status: record.status,
    claimRequestedAt: record.claimRequestedAt?.toISOString() || null,
    claimAvailableAt: record.claimAvailableAt?.toISOString() || null,
    claimedAt: record.claimedAt?.toISOString() || null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  }
}

function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function getAccountSuccessor(ownerUserId: string): Promise<SuccessorSummary | null> {
  const prisma = getPrismaClient()
  const record = await prisma.accountSuccessor.findUnique({
    where: { ownerUserId }
  })

  return record ? serialize(record) : null
}

export async function upsertAccountSuccessor(
  ownerUserId: string,
  input: {
    successorEmail: string
    successorName?: string
    relationshipLabel?: string
    note?: string
    waitingPeriodDays?: number
  }
): Promise<SuccessorSummary> {
  const prisma = getPrismaClient()
  const owner = await findUserById(ownerUserId)
  if (!owner) {
    throw new Error('Owner account not found')
  }

  const successorEmail = normalizeEmail(input.successorEmail)
  if (!successorEmail) {
    throw new Error('Successor email is required')
  }
  if (successorEmail === normalizeEmail(owner.email)) {
    throw new Error('Successor email must be different from the current owner email')
  }

  const existingUser = await findUserByEmail(successorEmail)
  if (existingUser && existingUser.id !== ownerUserId) {
    throw new Error('Successor email is already in use by another SafeNode account')
  }

  const waitingPeriodDays = Math.min(30, Math.max(7, input.waitingPeriodDays || DEFAULT_WAITING_DAYS))

  const record = await prisma.accountSuccessor.upsert({
    where: { ownerUserId },
    update: {
      successorEmail,
      successorName: input.successorName?.trim() || null,
      relationshipLabel: input.relationshipLabel?.trim() || null,
      note: input.note?.trim() || null,
      waitingPeriodDays,
      status: 'active',
      claimRequestedAt: null,
      claimAvailableAt: null,
      claimTokenHash: null,
      claimTokenExpiresAt: null,
      claimedAt: null,
      revokedAt: null
    },
    create: {
      ownerUserId,
      successorEmail,
      successorName: input.successorName?.trim() || null,
      relationshipLabel: input.relationshipLabel?.trim() || null,
      note: input.note?.trim() || null,
      waitingPeriodDays,
      status: 'active'
    }
  })

  await createAuditLog({
    userId: ownerUserId,
    action: 'successor_designated',
    resourceType: 'account_successor',
    resourceId: record.id,
    metadata: {
      successorEmail,
      waitingPeriodDays
    }
  })

  await emailService.sendSuccessorDesignationEmail({
    to: successorEmail,
    ownerName: owner.displayName || owner.email,
    waitingPeriodDays,
    relationshipLabel: record.relationshipLabel || undefined,
    note: record.note || undefined
  })

  return serialize(record)
}

export async function revokeAccountSuccessor(ownerUserId: string): Promise<void> {
  const prisma = getPrismaClient()
  const existing = await prisma.accountSuccessor.findUnique({
    where: { ownerUserId }
  })

  if (!existing) return

  await prisma.accountSuccessor.update({
    where: { ownerUserId },
    data: {
      status: 'revoked',
      revokedAt: new Date(),
      claimRequestedAt: null,
      claimAvailableAt: null,
      claimTokenHash: null,
      claimTokenExpiresAt: null
    }
  })

  await createAuditLog({
    userId: ownerUserId,
    action: 'successor_revoked',
    resourceType: 'account_successor',
    resourceId: existing.id,
    metadata: {
      successorEmail: existing.successorEmail
    }
  })
}

export async function requestAccountSuccessorClaim(input: {
  ownerEmail: string
  successorEmail: string
}): Promise<{ claimUrl: string; claimAvailableAt: Date }> {
  const prisma = getPrismaClient()
  const ownerEmail = normalizeEmail(input.ownerEmail)
  const successorEmail = normalizeEmail(input.successorEmail)

  const owner = await findUserByEmail(ownerEmail)
  if (!owner) {
    throw new Error('No successor setup matches those emails')
  }

  const record = await prisma.accountSuccessor.findUnique({
    where: { ownerUserId: owner.id }
  })

  if (!record || record.successorEmail !== successorEmail || record.status === 'revoked') {
    throw new Error('No successor setup matches those emails')
  }

  if (record.status === 'transferred') {
    throw new Error('This account has already been transferred')
  }

  const existingUser = await findUserByEmail(successorEmail)
  if (existingUser && existingUser.id !== owner.id) {
    throw new Error('Successor email is already attached to another SafeNode account')
  }

  const claimToken = randomBytes(24).toString('hex')
  const now = new Date()
  const claimAvailableAt = new Date(now.getTime() + record.waitingPeriodDays * 24 * 60 * 60 * 1000)
  const claimTokenExpiresAt = new Date(claimAvailableAt.getTime() + CLAIM_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  const frontendBaseUrl = process.env.FRONTEND_URL || 'https://safe-node.app'
  const claimUrl = `${frontendBaseUrl}/auth/successor?token=${claimToken}`

  await prisma.accountSuccessor.update({
    where: { ownerUserId: owner.id },
    data: {
      status: 'claim_pending',
      claimRequestedAt: now,
      claimAvailableAt,
      claimTokenHash: hashClaimToken(claimToken),
      claimTokenExpiresAt,
      revokedAt: null
    }
  })

  await createAuditLog({
    userId: owner.id,
    action: 'successor_claim_requested',
    resourceType: 'account_successor',
    resourceId: record.id,
    metadata: {
      successorEmail,
      claimAvailableAt: claimAvailableAt.toISOString()
    }
  })

  await emailService.sendSuccessorClaimOwnerAlertEmail({
    to: owner.email,
    ownerName: owner.displayName || owner.email,
    successorEmail,
    claimAvailableAt
  })

  await emailService.sendSuccessorClaimSuccessorEmail({
    to: successorEmail,
    ownerEmail,
    claimUrl,
    claimAvailableAt
  })

  return { claimUrl, claimAvailableAt }
}

export async function cancelAccountSuccessorClaim(ownerUserId: string): Promise<void> {
  const prisma = getPrismaClient()
  const record = await prisma.accountSuccessor.findUnique({
    where: { ownerUserId }
  })

  if (!record || record.status !== 'claim_pending') {
    throw new Error('There is no active succession claim to cancel')
  }

  await prisma.accountSuccessor.update({
    where: { ownerUserId },
    data: {
      status: 'active',
      claimRequestedAt: null,
      claimAvailableAt: null,
      claimTokenHash: null,
      claimTokenExpiresAt: null
    }
  })

  await createAuditLog({
    userId: ownerUserId,
    action: 'successor_claim_cancelled',
    resourceType: 'account_successor',
    resourceId: record.id,
    metadata: {
      successorEmail: record.successorEmail
    }
  })
}

export async function getSuccessorClaimStatus(token: string): Promise<{
  ownerEmail: string
  successorEmail: string
  successorName?: string | null
  relationshipLabel?: string | null
  status: 'waiting' | 'ready' | 'invalid'
  claimAvailableAt?: string
  message: string
}> {
  const prisma = getPrismaClient()
  const record = await prisma.accountSuccessor.findFirst({
    where: {
      claimTokenHash: hashClaimToken(token)
    },
    include: {
      owner: {
        select: {
          email: true
        }
      }
    }
  })

  if (!record || record.status !== 'claim_pending' || !record.claimAvailableAt) {
    return {
      ownerEmail: '',
      successorEmail: '',
      status: 'invalid',
      message: 'This successor claim is invalid, cancelled, or expired.'
    }
  }

  if (record.claimTokenExpiresAt && record.claimTokenExpiresAt.getTime() < Date.now()) {
    return {
      ownerEmail: '',
      successorEmail: '',
      status: 'invalid',
      message: 'This successor claim has expired.'
    }
  }

  const isReady = record.claimAvailableAt.getTime() <= Date.now()
  return {
    ownerEmail: record.owner.email,
    successorEmail: record.successorEmail,
    successorName: record.successorName,
    relationshipLabel: record.relationshipLabel,
    status: isReady ? 'ready' : 'waiting',
    claimAvailableAt: record.claimAvailableAt.toISOString(),
    message: isReady
      ? 'The waiting period has completed. You can now take over the account.'
      : 'The claim is active, but the waiting period has not finished yet.'
  }
}

export async function completeAccountSuccessorClaim(input: {
  token: string
  password: string
  displayName?: string
}): Promise<{ user: any }> {
  const prisma = getPrismaClient()
  const tokenHash = hashClaimToken(input.token)
  const record = await prisma.accountSuccessor.findFirst({
    where: {
      claimTokenHash: tokenHash
    },
    include: {
      owner: true
    }
  })

  if (!record || record.status !== 'claim_pending' || !record.claimAvailableAt) {
    throw new Error('This successor claim is invalid, cancelled, or expired')
  }

  if (record.claimAvailableAt.getTime() > Date.now()) {
    throw new Error('The waiting period has not finished yet')
  }

  if (record.claimTokenExpiresAt && record.claimTokenExpiresAt.getTime() < Date.now()) {
    throw new Error('This successor claim has expired')
  }

  const existingUser = await findUserByEmail(record.successorEmail)
  if (existingUser && existingUser.id !== record.ownerUserId) {
    throw new Error('Successor email is already attached to another SafeNode account')
  }

  const hashedPassword = await hashPassword(input.password)
  const now = new Date()
  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.deviceSession.updateMany({
      where: {
        userId: record.ownerUserId,
        status: 'active'
      },
      data: {
        status: 'revoked',
        revokedAt: now,
        revokedReason: 'successor_transfer_completed'
      }
    })

    await tx.device.updateMany({
      where: { userId: record.ownerUserId },
      data: {
        isActive: false,
        requiresReapproval: true,
        removedAt: now
      }
    })

    await tx.webAuthnCredential.deleteMany({
      where: { userId: record.ownerUserId }
    })

    await tx.webAuthnChallenge.deleteMany({
      where: { userId: record.ownerUserId }
    })

    const user = await tx.user.update({
      where: { id: record.ownerUserId },
      data: {
        email: record.successorEmail,
        displayName: input.displayName?.trim() || record.successorName || record.owner.displayName || record.successorEmail.split('@')[0],
        passwordHash: hashedPassword,
        emailVerified: true,
        tokenVersion: { increment: 1 },
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        biometricEnabled: false,
        lastLoginAt: now
      }
    })

    await tx.accountSuccessor.update({
      where: { ownerUserId: record.ownerUserId },
      data: {
        status: 'transferred',
        claimedAt: now,
        claimTokenHash: null,
        claimTokenExpiresAt: null
      }
    })

    return user
  })

  await createAuditLog({
    userId: record.ownerUserId,
    action: 'successor_transfer_completed',
    resourceType: 'account_successor',
    resourceId: record.id,
    metadata: {
      successorEmail: record.successorEmail
    }
  })

  return { user: updatedUser }
}
