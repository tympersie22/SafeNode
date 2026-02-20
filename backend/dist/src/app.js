"use strict";
/**
 * Fastify App Configuration
 * Sets up middleware, rate limiting, security headers, and routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const compress_1 = __importDefault(require("@fastify/compress"));
const fastify_raw_body_1 = __importDefault(require("fastify-raw-body"));
const config_1 = require("./config");
const auth_1 = require("./routes/auth");
const billing_1 = require("./routes/billing");
const sync_1 = require("./routes/sync");
const sso_1 = require("./routes/sso");
const health_1 = require("./routes/health");
const downloads_1 = require("./routes/downloads");
const devices_1 = require("./routes/devices");
const auth_2 = require("./middleware/auth");
const vaultController_1 = require("./controllers/vaultController");
const breachController_1 = require("./controllers/breachController");
const userService_1 = require("./services/userService");
/**
 * Creates and configures the Fastify server instance
 */
async function createApp() {
    const server = (0, fastify_1.default)({
        logger: {
            level: config_1.config.nodeEnv === 'production' ? 'info' : 'debug',
            transport: config_1.config.nodeEnv === 'development'
                ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
                : undefined
        }
    });
    // Register CORS
    await server.register(cors_1.default, {
        origin: config_1.config.corsOrigin,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
    });
    // Register compression (gzip)
    await server.register(compress_1.default, {
        encodings: ['gzip', 'deflate']
    });
    // Register raw body support for Stripe webhook signature verification
    await server.register(fastify_raw_body_1.default, {
        field: 'rawBody',
        global: false,
        runFirst: true,
        encoding: false
    });
    // Security headers are registered via registerSecurityHeaders middleware
    // This ensures consistent CSP configuration across the application
    // Register rate limiting
    await server.register(rate_limit_1.default, {
        max: config_1.config.rateLimitMax,
        timeWindow: config_1.config.rateLimitWindowMinutes * 60 * 1000, // Convert minutes to ms
        errorResponseBuilder: (request, context) => {
            return {
                error: 'rate_limit_exceeded',
                message: `Rate limit exceeded. Maximum ${context.max} requests per ${config_1.config.rateLimitWindowMinutes} minutes.`,
                retryAfter: Math.ceil(context.ttl / 1000) // seconds
            };
        }
    });
    // Security headers hook
    server.addHook('onSend', async (request, reply, payload) => {
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('Referrer-Policy', 'no-referrer');
        reply.header('X-Frame-Options', 'DENY');
        reply.header('Permissions-Policy', 'camera=(), microphone=()');
        return payload;
    });
    // Register authentication routes (public)
    await (0, auth_1.registerAuthRoutes)(server);
    // Register billing routes
    await (0, billing_1.registerBillingRoutes)(server);
    // Register sync routes
    await (0, sync_1.registerSyncRoutes)(server);
    // Register SSO routes
    await (0, sso_1.registerSSORoutes)(server);
    // Register health check routes
    await (0, health_1.registerHealthRoutes)(server);
    // Register download routes
    await (0, downloads_1.registerDownloadRoutes)(server);
    // Register device routes
    await (0, devices_1.registerDeviceRoutes)(server);
    // Vault routes
    // NOTE: For backward compatibility, these are NOT protected by default
    // To enable JWT auth, uncomment the preHandler lines
    server.get('/api/vault/latest', 
    // { preHandler: requireAuth }, // Uncomment to enable JWT auth
    vaultController_1.getLatestVault);
    server.post('/api/vault', 
    // { preHandler: requireAuth }, // Uncomment to enable JWT auth
    vaultController_1.saveVault);
    server.post('/api/vault/save', 
    // { preHandler: requireAuth }, // Uncomment to enable JWT auth
    vaultController_1.saveVaultAlias);
    // Vault entry CRUD routes (required by frontend)
    // These work with the full encrypted vault blob
    // The frontend handles encryption/decryption locally
    server.post('/api/vault/entry', { preHandler: auth_2.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            const { encryptedVault, iv, version } = body || {};
            if (typeof encryptedVault !== 'string' || typeof iv !== 'string') {
                return reply.code(400).send({
                    error: 'invalid_payload',
                    message: 'encryptedVault and iv are required and must be strings'
                });
            }
            // Update vault
            const updated = await (0, userService_1.updateVault)(user.id, encryptedVault, iv, typeof version === 'number' ? version : Date.now());
            if (!updated) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            return {
                ok: true,
                version: updated.vaultVersion,
                message: 'Entry created successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to create vault entry'
            });
        }
    });
    server.put('/api/vault/entry/:id', { preHandler: auth_2.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const body = request.body;
            const { encryptedVault, iv, version } = body || {};
            if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
                return reply.code(400).send({
                    error: 'invalid_payload',
                    message: 'ID, encryptedVault, and iv are required'
                });
            }
            // Update vault
            const updated = await (0, userService_1.updateVault)(user.id, encryptedVault, iv, typeof version === 'number' ? version : Date.now());
            if (!updated) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            return {
                ok: true,
                version: updated.vaultVersion,
                message: `Entry ${id} updated successfully`
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to update vault entry'
            });
        }
    });
    server.delete('/api/vault/entry/:id', { preHandler: auth_2.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const body = request.body;
            const { encryptedVault, iv, version } = body || {};
            if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
                return reply.code(400).send({
                    error: 'invalid_payload',
                    message: 'ID, encryptedVault, and iv are required'
                });
            }
            // Update vault
            const updated = await (0, userService_1.updateVault)(user.id, encryptedVault, iv, typeof version === 'number' ? version : Date.now());
            if (!updated) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            return {
                ok: true,
                version: updated.vaultVersion,
                message: `Entry ${id} deleted successfully`
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to delete vault entry'
            });
        }
    });
    // Breach check routes (public, but rate limited)
    server.get('/api/breach/range/:prefix', breachController_1.getBreachRange);
    server.get('/api/breach/cache/stats', breachController_1.getCacheStats);
    // Root health check route
    server.get('/', async (request, reply) => {
        return { status: 'ok', message: 'SafeNode API is running' };
    });
    return server;
}
