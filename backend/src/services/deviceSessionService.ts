import { FastifyRequest } from 'fastify'
import { DeviceSession } from '@prisma/client'
import { getPrismaClient } from '../db/prisma'
import { createAuditLog } from './auditLogService'

interface CreateDeviceSessionInput {
  userId: string
  deviceId?: string | null
  ipAddress?: string
  userAgent?: string
}

function normalizeDeviceId(deviceId?: string | null): string | null {
  if (!deviceId || typeof deviceId !== 'string') return null
  const trimmed = deviceId.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getRequestDeviceId(request: FastifyRequest): string | null {
  const raw = request.headers['x-device-id'] || request.headers['X-Device-Id']
  return normalizeDeviceId(Array.isArray(raw) ? raw[0] : raw)
}

export async function revokeUserSessions(
  userId: string,
  reason: string,
  options?: {
    exceptSessionId?: string
    replacedBySessionId?: string
  }
): Promise<number> {
  const prisma = getPrismaClient()
  const now = new Date()

  const result = await prisma.deviceSession.updateMany({
    where: {
      userId,
      status: 'active',
      ...(options?.exceptSessionId ? { id: { not: options.exceptSessionId } } : {})
    },
    data: {
      status: options?.replacedBySessionId ? 'replaced' : 'revoked',
      revokedAt: now,
      revokedReason: reason,
      replacedBySessionId: options?.replacedBySessionId || null
    }
  })

  return result.count
}

export async function createDeviceSession(input: CreateDeviceSessionInput): Promise<DeviceSession> {
  const prisma = getPrismaClient()
  const now = new Date()

  const session = await prisma.deviceSession.create({
    data: {
      userId: input.userId,
      deviceId: normalizeDeviceId(input.deviceId),
      status: 'active',
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      lastSeenAt: now
    }
  })

  const replacedCount = await revokeUserSessions(input.userId, 'superseded_by_new_login', {
    exceptSessionId: session.id,
    replacedBySessionId: session.id
  })

  if (replacedCount > 0) {
    void createAuditLog({
      userId: input.userId,
      action: 'session_replaced',
      resourceType: 'session',
      resourceId: session.id,
      metadata: {
        replacedSessionCount: replacedCount,
        deviceId: session.deviceId
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    })
  }

  return session
}

export async function getActiveSession(sessionId: string): Promise<DeviceSession | null> {
  const prisma = getPrismaClient()
  return prisma.deviceSession.findFirst({
    where: {
      id: sessionId,
      status: 'active'
    }
  })
}

export async function touchDeviceSession(sessionId: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      lastSeenAt: new Date()
    }
  }).catch(() => undefined)
}

export async function bindSessionToDevice(
  sessionId: string,
  userId: string,
  deviceId: string
): Promise<DeviceSession | null> {
  const prisma = getPrismaClient()
  const normalized = normalizeDeviceId(deviceId)
  if (!normalized) return null

  const session = await prisma.deviceSession.findUnique({
    where: { id: sessionId }
  })

  if (!session || session.userId !== userId || session.status !== 'active') {
    return null
  }

  if (session.deviceId && session.deviceId !== normalized) {
    return null
  }

  return prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      deviceId: normalized,
      lastSeenAt: new Date()
    }
  })
}

export async function revokeDeviceSessions(
  userId: string,
  deviceId: string,
  reason: string
): Promise<number> {
  const prisma = getPrismaClient()
  const now = new Date()
  const normalized = normalizeDeviceId(deviceId)

  if (!normalized) return 0

  const result = await prisma.deviceSession.updateMany({
    where: {
      userId,
      deviceId: normalized,
      status: 'active'
    },
    data: {
      status: 'revoked',
      revokedAt: now,
      revokedReason: reason
    }
  })

  return result.count
}

export function getRequestAuditContext(request: FastifyRequest): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: request.ip || request.headers['x-forwarded-for'] as string || undefined,
    userAgent: request.headers['user-agent'] || undefined
  }
}
