/**
 * Vault Entry Service
 * Handles CRUD operations for vault entries
 */

import { Vault, VaultEntry } from './vaultService'
import { saveVault, unlockVault } from './vaultService'

/**
 * Add a new entry to the vault
 */
export async function addEntry(
  vault: Vault,
  entry: VaultEntry,
  masterPassword: string
): Promise<Vault> {
  const updatedEntries = [...(vault.entries || []), entry]
  const updatedVault: Vault = {
    ...vault,
    entries: updatedEntries
  }
  
  await saveVault(updatedVault, masterPassword)
  return updatedVault
}

/**
 * Update an existing entry in the vault
 */
export async function updateEntry(
  vault: Vault,
  entryId: string,
  updates: Partial<VaultEntry>,
  masterPassword: string
): Promise<Vault> {
  const updatedEntries = (vault.entries || []).map(entry =>
    entry.id === entryId ? { ...entry, ...updates, updatedAt: Date.now() } : entry
  )
  
  const updatedVault: Vault = {
    ...vault,
    entries: updatedEntries
  }
  
  await saveVault(updatedVault, masterPassword)
  return updatedVault
}

/**
 * Delete an entry from the vault
 */
export async function deleteEntry(
  vault: Vault,
  entryId: string,
  masterPassword: string
): Promise<Vault> {
  const updatedEntries = (vault.entries || []).filter(entry => entry.id !== entryId)
  
  const updatedVault: Vault = {
    ...vault,
    entries: updatedEntries
  }
  
  await saveVault(updatedVault, masterPassword)
  return updatedVault
}

/**
 * Get entry by ID
 */
export function getEntry(vault: Vault, entryId: string): VaultEntry | undefined {
  return vault.entries?.find(entry => entry.id === entryId)
}

/**
 * Search entries by query string
 */
export function searchEntries(vault: Vault, query: string): VaultEntry[] {
  if (!query.trim()) {
    return vault.entries || []
  }

  const lowerQuery = query.toLowerCase()
  return (vault.entries || []).filter(entry =>
    entry.name.toLowerCase().includes(lowerQuery) ||
    entry.username?.toLowerCase().includes(lowerQuery) ||
    entry.url?.toLowerCase().includes(lowerQuery) ||
    entry.notes?.toLowerCase().includes(lowerQuery) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Filter entries by tag
 */
export function filterEntriesByTag(vault: Vault, tag: string): VaultEntry[] {
  return (vault.entries || []).filter(entry =>
    entry.tags?.includes(tag)
  )
}

/**
 * Filter entries by category
 */
export function filterEntriesByCategory(vault: Vault, category: VaultEntry['category']): VaultEntry[] {
  return (vault.entries || []).filter(entry => entry.category === category)
}

/**
 * Get all unique tags from vault
 */
export function getAllTags(vault: Vault): string[] {
  const tags = new Set<string>()
  vault.entries?.forEach(entry => {
    entry.tags?.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
}

/**
 * Sort entries
 */
export function sortEntries(
  entries: VaultEntry[],
  sortBy: 'name' | 'category' | 'updatedAt' | 'createdAt' = 'name',
  order: 'asc' | 'desc' = 'asc'
): VaultEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let aVal: any = a[sortBy]
    let bVal: any = b[sortBy]

    if (sortBy === 'name' || sortBy === 'category') {
      aVal = (aVal || '').toLowerCase()
      bVal = (bVal || '').toLowerCase()
    }

    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })

  return sorted
}

/**
 * Create a new entry with default values
 */
export function createEntry(data: Partial<VaultEntry>): VaultEntry {
  const now = Date.now()
  return {
    id: data.id || `entry-${now}-${Math.random().toString(36).substr(2, 9)}`,
    name: data.name || '',
    category: data.category || 'password',
    username: data.username,
    password: data.password,
    url: data.url,
    notes: data.notes,
    tags: data.tags || [],
    totpSecret: data.totpSecret,
    creditCard: data.creditCard,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  }
}

