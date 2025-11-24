/**
 * SafeNode Audit Logs
 * Encrypted audit trail for security events
 */

import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from '../crypto/crypto';

export interface AuditLog {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  userId?: string;
  accountId?: string;
  entryId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export type AuditEventType =
  | 'vault_unlock'
  | 'vault_lock'
  | 'entry_create'
  | 'entry_update'
  | 'entry_delete'
  | 'entry_view'
  | 'entry_copy'
  | 'entry_share'
  | 'entry_import'
  | 'sync_start'
  | 'sync_complete'
  | 'sync_failed'
  | 'backup_create'
  | 'backup_restore'
  | 'key_rotation'
  | 'password_change'
  | 'account_switch'
  | 'account_create'
  | 'account_delete'
  | 'team_invite'
  | 'team_remove'
  | 'admin_action'
  | 'security_scan'
  | 'breach_detected'
  | 'failed_login'
  | 'biometric_unlock'
  | 'pin_unlock'
  | 'multi_factor_unlock';

const DB_NAME = 'SafeNodeAuditLogs';
const DB_VERSION = 1;
const STORE_NAME = 'audit_logs';
const MAX_LOGS = 10000; // Keep last 10k logs

class AuditLogStorage {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private encryptionKey: CryptoKey | null = null;

  async init(masterPassword: string, salt: ArrayBuffer): Promise<void> {
    if (this.isInitialized) return;

    // Derive encryption key for audit logs
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

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
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('eventType', 'eventType', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('accountId', 'accountId', { unique: false });
          store.createIndex('entryId', 'entryId', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Audit log storage not initialized. Call init() first.');
    }
  }

  async logEvent(
    eventType: AuditEventType,
    action: string,
    options: {
      userId?: string;
      accountId?: string;
      entryId?: string;
      details?: Record<string, any>;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    await this.ensureInitialized();

    const log: AuditLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      eventType,
      action,
      userId: options.userId,
      accountId: options.accountId,
      entryId: options.entryId,
      details: options.details,
      ipAddress: await this.getIPAddress(),
      userAgent: navigator.userAgent,
      success: options.success ?? true,
      errorMessage: options.errorMessage
    };

    // Encrypt sensitive details
    if (log.details && this.encryptionKey) {
      try {
        const detailsJson = JSON.stringify(log.details);
        const detailsBuffer = new TextEncoder().encode(detailsJson);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          this.encryptionKey,
          detailsBuffer
        );

        log.details = {
          _encrypted: true,
          data: arrayBufferToBase64(encrypted),
          iv: arrayBufferToBase64(iv.buffer)
        } as any;
      } catch (error) {
        console.error('Failed to encrypt audit log details:', error);
        // Continue without encryption if it fails
      }
    }

    // Store in IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.add(log);
      request.onsuccess = async () => {
        // Clean up old logs if we exceed the limit
        await this.cleanupOldLogs();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getLogs(filters?: {
    eventType?: AuditEventType;
    userId?: string;
    accountId?: string;
    entryId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): Promise<AuditLog[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      const range = filters?.startDate || filters?.endDate
        ? IDBKeyRange.bound(
            filters.startDate || 0,
            filters.endDate || Date.now()
          )
        : null;

      const request = index.openCursor(range, 'prev'); // Reverse order (newest first)
      const logs: AuditLog[] = [];
      const limit = filters?.limit || 1000;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor || logs.length >= limit) {
          // Decrypt and filter logs
          const filtered = this.filterLogs(logs, filters);
          resolve(filtered);
          return;
        }

        const log = cursor.value as AuditLog;
        
        // Apply filters
        if (filters?.eventType && log.eventType !== filters.eventType) {
          cursor.continue();
          return;
        }
        if (filters?.userId && log.userId !== filters.userId) {
          cursor.continue();
          return;
        }
        if (filters?.accountId && log.accountId !== filters.accountId) {
          cursor.continue();
          return;
        }
        if (filters?.entryId && log.entryId !== filters.entryId) {
          cursor.continue();
          return;
        }

        logs.push(log);
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private filterLogs(logs: AuditLog[], filters?: {
    eventType?: AuditEventType;
    userId?: string;
    accountId?: string;
    entryId?: string;
  }): AuditLog[] {
    if (!filters) return logs;

    return logs.filter(log => {
      if (filters.eventType && log.eventType !== filters.eventType) return false;
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.accountId && log.accountId !== filters.accountId) return false;
      if (filters.entryId && log.entryId !== filters.entryId) return false;
      return true;
    });
  }

  async getLogsByEventType(eventType: AuditEventType, limit: number = 100): Promise<AuditLog[]> {
    return this.getLogs({ eventType, limit });
  }

  async getLogsByAccount(accountId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.getLogs({ accountId, limit });
  }

  async getLogsByEntry(entryId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.getLogs({ entryId, limit });
  }

  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.getLogs({ limit: MAX_LOGS });
    
    if (format === 'csv') {
      const headers = ['Timestamp', 'Event Type', 'Action', 'User ID', 'Account ID', 'Entry ID', 'Success', 'Error'];
      const rows = logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.eventType,
        log.action,
        log.userId || '',
        log.accountId || '',
        log.entryId || '',
        log.success.toString(),
        log.errorMessage || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  async cleanupOldLogs(): Promise<void> {
    const allLogs = await this.getLogs({ limit: MAX_LOGS + 100 });
    
    if (allLogs.length <= MAX_LOGS) return;

    // Sort by timestamp and keep only the newest MAX_LOGS
    const sorted = allLogs.sort((a, b) => b.timestamp - a.timestamp);
    const toKeep = sorted.slice(0, MAX_LOGS);
    const toDelete = sorted.slice(MAX_LOGS);

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await Promise.all(
      toDelete.map(log => 
        new Promise<void>((resolve, reject) => {
          const request = store.delete(log.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      )
    );
  }

  private async getIPAddress(): Promise<string | undefined> {
    try {
      // Try to get IP from a service (for demo purposes)
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
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
}

export const auditLogStorage = new AuditLogStorage();

