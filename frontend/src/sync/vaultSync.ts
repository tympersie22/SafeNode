/**
 * SafeNode Vault Sync
 * Handles synchronization between local storage and server
 */

import { vaultStorage, StoredVault } from '../storage/vaultStorage';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../crypto/crypto';
import { API_BASE } from '../config/api';

export interface ServerVaultResponse {
  encryptedVault: string;
  iv: string;
  salt: string;
  version: number;
}

export interface SyncResult {
  success: boolean;
  vault: StoredVault | null;
  conflict?: boolean;
  error?: string;
  action: 'local' | 'server' | 'merged' | 'error';
}

export class VaultSync {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? API_BASE;
  }

  /**
   * Get auth headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('safenode_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetch vault data from server
   */
  private async fetchServerVault(currentVersion?: number): Promise<{
    vault: ServerVaultResponse | null;
    upToDate: boolean;
    version: number;
  }> {
    try {
      const query = typeof currentVersion === 'number'
        ? `?since=${encodeURIComponent(currentVersion)}`
        : '';

      // Use the auth-protected vault endpoint which returns salt included
      const vaultResponse = await fetch(`${this.baseUrl}/api/auth/vault/latest${query}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });

      if (!vaultResponse.ok) {
        throw new Error(`Failed to fetch vault from server (${vaultResponse.status})`);
      }

      const vaultData = await vaultResponse.json();

      // Check if vault doesn't exist yet (new user)
      if (vaultData?.exists === false) {
        return {
          vault: null,
          upToDate: false,
          version: 0
        };
      }

      if (vaultData?.upToDate) {
        return {
          vault: null,
          upToDate: true,
          version: vaultData.version || currentVersion || 0
        };
      }

      // /api/auth/vault/latest returns { exists, encryptedVault, iv, salt, version }
      // No need for a separate salt fetch
      if (!vaultData.encryptedVault || !vaultData.iv || !vaultData.salt) {
        return {
          vault: null,
          upToDate: false,
          version: 0
        };
      }

      return {
        vault: {
          encryptedVault: vaultData.encryptedVault,
          iv: vaultData.iv,
          salt: vaultData.salt,
          version: vaultData.version || Date.now()
        },
        upToDate: false,
        version: vaultData.version || Date.now()
      };
    } catch (error) {
      console.warn('Failed to fetch server vault:', error);
      return {
        vault: null,
        upToDate: false,
        version: currentVersion || 0
      };
    }
  }

  /**
   * Upload vault data to server
   */
  private async uploadServerVault(vault: StoredVault): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vault`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
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
      const fetchResult = await this.fetchServerVault(localVault?.version);
      const serverVault = fetchResult.vault;

      // If we're offline or server is unreachable
      if (!serverVault && !fetchResult.upToDate) {
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

      if (fetchResult.upToDate && localVault) {
        return {
          success: true,
          vault: localVault,
          action: 'local'
        };
      }

      // If no local vault, use server vault
      if (!localVault) {
        if (!serverVault) {
          return {
            success: false,
            vault: null,
            error: 'Server vault unavailable',
            action: 'error'
          };
        }
        const storedVault = vaultStorage.createVault(
          serverVault.encryptedVault,
          serverVault.iv,
          serverVault.salt,
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
      if (!serverVault) {
        return {
          success: true,
          vault: localVault,
          action: 'local'
        };
      }

      const needsServerUpdate = vaultStorage.needsSync(localVault.version, serverVault.version);
      const needsLocalUpdate = vaultStorage.needsSync(serverVault.version, localVault.version);

      if (needsLocalUpdate) {
        // Server is newer, update local
        const updatedVault = vaultStorage.createVault(
          serverVault.encryptedVault,
          serverVault.iv,
          serverVault.salt || localVault.salt,
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
    const fetchResult = await this.fetchServerVault();
    const serverVault = fetchResult.vault;

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
      serverVault.salt || localVault?.salt || '',
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
    const fetchResult = await this.fetchServerVault(localVault?.version);
    const serverVault = fetchResult.vault;

    return {
      needsSync: serverVault
        ? vaultStorage.needsSync(localVault?.version || 0, serverVault.version || 0)
        : !fetchResult.upToDate,
      localVersion: localVault?.version || 0,
      serverVersion: serverVault?.version || fetchResult.version || 0,
      isOnline: vaultStorage.isOnline()
    };
  }
}

// Export singleton instance with production API base URL
export const vaultSync = new VaultSync();
