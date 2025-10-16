import type { StoredVault } from './vaultStorage';

export interface VaultBackup {
  id: string;
  label?: string;
  createdAt: number;
  vault: StoredVault;
}

const DB_NAME = 'SafeNodeBackups';
const DB_VERSION = 1;
const STORE_NAME = 'backups';

class BackupStorage {
  private db: IDBDatabase | null = null;
  private initialized = false;

  private async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  async saveBackup(backup: VaultBackup): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(backup);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBackup(id: string): Promise<VaultBackup | null> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async listBackups(): Promise<VaultBackup[]> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const backups = (request.result || []) as VaultBackup[];
        backups.sort((a, b) => b.createdAt - a.createdAt);
        resolve(backups);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBackup(id: string): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearBackups(): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const backupStorage = new BackupStorage();

