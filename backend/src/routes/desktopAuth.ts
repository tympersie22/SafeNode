import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getPrismaClient } from '../db/prisma'
import { issueToken, requireAuth } from '../middleware/auth'
import {
  createDeviceSession,
  getRequestAuditContext,
  getRequestDeviceId,
} from '../services/deviceSessionService'
import { findUserById } from '../services/userService'

const FLOW_TTL_MS = 5 * 60 * 1000
const BASE64URL = /^[A-Za-z0-9_-]+$/

const startSchema = z.object({
  state: z.string().min(43).max(128).regex(BASE64URL),
  codeChallenge: z.string().length(43).regex(BASE64URL),
})

const approveSchema = z.object({
  flowId: z.string().length(43).regex(BASE64URL),
  state: z.string().min(43).max(128).regex(BASE64URL),
})

const exchangeSchema = approveSchema.extend({
  code: z.string().length(43).regex(BASE64URL),
  codeVerifier: z.string().min(43).max(128).regex(BASE64URL),
})

function randomValue(): string {
  return randomBytes(32).toString('base64url')
}

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url')
}

function equalHash(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, 'utf8')
  const expectedBytes = Buffer.from(expected, 'utf8')
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

function desktopWebOrigin(): string {
  const fallback = process.env.NODE_ENV === 'production'
    ? 'https://safe-node.app'
    : 'http://localhost:5173'
  const origin = new URL(process.env.DESKTOP_AUTH_WEB_ORIGIN || fallback)

  if (origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('DESKTOP_AUTH_WEB_ORIGIN must be an origin without a path')
  }
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') {
    throw new Error('DESKTOP_AUTH_WEB_ORIGIN must use HTTPS in production')
  }

  return origin.origin
}

function noStore(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store')
  reply.header('Pragma', 'no-cache')
}

function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: Boolean(user.emailVerified),
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    biometricEnabled: Boolean(user.biometricEnabled),
    hasVault: Boolean(user.vaultEncrypted && user.vaultIV && user.vaultSalt),
    vaultAccessMode: user.vaultAccessMode === 'wrapped_key' ? 'wrapped_key' : 'passphrase',
    recoveryKitConfigured: Boolean(
      user.recoveryWrappedVaultKey &&
      user.recoveryWrappedVaultKeyIV &&
      user.recoverySalt &&
      user.recoveryKitCreatedAt
    ),
    createdAt: user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
    lastLoginAt: user.lastLoginAt instanceof Date ? user.lastLoginAt.getTime() : user.lastLoginAt,
  }
}

export async function registerDesktopAuthRoutes(server: FastifyInstance) {
  server.post('/api/desktop-auth/start', async (request, reply) => {
    noStore(reply)
    const parsed = startSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: 'Invalid desktop authorization request' })
    }

    try {
      const prisma = getPrismaClient()
      await prisma.desktopAuthFlow.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      })
      const flowId = randomValue()
      const expiresAt = new Date(Date.now() + FLOW_TTL_MS)
      await prisma.desktopAuthFlow.create({
        data: {
          id: flowId,
          stateHash: hash(parsed.data.state),
          codeChallenge: parsed.data.codeChallenge,
          expiresAt,
        },
      })

      const browserUrl = new URL('/auth/desktop', desktopWebOrigin())
      browserUrl.searchParams.set('flow', flowId)
      browserUrl.searchParams.set('state', parsed.data.state)

      return {
        flowId,
        browserUrl: browserUrl.toString(),
        expiresAt: expiresAt.getTime(),
      }
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to begin desktop authorization' })
    }
  })

  server.post('/api/desktop-auth/approve', { preHandler: requireAuth }, async (request, reply) => {
    noStore(reply)
    const parsed = approveSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: 'Invalid desktop authorization request' })
    }

    try {
      const prisma = getPrismaClient()
      const flow = await prisma.desktopAuthFlow.findUnique({ where: { id: parsed.data.flowId } })
      if (
        !flow ||
        flow.status !== 'pending' ||
        flow.expiresAt.getTime() <= Date.now() ||
        !equalHash(hash(parsed.data.state), flow.stateHash)
      ) {
        return reply.code(400).send({ error: 'invalid_flow', message: 'Desktop authorization is invalid or expired' })
      }

      const code = randomValue()
      const user = (request as any).user as { id: string }
      const approved = await prisma.desktopAuthFlow.updateMany({
        where: {
          id: flow.id,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
        data: {
          status: 'approved',
          userId: user.id,
          authorizationCodeHash: hash(code),
          approvedAt: new Date(),
        },
      })
      if (approved.count !== 1) {
        return reply.code(409).send({ error: 'flow_already_used', message: 'Desktop authorization was already processed' })
      }

      const redirectUrl = new URL('safenode://auth/callback')
      redirectUrl.searchParams.set('flow', flow.id)
      redirectUrl.searchParams.set('code', code)
      redirectUrl.searchParams.set('state', parsed.data.state)
      return { success: true, redirectUrl: redirectUrl.toString() }
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to approve desktop authorization' })
    }
  })

  server.post('/api/desktop-auth/exchange', async (request, reply) => {
    noStore(reply)
    const parsed = exchangeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', message: 'Invalid desktop authorization exchange' })
    }

    try {
      const prisma = getPrismaClient()
      const flow = await prisma.desktopAuthFlow.findUnique({ where: { id: parsed.data.flowId } })
      const expectedChallenge = hash(parsed.data.codeVerifier)
      if (
        !flow ||
        flow.status !== 'approved' ||
        !flow.userId ||
        !flow.authorizationCodeHash ||
        flow.expiresAt.getTime() <= Date.now() ||
        !equalHash(hash(parsed.data.state), flow.stateHash) ||
        !equalHash(hash(parsed.data.code), flow.authorizationCodeHash) ||
        !equalHash(expectedChallenge, flow.codeChallenge)
      ) {
        return reply.code(400).send({ error: 'invalid_grant', message: 'Desktop authorization is invalid or expired' })
      }

      const consumed = await prisma.desktopAuthFlow.updateMany({
        where: {
          id: flow.id,
          status: 'approved',
          expiresAt: { gt: new Date() },
        },
        data: {
          status: 'consumed',
          consumedAt: new Date(),
          authorizationCodeHash: null,
        },
      })
      if (consumed.count !== 1) {
        return reply.code(400).send({ error: 'invalid_grant', message: 'Desktop authorization is invalid or expired' })
      }

      const user = await findUserById(flow.userId)
      if (!user) {
        return reply.code(400).send({ error: 'invalid_grant', message: 'Desktop authorization is invalid or expired' })
      }

      const session = await createDeviceSession({
        userId: user.id,
        deviceId: getRequestDeviceId(request),
        ...getRequestAuditContext(request),
      })
      const token = issueToken({
        id: user.id,
        email: user.email,
        tokenVersion: (user as any).tokenVersion || 1,
        sessionId: session.id,
      })

      return {
        success: true,
        token,
        user: serializeUser(user),
      }
    } catch (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to exchange desktop authorization' })
    }
  })
}
