/**
 * System Keychain Integration
 * Provides unified interface for macOS Keychain, Windows Credential Manager, and web storage
 */

export interface KeychainEntry {
  service: string;
  account: string;
  password: string;
  metadata?: Record<string, string>;
}

class KeychainService {
  private isTauri: boolean = false;
  private tauriApi: any = null;

  constructor() {
    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      this.isTauri = true;
      this.tauriApi = (window as any).__TAURI__;
    }
  }

  /**
   * Save credentials to system keychain (Tauri) or secure storage (Web)
   */
  async save(entry: KeychainEntry): Promise<void> {
    if (this.isTauri && this.tauriApi) {
      // Use Tauri keychain commands
      try {
        const { invoke } = this.tauriApi.core;
        await invoke('save_to_keychain', {
          service: entry.service,
          account: entry.account,
          password: entry.password
        });
      } catch (error) {
        console.error('Failed to save to keychain:', error);
        throw error;
      }
    } else {
      // Web fallback: Use encrypted localStorage
      await this.saveToWebStorage(entry);
    }
  }

  /**
   * Retrieve credentials from system keychain
   */
  async get(service: string, account: string): Promise<string | null> {
    if (this.isTauri && this.tauriApi) {
      try {
        const { invoke } = this.tauriApi.core;
        const password = await invoke('get_from_keychain', {
          service,
          account
        });
        return password || null;
      } catch (error) {
        console.error('Failed to get from keychain:', error);
        return null;
      }
    } else {
      // Web fallback
      return await this.getFromWebStorage(service, account);
    }
  }

  /**
   * Delete credentials from system keychain
   */
  async delete(service: string, account: string): Promise<void> {
    if (this.isTauri && this.tauriApi) {
      try {
        const { invoke } = this.tauriApi.core;
        await invoke('delete_from_keychain', {
          service,
          account
        });
      } catch (error) {
        console.error('Failed to delete from keychain:', error);
        throw error;
      }
    } else {
      // Web fallback
      await this.deleteFromWebStorage(service, account);
    }
  }

  /**
   * List all entries for a service
   */
  async list(service: string): Promise<string[]> {
    if (this.isTauri && this.tauriApi) {
      try {
        const { invoke } = this.tauriApi.core;
        const accounts = await invoke('list_keychain_accounts', { service });
        return accounts || [];
      } catch (error) {
        console.error('Failed to list keychain entries:', error);
        return [];
      }
    } else {
      // Web fallback
      return await this.listFromWebStorage(service);
    }
  }

  /**
   * Web storage fallback using encrypted localStorage
   */
  private async saveToWebStorage(entry: KeychainEntry): Promise<void> {
    const key = `keychain_${entry.service}_${entry.account}`;
    
    // Simple encryption using Web Crypto API
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(entry.password);
      
      // Use a key derived from service + account (not secure, but better than plaintext)
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(`${entry.service}:${entry.account}:safenode`),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('safenode-keychain-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );

      const encryptedData = {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        metadata: entry.metadata
      };

      localStorage.setItem(key, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('Failed to encrypt for web storage:', error);
      throw error;
    }
  }

  private async getFromWebStorage(service: string, account: string): Promise<string | null> {
    const key = `keychain_${service}_${account}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;

    try {
      const encryptedData = JSON.parse(stored);
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(`${service}:${account}:safenode`),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('safenode-keychain-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        cryptoKey,
        new Uint8Array(encryptedData.encrypted)
      );

      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Failed to decrypt from web storage:', error);
      return null;
    }
  }

  private async deleteFromWebStorage(service: string, account: string): Promise<void> {
    const key = `keychain_${service}_${account}`;
    localStorage.removeItem(key);
  }

  private async listFromWebStorage(service: string): Promise<string[]> {
    const prefix = `keychain_${service}_`;
    const accounts: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const account = key.replace(prefix, '');
        accounts.push(account);
      }
    }

    return accounts;
  }

  /**
   * Check if system keychain is available
   */
  isAvailable(): boolean {
    return this.isTauri || typeof localStorage !== 'undefined';
  }

  /**
   * Get platform-specific keychain name
   */
  getPlatformName(): string {
    if (this.isTauri) {
      const platform = navigator.platform.toLowerCase();
      if (platform.includes('mac')) return 'macOS Keychain';
      if (platform.includes('win')) return 'Windows Credential Manager';
      if (platform.includes('linux')) return 'Linux Secret Service';
    }
    return 'Web Secure Storage';
  }
}

export const keychainService = new KeychainService();

