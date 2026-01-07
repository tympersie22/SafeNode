/**
 * Health Check Route
 * Production-ready health endpoint for monitoring and load balancers
 */

import { FastifyInstance } from 'fastify'
import { getPrismaClient } from '../db/prisma'
import { config } from '../config'
import { getPasswordConfig } from '../utils/password'

/**
 * Register health check routes
 */
export async function registerHealthRoutes(server: FastifyInstance) {
  /**
   * GET /api/health
   * Basic health check endpoint
   */
  server.get('/api/health', async (request, reply) => {
    try {
      const response: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'safenode-backend',
        version: '1.0.0',
        environment: config.nodeEnv
      }
      
      // Include auth config summary in development only
      if (config.nodeEnv === 'development') {
        const passwordConfig = getPasswordConfig()
        response.auth = {
          seedOnBoot: process.env.SEED_ON_BOOT === 'true',
          pepperConfigured: passwordConfig.pepperConfigured,
          hashingParamsVersion: passwordConfig.hashingParamsVersion
        }
      }
      
      return response
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      })
    }
  })

  /**
   * GET /api/health/ready
   * Readiness probe - checks if service is ready to accept traffic
   * Includes database connectivity check
   */
  server.get('/api/health/ready', async (request, reply) => {
    try {
      // Check database connectivity
      let dbStatus = 'unknown'
      try {
        if (config.dbAdapter === 'prisma' && config.databaseUrl) {
          const prisma = getPrismaClient()
          await prisma.$queryRaw`SELECT 1`
          dbStatus = 'connected'
        } else {
          dbStatus = 'not_configured'
        }
      } catch (dbError: any) {
        request.log.error({ error: dbError }, 'Database health check failed')
        dbStatus = 'disconnected'
      }

      const isReady = dbStatus === 'connected' || dbStatus === 'not_configured'

      if (!isReady) {
        return reply.code(503).send({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          checks: {
            database: dbStatus
          }
        })
      }

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbStatus
        }
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        status: 'error',
        message: 'Readiness check failed',
        timestamp: new Date().toISOString()
      })
    }
  })

  /**
   * GET /api/health/live
   * Liveness probe - checks if service is alive
   * Should always return 200 if the process is running
   */
  server.get('/api/health/live', async (request, reply) => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    }
  })

  /**
   * Legacy health endpoint for backward compatibility
   */
  server.get('/health', async (request, reply) => {
    return reply.redirect('/api/health')
  })
}

