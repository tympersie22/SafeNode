/**
 * Vault Sync Service
 * Handles vault synchronization between client and server
 */

import { Vault } from './vaultService'
import { unlockVault, saveVault, getVaultSalt } from './vaultService'
import { base64ToArrayBuffer } from '../crypto/crypto'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export interface SyncResult {
  success: boolean
  vault?: Vault
  version?: number
  error?: string
  conflict?: boolean
}

/**
 * Sync vault with server
 * Checks for newer version and merges if needed
 */
export async function syncVault(
  localVault: Vault | null,
  masterPassword: string
): Promise<SyncResult> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    return {
      success: false,
      error: 'Not authenticated'
    }
  }

  try {
    // Get latest vault from server
    const response = await fetch(`${API_BASE}/api/auth/vault/latest`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.message || 'Failed to fetch vault'
      }
    }

    const data = await response.json()

    // Check if vault exists on server
    if (!data.exists || !data.encryptedVault) {
      // No vault on server - upload local if exists
      if (localVault) {
        const version = await saveVault(localVault, masterPassword)
        return {
          success: true,
          vault: localVault,
          version
        }
      }
      
      return {
        success: false,
        error: 'No vault found on server or locally'
      }
    }

    // Check if up to date
    if (data.upToDate === true) {
      // Client has latest version
      return {
        success: true,
        vault: localVault || undefined,
        version: localVault?.version || data.version
      }
    }

    // Server has newer version - decrypt and return
    const saltBase64 = await getVaultSalt()
    const salt = base64ToArrayBuffer(saltBase64)
    const encrypted = base64ToArrayBuffer(data.encryptedVault)
    const iv = base64ToArrayBuffer(data.iv)

    const { decrypt } = await import('../crypto/crypto')
    const decrypted = await decrypt(
      {
        encrypted,
        iv,
        salt
      },
      masterPassword
    )

    const serverVault: Vault = JSON.parse(decrypted)

    // Check for conflicts
    if (localVault && localVault.version && serverVault.version) {
      // Both have versions - check if conflict
      if (localVault.version !== serverVault.version) {
        // Conflict detected - need to merge
        const mergedVault = mergeVaults(localVault, serverVault)
        
        // Save merged vault
        const version = await saveVault(mergedVault, masterPassword)
        
        return {
          success: true,
          vault: mergedVault,
          version,
          conflict: true
        }
      }
    }

    // No conflict - server version is newer, use it
    return {
      success: true,
      vault: serverVault,
      version: serverVault.version
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to sync vault'
    }
  }
}

/**
 * Merge two vaults together
 * Combines entries from both vaults, preferring newer versions
 */
export function mergeVaults(localVault: Vault, serverVault: Vault): Vault {
  const localEntries = localVault.entries || []
  const serverEntries = serverVault.entries || []

  // Create map of entries by ID
  const entryMap = new Map<string, typeof localEntries[0]>()

  // Add server entries first
  serverEntries.forEach(entry => {
    entryMap.set(entry.id, entry)
  })

  // Add/update with local entries (prefer newer)
  localEntries.forEach(entry => {
    const existing = entryMap.get(entry.id)
    if (!existing || entry.updatedAt > existing.updatedAt) {
      entryMap.set(entry.id, entry)
    }
  })

  // Combine entries
  const mergedEntries = Array.from(entryMap.values())

  // Use newer version number
  const version = Math.max(
    localVault.version || 1,
    serverVault.version || 1
  ) + 1

  return {
    entries: mergedEntries,
    version
  }
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Sync vault in background
 */
export async function syncVaultInBackground(
  localVault: Vault | null,
  masterPassword: string,
  onProgress?: (status: string) => void
): Promise<SyncResult> {
  if (!isOnline()) {
    onProgress?.('Offline - skipping sync')
    return {
      success: false,
      error: 'Offline'
    }
  }

  onProgress?.('Syncing vault...')
  const result = await syncVault(localVault, masterPassword)
  
  if (result.success) {
    onProgress?.('Sync complete')
  } else {
    onProgress?.(`Sync failed: ${result.error}`)
  }

  return result
}
