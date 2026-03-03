import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { issueToken, requireAuth } from '../middleware/auth'
import { requireRegisteredDevice } from '../middleware/deviceAccess'
import { createDeviceSession, getRequestAuditContext, getRequestDeviceId } from '../services/deviceSessionService'
import {
  cancelAccountSuccessorClaim,
  completeAccountSuccessorClaim,
  getAccountSuccessor,
  getSuccessorClaimStatus,
  requestAccountSuccessorClaim,
  revokeAccountSuccessor,
  upsertAccountSuccessor
} from '../services/accountSuccessorService'

const successorSchema = z.object({
  successorEmail: z.string().email('Valid successor email is required'),
  successorName: z.string().max(120).optional().or(z.literal('')),
  relationshipLabel: z.string().max(120).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
  waitingPeriodDays: z.number().int().min(7).max(30).optional()
})

const claimRequestSchema = z.object({
  ownerEmail: z.string().email('Valid owner email is required'),
  successorEmail: z.string().email('Valid successor email is required')
})

const claimCompleteSchema = z.object({
  token: z.string().min(12, 'Claim token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(120).optional().or(z.literal(''))
})

export async function registerSuccessorRoutes(server: FastifyInstance) {
  server.get('/api/account/successor', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request) => {
    const user = (request as any).user
    const successor = await getAccountSuccessor(user.id)
    return { successor }
  })

  server.put('/api/account/successor', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request, reply) => {
    const validation = successorSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Invalid successor configuration',
        details: validation.error.errors
      })
    }

    try {
      const user = (request as any).user
      const { successorEmail, successorName, relationshipLabel, note, waitingPeriodDays } = validation.data
      const successor = await upsertAccountSuccessor(user.id, {
        successorEmail,
        successorName: successorName || undefined,
        relationshipLabel: relationshipLabel || undefined,
        note: note || undefined,
        waitingPeriodDays
      })
      return { success: true, successor }
    } catch (error: any) {
      return reply.code(400).send({
        error: 'successor_update_failed',
        message: error.message || 'Failed to save successor settings'
      })
    }
  })

  server.delete('/api/account/successor', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request) => {
    const user = (request as any).user
    await revokeAccountSuccessor(user.id)
    return { success: true }
  })

  server.post('/api/account/successor/cancel-claim', {
    preHandler: [requireAuth, requireRegisteredDevice]
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      await cancelAccountSuccessorClaim(user.id)
      return { success: true }
    } catch (error: any) {
      return reply.code(400).send({
        error: 'claim_cancel_failed',
        message: error.message || 'Failed to cancel succession claim'
      })
    }
  })

  server.post('/api/account/successor/claim/request', async (request, reply) => {
    const validation = claimRequestSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Invalid succession claim request',
        details: validation.error.errors
      })
    }

    try {
      const { ownerEmail, successorEmail } = validation.data
      const result = await requestAccountSuccessorClaim({ ownerEmail, successorEmail })
      return {
        success: true,
        claimAvailableAt: result.claimAvailableAt.toISOString(),
        message: 'Succession claim started. The owner has been notified and can cancel it during the waiting period.'
      }
    } catch (error: any) {
      return reply.code(400).send({
        error: 'claim_request_failed',
        message: error.message || 'Failed to start succession claim'
      })
    }
  })

  server.get('/api/account/successor/claim/status', async (request, reply) => {
    const token = String((request.query as any)?.token || '').trim()
    if (!token) {
      return reply.code(400).send({
        error: 'missing_token',
        message: 'Claim token is required'
      })
    }

    const status = await getSuccessorClaimStatus(token)
    if (status.status === 'invalid') {
      return reply.code(404).send({
        error: 'invalid_claim',
        message: status.message
      })
    }

    return status
  })

  server.post('/api/account/successor/claim/complete', async (request, reply) => {
    const validation = claimCompleteSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Invalid succession claim completion request',
        details: validation.error.errors
      })
    }

    try {
      const { token: claimToken, password, displayName } = validation.data
      const { user } = await completeAccountSuccessorClaim({
        token: claimToken,
        password,
        displayName: displayName || undefined
      })
      const session = await createDeviceSession({
        userId: user.id,
        deviceId: getRequestDeviceId(request),
        ...getRequestAuditContext(request)
      })
      const token = issueToken({
        id: user.id,
        email: user.email,
        tokenVersion: (user as any).tokenVersion || 1,
        sessionId: session.id
      })

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          twoFactorEnabled: user.twoFactorEnabled,
          biometricEnabled: user.biometricEnabled,
          createdAt: user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
          lastLoginAt: user.lastLoginAt instanceof Date ? user.lastLoginAt.getTime() : user.lastLoginAt
        }
      }
    } catch (error: any) {
      return reply.code(400).send({
        error: 'claim_completion_failed',
        message: error.message || 'Failed to complete succession claim'
      })
    }
  })
}
