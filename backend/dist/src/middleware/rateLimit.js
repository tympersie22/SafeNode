"use strict";
/**
 * Rate Limiting Middleware
 * Prevents abuse and DDoS attacks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRateLimit = registerRateLimit;
exports.createRouteRateLimit = createRouteRateLimit;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const defaultOptions = {
    max: 100, // requests
    timeWindow: 60 * 1000, // 1 minute
    cache: 10000,
    skipOnError: false
};
/**
 * Register rate limiting plugin
 */
async function registerRateLimit(server, options = {}) {
    const opts = { ...defaultOptions, ...options };
    await server.register(rate_limit_1.default, {
        max: opts.max,
        timeWindow: opts.timeWindow,
        cache: opts.cache,
        skipOnError: opts.skipOnError,
        keyGenerator: (request) => {
            // Use IP address or user ID if authenticated
            const user = request.user;
            return user?.id || request.ip || request.headers['x-forwarded-for'] || 'unknown';
        },
        errorResponseBuilder: (request, context) => {
            return {
                error: 'rate_limit_exceeded',
                message: `Rate limit exceeded. Maximum ${context.max} requests per ${Math.floor((opts.timeWindow || 60000) / 1000)} seconds.`,
                retryAfter: Math.ceil(context.ttl / 1000) // seconds
            };
        },
        enableDraftSpec: true
    });
}
/**
 * Create rate limiter for specific routes
 */
function createRouteRateLimit(options) {
    return async (server) => {
        await registerRateLimit(server, options);
    };
}
