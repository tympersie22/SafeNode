"use strict";
/**
 * Stricter Rate Limiting for Authentication Endpoints
 * Prevents brute force attacks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRateLimit = registerAuthRateLimit;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
/**
 * Register strict rate limiting for auth endpoints
 */
async function registerAuthRateLimit(server) {
    // Stricter rate limit for login/register endpoints
    await server.register(rate_limit_1.default, {
        max: 5, // Only 5 requests
        timeWindow: 15 * 60 * 1000, // per 15 minutes
        cache: 5000,
        skipOnError: false,
        keyGenerator: (request) => {
            // Rate limit by IP address
            return request.ip || request.headers['x-forwarded-for'] || 'unknown';
        },
        errorResponseBuilder: (request, context) => {
            return {
                error: 'rate_limit_exceeded',
                message: 'Too many authentication attempts. Please try again in 15 minutes.',
                retryAfter: Math.ceil(context.ttl / 1000) // seconds
            };
        },
        enableDraftSpec: true
    });
}
