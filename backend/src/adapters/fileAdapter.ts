/**
 * File-based Storage Adapter
 * Default adapter that stores vault data in memory
 * Suitable for development and single-instance deployments
 * 
 * NOTE: Data is lost on server restart. For production, use Prisma or MongoDB adapter.
 */

import { StoredVault } from '../validation/vaultSchema'
import { encryptWithConfig, decryptWithConfig } from '../utils/encryption'
import { config } from '../config'

// In-memory storage (lost on restart)
let vaultStorage: StoredVault | null = null

// Metadata for encryption at rest
interface EncryptedStorage {
  encrypted: string
  iv: string
  authTag: string
}

/**
 * File Adapter Implementation
 * Stores vault data in memory with optional encryption at rest
 */
export const fileAdapter = {
  /**
   * Reads the vault from storage
   * Automatically decrypts if encryption is enabled
   */
  async readVault(): Promise<StoredVault | null> {
    try {
      if (!vaultStorage) {
        return null
      }
      
      // If encryption is enabled, decrypt the stored data
      if (config.encryptionKey) {
        try {
          // Check if encryptedVault contains encrypted metadata
          const encryptedData = JSON.parse(vaultStorage.encryptedVault)
          if (encryptedData.data && encryptedData.authTag) {
            const decrypted = decryptWithConfig(
              encryptedData.data,
              vaultStorage.iv,
              encryptedData.authTag
            )
            
            if (!decrypted) {
              throw new Error('Failed to decrypt vault data')
            }
            
            return JSON.parse(decrypted.toString('utf8')) as StoredVault
          }
        } catch (error) {
          // If parsing fails, assume it's not encrypted JSON format
          // This handles migration from unencrypted to encrypted storage
          console.warn('Failed to decrypt vault, treating as unencrypted:', error)
        }
      }
      
      return vaultStorage
    } catch (error) {
      console.error('Error reading vault from file adapter:', error)
      throw error
    }
  },
  
  /**
   * Writes the vault to storage
   * Automatically encrypts if encryption is enabled
   */
  async writeVault(vault: StoredVault): Promise<void> {
    try {
      // If encryption is enabled, encrypt the entire vault object
      if (config.encryptionKey) {
        const vaultJson = JSON.stringify(vault)
        const encrypted = encryptWithConfig(Buffer.from(vaultJson, 'utf8'))
        
        if (!encrypted) {
          throw new Error('Failed to encrypt vault data')
        }
        
        // Store encrypted data with authTag embedded in encryptedVault field
        // Format: JSON string containing { data, authTag }
        vaultStorage = {
          id: vault.id || 'default',
          encryptedVault: JSON.stringify({
            data: encrypted.ciphertext,
            authTag: encrypted.authTag
          }),
          iv: encrypted.iv,
          salt: vault.salt,
          version: vault.version,
          lastModified: vault.lastModified || Date.now(),
          isOffline: vault.isOffline || false
        } as StoredVault
      } else {
        // No encryption, store directly
        vaultStorage = vault
      }
    } catch (error) {
      console.error('Error writing vault to file adapter:', error)
      throw error
    }
  },
  
  /**
   * Initializes the adapter (no-op for file adapter)
   */
  async init(): Promise<void> {
    // File adapter doesn't need initialization
    return Promise.resolve()
  },
  
  /**
   * Closes the adapter (no-op for file adapter)
   */
  async close(): Promise<void> {
    // File adapter doesn't need cleanup
    return Promise.resolve()
  }
}

