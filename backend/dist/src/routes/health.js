"use strict";
/**
 * Health Check Route
 * Production-ready health endpoint for monitoring and load balancers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHealthRoutes = registerHealthRoutes;
const prisma_1 = require("../db/prisma");
const config_1 = require("../config");
const password_1 = require("../utils/password");
/**
 * Register health check routes
 */
async function registerHealthRoutes(server) {
    /**
     * GET /api/health
     * Basic health check endpoint
     */
    server.get('/api/health', async (request, reply) => {
        try {
            const response = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'safenode-backend',
                version: '1.0.0',
                environment: config_1.config.nodeEnv
            };
            // Include auth config summary in development only
            if (config_1.config.nodeEnv === 'development') {
                const passwordConfig = (0, password_1.getPasswordConfig)();
                response.auth = {
                    seedOnBoot: process.env.SEED_ON_BOOT === 'true',
                    pepperConfigured: passwordConfig.pepperConfigured,
                    hashingParamsVersion: passwordConfig.hashingParamsVersion
                };
            }
            return response;
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                status: 'error',
                message: 'Health check failed',
                timestamp: new Date().toISOString()
            });
        }
    });
    /**
     * GET /api/health/ready
     * Readiness probe - checks if service is ready to accept traffic
     * Includes database connectivity check
     */
    server.get('/api/health/ready', async (request, reply) => {
        try {
            // Check database connectivity
            let dbStatus = 'unknown';
            try {
                if (config_1.config.dbAdapter === 'prisma' && config_1.config.databaseUrl) {
                    const prisma = (0, prisma_1.getPrismaClient)();
                    await prisma.$queryRaw `SELECT 1`;
                    dbStatus = 'connected';
                }
                else {
                    dbStatus = 'not_configured';
                }
            }
            catch (dbError) {
                request.log.error({ error: dbError }, 'Database health check failed');
                dbStatus = 'disconnected';
            }
            const isReady = dbStatus === 'connected' || dbStatus === 'not_configured';
            if (!isReady) {
                return reply.code(503).send({
                    status: 'not_ready',
                    timestamp: new Date().toISOString(),
                    checks: {
                        database: dbStatus
                    }
                });
            }
            return {
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: dbStatus
                }
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                status: 'error',
                message: 'Readiness check failed',
                timestamp: new Date().toISOString()
            });
        }
    });
    /**
     * GET /api/health/live
     * Liveness probe - checks if service is alive
     * Should always return 200 if the process is running
     */
    server.get('/api/health/live', async (request, reply) => {
        return {
            status: 'alive',
            timestamp: new Date().toISOString()
        };
    });
    /**
     * Legacy health endpoint for backward compatibility
     */
    server.get('/health', async (request, reply) => {
        return reply.redirect('/api/health');
    });
}
