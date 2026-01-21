/**
 * Prisma User Database Adapter
 * Implements user operations using Prisma ORM
 */

import { getPrismaClient } from '../prisma'
import { User, CreateUserInput, UpdateUserInput } from '../../models/User'
import { Prisma } from '@prisma/client'

/**
 * Convert Prisma user to domain User model
 */
function prismaUserToDomain(prismaUser: any): User {
  const user: User = {
    id: prismaUser.id,
    email: prismaUser.email,
    passwordHash: prismaUser.passwordHash,
    displayName: prismaUser.displayName || undefined,
    emailVerified: prismaUser.emailVerified,
    createdAt: prismaUser.createdAt.getTime(),
    updatedAt: prismaUser.updatedAt.getTime(),
    lastLoginAt: prismaUser.lastLoginAt?.getTime(),
    
    // Vault configuration
    vaultSalt: prismaUser.vaultSalt,
    vaultEncrypted: prismaUser.vaultEncrypted,
    vaultIV: prismaUser.vaultIV,
    vaultVersion: prismaUser.vaultVersion,
    
    // Account settings
    twoFactorEnabled: prismaUser.twoFactorEnabled,
    twoFactorSecret: prismaUser.twoFactorSecret || undefined,
    twoFactorBackupCodes: prismaUser.twoFactorBackupCodes || [],
    biometricEnabled: prismaUser.biometricEnabled,
    
    // Subscription
    subscriptionTier: prismaUser.subscriptionTier as 'free' | 'pro' | 'enterprise',
    subscriptionStatus: prismaUser.subscriptionStatus as 'active' | 'cancelled' | 'past_due',
    subscriptionExpiresAt: prismaUser.subscriptionExpiresAt?.getTime(),
    stripeCustomerId: prismaUser.stripeCustomerId || undefined,
    stripeSubscriptionId: prismaUser.stripeSubscriptionId || undefined,
    
    // Role
    role: (prismaUser.role || 'user') as 'user' | 'admin' | 'superadmin',
    
    // Token versioning
    tokenVersion: prismaUser.tokenVersion || 1,
    
    // Device limits
    devices: (prismaUser.devices || []).map((d: any) => ({
      id: d.deviceId,
      name: d.name,
      lastSeen: d.lastSeen.getTime(),
      registeredAt: d.registeredAt.getTime()
    }))
  }
  
  // Attach tokenVersion as a property (for middleware access)
  ;(user as any).tokenVersion = prismaUser.tokenVersion || 1
  return user
}

/**
 * Prisma-based User Database Adapter
 */
