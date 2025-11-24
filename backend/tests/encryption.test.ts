/**
 * Encryption Tests
 * Unit tests for AES-256-GCM encryption utilities
 */

import { describe, it, expect } from '@jest/globals'
import {
  encryptBuffer,
  decryptBuffer,
  encryptString,
  decryptString,
  isEncryptionEnabled,
  encryptWithConfig,
  decryptWithConfig
} from '../src/utils/encryption'

describe('Encryption Utilities', () => {
  const testKey = Buffer.from('test-key-32-bytes-long-exactly!!').toString('base64')
  const testData = 'Hello, SafeNode! This is test data.'
  const testBuffer = Buffer.from(testData, 'utf8')

  describe('encryptBuffer / decryptBuffer', () => {
    it('should encrypt and decrypt a buffer correctly', () => {
      const encrypted = encryptBuffer(testBuffer, testKey)
      
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('ciphertext')
      expect(encrypted).toHaveProperty('authTag')
      expect(encrypted.iv).toBeTruthy()
      expect(encrypted.ciphertext).toBeTruthy()
      expect(encrypted.authTag).toBeTruthy()

      const decrypted = decryptBuffer(
        encrypted.ciphertext,
        encrypted.iv,
        testKey,
        encrypted.authTag
      )

      expect(decrypted.toString('utf8')).toBe(testData)
    })

    it('should produce different ciphertexts for same plaintext (IV uniqueness)', () => {
      const encrypted1 = encryptBuffer(testBuffer, testKey)
      const encrypted2 = encryptBuffer(testBuffer, testKey)

      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      // Ciphertexts should be different
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
      
      // But both should decrypt to same plaintext
      const decrypted1 = decryptBuffer(encrypted1.ciphertext, encrypted1.iv, testKey, encrypted1.authTag)
      const decrypted2 = decryptBuffer(encrypted2.ciphertext, encrypted2.iv, testKey, encrypted2.authTag)
      
      expect(decrypted1.toString('utf8')).toBe(testData)
      expect(decrypted2.toString('utf8')).toBe(testData)
    })

    it('should fail to decrypt with wrong key', () => {
      const encrypted = encryptBuffer(testBuffer, testKey)
      const wrongKey = Buffer.from('wrong-key-32-bytes-long-exactly!!').toString('base64')

      expect(() => {
        decryptBuffer(encrypted.ciphertext, encrypted.iv, wrongKey, encrypted.authTag)
      }).toThrow()
    })

    it('should fail to decrypt with wrong auth tag', () => {
      const encrypted = encryptBuffer(testBuffer, testKey)
      const wrongAuthTag = Buffer.from('wrong-tag').toString('base64')

      expect(() => {
        decryptBuffer(encrypted.ciphertext, encrypted.iv, testKey, wrongAuthTag)
      }).toThrow()
    })

    it('should fail to decrypt with wrong IV', () => {
      const encrypted = encryptBuffer(testBuffer, testKey)
      const wrongIV = Buffer.from('wrong-iv-12').toString('base64')

      expect(() => {
        decryptBuffer(encrypted.ciphertext, wrongIV, testKey, encrypted.authTag)
      }).toThrow()
    })

    it('should throw error if key is missing', () => {
      expect(() => {
        encryptBuffer(testBuffer, '')
      }).toThrow('Encryption key is required')
    })

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0)
      const encrypted = encryptBuffer(emptyBuffer, testKey)
      const decrypted = decryptBuffer(encrypted.ciphertext, encrypted.iv, testKey, encrypted.authTag)
      
      expect(decrypted.length).toBe(0)
    })

    it('should handle large buffers', () => {
      const largeBuffer = Buffer.alloc(1024 * 1024, 'A') // 1MB
      const encrypted = encryptBuffer(largeBuffer, testKey)
      const decrypted = decryptBuffer(encrypted.ciphertext, encrypted.iv, testKey, encrypted.authTag)
      
      expect(decrypted.length).toBe(largeBuffer.length)
      expect(decrypted.equals(largeBuffer)).toBe(true)
    })
  })

  describe('encryptString / decryptString', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const encrypted = encryptString(testData, testKey)
      const decrypted = decryptString(
        encrypted.ciphertext,
        encrypted.iv,
        testKey,
        encrypted.authTag
      )

      expect(decrypted).toBe(testData)
    })

    it('should handle unicode characters', () => {
      const unicodeData = 'Hello 世界! 🌍 Test émojis 🎉'
      const encrypted = encryptString(unicodeData, testKey)
      const decrypted = decryptString(
        encrypted.ciphertext,
        encrypted.iv,
        testKey,
        encrypted.authTag
      )

      expect(decrypted).toBe(unicodeData)
    })

    it('should handle empty string', () => {
      const encrypted = encryptString('', testKey)
      const decrypted = decryptString(
        encrypted.ciphertext,
        encrypted.iv,
        testKey,
        encrypted.authTag
      )

      expect(decrypted).toBe('')
    })
  })

  describe('encryptWithConfig / decryptWithConfig', () => {
    it('should return null if encryption key is not configured', () => {
      const originalKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY
      
      // Reload config
      jest.resetModules()
      
      const result = encryptWithConfig(testBuffer)
      expect(result).toBeNull()
      
      // Restore
      if (originalKey) {
        process.env.ENCRYPTION_KEY = originalKey
      }
    })

    it('should encrypt/decrypt with configured key if available', () => {
      const originalKey = process.env.ENCRYPTION_KEY
      process.env.ENCRYPTION_KEY = testKey
      
      // Reload config
      jest.resetModules()
      
      const encrypted = encryptWithConfig(testBuffer)
      if (encrypted) {
        const decrypted = decryptWithConfig(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag
        )
        expect(decrypted?.toString('utf8')).toBe(testData)
      }
      
      // Restore
      if (originalKey) {
        process.env.ENCRYPTION_KEY = originalKey
      } else {
        delete process.env.ENCRYPTION_KEY
      }
    })
  })

  describe('isEncryptionEnabled', () => {
    it('should return true if encryption key is configured', () => {
      const originalKey = process.env.ENCRYPTION_KEY
      process.env.ENCRYPTION_KEY = testKey
      
      jest.resetModules()
      const { isEncryptionEnabled } = require('../src/utils/encryption')
      expect(isEncryptionEnabled()).toBe(true)
      
      if (originalKey) {
        process.env.ENCRYPTION_KEY = originalKey
      } else {
        delete process.env.ENCRYPTION_KEY
      }
    })
  })
})

