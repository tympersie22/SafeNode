/**
 * Vault Tests
 * Unit tests for vault operations (encryption, decryption, sync)
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { getLatestVault, saveVault } from '../src/controllers/vaultController'
import { adapter } from '../src/adapters'
import { FastifyRequest, FastifyReply } from 'fastify'

// Mock Fastify request/reply
const createMockRequest = (body?: any, query?: any): FastifyRequest => ({
  body,
  query,
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
} as any)

const createMockReply = (): FastifyReply => {
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis()
  }
  return reply as any
}

describe('Vault Controller', () => {
  beforeEach(async () => {
    // Initialize adapter
    await adapter.init()
  })

  describe('saveVault', () => {
    it('should save a vault successfully', async () => {
      const request = createMockRequest({
        encryptedVault: 'encrypted-data-here',
        iv: 'iv-here',
        salt: 'salt-here',
        version: Date.now()
      })
      const reply = createMockReply()

      const result = await saveVault(request, reply)

      expect(result).toHaveProperty('ok', true)
      expect(result).toHaveProperty('version')
      expect(reply.code).not.toHaveBeenCalled()
    })

    it('should reject vault with missing encryptedVault', async () => {
      const request = createMockRequest({
        iv: 'iv-here',
        version: Date.now()
      })
      const reply = createMockReply()

      await saveVault(request, reply)

      expect(reply.code).toHaveBeenCalledWith(400)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_payload',
          message: 'encryptedVault is required and cannot be empty'
        })
      )
    })

    it('should reject vault with missing IV', async () => {
      const request = createMockRequest({
        encryptedVault: 'encrypted-data-here',
        version: Date.now()
      })
      const reply = createMockReply()

      await saveVault(request, reply)

      expect(reply.code).toHaveBeenCalledWith(400)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_payload',
          message: 'iv is required and cannot be empty'
        })
      )
    })

    it('should reject vault with empty encryptedVault', async () => {
      const request = createMockRequest({
        encryptedVault: '   ',
        iv: 'iv-here',
        version: Date.now()
      })
      const reply = createMockReply()

      await saveVault(request, reply)

      expect(reply.code).toHaveBeenCalledWith(400)
    })

    it('should use current timestamp if version not provided', async () => {
      const request = createMockRequest({
        encryptedVault: 'encrypted-data-here',
        iv: 'iv-here'
      })
      const reply = createMockReply()

      const result = await saveVault(request, reply)

      expect(result).toHaveProperty('ok', true)
      expect(result.version).toBeGreaterThan(0)
    })
  })

  describe('getLatestVault', () => {
    it('should return exists: false when no vault exists', async () => {
      const request = createMockRequest(undefined, {})
      const reply = createMockReply()

      const result = await getLatestVault(request, reply)

      expect(result).toHaveProperty('exists', false)
    })

    it('should return vault when it exists', async () => {
      // First save a vault
      const saveRequest = createMockRequest({
        encryptedVault: 'encrypted-data-here',
        iv: 'iv-here',
        salt: 'salt-here',
        version: Date.now()
      })
      const saveReply = createMockReply()
      await saveVault(saveRequest, saveReply)

      // Then retrieve it
      const getRequest = createMockRequest(undefined, {})
      const getReply = createMockReply()
      const result = await getLatestVault(getRequest, getReply)

      expect(result).toHaveProperty('encryptedVault')
      expect(result).toHaveProperty('iv')
      expect(result).toHaveProperty('version')
    })

    it('should return upToDate when since version is current', async () => {
      const version = Date.now()
      
      // Save vault
      const saveRequest = createMockRequest({
        encryptedVault: 'encrypted-data-here',
        iv: 'iv-here',
        version
      })
      const saveReply = createMockReply()
      await saveVault(saveRequest, saveReply)

      // Get with since parameter
      const getRequest = createMockRequest(undefined, { since: version.toString() })
      const getReply = createMockReply()
      const result = await getLatestVault(getRequest, getReply)

      expect(result).toHaveProperty('upToDate', true)
      expect(result).toHaveProperty('version', version)
    })

    it('should return vault when since version is older', async () => {
      const oldVersion = Date.now() - 10000
      const newVersion = Date.now()
      
      // Save vault with new version
      const saveRequest = createMockRequest({
        encryptedVault: 'encrypted-data-here',
        iv: 'iv-here',
        version: newVersion
      })
      const saveReply = createMockReply()
      await saveVault(saveRequest, saveReply)

      // Get with old since parameter
      const getRequest = createMockRequest(undefined, { since: oldVersion.toString() })
      const getReply = createMockReply()
      const result = await getLatestVault(getRequest, getReply)

      expect(result).toHaveProperty('encryptedVault')
      expect(result).not.toHaveProperty('upToDate')
    })
  })
})

