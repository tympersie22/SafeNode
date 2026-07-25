/**
 * Device Re-approval Service
 * Issues and consumes single-use, short-lived tokens that let an account owner
 * re-approve a device that was previously removed. A valid token ONLY clears the
 * requiresReapproval flag on the bound device — it never grants auth or vault access.
 * Pattern follows passwordResetService.ts.
 */

import { createHash, randomBytes } from 'crypto'
import { getPrismaClient } from '../db/prisma'
import { emailService } from './emailService'

const REAPPROVAL_TOKEN_EXPIRY_MINUTES = 30

function generateReapprovalToken(): string {
  return randomBytes(32).toString('base64url')
}

function hashReapprovalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Issue a re-approval token for a specific device row and email the owner a link.
 * The caller must have already resolved that this device belongs to the user and
 * is in a requiresReapproval state.
 */
export async function createDeviceReapprovalToken(params: {
  userId: string
  deviceRowId: string
  email: string
  displayName?: string | null
  deviceName?: string | null
}): Promise<{ success: boolean }> {
  const prisma = getPrismaClient()
  const token = generateReapprovalToken()
  const tokenHash = hashReapprovalToken(token)
  const expiresAt = new Date(Date.now() + REAPPROVAL_TOKEN_EXPIRY_MINUTES * 60 * 1000)

  // Invalidate any previous unused tokens for this device row.
  await prisma.deviceReapprovalToken.deleteMany({
    where: { userId: params.userId, deviceId: params.deviceRowId, usedAt: null }
  })

  await prisma.deviceReapprovalToken.create({
    data: {
      userId: params.userId,
      deviceId: params.deviceRowId,
      token: tokenHash,
      expiresAt
    }
  })

  try {
    await emailService.sendDeviceReapprovalEmail(
      params.email,
      token,
      params.displayName || undefined,
      params.deviceName || undefined
    )
  } catch (error: any) {
    // Never log the token; log only the failure.
    console.error('Failed to send device re-approval email:', error?.message || error)
  }

  return { success: true }
}

/**
 * Consume a re-approval token: clears requiresReapproval on the bound device.
 * Single-use and expiry-checked. Returns the affected device id on success.
 */
export async function confirmDeviceReapproval(token: string): Promise<{
  success: boolean
  deviceName?: string
  error?: string
}> {
  const prisma = getPrismaClient()

  if (!token || token.length < 16) {
    return { success: false, error: 'Invalid or expired approval link.' }
  }

  const tokenHash = hashReapprovalToken(token)
  return prisma.$transaction(async (tx) => {
    const record = await tx.deviceReapprovalToken.findUnique({ where: { token: tokenHash } })
    if (!record) {
      return { success: false, error: 'Invalid or expired approval link.' }
    }
    if (record.usedAt) {
      return { success: false, error: 'This approval link has already been used.' }
    }

    const now = new Date()
    if (record.expiresAt < now) {
      return { success: false, error: 'This approval link has expired. Request a new one from the device.' }
    }

    // Atomically claim the token. Concurrent confirmations can read the same
    // record, but only one can transition usedAt from null.
    const claimed = await tx.deviceReapprovalToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: now }
      },
      data: { usedAt: now }
    })
    if (claimed.count !== 1) {
      return { success: false, error: 'This approval link has already been used or expired.' }
    }

    const device = await tx.device.findFirst({
      where: { id: record.deviceId, userId: record.userId }
    })
    if (!device) {
      return { success: false, error: 'The device linked to this approval no longer exists.' }
    }

    await tx.device.update({
      where: { id: device.id },
      data: {
        isActive: true,
        requiresReapproval: false,
        removedAt: null,
        lastSeen: now
      }
    })

    return { success: true, deviceName: device.name }
  })
}
