"use strict";
/**
 * Authentication Middleware
 * JWT-based authentication for protecting API routes
 *
 * SECURITY NOTES:
 * - JWT_SECRET must be a strong random string (32+ bytes) in production
 * - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * - Tokens expire after 24 hours by default (configurable)
 * - Rotate JWT_SECRET periodically and invalidate old tokens
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueToken = issueToken;
exports.verifyToken = verifyToken;
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
/**
 * Issues a JWT token for a user
 * @param user - User object with id, email, and optional tokenVersion
 * @returns JWT token string
 */
function issueToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion || 1
    };
    // Token expires in 24 hours (configurable via JWT_EXPIRES_IN env var)
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, {
        expiresIn: expiresIn,
        issuer: 'safenode',
        audience: 'safenode-api'
    });
}
/**
 * Verifies a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, {
            issuer: 'safenode',
            audience: 'safenode-api'
        });
        return decoded;
    }
    catch (error) {
        return null;
    }
}
/**
 * Authentication middleware for Fastify
 * Verifies JWT token from Authorization header or cookie
 * Validates token version against user's current tokenVersion
 *
 * Usage:
 * server.get('/protected', { preHandler: requireAuth }, handler)
 */
async function requireAuth(request, reply) {
    try {
        // Try to get token from Authorization header first, then from cookie
        let token;
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
        else {
            // Try cookie - use type assertion since @fastify/cookie extends FastifyRequest
            const cookies = request.cookies;
            token = cookies?.safenode_token;
        }
        if (!token) {
            request.log.warn({ path: request.url }, 'Missing or invalid Authorization header/cookie');
            return reply.code(401).send({
                error: 'unauthorized',
                code: 'MISSING_TOKEN',
                message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
            });
        }
        const payload = verifyToken(token);
        if (!payload) {
            request.log.warn({ path: request.url }, 'Invalid or expired token');
            return reply.code(401).send({
                error: 'unauthorized',
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired token'
            });
        }
        // Verify user exists and check token version
        const { db } = await Promise.resolve().then(() => __importStar(require('../services/database')));
        // For new users, there can be propagation delay in serverless + managed DB setups.
        // Retry with exponential backoff to reduce false USER_NOT_FOUND responses.
        let user = await db.users.findById(payload.userId);
        let retries = 0;
        const maxRetries = 6;
        while (!user && retries < maxRetries) {
            // 75ms, 150ms, 300ms, 600ms, 1200ms, 2400ms
            await new Promise(resolve => setTimeout(resolve, 75 * Math.pow(2, retries)));
            user = await db.users.findById(payload.userId);
            retries++;
        }
        if (!user) {
            // User not found - token is invalid (user deleted or reseeded)
            request.log.warn({
                userId: payload.userId,
                tokenSub: payload.userId,
                path: request.url,
                retries
            }, 'User not found in database after retries - token invalid');
            return reply.code(401).send({
                error: 'unauthorized',
                code: 'USER_NOT_FOUND',
                message: 'User not found - authentication invalid'
            });
        }
        // Check token version (if token has version, it must match user's current version)
        const userTokenVersion = user.tokenVersion || 1;
        const tokenVersion = payload.tokenVersion || 1;
        if (tokenVersion < userTokenVersion) {
            // Token version is outdated (user's tokenVersion was bumped)
            request.log.warn({
                userId: payload.userId,
                tokenVersion,
                userTokenVersion,
                path: request.url
            }, 'Token version mismatch - token invalidated');
            return reply.code(401).send({
                error: 'unauthorized',
                code: 'TOKEN_VERSION_MISMATCH',
                message: 'Token has been invalidated. Please log in again.'
            });
        }
        // Attach user info to request for use in handlers
        ;
        request.user = {
            id: user.id,
            email: user.email
        };
        request.log.debug({ userId: user.id, path: request.url }, 'Authentication successful');
    }
    catch (error) {
        request.log.error({
            error: error?.message,
            stack: error?.stack,
            path: request.url
        }, 'Authentication error');
        return reply.code(401).send({
            error: 'unauthorized',
            code: 'AUTH_ERROR',
            message: 'Authentication failed',
            details: error?.message
        });
    }
}
/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
async function optionalAuth(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyToken(token);
            if (payload) {
                ;
                request.user = {
                    id: payload.userId,
                    email: payload.email
                };
            }
        }
    }
    catch {
        // Ignore errors for optional auth
    }
}
