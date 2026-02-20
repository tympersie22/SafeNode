"use strict";
/**
 * Authentication Routes
 * Production-ready authentication endpoints
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const auth_1 = require("../middleware/auth");
const sentryService_1 = require("../services/sentryService");
const userService_1 = require("../services/userService");
const emailVerificationService_1 = require("../services/emailVerificationService");
const passwordResetService_1 = require("../services/passwordResetService");
const totp_1 = require("../lib/totp");
const auditLogService_1 = require("../services/auditLogService");
const config_1 = require("../config");
const zod_1 = require("zod");
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    displayName: zod_1.z.string().optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
const vaultUpdateSchema = zod_1.z.object({
    encryptedVault: zod_1.z.string().min(1, 'Encrypted vault is required'),
    iv: zod_1.z.string().min(1, 'IV is required'),
    version: zod_1.z.number().int().positive('Version must be a positive integer')
});
/**
 * Register authentication routes
 */
async function registerAuthRoutes(server) {
    /**
     * POST /api/auth/register
     * Register a new user account
     * @swagger
     * /api/auth/register:
     *   post:
     *     tags: [Authentication]
     *     summary: Register a new user account
     *     description: Creates a new user account with email and password
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, password]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *                 minLength: 8
     *               displayName:
     *                 type: string
     *     responses:
     *       200:
     *         description: User registered successfully
     *       400:
     *         description: Validation error
     *       409:
     *         description: Email already exists
     */
    server.post('/api/auth/register', async (request, reply) => {
        try {
            const body = request.body;
            // Validate input
            const validation = registerSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { email, password, displayName } = validation.data;
            // Normalize email for checking
            const normalizedEmail = email.toLowerCase().trim();
            // Check if email already exists
            request.log.info({
                email,
                normalizedEmail,
                emailLength: normalizedEmail.length,
                emailChars: normalizedEmail.split('').map(c => c.charCodeAt(0))
            }, 'Checking if email exists');
            const exists = await (0, userService_1.emailExists)(normalizedEmail);
            request.log.info({
                email: normalizedEmail,
                exists,
                dbAdapter: process.env.DATABASE_ADAPTER || 'not set'
            }, 'Email existence check result');
            if (exists) {
                // Double-check by trying to find the user directly
                const existingUser = await (0, userService_1.findUserByEmail)(normalizedEmail);
                request.log.warn({
                    email,
                    normalizedEmail,
                    existingUserId: existingUser?.id,
                    existingUserEmail: existingUser?.email
                }, 'Registration attempt with existing email - found user');
                return reply.code(409).send({
                    error: 'email_exists',
                    message: 'An account with this email already exists'
                });
            }
            request.log.info({ email, normalizedEmail }, 'Email is available, proceeding with registration');
            // Create user
            let user;
            try {
                request.log.info({ email: normalizedEmail }, 'Calling createUser service');
                user = await (0, userService_1.createUser)({
                    email,
                    password,
                    displayName
                });
                request.log.info({ userId: user.id, email: user.email }, 'User created successfully in service');
            }
            catch (error) {
                request.log.error({
                    error: error.message,
                    errorStack: error.stack,
                    email: normalizedEmail
                }, 'User creation failed in service');
                // Check if it's a unique constraint error
                if (error.message?.includes('already exists') || error.message?.includes('email')) {
                    return reply.code(409).send({
                        error: 'email_exists',
                        message: 'An account with this email already exists'
                    });
                }
                return reply.code(500).send({
                    error: 'server_error',
                    message: error.message || 'Failed to create user account. Please try again.'
                });
            }
            // The user creation already includes verification in the adapter
            // But we do an additional check here with retry logic for database consistency
            let verifiedUser = await (0, userService_1.findUserById)(user.id);
            let retries = 0;
            const maxRetries = 3;
            while (!verifiedUser && retries < maxRetries) {
                // Wait before retry (exponential backoff: 50ms, 100ms, 200ms)
                await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, retries)));
                verifiedUser = await (0, userService_1.findUserById)(user.id);
                retries++;
            }
            if (!verifiedUser) {
                request.log.error({
                    userId: user.id,
                    email: normalizedEmail,
                    userEmail: user.email,
                    retries
                }, 'User creation verification failed - user not found after creation and retries');
                return reply.code(500).send({
                    error: 'server_error',
                    message: 'Failed to create user account. Please try again.'
                });
            }
            // Create and send verification email (fire-and-forget)
            (0, emailVerificationService_1.createVerificationToken)(verifiedUser.id, verifiedUser.email, verifiedUser.displayName).catch(error => {
                request.log.error({ error, userId: verifiedUser.id }, 'Failed to send verification email');
                // Don't fail registration if email sending fails
            });
            // Generate JWT token with tokenVersion
            const token = (0, auth_1.issueToken)({
                id: verifiedUser.id,
                email: verifiedUser.email,
                tokenVersion: verifiedUser.tokenVersion || 1
            });
            // Set HTTP-only cookie (optional, controlled by USE_COOKIE_AUTH env var)
            const nodeEnv = process.env.NODE_ENV || 'development';
            const useCookieAuth = process.env.USE_COOKIE_AUTH === 'true';
            if (useCookieAuth) {
                const isProduction = nodeEnv === 'production';
                // Type assertion for cookie support (requires @fastify/cookie plugin)
                const replyWithCookies = reply;
                if (replyWithCookies.setCookie) {
                    replyWithCookies.setCookie('safenode_token', token, {
                        httpOnly: true,
                        secure: isProduction, // true in prod, false on localhost
                        sameSite: isProduction ? 'none' : 'lax', // none in prod (for cross-origin), lax in dev
                        maxAge: 24 * 60 * 60, // 24 hours
                        path: '/'
                    });
                }
            }
            // Set user context in Sentry
            (0, sentryService_1.setUser)({
                id: verifiedUser.id,
                email: verifiedUser.email,
                username: verifiedUser.displayName
            });
            // Return user data (exclude sensitive fields) - format: { token, userId, user }
            return reply.code(200).send({
                success: true,
                token,
                userId: verifiedUser.id,
                user: {
                    id: verifiedUser.id,
                    email: verifiedUser.email,
                    displayName: verifiedUser.displayName,
                    emailVerified: verifiedUser.emailVerified,
                    subscriptionTier: verifiedUser.subscriptionTier,
                    subscriptionStatus: verifiedUser.subscriptionStatus,
                    twoFactorEnabled: verifiedUser.twoFactorEnabled,
                    biometricEnabled: verifiedUser.biometricEnabled,
                    createdAt: verifiedUser.createdAt,
                    lastLoginAt: verifiedUser.lastLoginAt
                }
            });
        }
        catch (error) {
            request.log.error(error);
            // Capture error in Sentry
            const body = request.body;
            (0, sentryService_1.captureException)(error, {
                context: 'user_registration',
                email: body?.email
            });
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to register user'
            });
        }
    });
    /**
     * POST /api/auth/login
     * Authenticate user and return JWT token
     */
    server.post('/api/auth/login', async (request, reply) => {
        try {
            const body = request.body;
            // Validate body exists
            if (body === undefined || body === null) {
                return reply.code(400).send({
                    error: 'invalid_request',
                    message: 'Request body is missing or invalid. Please ensure Content-Type is application/json.'
                });
            }
            // Validate input
            const validation = loginSchema.safeParse(body);
            if (!validation.success) {
                request.log.warn({ errors: validation.error.errors }, 'Validation failed');
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid email or password',
                    details: validation.error.errors
                });
            }
            const { email, password } = validation.data;
            const normalizedEmail = email.toLowerCase().trim();
            // Authenticate user with timeout
            let authResult;
            try {
                const authPromise = (0, userService_1.authenticateUser)(normalizedEmail, password);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Authentication timeout')), 30000));
                authResult = await Promise.race([authPromise, timeoutPromise]);
            }
            catch (authError) {
                request.log.error({ error: authError?.message }, 'Authentication error');
                return reply.code(500).send({
                    error: 'auth_error',
                    code: 'AUTH_ERROR',
                    message: authError?.message === 'Authentication timeout'
                        ? 'Authentication request timed out. Please try again.'
                        : 'Authentication failed'
                });
            }
            // Handle failed authentication
            if (authResult.reason === 'USER_NOT_FOUND' || authResult.reason === 'BAD_PASSWORD') {
                return reply.code(401).send({
                    error: 'invalid_credentials',
                    code: authResult.reason,
                    message: 'Invalid email or password'
                });
            }
            const user = authResult.user;
            if (!user) {
                // Fallback (should not happen)
                return reply.code(401).send({
                    error: 'invalid_credentials',
                    code: 'AUTH_FAILED',
                    message: 'Invalid email or password'
                });
            }
            // Check email verification status
            if (!user.emailVerified && config_1.config.nodeEnv === 'production') {
                return reply.code(403).send({
                    error: 'email_not_verified',
                    message: 'Please verify your email before logging in'
                });
            }
            else if (!user.emailVerified) {
                request.log.warn({ userId: user.id, email: user.email }, 'User login attempted with unverified email');
            }
            // Check if 2FA is enabled
            if (user.twoFactorEnabled) {
                // Return partial success - requires 2FA verification
                return reply.code(200).send({
                    success: true,
                    requiresTwoFactor: true,
                    message: '2FA verification required',
                    user: {
                        id: user.id,
                        email: user.email,
                        displayName: user.displayName,
                        emailVerified: user.emailVerified,
                        twoFactorEnabled: true
                    }
                });
            }
            // Sanity check: Verify user exists and audit log succeeds after login
            // This ensures data consistency
            try {
                const verifyUser = await (0, userService_1.findUserById)(user.id);
                if (!verifyUser) {
                    request.log.error({ userId: user.id }, 'User not found after login - data inconsistency');
                    return reply.code(500).send({
                        error: 'internal_error',
                        message: 'Login verification failed. Please try again.'
                    });
                }
                // Log successful login with structured logging
                await (0, auditLogService_1.createAuditLog)({
                    userId: user.id,
                    action: 'login',
                    ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                    userAgent: request.headers['user-agent'] || undefined
                });
            }
            catch (err) {
                request.log.error({
                    error: err?.message,
                    userId: user.id
                }, 'Failed to verify login or create audit log');
                // Don't fail login if audit log fails, but log the error
            }
            // Generate JWT token (no 2FA required) with tokenVersion
            const token = (0, auth_1.issueToken)({
                id: user.id,
                email: user.email,
                tokenVersion: user.tokenVersion || 1
            });
            // Set HTTP-only cookie (optional, controlled by USE_COOKIE_AUTH env var)
            const nodeEnv = process.env.NODE_ENV || 'development';
            const useCookieAuth = process.env.USE_COOKIE_AUTH === 'true';
            if (useCookieAuth) {
                const isProduction = nodeEnv === 'production';
                // Type assertion for cookie support (requires @fastify/cookie plugin)
                const replyWithCookies = reply;
                if (replyWithCookies.setCookie) {
                    replyWithCookies.setCookie('safenode_token', token, {
                        httpOnly: true,
                        secure: isProduction, // true in prod, false on localhost
                        sameSite: isProduction ? 'none' : 'lax', // none in prod (for cross-origin), lax in dev
                        maxAge: 24 * 60 * 60, // 24 hours
                        path: '/'
                    });
                }
            }
            // Return user data (exclude sensitive fields) - format: { token, userId, user }
            return reply.code(200).send({
                success: true,
                token,
                userId: user.id,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    emailVerified: user.emailVerified,
                    subscriptionTier: user.subscriptionTier,
                    lastLoginAt: user.lastLoginAt,
                    twoFactorEnabled: user.twoFactorEnabled,
                    biometricEnabled: user.biometricEnabled
                }
            });
        }
        catch (error) {
            request.log.error({ error, stack: error?.stack, email: request.body?.email }, 'Login error');
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to authenticate user',
                details: process.env.NODE_ENV === 'development' ? error?.message : undefined
            });
        }
    });
    /**
     * GET /api/auth/me
     * Get current user information (requires authentication)
     */
    server.get('/api/auth/me', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            request.log.info({ userId: user.id, email: user.email }, 'GET /api/auth/me request');
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                // If JWT is valid but user doesn't exist, token is invalid (user deleted or token issued before reseed)
                // Return 401 with machine-readable code for frontend to handle
                const dbUrl = process.env.DATABASE_URL || 'not_set';
                const dbUrlHash = dbUrl ? require('crypto').createHash('sha256').update(dbUrl).digest('hex').substring(0, 8) : 'unknown';
                request.log.warn({
                    userId: user.id,
                    tokenSub: user.id,
                    dbUrlHash,
                    schema: 'public',
                    reason: 'user_not_found_after_token_verification'
                }, 'User not found in database - token invalid');
                return reply.code(401).send({
                    error: 'unauthorized',
                    code: 'USER_NOT_FOUND',
                    message: 'User not found - authentication invalid'
                });
            }
            request.log.info({ userId: userData.id }, 'User data fetched successfully');
            // Return user data (exclude sensitive fields)
            const response = {
                id: userData.id,
                email: userData.email,
                displayName: userData.displayName,
                emailVerified: userData.emailVerified,
                subscriptionTier: userData.subscriptionTier,
                subscriptionStatus: userData.subscriptionStatus,
                twoFactorEnabled: userData.twoFactorEnabled,
                biometricEnabled: userData.biometricEnabled,
                devices: userData.devices,
                createdAt: userData.createdAt,
                lastLoginAt: userData.lastLoginAt
            };
            return reply.code(200).send(response);
        }
        catch (error) {
            request.log.error({ error: error?.message, stack: error?.stack }, 'Error in GET /api/auth/me');
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch user data'
            });
        }
    });
    /**
     * POST /api/auth/vault/init
     * Initialize vault with master password (first-time setup)
     * Creates encrypted vault and stores salt
     */
    server.post('/api/auth/vault/init', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            // Validate input
            const validation = vaultUpdateSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid vault data',
                    details: validation.error.errors
                });
            }
            const { encryptedVault, iv, version } = validation.data;
            // Update user vault (salt is generated on registration)
            const updated = await (0, userService_1.updateVault)(user.id, encryptedVault, iv, version);
            if (!updated) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            return {
                success: true,
                message: 'Vault initialized successfully',
                version: updated.vaultVersion
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to initialize vault'
            });
        }
    });
    /**
     * GET /api/auth/vault/salt
     * Get vault salt for master password derivation (requires authentication)
     * If no salt exists, generates one (32 bytes, base64 encoded)
     */
    server.get('/api/auth/vault/salt', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            // If user doesn't have a salt yet, generate one
            let salt = userData.vaultSalt;
            if (!salt || salt.length === 0) {
                const { randomBytes } = await Promise.resolve().then(() => __importStar(require('crypto')));
                salt = randomBytes(32).toString('base64');
                // Save the generated salt
                await (0, userService_1.updateUser)(user.id, { vaultSalt: salt });
                request.log.info({ userId: user.id }, 'Generated new vault salt for user');
            }
            return {
                salt
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch vault salt'
            });
        }
    });
    /**
     * POST /api/auth/vault/save
     * Save encrypted vault (requires authentication)
     */
    server.post('/api/auth/vault/save', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            // Validate input
            const validation = vaultUpdateSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid vault data',
                    details: validation.error.errors
                });
            }
            const { encryptedVault, iv, version } = validation.data;
            // Update vault
            const updated = await (0, userService_1.updateVault)(user.id, encryptedVault, iv, version);
            if (!updated) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            return {
                success: true,
                version: updated.vaultVersion
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to save vault'
            });
        }
    });
    /**
     * GET /api/auth/vault/latest
     * Get latest encrypted vault (requires authentication)
     */
    server.get('/api/auth/vault/latest', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const query = request.query;
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            // Check if vault exists - must have encrypted data, IV, and salt
            if (!userData.vaultEncrypted || !userData.vaultIV || !userData.vaultSalt || userData.vaultSalt.length === 0) {
                return {
                    exists: false
                };
            }
            // Validate vault data format (must be valid base64 strings)
            try {
                // Validate that encrypted data, IV, and salt are valid base64 strings
                if (typeof userData.vaultEncrypted !== 'string' || userData.vaultEncrypted.trim().length === 0) {
                    return {
                        exists: false
                    };
                }
                if (typeof userData.vaultIV !== 'string' || userData.vaultIV.trim().length === 0) {
                    return {
                        exists: false
                    };
                }
                if (typeof userData.vaultSalt !== 'string' || userData.vaultSalt.trim().length === 0) {
                    return {
                        exists: false
                    };
                }
                // Try to decode to validate base64 format (but don't use the result)
                Buffer.from(userData.vaultEncrypted, 'base64');
                Buffer.from(userData.vaultIV, 'base64');
                Buffer.from(userData.vaultSalt, 'base64');
            }
            catch (error) {
                // Invalid base64 data - vault is corrupted or not initialized
                request.log.warn({ userId: user.id }, 'Vault data has invalid base64 format');
                return {
                    exists: false
                };
            }
            // Check if client has latest version
            if (query?.since) {
                const since = parseInt(query.since, 10);
                if (!isNaN(since) && userData.vaultVersion && since >= userData.vaultVersion) {
                    return {
                        upToDate: true,
                        version: userData.vaultVersion
                    };
                }
            }
            // Return vault data
            return {
                exists: true,
                encryptedVault: userData.vaultEncrypted,
                iv: userData.vaultIV,
                version: userData.vaultVersion,
                salt: userData.vaultSalt
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch vault'
            });
        }
    });
    /**
     * POST /api/auth/refresh
     * Refresh JWT token (requires valid token)
     */
    server.post('/api/auth/refresh', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            if (!user || !user.id) {
                return reply.code(401).send({
                    error: 'unauthorized',
                    message: 'Invalid token'
                });
            }
            // Fetch fresh user data
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(401).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            // Issue new token
            const newToken = (0, auth_1.issueToken)({
                id: userData.id,
                email: userData.email,
                tokenVersion: userData.tokenVersion || 1
            });
            return {
                token: newToken,
                user: {
                    id: userData.id,
                    email: userData.email,
                    displayName: userData.displayName
                }
            };
        }
        catch (error) {
            request.log.error({ error: error?.message }, 'Token refresh failed');
            return reply.code(500).send({
                error: 'server_error',
                message: 'Failed to refresh token'
            });
        }
    });
    /**
     * POST /api/auth/verify
     * Verify JWT token validity
     */
    server.post('/api/auth/verify', async (request, reply) => {
        try {
            const { token } = request.body;
            if (!token) {
                return reply.code(400).send({
                    valid: false,
                    error: 'missing_token',
                    message: 'Token is required'
                });
            }
            const { verifyToken } = await Promise.resolve().then(() => __importStar(require('../middleware/auth.js')));
            const payload = verifyToken(token);
            if (!payload) {
                return reply.code(401).send({
                    valid: false,
                    error: 'invalid_token',
                    message: 'Token is invalid or expired'
                });
            }
            // Fetch user data
            const user = await (0, userService_1.findUserById)(payload.userId);
            if (!user) {
                return reply.code(401).send({
                    valid: false,
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            return {
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName
                }
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to verify token'
            });
        }
    });
    /**
     * POST /api/auth/send-verification
     * Resend email verification (requires authentication)
     */
    server.post('/api/auth/send-verification', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            if (userData.emailVerified) {
                return reply.code(400).send({
                    error: 'already_verified',
                    message: 'Email is already verified'
                });
            }
            // Resend verification email
            await (0, emailVerificationService_1.resendVerificationEmail)(userData.email);
            return {
                success: true,
                message: 'Verification email sent'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to send verification email'
            });
        }
    });
    /**
     * GET /api/auth/verify/:token
     * Verify email token
     */
    server.get('/api/auth/verify/:token', async (request, reply) => {
        try {
            const { token } = request.params;
            if (!token) {
                return reply.code(400).send({
                    error: 'missing_token',
                    message: 'Verification token is required'
                });
            }
            const result = await (0, emailVerificationService_1.verifyEmailToken)(token);
            if (!result.success) {
                return reply.code(400).send({
                    error: 'verification_failed',
                    message: result.error || 'Invalid or expired verification token'
                });
            }
            return {
                success: true,
                message: 'Email verified successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to verify email'
            });
        }
    });
    /**
     * POST /api/auth/2fa/setup
     * Generate 2FA secret and QR code (requires authentication)
     */
    server.post('/api/auth/2fa/setup', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            if (userData.twoFactorEnabled) {
                return reply.code(400).send({
                    error: 'already_enabled',
                    message: '2FA is already enabled'
                });
            }
            // Generate TOTP secret
            const totpSecret = await (0, totp_1.generateTOTPSecret)(userData.id, userData.email, 'SafeNode');
            // Generate backup codes
            const backupCodes = (0, totp_1.generateBackupCodes)(10);
            // Store secret and backup codes (but don't enable 2FA yet - user needs to verify first)
            await (0, userService_1.updateUser)(userData.id, {
                twoFactorSecret: totpSecret.secret,
                twoFactorBackupCodes: backupCodes
            });
            return {
                success: true,
                secret: totpSecret.secret,
                qrCodeUrl: totpSecret.qrCodeUrl,
                manualEntryKey: totpSecret.manualEntryKey,
                backupCodes
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to setup 2FA'
            });
        }
    });
    /**
     * POST /api/auth/2fa/verify
     * Verify 2FA code and enable 2FA (requires authentication)
     */
    server.post('/api/auth/2fa/verify', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            if (!body.code) {
                return reply.code(400).send({
                    error: 'missing_code',
                    message: '2FA code is required'
                });
            }
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            if (!userData.twoFactorSecret) {
                return reply.code(400).send({
                    error: 'no_secret',
                    message: '2FA secret not found. Please setup 2FA first.'
                });
            }
            // Verify TOTP code
            const verifyResult = (0, totp_1.verifyTOTP)(userData.twoFactorSecret, body.code);
            if (!verifyResult.valid) {
                return reply.code(400).send({
                    error: 'invalid_code',
                    message: 'Invalid 2FA code'
                });
            }
            // Enable 2FA
            await (0, userService_1.updateUser)(userData.id, {
                twoFactorEnabled: true
            });
            return {
                success: true,
                message: '2FA enabled successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to verify 2FA code'
            });
        }
    });
    /**
     * POST /api/auth/2fa/disable
     * Disable 2FA (requires authentication)
     */
    server.post('/api/auth/2fa/disable', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            if (!body.password) {
                return reply.code(400).send({
                    error: 'missing_password',
                    message: 'Password is required to disable 2FA'
                });
            }
            const userData = await (0, userService_1.findUserById)(user.id);
            if (!userData) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'User not found'
                });
            }
            // Verify password
            const authResult = await (0, userService_1.authenticateUser)(userData.email, body.password);
            if (!authResult) {
                return reply.code(401).send({
                    error: 'invalid_password',
                    message: 'Invalid password'
                });
            }
            // If code provided, verify it
            if (body.code && userData.twoFactorSecret) {
                const verifyResult = (0, totp_1.verifyTOTP)(userData.twoFactorSecret, body.code);
                if (!verifyResult.valid) {
                    return reply.code(400).send({
                        error: 'invalid_code',
                        message: 'Invalid 2FA code'
                    });
                }
            }
            else if (body.backupCode && userData.twoFactorBackupCodes) {
                // Verify backup code
                const backupResult = (0, totp_1.verifyBackupCode)(userData.twoFactorBackupCodes, body.backupCode);
                if (!backupResult.valid) {
                    return reply.code(400).send({
                        error: 'invalid_backup_code',
                        message: 'Invalid backup code'
                    });
                }
                // Update backup codes
                await (0, userService_1.updateUser)(userData.id, {
                    twoFactorBackupCodes: backupResult.remainingCodes
                });
            }
            else {
                return reply.code(400).send({
                    error: 'missing_code',
                    message: '2FA code or backup code is required'
                });
            }
            // Disable 2FA
            await (0, userService_1.updateUser)(userData.id, {
                twoFactorEnabled: false,
                twoFactorSecret: undefined,
                twoFactorBackupCodes: []
            });
            // Log 2FA disable
            (0, auditLogService_1.createAuditLog)({
                userId: userData.id,
                action: '2fa_disabled',
                ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                userAgent: request.headers['user-agent'] || undefined
            }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'));
            return {
                success: true,
                message: '2FA disabled successfully'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to disable 2FA'
            });
        }
    });
    /**
     * POST /api/auth/2fa/verify-login
     * Verify 2FA code during login (after password verification)
     */
    server.post('/api/auth/2fa/verify-login', async (request, reply) => {
        try {
            const body = request.body;
            if (!body.email || !body.password) {
                return reply.code(400).send({
                    error: 'missing_credentials',
                    message: 'Email and password are required'
                });
            }
            // Authenticate user
            const authResult = await (0, userService_1.authenticateUser)(body.email, body.password);
            if (authResult.reason !== 'SUCCESS' || !authResult.user) {
                return reply.code(401).send({
                    error: 'invalid_credentials',
                    message: 'Invalid email or password'
                });
            }
            // Type guard: at this point, authResult.user is guaranteed to be non-null
            const user = authResult.user;
            if (!user.twoFactorEnabled) {
                return reply.code(400).send({
                    error: '2fa_not_enabled',
                    message: '2FA is not enabled for this account'
                });
            }
            // Verify 2FA code or backup code
            let verified = false;
            if (body.code && user.twoFactorSecret) {
                const verifyResult = (0, totp_1.verifyTOTP)(user.twoFactorSecret, body.code);
                verified = verifyResult.valid;
            }
            else if (body.backupCode && user.twoFactorBackupCodes) {
                const backupResult = (0, totp_1.verifyBackupCode)(user.twoFactorBackupCodes, body.backupCode);
                verified = backupResult.valid;
                if (verified) {
                    // Update backup codes
                    await (0, userService_1.updateUser)(user.id, {
                        twoFactorBackupCodes: backupResult.remainingCodes
                    });
                }
            }
            else {
                return reply.code(400).send({
                    error: 'missing_code',
                    message: '2FA code or backup code is required'
                });
            }
            if (!verified) {
                return reply.code(401).send({
                    error: 'invalid_code',
                    message: 'Invalid 2FA code or backup code'
                });
            }
            // Generate JWT token
            const token = (0, auth_1.issueToken)({
                id: user.id,
                email: user.email,
                tokenVersion: user.tokenVersion || 1
            });
            // Return user data
            return {
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    emailVerified: user.emailVerified,
                    subscriptionTier: user.subscriptionTier,
                    lastLoginAt: user.lastLoginAt,
                    twoFactorEnabled: user.twoFactorEnabled,
                    biometricEnabled: user.biometricEnabled
                }
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to verify 2FA code'
            });
        }
    });
    /**
     * POST /api/auth/forgot-password
     * Request a password reset email
     * Always returns success to avoid revealing if user exists
     */
    server.post('/api/auth/forgot-password', async (request, reply) => {
        try {
            const body = request.body;
            const forgotPasswordSchema = zod_1.z.object({
                email: zod_1.z.string().email('Invalid email address')
            });
            const validation = forgotPasswordSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid email address',
                    details: validation.error.errors
                });
            }
            const { email } = validation.data;
            // Create reset token and send email (always returns success)
            await (0, passwordResetService_1.createPasswordResetToken)(email);
            return {
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent.'
            };
        }
        catch (error) {
            request.log.error(error);
            // Still return success to avoid revealing information
            return {
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent.'
            };
        }
    });
    /**
     * POST /api/auth/reset-password
     * Reset password using a valid token
     */
    server.post('/api/auth/reset-password', async (request, reply) => {
        try {
            const body = request.body;
            const resetPasswordSchema = zod_1.z.object({
                token: zod_1.z.string().min(1, 'Reset token is required'),
                newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters')
            });
            const validation = resetPasswordSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { token, newPassword } = validation.data;
            const result = await (0, passwordResetService_1.resetPassword)(token, newPassword);
            if (!result.success) {
                return reply.code(400).send({
                    error: 'reset_failed',
                    message: result.error || 'Failed to reset password'
                });
            }
            return {
                success: true,
                message: 'Password has been reset successfully. Please log in with your new password.'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to reset password'
            });
        }
    });
    /**
     * DELETE /api/auth/account
     * Permanently delete the authenticated user's account and all associated data
     * Requires password confirmation for safety
     */
    server.delete('/api/auth/account', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            // Require password confirmation
            const validation = zod_1.z.object({
                password: zod_1.z.string().min(1, 'Password is required for account deletion')
            }).safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Password confirmation is required to delete your account',
                    details: validation.error.errors
                });
            }
            // Verify the password matches
            const authResult = await (0, userService_1.authenticateUser)(user.email, validation.data.password);
            if (authResult.reason !== 'SUCCESS' || !authResult.user) {
                return reply.code(401).send({
                    error: 'invalid_credentials',
                    message: 'Incorrect password. Account deletion cancelled.'
                });
            }
            // Log the deletion before it happens
            await (0, auditLogService_1.createAuditLog)({
                userId: user.id,
                action: 'account_deleted',
                resourceType: 'user',
                resourceId: user.id,
                metadata: { email: user.email },
                ipAddress: request.ip || request.headers['x-forwarded-for'] || undefined,
                userAgent: request.headers['user-agent'] || undefined
            }).catch(() => { }); // Don't fail if audit log fails
            // Delete the user (cascades to all related data)
            const deleted = await (0, userService_1.deleteUser)(user.id);
            if (!deleted) {
                return reply.code(404).send({
                    error: 'user_not_found',
                    message: 'Account not found'
                });
            }
            return {
                success: true,
                message: 'Your account and all associated data have been permanently deleted.'
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to delete account'
            });
        }
    });
}
