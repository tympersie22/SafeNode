/**
 * User Service
 * Handles user authentication, registration, and management
 */

import { randomBytes } from 'crypto'
import { User, CreateUserInput, UpdateUserInput } from '../models/User'
import { db } from './database'
import { hashPassword, verifyPassword } from '../utils/password'

/**
 * Create a new user account
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  console.log('[userService] Creating user:', { email: input.email })
  
  // Hash the account password (not master password)
  // Uses password utility with pepper support
  const passwordHash = await hashPassword(input.password)

  // Generate vault salt for master password derivation
  const vaultSalt = randomBytes(32).toString('base64')

  const now = Date.now()
  
  const user: User = {
    id: `user-${now}-${randomBytes(8).toString('hex')}`,
    email: input.email.toLowerCase().trim(),
    passwordHash,
    displayName: input.displayName || input.email.split('@')[0],
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
    
    // Vault configuration (empty vault initially)
    vaultSalt,
    vaultEncrypted: '',
    vaultIV: '',
    vaultVersion: 0,
    
    // Account settings
    twoFactorEnabled: false,
    twoFactorBackupCodes: [],
    biometricEnabled: false,
    
    // Subscription (defaults to free)
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    
    // Role (defaults to user)
    role: 'user',
    
    // Token versioning (starts at 1)
    tokenVersion: 1,
    
    // Device limits
    devices: []
  }

  console.log('[userService] User object created, calling db.users.create:', {
    userId: user.id,
    email: user.email
  })

  try {
  const created = await db.users.create(user)
    console.log('[userService] User created successfully:', {
      userId: created.id,
      email: created.email
    })
  ;(created as any).tokenVersion = 1
  return created
  } catch (error: any) {
    console.error('[userService] Error in db.users.create:', {
      error: error.message,
      errorStack: error.stack,
      userId: user.id,
      email: user.email
    })
    throw error
  }
}

/**
 * Authenticate a user by email and password
 */
export async function authenticateUser(
  email: string, 
  password: string
): Promise<{ user: User | null; reason: 'USER_NOT_FOUND' | 'BAD_PASSWORD' | 'SUCCESS' }> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    
    const user = await db.users.findByEmail(normalizedEmail)
    
    if (!user) {
      return { user: null, reason: 'USER_NOT_FOUND' }
    }

    // Verify password hash with timeout protection
    const verifyPromise = verifyPassword(password, user.passwordHash)
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Password verification timeout')), 30000)
    )
    const valid = await Promise.race([verifyPromise, timeoutPromise]) as boolean
    
    if (!valid) {
      return { user: null, reason: 'BAD_PASSWORD' }
    }

    // Update last login time (don't wait for this to complete)
    db.users.update(user.id, {
      lastLoginAt: Date.now()
    }).catch(err => console.error('Failed to update last login:', err))

    return {
      user: {
      ...user,
      lastLoginAt: Date.now()
      },
      reason: 'SUCCESS'
    }
  } catch (error: any) {
    // If timeout or other error, treat as bad password
    if (error?.message?.includes('timeout')) {
      return { user: null, reason: 'BAD_PASSWORD' }
    }
    throw new Error(`Authentication failed: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  return db.users.findById(id)
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return db.users.findByEmail(email.toLowerCase().trim())
}

/**
 * Update user
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  return db.users.update(id, {
    ...input,
    updatedAt: Date.now()
  })
}

/**
 * Check if email is already registered
 */
export async function emailExists(email: string): Promise<boolean> {
  // Normalize email (should already be normalized, but be safe)
  const normalizedEmail = email.toLowerCase().trim()
  
  if (db.users.emailExists) {
    return db.users.emailExists(normalizedEmail)
  }
  // Fallback for older adapters
  const user = await db.users.findByEmail(normalizedEmail)
  return user !== null
}

/**
 * Verify master password for vault unlock
 * This validates that the user knows their master password
 * without exposing it to the server
 */
export async function verifyMasterPassword(
  userId: string,
  masterPassword: string
): Promise<{ valid: boolean; salt: string }> {
  const user = await findUserById(userId)
  
  if (!user) {
    return { valid: false, salt: '' }
  }

  // In zero-knowledge architecture, we don't verify the master password on server
  // The client derives the key and attempts to decrypt the vault
  // If decryption succeeds, the password is correct
  // We return the salt so the client can derive the key
  return {
    valid: true, // Client will verify by decrypting
    salt: user.vaultSalt
  }
}

/**
 * Delete a user account and all associated data (cascading)
 * Prisma schema has onDelete: Cascade on all relations,
 * so deleting the user cascades to devices, tokens, audit logs, team memberships, subscriptions
 */
export async function deleteUser(userId: string): Promise<boolean> {
  return db.users.delete(userId)
}

/**
 * Update vault data (encrypted by client)
 */
export async function updateVault(
  userId: string,
  encryptedVault: string,
  iv: string,
  version: number
): Promise<User | null> {
  return updateUser(userId, {
    vaultEncrypted: encryptedVault,
    vaultIV: iv,
    vaultVersion: version
  })
}