export const prismaUserAdapter = {
  /**
   * Create a new user
   */
  async create(user: User): Promise<User> {
    const prisma = getPrismaClient()
    
    // Ensure email is normalized before creating
    const normalizedEmail = user.email.toLowerCase().trim()
    
    console.log('[PrismaAdapter] Creating user:', {
      userId: user.id,
      email: normalizedEmail,
      displayName: user.displayName
    })
    
    try {
    const created = await prisma.user.create({
      data: {
        id: user.id,
          email: normalizedEmail, // Use normalized email
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        vaultSalt: user.vaultSalt,
        vaultEncrypted: user.vaultEncrypted,
        vaultIV: user.vaultIV,
        vaultVersion: user.vaultVersion,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorSecret: user.twoFactorSecret,
        twoFactorBackupCodes: user.twoFactorBackupCodes || [],
        biometricEnabled: user.biometricEnabled,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        role: user.role || 'user',
        tokenVersion: user.tokenVersion || 1
      }
    })
    
      console.log('[PrismaAdapter] User created successfully:', {
        userId: created.id,
        email: created.email
      })
      
      // Verify the user was actually created by fetching it back
      // This ensures the transaction is committed and the user is available
      const verified = await prisma.user.findUnique({ 
        where: { id: created.id },
        include: {
          devices: {
            where: { isActive: true },
            orderBy: { lastSeen: 'desc' }
          }
        }
      })
      
      if (!verified) {
        console.error('[PrismaAdapter] User creation verification failed - user not found after create', {
          userId: created.id,
          email: normalizedEmail,
          createdEmail: created.email
        })
        throw new Error('User creation verification failed - user not found in database after creation')
      }
      
      console.log('[PrismaAdapter] User verification successful:', {
        userId: verified.id,
        email: verified.email
      })
      
      const result = prismaUserToDomain(verified)
      ;(result as any).tokenVersion = verified.tokenVersion || 1
    return result
    } catch (error: any) {
      console.error('[PrismaAdapter] Error creating user:', {
        error: error.message,
        errorStack: error.stack,
        code: error.code,
        email: normalizedEmail,
        userId: user.id,
        prismaError: error instanceof Prisma.PrismaClientKnownRequestError ? {
          code: error.code,
          meta: error.meta
        } : null
      })
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation - email already exists
          const target = (error.meta as any)?.target
          console.error('[PrismaAdapter] Unique constraint violation:', { target, email: normalizedEmail })
          throw new Error('User with this email already exists')
        }
        if (error.code === 'P2003') {
          // Foreign key constraint violation
          throw new Error('Database constraint violation')
        }
      }
      throw error
    }
  },

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const prisma = getPrismaClient()
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        devices: {
          where: { isActive: true },
          orderBy: { lastSeen: 'desc' }
        }
      }
    })
    
    if (!user) return null
    const result = prismaUserToDomain(user)
    ;(result as any).tokenVersion = user.tokenVersion || 1
    return result
  },

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const prisma = getPrismaClient()
    const normalizedEmail = email.toLowerCase().trim()
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        devices: {
          where: { isActive: true },
          orderBy: { lastSeen: 'desc' }
        }
      }
    })
    
    if (!user) return null
    
    const result = prismaUserToDomain(user)
    ;(result as any).tokenVersion = user.tokenVersion || 1
    return result
  },

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const prisma = getPrismaClient()
    
    const updateData: Prisma.UserUpdateInput = {
      updatedAt: new Date()
    }
    
    if (input.displayName !== undefined) updateData.displayName = input.displayName
    if (input.emailVerified !== undefined) updateData.emailVerified = input.emailVerified
    if (input.lastLoginAt !== undefined) updateData.lastLoginAt = input.lastLoginAt ? new Date(input.lastLoginAt) : null
    if (input.vaultSalt !== undefined) updateData.vaultSalt = input.vaultSalt
    if (input.vaultEncrypted !== undefined) updateData.vaultEncrypted = input.vaultEncrypted
    if (input.vaultIV !== undefined) updateData.vaultIV = input.vaultIV
    if (input.vaultVersion !== undefined) updateData.vaultVersion = input.vaultVersion
    if (input.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = input.twoFactorEnabled
    if (input.twoFactorSecret !== undefined) {
      updateData.twoFactorSecret = input.twoFactorSecret === undefined || input.twoFactorSecret === null ? null : input.twoFactorSecret
    }
    if (input.twoFactorBackupCodes !== undefined) {
      updateData.twoFactorBackupCodes = {
        set: input.twoFactorBackupCodes || []
      }
    }
    if (input.biometricEnabled !== undefined) updateData.biometricEnabled = input.biometricEnabled
    if (input.subscriptionTier !== undefined) updateData.subscriptionTier = input.subscriptionTier
    if (input.subscriptionStatus !== undefined) updateData.subscriptionStatus = input.subscriptionStatus
    if (input.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = input.subscriptionExpiresAt 
        ? new Date(input.subscriptionExpiresAt) 
        : null
    }
    if (input.role !== undefined) updateData.role = input.role
    if (input.tokenVersion !== undefined) updateData.tokenVersion = input.tokenVersion
    if (input.stripeCustomerId !== undefined) {
      updateData.stripeCustomerId = input.stripeCustomerId || null
    }
    if (input.stripeSubscriptionId !== undefined) {
      updateData.stripeSubscriptionId = input.stripeSubscriptionId || null
    }
    
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        devices: {
          where: { isActive: true },
          orderBy: { lastSeen: 'desc' }
        }
      }
    })
    
    const result = prismaUserToDomain(updated)
    ;(result as any).tokenVersion = updated.tokenVersion || 1
    return result
  },

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const prisma = getPrismaClient()
    
    try {
      await prisma.user.delete({
        where: { id }
      })
      return true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // Record not found
        return false
      }
      throw error
    }
  },

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const prisma = getPrismaClient()
    
    // Ensure email is normalized
    const normalizedEmail = email.toLowerCase().trim()
    
    // Validate email format before querying
    if (!normalizedEmail || normalizedEmail.length === 0) {
      console.warn('[PrismaAdapter] Empty email provided to emailExists')
      return false
    }
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[PrismaAdapter] Checking if email exists:', normalizedEmail)
    }
    
    try {
      // Use findUnique for better performance and to catch any unique constraint issues
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true } // Only select id for performance
      })
      
      const exists = user !== null
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[PrismaAdapter] Email exists check result:', { email: normalizedEmail, exists, userId: user?.id })
      }
      
      return exists
    } catch (error: any) {
      console.error('[PrismaAdapter] Error checking email existence:', error)
      // On error, assume email doesn't exist to allow registration
      // This prevents blocking legitimate registrations due to database issues
      return false
    }
  }
}

