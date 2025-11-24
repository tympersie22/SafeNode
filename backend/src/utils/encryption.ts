/**
 * Encryption Utilities
 * Provides AES-GCM encryption/decryption for vault data at rest
 * 
 * SECURITY NOTES:
 * - ENCRYPTION_KEY must be a 32-byte base64-encoded key
 * - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * - Rotate encryption keys periodically in production
 * - If ENCRYPTION_KEY is not set, encryption is skipped (development only)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { config } from '../config'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 12 bytes for AES-GCM
const KEY_LENGTH = 32 // 32 bytes for AES-256

export interface EncryptionResult {
  iv: string // base64 encoded
  ciphertext: string // base64 encoded
  authTag: string // base64 encoded (for GCM)
}

/**
 * Derives a 32-byte key from a string using SHA-256
 * This is a fallback if ENCRYPTION_KEY is not base64
 */
function deriveKey(keyString: string): Buffer {
  if (keyString.length === 44 && /^[A-Za-z0-9+/=]+$/.test(keyString)) {
    // Looks like base64, try to decode
    try {
      const decoded = Buffer.from(keyString, 'base64')
      if (decoded.length === KEY_LENGTH) {
        return decoded
      }
    } catch {
      // Not valid base64, fall through to hash
    }
  }
  
  // Fallback: hash the string to get 32 bytes
  return createHash('sha256').update(keyString).digest()
}

/**
 * Encrypts a buffer using AES-256-GCM
 * @param plain - Plaintext buffer to encrypt
 * @param key - Encryption key (32-byte base64 string or any string for fallback)
 * @returns Encrypted data with IV and auth tag
 */
export function encryptBuffer(plain: Buffer, key: string): EncryptionResult {
  if (!key) {
    throw new Error('Encryption key is required')
  }
  
  const keyBuffer = deriveKey(key)
  const iv = randomBytes(IV_LENGTH)
  
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv)
  cipher.setAAD(Buffer.from('safenode-vault', 'utf8')) // Additional authenticated data
  
  const encrypted = Buffer.concat([
    cipher.update(plain),
    cipher.final()
  ])
  
  const authTag = cipher.getAuthTag()
  
  return {
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    authTag: authTag.toString('base64')
  }
}

/**
 * Decrypts a buffer using AES-256-GCM
 * @param ciphertextBase64 - Base64 encoded ciphertext
 * @param ivBase64 - Base64 encoded IV
 * @param key - Encryption key (must match the key used for encryption)
 * @param authTagBase64 - Base64 encoded authentication tag
 * @returns Decrypted buffer
 */
export function decryptBuffer(
  ciphertextBase64: string,
  ivBase64: string,
  key: string,
  authTagBase64: string
): Buffer {
  if (!key) {
    throw new Error('Encryption key is required')
  }
  
  const keyBuffer = deriveKey(key)
  const iv = Buffer.from(ivBase64, 'base64')
  const ciphertext = Buffer.from(ciphertextBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')
  
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`)
  }
  
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv)
  decipher.setAAD(Buffer.from('safenode-vault', 'utf8'))
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ])
  
  return decrypted
}

/**
 * Encrypts a string (convenience wrapper)
 */
export function encryptString(plain: string, key: string): EncryptionResult {
  return encryptBuffer(Buffer.from(plain, 'utf8'), key)
}

/**
 * Decrypts to a string (convenience wrapper)
 */
export function decryptString(
  ciphertextBase64: string,
  ivBase64: string,
  key: string,
  authTagBase64: string
): string {
  return decryptBuffer(ciphertextBase64, ivBase64, key, authTagBase64).toString('utf8')
}

/**
 * Checks if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return config.encryptionKey !== null
}

/**
 * Encrypts using the configured encryption key (if available)
 */
export function encryptWithConfig(plain: Buffer): EncryptionResult | null {
  if (!config.encryptionKey) {
    return null
  }
  return encryptBuffer(plain, config.encryptionKey)
}

/**
 * Decrypts using the configured encryption key (if available)
 */
export function decryptWithConfig(
  ciphertextBase64: string,
  ivBase64: string,
  authTagBase64: string
): Buffer | null {
  if (!config.encryptionKey) {
    return null
  }
  return decryptBuffer(ciphertextBase64, ivBase64, config.encryptionKey, authTagBase64)
}

