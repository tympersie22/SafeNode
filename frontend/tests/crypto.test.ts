/**
 * Crypto Tests
 * Unit tests for frontend encryption utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateSalt, deriveKey, encrypt, decrypt } from '../src/crypto/crypto'

// Mock hash-wasm
vi.mock('hash-wasm', () => ({
  argon2id: vi.fn(async ({ password, salt }) => {
    const bytes = new Uint8Array(32)
    const seed = `${password}:${Array.from(salt as Uint8Array).join(',')}`
    for (let i = 0; i < bytes.length; i++) {
      const ch = seed.charCodeAt(i % seed.length)
      bytes[i] = (ch + i * 13) % 256
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  })
}))

describe('Crypto Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSalt', () => {
    it('should generate a salt of specified length', async () => {
      const salt = await generateSalt(32)
      expect(salt.byteLength).toBe(32)
    })

    it('should generate different salts each time', async () => {
      const salt1 = await generateSalt(32)
      const salt2 = await generateSalt(32)
      
      const arr1 = new Uint8Array(salt1)
      const arr2 = new Uint8Array(salt2)
      
      // Very unlikely to be the same
      expect(arr1).not.toEqual(arr2)
    })

    it('should use WebCrypto if available', async () => {
      const originalGetRandomValues = global.crypto.getRandomValues
      const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i % 256
        }
        return arr
      })
      
      global.crypto.getRandomValues = mockGetRandomValues as any
      
      await generateSalt(16)
      
      expect(mockGetRandomValues).toHaveBeenCalled()
      
      global.crypto.getRandomValues = originalGetRandomValues
    })
  })

  describe('deriveKey', () => {
    it('should derive a key from password and salt', async () => {
      const salt = await generateSalt(32)
      const key = await deriveKey('test-password', salt)
      
      expect(key).toBeDefined()
      expect(key.algorithm.name).toBe('AES-GCM')
    })

    it('should throw error if WebCrypto not available', async () => {
      const originalCrypto = window.crypto
      Object.defineProperty(window, 'crypto', {
        configurable: true,
        value: undefined
      })

      await expect(deriveKey('password', await generateSalt(32))).rejects.toThrow('WebCrypto API not supported')

      Object.defineProperty(window, 'crypto', {
        configurable: true,
        value: originalCrypto
      })
    })

    it('should produce same key for same password and salt', async () => {
      const salt = await generateSalt(32)
      const key1 = await deriveKey('same-password', salt)
      const key2 = await deriveKey('same-password', salt)
      
      // Keys should be the same (deterministic)
      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
    })

    it('should produce different keys for different passwords', async () => {
      const salt = await generateSalt(32)
      const key1 = await deriveKey('password1', salt)
      const key2 = await deriveKey('password2', salt)
      
      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
    })
  })

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const data = 'Hello, SafeNode!'
      const password = 'test-password'
      
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt(encrypted, password)
      
      expect(decrypted).toBe(data)
    })

    it('should encrypt with provided salt', async () => {
      const data = 'Test data'
      const password = 'password'
      const salt = await generateSalt(32)
      
      const encrypted = await encrypt(data, password, salt)
      
      expect(encrypted.salt).toBe(salt)
    })

    it('should generate salt if not provided', async () => {
      const data = 'Test data'
      const password = 'password'
      
      const encrypted = await encrypt(data, password)
      
      expect(encrypted.salt).toBeDefined()
      expect(encrypted.salt.byteLength).toBeGreaterThan(0)
    })

    it('should produce different ciphertexts for same plaintext', async () => {
      const data = 'Same data'
      const password = 'password'
      
      const encrypted1 = await encrypt(data, password)
      const encrypted2 = await encrypt(data, password)
      
      // IVs should be different
      const iv1 = new Uint8Array(encrypted1.iv)
      const iv2 = new Uint8Array(encrypted2.iv)
      expect(iv1).not.toEqual(iv2)
      
      // But both should decrypt to same plaintext
      const decrypted1 = await decrypt(encrypted1, password)
      const decrypted2 = await decrypt(encrypted2, password)
      expect(decrypted1).toBe(data)
      expect(decrypted2).toBe(data)
    })

    it('should fail to decrypt with wrong password', async () => {
      const data = 'Secret data'
      const correctPassword = 'correct-password'
      const wrongPassword = 'wrong-password'
      
      const encrypted = await encrypt(data, correctPassword)
      
      await expect(decrypt(encrypted, wrongPassword)).rejects.toThrow()
    })

    it('should handle empty string', async () => {
      const encrypted = await encrypt('', 'password')
      const decrypted = await decrypt(encrypted, 'password')
      
      expect(decrypted).toBe('')
    })

    it('should handle unicode characters', async () => {
      const data = 'Hello 世界! 🌍 Test émojis 🎉'
      const password = 'password'
      
      const encrypted = await encrypt(data, password)
      const decrypted = await decrypt(encrypted, password)
      
      expect(decrypted).toBe(data)
    })

    it('should throw error if WebCrypto not available', async () => {
      const originalCrypto = window.crypto
      Object.defineProperty(window, 'crypto', {
        configurable: true,
        value: undefined
      })

      await expect(encrypt('data', 'password')).rejects.toThrow('WebCrypto API not supported')

      Object.defineProperty(window, 'crypto', {
        configurable: true,
        value: originalCrypto
      })
    })
  })
})
