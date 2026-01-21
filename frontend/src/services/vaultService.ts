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
    throw new Error('Not authenticated. Please log in again.')
  }

  const response = await fetch(`${API_BASE}/api/auth/vault/salt`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })

  if (!response.ok) {
    // Handle 401 specifically - might be auth issue
    if (response.status === 401) {
      const error = await response.json().catch(() => ({ message: 'Authentication failed' }))
      
      // If USER_NOT_FOUND, the user might not exist yet (race condition)
      // For new users, this shouldn't happen, but let's handle it gracefully
      if (error.code === 'USER_NOT_FOUND') {
        throw new Error('Your account is not ready yet. Please wait a moment and try again, or log out and log back in.')
      }
      
      throw new Error(error.message || 'Authentication failed. Please log in again.')
    }
    
    const error = await response.json().catch(() => ({ message: 'Failed to fetch vault salt' }))
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
    credentials: 'include',
    body: JSON.stringify({
      encryptedVault: arrayBufferToBase64(encrypted.encrypted),
      iv: arrayBufferToBase64(encrypted.iv),
      version: emptyVault.version
    })
  })

  if (!response.ok) {
    // Handle 401 specifically - authentication issue
    if (response.status === 401) {
      const error = await response.json().catch(() => ({ message: 'Authentication failed' }))
      
      if (error.code === 'USER_NOT_FOUND') {
        throw new Error('Your account is not ready yet. Please wait a moment and try again, or log out and log back in.')
      }
      
      throw new Error(error.message || 'Authentication failed. Please log in again.')
    }
    
    const error = await response.json().catch(() => ({ message: 'Failed to initialize vault' }))
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
  if (data.exists === false || !data.encryptedVault || !data.iv || !data.salt) {
    throw new Error('Vault not initialized. Please create your master password first.')
  }

  // Validate that all required fields are present and non-empty
  if (!data.salt || typeof data.salt !== 'string' || data.salt.trim().length === 0) {
    throw new Error('Vault salt is missing. Please reinitialize your vault by setting up your master password again.')
  }

  if (!data.encryptedVault || typeof data.encryptedVault !== 'string' || data.encryptedVault.trim().length === 0) {
    throw new Error('Vault data is missing. Please reinitialize your vault by setting up your master password again.')
  }

  if (!data.iv || typeof data.iv !== 'string' || data.iv.trim().length === 0) {
    throw new Error('Vault IV is missing. Please reinitialize your vault by setting up your master password again.')
  }

  // Check if up to date (client already has latest)
  if (data.upToDate === true) {
    // Server says vault is up to date - try to use cached vault from IndexedDB
    // This happens when the client already has the latest version cached
    try {
      const { vaultStorage } = await import('../storage/vaultStorage');
      await vaultStorage.init();
      const cachedVault = await vaultStorage.getVault();
      
      if (cachedVault && cachedVault.encryptedVault && cachedVault.iv && cachedVault.salt) {
        // Decrypt cached vault using the provided master password
        const salt = base64ToArrayBuffer(cachedVault.salt);
        const encrypted = base64ToArrayBuffer(cachedVault.encryptedVault);
        const iv = base64ToArrayBuffer(cachedVault.iv);
        
        const decrypted = await decrypt(
          { encrypted, iv, salt },
          masterPassword
        );
        
        const vault = JSON.parse(decrypted);
        
        // Validate vault structure
        if (vault && typeof vault === 'object' && Array.isArray(vault.entries)) {
          return vault;
        }
      }
    } catch (error: any) {
      // If cached vault doesn't exist or decryption fails, 
      // check if server actually returned the data anyway
      console.warn('Failed to use cached vault:', error);
      
      // If server returned vault data even when upToDate, use it
      if (data.encryptedVault && data.iv && data.salt) {
        // Fall through to decrypt server data below
      } else {
        // No cached vault and no server data - this is an error
        throw new Error('Vault is up to date but no cached version available. Please try unlocking again.')
      }
    }
    
    // If we get here and server didn't provide data, throw error
    if (!data.encryptedVault || !data.iv || !data.salt) {
      throw new Error('Vault is up to date but no cached version available. Please try unlocking again.')
    }
    // Otherwise, fall through to decrypt server data below
  }

  // Decrypt vault
  // Validate base64 strings before decoding
  let salt: ArrayBuffer
  let encrypted: ArrayBuffer
  let iv: ArrayBuffer
  
  try {
    // Validate salt is valid base64 and has minimum length (32 bytes = 44 base64 chars)
    if (data.salt.length < 32) {
      throw new Error('Vault salt is too short. Please reinitialize your vault.')
    }
    salt = base64ToArrayBuffer(data.salt)
    
    // Validate IV is valid base64 and has minimum length (12 bytes for AES-GCM = 16 base64 chars)
    if (data.iv.length < 12) {
      throw new Error('Vault IV is too short. Please reinitialize your vault.')
    }
    iv = base64ToArrayBuffer(data.iv)
    
    // Validate encrypted data exists
    if (data.encryptedVault.length === 0) {
      throw new Error('Vault data is empty. Please reinitialize your vault.')
    }
    encrypted = base64ToArrayBuffer(data.encryptedVault)
  } catch (error: any) {
    // If vault data is invalid (e.g., contains test data), clear it and throw a helpful error
    if (error.message.includes('base64') || error.message.includes('atob') || error.message.includes('decode')) {
      throw new Error('Vault data is corrupted or invalid. Please reinitialize your vault by setting up your master password again.')
    }
    throw error
  }

  let decrypted: string
  try {
    decrypted = await decrypt(
      {
        encrypted,
        iv,
        salt
      },
      masterPassword
    )
  } catch (error: any) {
    // OperationError from WebCrypto means decryption failed
    // This usually means wrong password or corrupted vault data
    if (error.name === 'OperationError' || error.message?.includes('Decryption failed')) {
      throw new Error('Incorrect master password. Please check your password and try again. If you recently changed your master password, the vault may need to be reinitialized.')
    }
    throw error
  }

  // Try to parse decrypted JSON
  let vault: Vault
  try {
    vault = JSON.parse(decrypted)
  } catch (error: any) {
    // If JSON parsing fails, vault data is corrupted
    throw new Error('Vault data is corrupted and cannot be decrypted. Please reinitialize your vault by setting up your master password again.')
  }

  // Validate vault structure
  if (!vault || typeof vault !== 'object' || !Array.isArray(vault.entries)) {
    throw new Error('Vault data is in an invalid format. Please reinitialize your vault.')
  }

  // Store encrypted vault in IndexedDB for future unlocks and saves
  // This ensures the vault is available for subsequent operations
  try {
    const { vaultStorage } = await import('../storage/vaultStorage')
    await vaultStorage.init()
    
    // Store the encrypted vault data we just decrypted
    const storedVault = vaultStorage.createVault(
      data.encryptedVault,
      data.iv,
      data.salt,
      data.version || Date.now()
    )
    await vaultStorage.storeVault(storedVault)
  } catch (error: any) {
    // Non-critical - log but don't fail unlock
    console.warn('[vaultService] Failed to store vault in IndexedDB after unlock:', error)
  }

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
