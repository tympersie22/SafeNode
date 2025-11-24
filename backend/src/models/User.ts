/**
 * User Model
 * Defines the user data structure for SafeNode authentication
 */

export interface User {
  id: string
  email: string
  passwordHash: string // Argon2 hash of account password (not master password)
  displayName?: string
  emailVerified: boolean
  createdAt: number
  updatedAt: number
  lastLoginAt?: number
  
  // Vault configuration
  vaultSalt: string // Base64 encoded salt for master password derivation
  vaultEncrypted: string // Encrypted vault data (AES-256-GCM)
  vaultIV: string // Initialization vector for vault encryption
  vaultVersion: number // Version number for sync conflict resolution
  
  // Account settings
  twoFactorEnabled: boolean
  twoFactorSecret?: string // TOTP secret (base32)
  twoFactorBackupCodes?: string[] // Backup codes for 2FA recovery
  biometricEnabled: boolean
  
  // Subscription
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  subscriptionStatus: 'active' | 'cancelled' | 'past_due'
  subscriptionExpiresAt?: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  
  // Device limits
  devices: Array<{
    id: string
    name: string
    lastSeen: number
    registeredAt: number
  }>
}

export interface CreateUserInput {
  email: string
  password: string // Plain text password (will be hashed)
  displayName?: string
}

export interface UpdateUserInput {
  displayName?: string
  emailVerified?: boolean
  lastLoginAt?: number
  updatedAt?: number
  vaultSalt?: string
  vaultEncrypted?: string
  vaultIV?: string
  vaultVersion?: number
  twoFactorEnabled?: boolean
  twoFactorSecret?: string
  twoFactorBackupCodes?: string[]
  biometricEnabled?: boolean
  subscriptionTier?: User['subscriptionTier']
  subscriptionStatus?: User['subscriptionStatus']
  subscriptionExpiresAt?: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

