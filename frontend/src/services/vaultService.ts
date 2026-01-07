/**
 * Vault Service
 * Handles vault encryption, sync, and management
 */

import {
  encrypt,
  decrypt,
  deriveKey,
  generateSalt,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from '../crypto/crypto'

import { API_BASE } from '../config/api'

export interface VaultEntry {
  id: string
  name: string
  category: 'password' | 'note' | 'file' | 'otp' | 'credit-card'
  username?: string
  password?: string
  url?: string
  notes?: string
  tags?: string[]
  totpSecret?: string // Base32 TOTP secret
  creditCard?: {
    number: string // Encrypted
    expiry: string
    cvv: string // Encrypted
    name: string
    cardholder?: string
    billingAddress?: string
  }
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
    data: string // Base64 encoded
  }>
  breachCount?: number
  lastBreachCheck?: number
  favorite?: boolean
  createdAt: number
  updatedAt: number
}

export interface Vault {
  entries: VaultEntry[]
  version: number
}

export interface EncryptedVault {
  encryptedVault: string
  iv: string
  salt: string
  version: number
  exportedAt?: number
  format?: string
}

/**
 * Get vault salt from server
 */
export async function getVaultSalt(): Promise<string> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/vault/salt`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch vault salt')
  }

  const data = await response.json()
  
  // Validate salt exists and is not empty
  if (!data.salt || typeof data.salt !== 'string' || data.salt.trim().length === 0) {
    throw new Error('Vault salt not available. Please try refreshing the page.')
  }
  
  return data.salt
}

/**
 * Initialize vault with master password
 */
export async function initializeVault(
  masterPassword: string
): Promise<{ success: boolean; version: number }> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  // Get vault salt
  const saltBase64 = await getVaultSalt()
  const salt = base64ToArrayBuffer(saltBase64)

  // Create empty vault
  const emptyVault: Vault = {
    entries: [],
    version: 1
  }

  // Encrypt vault
  const vaultJson = JSON.stringify(emptyVault)
  const encrypted = await encrypt(vaultJson, masterPassword, salt)

  // Send to server
  const response = await fetch(`${API_BASE}/api/auth/vault/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      encryptedVault: arrayBufferToBase64(encrypted.encrypted),
      iv: arrayBufferToBase64(encrypted.iv),
      version: emptyVault.version
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to initialize vault')
  }

  return await response.json()
}

/**
 * Unlock vault with master password
 */
export async function unlockVault(masterPassword: string): Promise<Vault> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  // Get encrypted vault from server
  const response = await fetch(`${API_BASE}/api/auth/vault/latest`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch vault')
  }

  const data = await response.json()

  // Check if vault exists
  if (data.exists === false || !data.encryptedVault) {
    throw new Error('Vault not initialized. Please create your master password first.')
  }

  // Check if up to date (client already has latest)
  if (data.upToDate === true) {
    // Return cached vault if available, otherwise throw error
    throw new Error('Vault is up to date but no cached version available. Please refresh.')
  }

  // Decrypt vault
  // Validate base64 strings before decoding
  let salt: ArrayBuffer
  let encrypted: ArrayBuffer
  let iv: ArrayBuffer
  
  try {
    salt = base64ToArrayBuffer(data.salt)
    encrypted = base64ToArrayBuffer(data.encryptedVault)
    iv = base64ToArrayBuffer(data.iv)
  } catch (error: any) {
    // If vault data is invalid (e.g., contains test data), clear it and throw a helpful error
    if (error.message.includes('base64') || error.message.includes('atob') || error.message.includes('decode')) {
      throw new Error('Vault data is corrupted or invalid. Please reinitialize your vault by setting up your master password again.')
    }
    throw error
  }

  const decrypted = await decrypt(
    {
      encrypted,
      iv,
      salt
    },
    masterPassword
  )

  const vault: Vault = JSON.parse(decrypted)
  return vault
}

/**
 * Save encrypted vault to server
 */
export async function saveVault(vault: Vault, masterPassword: string): Promise<number> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  // Get vault salt
  const saltBase64 = await getVaultSalt()
  const salt = base64ToArrayBuffer(saltBase64)

  // Encrypt vault
  const vaultJson = JSON.stringify(vault)
  const encrypted = await encrypt(vaultJson, masterPassword, salt)

  // Increment version
  const nextVersion = (vault.version || 0) + 1
  const vaultToSave = { ...vault, version: nextVersion }

  // Send to server
  const response = await fetch(`${API_BASE}/api/auth/vault/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      encryptedVault: arrayBufferToBase64(encrypted.encrypted),
      iv: arrayBufferToBase64(encrypted.iv),
      version: nextVersion
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to save vault')
  }

  const result = await response.json()
  return result.version
}

/**
 * Check if vault exists for current user
 */
export async function vaultExists(): Promise<boolean> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    return false
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/vault/latest`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.exists === true
  } catch {
    return false
  }
}
