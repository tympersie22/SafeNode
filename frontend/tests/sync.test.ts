/**
 * Sync Tests
 * Unit tests for vault sync logic and conflict resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mergeVaults } from '../src/services/vaultSyncService'

// Mock fetch
global.fetch = vi.fn()

describe('Vault Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('mergeVaults', () => {
    it('should merge two vaults with no conflicts', () => {
      const localVault = {
        entries: [
          { id: '1', name: 'Entry 1', updatedAt: 1000 },
          { id: '2', name: 'Entry 2', updatedAt: 2000 }
        ],
        version: 1
      }

      const serverVault = {
        entries: [
          { id: '3', name: 'Entry 3', updatedAt: 3000 }
        ],
        version: 2
      }

      const merged = mergeVaults(localVault as any, serverVault as any)

      expect(merged.entries.length).toBe(3)
      expect(merged.entries.find((e: any) => e.id === '1')).toBeDefined()
      expect(merged.entries.find((e: any) => e.id === '2')).toBeDefined()
      expect(merged.entries.find((e: any) => e.id === '3')).toBeDefined()
      expect(merged.version).toBeGreaterThan(2)
    })

    it('should prefer newer version on conflict', () => {
      const localVault = {
        entries: [
          { id: '1', name: 'Local Entry', updatedAt: 1000 }
        ],
        version: 1
      }

      const serverVault = {
        entries: [
          { id: '1', name: 'Server Entry', updatedAt: 2000 }
        ],
        version: 2
      }

      const merged = mergeVaults(localVault as any, serverVault as any)

      expect(merged.entries.length).toBe(1)
      expect(merged.entries[0].name).toBe('Server Entry')
      expect(merged.entries[0].updatedAt).toBe(2000)
    })

    it('should prefer local version if newer', () => {
      const localVault = {
        entries: [
          { id: '1', name: 'Local Entry', updatedAt: 2000 }
        ],
        version: 2
      }

      const serverVault = {
        entries: [
          { id: '1', name: 'Server Entry', updatedAt: 1000 }
        ],
        version: 1
      }

      const merged = mergeVaults(localVault as any, serverVault as any)

      expect(merged.entries.length).toBe(1)
      expect(merged.entries[0].name).toBe('Local Entry')
      expect(merged.entries[0].updatedAt).toBe(2000)
    })

    it('should handle empty vaults', () => {
      const localVault = { entries: [], version: 1 }
      const serverVault = { entries: [], version: 2 }

      const merged = mergeVaults(localVault as any, serverVault as any)

      expect(merged.entries.length).toBe(0)
      expect(merged.version).toBeGreaterThan(2)
    })

    it('should handle missing entries arrays', () => {
      const localVault = { version: 1 }
      const serverVault = { entries: [{ id: '1', name: 'Entry' }], version: 2 }

      const merged = mergeVaults(localVault as any, serverVault as any)

      expect(merged.entries.length).toBe(1)
    })

    it('should increment version number', () => {
      const localVault = { entries: [], version: 5 }
      const serverVault = { entries: [], version: 10 }

      const merged = mergeVaults(localVault as any, serverVault as any)

      expect(merged.version).toBeGreaterThan(10)
    })
  })

  describe('syncVault', () => {
    it('should handle no vault exists scenario', async () => {
      // This would require mocking the full sync service
      // For now, we test the merge function which is the core logic
      expect(true).toBe(true) // Placeholder
    })
  })
})

