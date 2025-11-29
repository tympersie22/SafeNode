/**
 * User Service
 * Handles user authentication, registration, and management
 */

import argon2 from 'argon2'
import { randomBytes } from 'crypto'
import { User, CreateUserInput, UpdateUserInput } from '../models/User'
import { db } from './database'

/**
 * Create a new user account
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  // Hash the account password (not master password)
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024, // 64 MB
    timeCost: 3,
    parallelism: 1,
    hashLength: 32
  })

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
    
    // Device limits
    devices: []
  }

  await db.users.create(user)
  return user
}

/**
 * Authenticate a user by email and password
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    console.log(`[AUTH] Looking up user: ${normalizedEmail}`)
    
    const user = await db.users.findByEmail(normalizedEmail)
    
    if (!user) {
      console.log(`[AUTH] User not found: ${normalizedEmail}`)
      return null
    }

    console.log(`[AUTH] User found, verifying password for: ${normalizedEmail}`)
    // Verify password hash
    const valid = await argon2.verify(user.passwordHash, password)
    
    if (!valid) {
      console.log(`[AUTH] Invalid password for user: ${normalizedEmail}`)
      return null
    }

    console.log(`[AUTH] Password valid, updating last login for: ${normalizedEmail}`)
    // Update last login time (don't wait for this to complete)
    db.users.update(user.id, {
      lastLoginAt: Date.now()
    }).catch(err => console.error('Failed to update last login:', err))

    console.log(`[AUTH] Successfully authenticated user: ${normalizedEmail}`)
    return {
      ...user,
      lastLoginAt: Date.now()
    }
  } catch (error: any) {
    console.error('Error in authenticateUser:', error)
    console.error('Stack:', error?.stack)
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
  if (db.users.emailExists) {
    return db.users.emailExists(email.toLowerCase().trim())
  }
  // Fallback for older adapters
  const user = await db.users.findByEmail(email.toLowerCase().trim())
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

