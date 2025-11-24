/**
 * Sync Routes
 * Handles vault synchronization and conflict resolution
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { detectConflicts, resolveConflicts, getSyncStatus } from '../services/syncService'
import { z } from 'zod'

const conflictDetectionSchema = z.object({
  localVersion: z.number().int().min(0),
  localEntries: z.array(z.object({
    id: z.string(),
    updatedAt: z.number(),
    version: z.number().optional()
  })).optional()
})

const conflictResolutionSchema = z.object({
  resolutions: z.array(z.object({
    entryId: z.string(),
    resolution: z.enum(['accept_local', 'accept_server', 'merge', 'keep_both']),
    mergedData: z.any().optional()
  }))
})

/**
 * Register sync routes
 */
export async function registerSyncRoutes(server: FastifyInstance) {
  /**
   * GET /api/sync/status
   * Get sync status and check for conflicts (requires authentication)
   */
  server.get('/api/sync/status', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { localVersion } = request.query as { localVersion?: string }

      const localVersionNum = localVersion ? parseInt(localVersion, 10) : 0

      const status = await getSyncStatus(user.id, localVersionNum)

      return status
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to get sync status'
      })
    }
  })

  /**
   * GET /api/sync/conflicts
   * Detect conflicts between local and server vault (requires authentication)
   */
  server.get('/api/sync/conflicts', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const query = request.query as { localVersion?: string }

      const localVersion = query.localVersion ? parseInt(query.localVersion, 10) : 0

      const conflicts = await detectConflicts(user.id, [], localVersion)

      return {
        conflicts,
        hasConflicts: conflicts.length > 0
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to detect conflicts'
      })
    }
  })

  /**
   * POST /api/sync/conflicts
   * Detect conflicts with detailed local entries (requires authentication)
   */
  server.post('/api/sync/conflicts', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      const validation = conflictDetectionSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { localVersion, localEntries = [] } = validation.data

      const conflicts = await detectConflicts(user.id, localEntries, localVersion)

      return {
        conflicts,
        hasConflicts: conflicts.length > 0
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to detect conflicts'
      })
    }
  })

  /**
   * POST /api/sync/resolve
   * Resolve conflicts with specified resolution strategy (requires authentication)
   */
  server.post('/api/sync/resolve', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      const validation = conflictResolutionSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { resolutions } = validation.data

      const result = await resolveConflicts(user.id, resolutions)

      return {
        success: result.success,
        newVersion: result.newVersion
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to resolve conflicts'
      })
    }
  })
}

