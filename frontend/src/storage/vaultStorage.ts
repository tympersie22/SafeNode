/**
 * SafeNode Vault Storage
 * IndexedDB wrapper for offline-first encrypted vault storage
 */

export interface StoredVault {
  id: string;
  encryptedVault: string; // base64
  iv: string; // base64
  salt: string; // base64
  version: number; // timestamp
  lastModified: number; // timestamp
  isOffline: boolean;
}

export interface VaultMetadata {
  version: number;
  lastModified: number;
  isOffline: boolean;
}

const DB_NAME = 'SafeNodeVault';
const DB_VERSION = 1;
const STORE_NAME = 'vaults';

class VaultStorage {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create vaults store if it doesndoesndoesn'tapos;tapos;t exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('version', 'version', { unique: false });
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async storeVault(vault: StoredVault): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(vault);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getVault(id: string = 'default'): Promise<StoredVault | null> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getVaultMetadata(id: string = 'default'): Promise<VaultMetadata | null> {
    const vault = await this.getVault(id);
    if (!vault) return null;

    return {
      version: vault.version,
      lastModified: vault.lastModified,
      isOffline: vault.isOffline
    };
  }

  async deleteVault(id: string = 'default'): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllVaults(): Promise<StoredVault[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Check if wewewe'reapos;reapos;re online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Generate a unique version number (timestamp)
  generateVersion(): number {
    return Date.now();
  }

  // Compare versions and determine if sync is needed
  needsSync(localVersion: number, serverVersion: number): boolean {
    return serverVersion > localVersion;
  }

  // Create a vault object with metadata
  createVault(
    encryptedVault: string,
    iv: string,
    salt: string,
    version?: number
  ): StoredVault {
    const now = Date.now();
    return {
      id: 'default',
      encryptedVault,
      iv,
      salt,
      version: version || now,
      lastModified: now,
      isOffline: !this.isOnline()
    };
  }
}

// Export singleton instance
export const vaultStorage = new VaultStorage();
