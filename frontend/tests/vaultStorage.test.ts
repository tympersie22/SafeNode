/**
 * Vault Storage Tests
 * Unit tests for local vault storage operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock IndexedDB
class MockIDBDatabase {
  objectStoreNames = {
    contains: vi.fn(() => false)
  } as any
  createObjectStore = vi.fn()
  transaction = vi.fn()
}

class MockIDBRequest {
  onsuccess: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  result: any = null
  error: any = null

  simulateSuccess(result: any) {
    this.result = result
    if (this.onsuccess) {
      this.onsuccess({ target: this } as any)
    }
  }

  simulateError(error: any) {
    this.error = error
    if (this.onerror) {
      this.onerror({ target: this } as any)
    }
  }
}

// Mock IndexedDB globally
const mockDB = new MockIDBDatabase()
const mockOpenRequest = new MockIDBRequest()

// @ts-ignore
global.indexedDB = {
  open: vi.fn(() => {
    mockOpenRequest.result = mockDB
    return mockOpenRequest
  }),
  deleteDatabase: vi.fn(() => new MockIDBRequest())
}

describe('Vault Storage', () => {
  let vaultStorage: any

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    mockDB.objectStoreNames.contains = vi.fn(() => false)
    
    // Dynamically import to get fresh instance
    const module = await import('../src/storage/vaultStorage')
    vaultStorage = new module.VaultStorage()
  })

  afterEach(async () => {
    // Clean up
    if (vaultStorage && typeof vaultStorage.close === 'function') {
      await vaultStorage.close().catch(() => {})
    }
  })

  describe('init', () => {
    it('should initialize IndexedDB connection', async () => {
      mockOpenRequest.simulateSuccess(mockDB)
      
      await vaultStorage.init()
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('SafeNodeVault', 1)
    })

    it('should create object store on upgrade', async () => {
      const upgradeEvent = {
        target: { result: mockDB }
      }
      
      mockOpenRequest.onupgradeneeded?.(upgradeEvent as any)
      mockOpenRequest.simulateSuccess(mockDB)
      
      await vaultStorage.init()
      
      expect(mockDB.createObjectStore).toHaveBeenCalled()
    })

    it('should handle initialization errors', async () => {
      const error = new Error('Database error')
      mockOpenRequest.simulateError(error)
      
      await expect(vaultStorage.init()).rejects.toThrow()
    })
  })

  describe('storeVault', () => {
    it('should store a vault', async () => {
      const vault = {
        id: 'default',
        encryptedVault: 'encrypted-data',
        iv: 'iv-data',
        salt: 'salt-data',
        version: Date.now(),
        lastModified: Date.now(),
        isOffline: false
      }

      const mockTransaction = {
        objectStore: vi.fn(() => ({
          put: vi.fn(() => {
            const request = new MockIDBRequest()
            request.simulateSuccess(undefined)
            return request
          })
        }))
      }
      mockDB.transaction = vi.fn(() => mockTransaction)
      mockOpenRequest.simulateSuccess(mockDB)

      await vaultStorage.init()
      await vaultStorage.storeVault(vault)

      expect(mockDB.transaction).toHaveBeenCalled()
    })
  })

  describe('getVault', () => {
    it('should retrieve a stored vault', async () => {
      const vault = {
        id: 'default',
        encryptedVault: 'encrypted-data',
        iv: 'iv-data',
        salt: 'salt-data',
        version: Date.now(),
        lastModified: Date.now(),
        isOffline: false
      }

      const mockTransaction = {
        objectStore: vi.fn(() => ({
          get: vi.fn(() => {
            const request = new MockIDBRequest()
            request.simulateSuccess(vault)
            return request
          })
        }))
      }
      mockDB.transaction = vi.fn(() => mockTransaction)
      mockOpenRequest.simulateSuccess(mockDB)

      await vaultStorage.init()
      const retrieved = await vaultStorage.getVault('default')

      expect(retrieved).toEqual(vault)
    })

    it('should return null if vault does not exist', async () => {
      const mockTransaction = {
        objectStore: vi.fn(() => ({
          get: vi.fn(() => {
            const request = new MockIDBRequest()
            request.simulateSuccess(undefined)
            return request
          })
        }))
      }
      mockDB.transaction = vi.fn(() => mockTransaction)
      mockOpenRequest.simulateSuccess(mockDB)

      await vaultStorage.init()
      const retrieved = await vaultStorage.getVault('nonexistent')

      expect(retrieved).toBeNull()
    })
  })

  describe('getVaultMetadata', () => {
    it('should return vault metadata', async () => {
      const vault = {
        id: 'default',
        encryptedVault: 'encrypted-data',
        iv: 'iv-data',
        salt: 'salt-data',
        version: 1234567890,
        lastModified: 1234567890,
        isOffline: false
      }

      const mockTransaction = {
        objectStore: vi.fn(() => ({
          get: vi.fn(() => {
            const request = new MockIDBRequest()
            request.simulateSuccess(vault)
            return request
          })
        }))
      }
      mockDB.transaction = vi.fn(() => mockTransaction)
      mockOpenRequest.simulateSuccess(mockDB)

      await vaultStorage.init()
      const metadata = await vaultStorage.getVaultMetadata('default')

      expect(metadata).toEqual({
        version: vault.version,
        lastModified: vault.lastModified,
        isOffline: vault.isOffline
      })
    })
  })
})

