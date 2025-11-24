/**
 * PIN Manager for Multi-Factor Unlock
 * Handles PIN setup, validation, and storage
 */

import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from '../crypto/crypto';

const PIN_STORAGE_KEY = 'safenode_pin_hash';
const PIN_SALT_KEY = 'safenode_pin_salt';
const PIN_ENABLED_KEY = 'safenode_pin_enabled';

export interface PINConfig {
  enabled: boolean;
  minLength: number;
  maxLength: number;
  maxAttempts: number;
  lockoutDuration: number; // milliseconds
}

const DEFAULT_CONFIG: PINConfig = {
  enabled: false,
  minLength: 4,
  maxLength: 8,
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000 // 15 minutes
};

class PINManager {
  private config: PINConfig = DEFAULT_CONFIG;
  private attemptCount: number = 0;
  private lockoutUntil: number = 0;

  async init(): Promise<void> {
    const enabled = localStorage.getItem(PIN_ENABLED_KEY) === 'true';
    this.config.enabled = enabled;

    // Load lockout state
    const lockoutUntil = localStorage.getItem('safenode_pin_lockout');
    if (lockoutUntil) {
      this.lockoutUntil = parseInt(lockoutUntil, 10);
      if (Date.now() > this.lockoutUntil) {
        this.lockoutUntil = 0;
        this.attemptCount = 0;
        localStorage.removeItem('safenode_pin_lockout');
      }
    }
  }

  /**
   * Set up a new PIN
   */
  async setupPIN(pin: string, masterPassword: string, salt: ArrayBuffer): Promise<void> {
    if (!this.validatePINFormat(pin)) {
      throw new Error(`PIN must be ${this.config.minLength}-${this.config.maxLength} digits`);
    }

    // Hash the PIN using the same salt as the master password
    const pinBuffer = new TextEncoder().encode(pin);
    const pinHash = await this.hashPIN(pinBuffer, salt);

    // Encrypt the PIN hash with master password
    const encrypted = await encrypt(
      JSON.stringify({ hash: arrayBufferToBase64(pinHash), createdAt: Date.now() }),
      masterPassword,
      salt
    );

    localStorage.setItem(PIN_STORAGE_KEY, arrayBufferToBase64(encrypted.encrypted));
    localStorage.setItem(PIN_SALT_KEY, arrayBufferToBase64(encrypted.iv));
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    
    this.config.enabled = true;
    this.attemptCount = 0;
    this.lockoutUntil = 0;
  }

  /**
   * Verify PIN
   */
  async verifyPIN(pin: string, masterPassword: string, salt: ArrayBuffer): Promise<boolean> {
    if (!this.config.enabled) {
      throw new Error('PIN is not enabled');
    }

    // Check lockout
    if (this.isLockedOut()) {
      const remaining = Math.ceil((this.lockoutUntil - Date.now()) / 1000 / 60);
      throw new Error(`PIN is locked. Try again in ${remaining} minute(s).`);
    }

    // Get stored PIN hash
    const encryptedHash = localStorage.getItem(PIN_STORAGE_KEY);
    const iv = localStorage.getItem(PIN_SALT_KEY);

    if (!encryptedHash || !iv) {
      throw new Error('PIN not found');
    }

    try {
      // Decrypt PIN hash
      const decrypted = await decrypt(
        {
          encrypted: base64ToArrayBuffer(encryptedHash),
          iv: base64ToArrayBuffer(iv),
          salt
        },
        masterPassword
      );

      const pinData = JSON.parse(decrypted);
      const storedHash = base64ToArrayBuffer(pinData.hash);

      // Hash the provided PIN
      const pinBuffer = new TextEncoder().encode(pin);
      const providedHash = await this.hashPIN(pinBuffer, salt);

      // Compare hashes
      const isValid = await this.compareHashes(storedHash, providedHash);

      if (isValid) {
        this.attemptCount = 0;
        this.lockoutUntil = 0;
        localStorage.removeItem('safenode_pin_lockout');
        return true;
      } else {
        this.attemptCount++;
        if (this.attemptCount >= this.config.maxAttempts) {
          this.lockoutUntil = Date.now() + this.config.lockoutDuration;
          localStorage.setItem('safenode_pin_lockout', this.lockoutUntil.toString());
          throw new Error(`Too many failed attempts. PIN is locked for ${this.config.lockoutDuration / 1000 / 60} minutes.`);
        }
        throw new Error(`Invalid PIN. ${this.config.maxAttempts - this.attemptCount} attempt(s) remaining.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('locked')) {
        throw error;
      }
      throw new Error('Failed to verify PIN');
    }
  }

  /**
   * Disable PIN
   */
  async disablePIN(masterPassword: string, salt: ArrayBuffer): Promise<void> {
    // Verify master password by attempting to decrypt PIN
    const encryptedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (encryptedHash) {
      const iv = localStorage.getItem(PIN_SALT_KEY);
      if (iv) {
        try {
          await decrypt(
            {
              encrypted: base64ToArrayBuffer(encryptedHash),
              iv: base64ToArrayBuffer(iv),
              salt
            },
            masterPassword
          );
        } catch {
          throw new Error('Invalid master password');
        }
      }
    }

    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(PIN_SALT_KEY);
    localStorage.setItem(PIN_ENABLED_KEY, 'false');
    
    this.config.enabled = false;
    this.attemptCount = 0;
    this.lockoutUntil = 0;
  }

  /**
   * Change PIN
   */
  async changePIN(
    oldPIN: string,
    newPIN: string,
    masterPassword: string,
    salt: ArrayBuffer
  ): Promise<void> {
    // Verify old PIN first
    await this.verifyPIN(oldPIN, masterPassword, salt);
    
    // Set up new PIN
    await this.setupPIN(newPIN, masterPassword, salt);
  }

  /**
   * Check if PIN is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if PIN is locked out
   */
  isLockedOut(): boolean {
    return this.lockoutUntil > 0 && Date.now() < this.lockoutUntil;
  }

  /**
   * Get remaining lockout time in minutes
   */
  getLockoutRemaining(): number {
    if (!this.isLockedOut()) return 0;
    return Math.ceil((this.lockoutUntil - Date.now()) / 1000 / 60);
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.config.maxAttempts - this.attemptCount);
  }

  /**
   * Validate PIN format
   */
  validatePINFormat(pin: string): boolean {
    if (pin.length < this.config.minLength || pin.length > this.config.maxLength) {
      return false;
    }
    // PIN must be numeric
    return /^\d+$/.test(pin);
  }

  /**
   * Hash PIN using PBKDF2
   */
  private async hashPIN(pin: Uint8Array, salt: ArrayBuffer): Promise<ArrayBuffer> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pin as BufferSource,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    return crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
  }

  /**
   * Compare two hashes securely
   */
  private async compareHashes(hash1: ArrayBuffer, hash2: ArrayBuffer): Promise<boolean> {
    if (hash1.byteLength !== hash2.byteLength) return false;

    const view1 = new Uint8Array(hash1);
    const view2 = new Uint8Array(hash2);

    let result = 0;
    for (let i = 0; i < view1.length; i++) {
      result |= view1[i] ^ view2[i];
    }

    return result === 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PINConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): PINConfig {
    return { ...this.config };
  }
}

export const pinManager = new PINManager();

