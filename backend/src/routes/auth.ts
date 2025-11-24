/**
 * Authentication Routes
 * Production-ready authentication endpoints
 */

import { FastifyInstance } from 'fastify'
import { issueToken, requireAuth } from '../middleware/auth'
import { setUser, captureException, addBreadcrumb } from '../services/sentryService'
import {
  createUser,
  authenticateUser,
  findUserById,
  findUserByEmail,
  emailExists,
  updateVault
} from '../services/userService'
import { createVerificationToken, verifyEmailToken, resendVerificationEmail } from '../services/emailVerificationService'
import { generateTOTPSecret, verifyTOTP, generateBackupCodes, verifyBackupCode } from '../lib/totp'
import { updateUser } from '../services/userService'
import { createAuditLog } from '../services/auditLogService'
import { config } from '../config'
import { User } from '../models/User'
import { z } from 'zod'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

const vaultUpdateSchema = z.object({
  encryptedVault: z.string().min(1, 'Encrypted vault is required'),
  iv: z.string().min(1, 'IV is required'),
  version: z.number().int().positive('Version must be a positive integer')
})

/**
 * Register authentication routes
 */
export async function registerAuthRoutes(server: FastifyInstance) {
  /**
   * POST /api/auth/register
   * Register a new user account
   */
  server.post('/api/auth/register', async (request, reply) => {
    try {
      const body = request.body as any
      
      // Validate input
      const validation = registerSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { email, password, displayName } = validation.data

      // Check if email already exists
      const exists = await emailExists(email)
      if (exists) {
        return reply.code(409).send({
          error: 'email_exists',
          message: 'An account with this email already exists'
        })
      }

      // Create user
      const user = await createUser({
        email,
        password,
        displayName
      })

      // Create and send verification email (fire-and-forget)
      createVerificationToken(user.id, user.email, user.displayName).catch(error => {
        request.log.error({ error, userId: user.id }, 'Failed to send verification email')
        // Don't fail registration if email sending fails
      })

              // Generate JWT token
              const token = issueToken({
                id: user.id,
                email: user.email
              })

              // Set user context in Sentry
              setUser({
                id: user.id,
                email: user.email,
                username: user.displayName
              })

              // Return user data (exclude sensitive fields)
              return {
                success: true,
                token,
                user: {
                  id: user.id,
                  email: user.email,
                  displayName: user.displayName,
                  emailVerified: user.emailVerified,
                  subscriptionTier: user.subscriptionTier,
                  createdAt: user.createdAt
                }
              }
            } catch (error: any) {
              request.log.error(error)
              
              // Capture error in Sentry
              const body = request.body as any
              captureException(error, {
                context: 'user_registration',
                email: body?.email
              })
              
              return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to register user'
              })
            }
  })
  
  /**
   * POST /api/auth/login
   * Authenticate user and return JWT token
   */
  server.post('/api/auth/login', async (request, reply) => {
    try {
      const body = request.body as any
      
      // Validate input
      const validation = loginSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid email or password',
          details: validation.error.errors
        })
      }

      const { email, password } = validation.data

      // Authenticate user
      let user: User | null
      try {
        user = await authenticateUser(email, password)
      } catch (authError: any) {
        request.log.error({ error: authError, email }, 'Authentication error')
        return reply.code(500).send({
          error: 'auth_error',
          message: 'Authentication failed',
          details: authError?.message
        })
      }
      
      if (!user) {
        return reply.code(401).send({
          error: 'invalid_credentials',
          message: 'Invalid email or password'
        })
      }

      // Check email verification status
      if (!user.emailVerified && config.nodeEnv === 'production') {
        return reply.code(403).send({
          error: 'email_not_verified',
          message: 'Please verify your email before logging in'
        })
      } else if (!user.emailVerified) {
        request.log.warn({ userId: user.id, email: user.email }, 'User login attempted with unverified email')
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
        })
      }
      
      // Generate JWT token (no 2FA required)
      const token = issueToken({
        id: user.id,
        email: user.email
      })

      // Log successful login
      createAuditLog({
        userId: user.id,
        action: 'login',
        ipAddress: request.ip || request.headers['x-forwarded-for'] as string || undefined,
        userAgent: request.headers['user-agent'] || undefined
      }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'))

      // Return user data (exclude sensitive fields)
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
      }
    } catch (error: any) {
      request.log.error({ error, stack: error?.stack, email: (request.body as any)?.email }, 'Login error')
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to authenticate user',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      })
    }
  })

  /**
   * GET /api/auth/me
   * Get current user information (requires authentication)
   */
  server.get('/api/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      
      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      // Return user data (exclude sensitive fields)
      return {
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
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch user data'
      })
    }
  })

  /**
   * POST /api/auth/vault/init
   * Initialize vault with master password (first-time setup)
   * Creates encrypted vault and stores salt
   */
  server.post('/api/auth/vault/init', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      // Validate input
      const validation = vaultUpdateSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid vault data',
          details: validation.error.errors
        })
      }

      const { encryptedVault, iv, version } = validation.data

      // Update user vault (salt is generated on registration)
      const updated = await updateVault(user.id, encryptedVault, iv, version)

      if (!updated) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      return {
        success: true,
        message: 'Vault initialized successfully',
        version: updated.vaultVersion
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to initialize vault'
      })
    }
  })

  /**
   * GET /api/auth/vault/salt
   * Get vault salt for master password derivation (requires authentication)
   */
  server.get('/api/auth/vault/salt', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      
      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      return {
        salt: userData.vaultSalt
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch vault salt'
      })
    }
  })

  /**
   * POST /api/auth/vault/save
   * Save encrypted vault (requires authentication)
   */
  server.post('/api/auth/vault/save', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      // Validate input
      const validation = vaultUpdateSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid vault data',
          details: validation.error.errors
        })
      }

      const { encryptedVault, iv, version } = validation.data

      // Update vault
      const updated = await updateVault(user.id, encryptedVault, iv, version)

      if (!updated) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      return {
        success: true,
        version: updated.vaultVersion
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to save vault'
      })
    }
  })

  /**
   * GET /api/auth/vault/latest
   * Get latest encrypted vault (requires authentication)
   */
  server.get('/api/auth/vault/latest', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const query = request.query as { since?: string }
      
      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      // Check if vault exists
      if (!userData.vaultEncrypted || !userData.vaultIV) {
        return {
          exists: false
        }
      }

      // Check if client has latest version
      if (query?.since) {
        const since = parseInt(query.since, 10)
        if (!isNaN(since) && userData.vaultVersion && since >= userData.vaultVersion) {
          return {
            upToDate: true,
            version: userData.vaultVersion
          }
        }
      }

      // Return vault data
      return {
        exists: true,
        encryptedVault: userData.vaultEncrypted,
        iv: userData.vaultIV,
        version: userData.vaultVersion,
        salt: userData.vaultSalt
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch vault'
      })
    }
  })
  
  /**
   * POST /api/auth/verify
   * Verify JWT token validity
   */
  server.post('/api/auth/verify', async (request, reply) => {
    try {
      const { token } = request.body as { token?: string }
      
      if (!token) {
        return reply.code(400).send({
          valid: false,
          error: 'missing_token',
          message: 'Token is required'
        })
      }
      
      const { verifyToken } = await import('../middleware/auth.js')
      const payload = verifyToken(token)
      
      if (!payload) {
        return reply.code(401).send({
          valid: false,
          error: 'invalid_token',
          message: 'Token is invalid or expired'
        })
      }
      
      // Fetch user data
      const user = await findUserById(payload.userId)
      
      if (!user) {
        return reply.code(401).send({
          valid: false,
          error: 'user_not_found',
          message: 'User not found'
        })
      }
      
      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        }
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to verify token'
      })
    }
  })

  /**
   * POST /api/auth/send-verification
   * Resend email verification (requires authentication)
   */
  server.post('/api/auth/send-verification', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      
      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      if (userData.emailVerified) {
        return reply.code(400).send({
          error: 'already_verified',
          message: 'Email is already verified'
        })
      }

      // Resend verification email
      await resendVerificationEmail(userData.email)

      return {
        success: true,
        message: 'Verification email sent'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to send verification email'
      })
    }
  })

  /**
   * GET /api/auth/verify/:token
   * Verify email token
   */
  server.get('/api/auth/verify/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      
      if (!token) {
        return reply.code(400).send({
          error: 'missing_token',
          message: 'Verification token is required'
        })
      }

      const result = await verifyEmailToken(token)

      if (!result.success) {
        return reply.code(400).send({
          error: 'verification_failed',
          message: result.error || 'Invalid or expired verification token'
        })
      }

      return {
        success: true,
        message: 'Email verified successfully'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to verify email'
      })
    }
  })

  /**
   * POST /api/auth/2fa/setup
   * Generate 2FA secret and QR code (requires authentication)
   */
  server.post('/api/auth/2fa/setup', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      
      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      if (userData.twoFactorEnabled) {
        return reply.code(400).send({
          error: 'already_enabled',
          message: '2FA is already enabled'
        })
      }

      // Generate TOTP secret
      const totpSecret = await generateTOTPSecret(
        userData.id,
        userData.email,
        'SafeNode'
      )

      // Generate backup codes
      const backupCodes = generateBackupCodes(10)

      // Store secret and backup codes (but don't enable 2FA yet - user needs to verify first)
      await updateUser(userData.id, {
        twoFactorSecret: totpSecret.secret,
        twoFactorBackupCodes: backupCodes
      })

      return {
        success: true,
        secret: totpSecret.secret,
        qrCodeUrl: totpSecret.qrCodeUrl,
        manualEntryKey: totpSecret.manualEntryKey,
        backupCodes
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to setup 2FA'
      })
    }
  })

  /**
   * POST /api/auth/2fa/verify
   * Verify 2FA code and enable 2FA (requires authentication)
   */
  server.post('/api/auth/2fa/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as { code: string }
      
      if (!body.code) {
        return reply.code(400).send({
          error: 'missing_code',
          message: '2FA code is required'
        })
      }

      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      if (!userData.twoFactorSecret) {
        return reply.code(400).send({
          error: 'no_secret',
          message: '2FA secret not found. Please setup 2FA first.'
        })
      }

      // Verify TOTP code
      const verifyResult = verifyTOTP(userData.twoFactorSecret, body.code)

      if (!verifyResult.valid) {
        return reply.code(400).send({
          error: 'invalid_code',
          message: 'Invalid 2FA code'
        })
      }

      // Enable 2FA
      await updateUser(userData.id, {
        twoFactorEnabled: true
      })

      return {
        success: true,
        message: '2FA enabled successfully'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to verify 2FA code'
      })
    }
  })

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA (requires authentication)
   */
  server.post('/api/auth/2fa/disable', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as { password: string; code?: string; backupCode?: string }
      
      if (!body.password) {
        return reply.code(400).send({
          error: 'missing_password',
          message: 'Password is required to disable 2FA'
        })
      }

      const userData = await findUserById(user.id)
      
      if (!userData) {
        return reply.code(404).send({
          error: 'user_not_found',
          message: 'User not found'
        })
      }

      // Verify password
      const authResult = await authenticateUser(userData.email, body.password)
      if (!authResult) {
        return reply.code(401).send({
          error: 'invalid_password',
          message: 'Invalid password'
        })
      }

      // If code provided, verify it
      if (body.code && userData.twoFactorSecret) {
        const verifyResult = verifyTOTP(userData.twoFactorSecret, body.code)
        if (!verifyResult.valid) {
          return reply.code(400).send({
            error: 'invalid_code',
            message: 'Invalid 2FA code'
          })
        }
      } else if (body.backupCode && userData.twoFactorBackupCodes) {
        // Verify backup code
        const backupResult = verifyBackupCode(userData.twoFactorBackupCodes, body.backupCode)
        if (!backupResult.valid) {
          return reply.code(400).send({
            error: 'invalid_backup_code',
            message: 'Invalid backup code'
          })
        }
        // Update backup codes
        await updateUser(userData.id, {
          twoFactorBackupCodes: backupResult.remainingCodes
        })
      } else {
        return reply.code(400).send({
          error: 'missing_code',
          message: '2FA code or backup code is required'
        })
      }

      // Disable 2FA
      await updateUser(userData.id, {
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: []
      })

      // Log 2FA disable
      createAuditLog({
        userId: userData.id,
        action: '2fa_disabled',
        ipAddress: request.ip || request.headers['x-forwarded-for'] as string || undefined,
        userAgent: request.headers['user-agent'] || undefined
      }).catch(err => request.log.warn({ error: err }, 'Failed to create audit log'))

      return {
        success: true,
        message: '2FA disabled successfully'
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to disable 2FA'
      })
    }
  })

  /**
   * POST /api/auth/2fa/verify-login
   * Verify 2FA code during login (after password verification)
   */
  server.post('/api/auth/2fa/verify-login', async (request, reply) => {
    try {
      const body = request.body as { email: string; password: string; code?: string; backupCode?: string }
      
      if (!body.email || !body.password) {
        return reply.code(400).send({
          error: 'missing_credentials',
          message: 'Email and password are required'
        })
      }

      // Authenticate user
      const user = await authenticateUser(body.email, body.password)
      
      if (!user) {
        return reply.code(401).send({
          error: 'invalid_credentials',
          message: 'Invalid email or password'
        })
      }

      if (!user.twoFactorEnabled) {
        return reply.code(400).send({
          error: '2fa_not_enabled',
          message: '2FA is not enabled for this account'
        })
      }

      // Verify 2FA code or backup code
      let verified = false

      if (body.code && user.twoFactorSecret) {
        const verifyResult = verifyTOTP(user.twoFactorSecret, body.code)
        verified = verifyResult.valid
      } else if (body.backupCode && user.twoFactorBackupCodes) {
        const backupResult = verifyBackupCode(user.twoFactorBackupCodes, body.backupCode)
        verified = backupResult.valid
        if (verified) {
          // Update backup codes
          await updateUser(user.id, {
            twoFactorBackupCodes: backupResult.remainingCodes
          })
        }
      } else {
        return reply.code(400).send({
          error: 'missing_code',
          message: '2FA code or backup code is required'
        })
      }

      if (!verified) {
        return reply.code(401).send({
          error: 'invalid_code',
          message: 'Invalid 2FA code or backup code'
        })
      }

      // Generate JWT token
      const token = issueToken({
        id: user.id,
        email: user.email
      })

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
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to verify 2FA code'
      })
    }
  })
}
