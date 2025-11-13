/**
 * SafeNode Vault Sync
 * Handles synchronization between local storage and server
 */

import { vaultStorage, StoredVault } from '../storage/vaultStorage';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../crypto/crypto';

export interface ServerVaultResponse {
  encryptedVault: string;
  iv: string;
  version?: number;
}

export interface SyncResult {
  success: boolean;
  vault: StoredVault | null;
  conflict?: boolean;
  error?: string;
  action: 'local' | 'server' | 'merged' | 'error';
}

export class VaultSync {
  private baseUrl = '';

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch vault data from server
   */
  private async fetchServerVault(): Promise<ServerVaultResponse | null> {
    try {
      const [saltResponse, vaultResponse] = await Promise.all([
        fetch(`${this.baseUrl}/api/user/salt`),
        fetch(`${this.baseUrl}/api/vault/latest`)
      ]);

      if (!saltResponse.ok || !vaultResponse.ok) {
        throw new Error('Failed to fetch vault from server');
      }

      const saltData = await saltResponse.json();
      const vaultData = await vaultResponse.json();

      return {
        encryptedVault: vaultData.encryptedVault,
        iv: vaultData.iv,
        version: vaultData.version || Date.now()
      };
    } catch (error) {
      console.warn('Failed to fetch server vault:', error);
      return null;
    }
  }

  /**
   * Upload vault data to server
   */
  private async uploadServerVault(vault: StoredVault): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vault`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          encryptedVault: vault.encryptedVault,
          iv: vault.iv,
          salt: vault.salt,
          version: vault.version
        })
      });

      return response.ok;
    } catch (error) {
      console.warn('Failed to upload vault to server:', error);
      return false;
    }
  }

  /**
   * Main sync method - determines what action to take
   */
  async syncVault(): Promise<SyncResult> {
    try {
      // Get local vault
      const localVault = await vaultStorage.getVault();
      
      // Try to fetch server vault
      const serverVault = await this.fetchServerVault();

      // If we're offline or server is unreachable
      if (!serverVault) {
        if (localVault) {
          return {
            success: true,
            vault: localVault,
            action: 'local'
          };
        } else {
          return {
            success: false,
            vault: null,
            error: 'No local vault and server unavailable',
            action: 'error'
          };
        }
      }

      // If no local vault, use server vault
      if (!localVault) {
        const storedVault = vaultStorage.createVault(
          serverVault.encryptedVault,
          serverVault.iv,
          '', // salt will be fetched separately
          serverVault.version
        );
        await vaultStorage.storeVault(storedVault);
        
        return {
          success: true,
          vault: storedVault,
          action: 'server'
        };
      }

      // Compare versions
      const needsServerUpdate = vaultStorage.needsSync(localVault.version, serverVault.version);
      const needsLocalUpdate = vaultStorage.needsSync(serverVault.version, localVault.version);

      if (needsLocalUpdate) {
        // Server is newer, update local
        const updatedVault = vaultStorage.createVault(
          serverVault.encryptedVault,
          serverVault.iv,
          localVault.salt, // Keep existing salt
          serverVault.version
        );
        await vaultStorage.storeVault(updatedVault);
        
        return {
          success: true,
          vault: updatedVault,
          action: 'server'
        };
      } else if (needsServerUpdate) {
        // Local is newer, update server
        const uploadSuccess = await this.uploadServerVault(localVault);
        
        if (uploadSuccess) {
          return {
            success: true,
            vault: localVault,
            action: 'local'
          };
        } else {
          // Upload failed, but we have local data
          return {
            success: true,
            vault: localVault,
            action: 'local'
          };
        }
      } else {
        // Versions are the same, no sync needed
        return {
          success: true,
          vault: localVault,
          action: 'local'
        };
      }
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        vault: null,
        error: error instanceof Error ? error.message : 'Unknown sync error',
        action: 'error'
      };
    }
  }

  /**
   * Force sync from server (overwrites local)
   */
  async forceServerSync(): Promise<SyncResult> {
    const serverVault = await this.fetchServerVault();
    
    if (!serverVault) {
      return {
        success: false,
        vault: null,
        error: 'Server unavailable',
        action: 'error'
      };
    }

    const localVault = await vaultStorage.getVault();
    const storedVault = vaultStorage.createVault(
      serverVault.encryptedVault,
      serverVault.iv,
      localVault?.salt || '', // Keep existing salt if available
      serverVault.version
    );

    await vaultStorage.storeVault(storedVault);
    
    return {
      success: true,
      vault: storedVault,
      action: 'server'
    };
  }

  /**
   * Force sync to server (uploads local)
   */
  async forceLocalSync(): Promise<SyncResult> {
    const localVault = await vaultStorage.getVault();
    
    if (!localVault) {
      return {
        success: false,
        vault: null,
        error: 'No local vault to sync',
        action: 'error'
      };
    }

    const uploadSuccess = await this.uploadServerVault(localVault);
    
    if (!uploadSuccess) {
      return {
        success: false,
        vault: localVault,
        error: 'Failed to upload to server',
        action: 'error'
      };
    }

    return {
      success: true,
      vault: localVault,
      action: 'local'
    };
  }

  /**
   * Check if sync is needed without performing it
   */
  async checkSyncStatus(): Promise<{
    needsSync: boolean;
    localVersion: number;
    serverVersion: number;
    isOnline: boolean;
  }> {
    const localVault = await vaultStorage.getVault();
    const serverVault = await this.fetchServerVault();
    
    return {
      needsSync: serverVault ? vaultStorage.needsSync(localVault?.version || 0, serverVault.version || 0) : false,
      localVersion: localVault?.version || 0,
      serverVersion: serverVault?.version || 0,
      isOnline: vaultStorage.isOnline()
    };
  }
}

// Export singleton instance
export const vaultSync = new VaultSync();
