import { describe, expect, it } from 'vitest'
import {
  ENTRY_KINDS,
  ENTRY_SCHEMAS,
  isEntryKind,
  migrateLegacyEntries,
  migrateLegacyEntry
} from '../src/types/entries'

describe('entry model', () => {
  it('defines a field schema for every entry kind', () => {
    expect(Object.keys(ENTRY_SCHEMAS)).toEqual(ENTRY_KINDS)

    for (const kind of ENTRY_KINDS) {
      expect(ENTRY_SCHEMAS[kind].label).not.toBe('')
      expect(ENTRY_SCHEMAS[kind].description).not.toBe('')
      expect(ENTRY_SCHEMAS[kind].fields.length).toBeGreaterThan(0)
    }
  })

  it('defines the required fields for each specialized entry', () => {
    const requiredNames = (kind: keyof typeof ENTRY_SCHEMAS) =>
      ENTRY_SCHEMAS[kind].fields.filter((field) => field.required).map((field) => field.name)

    expect(requiredNames('login')).toEqual(['username', 'password'])
    expect(requiredNames('card')).toEqual(['cardholder', 'number', 'expiry', 'cvv'])
    expect(requiredNames('identity')).toEqual(['fullName'])
    expect(requiredNames('note')).toEqual(['notes'])
    expect(requiredNames('totp')).toEqual(['issuer', 'totpSecret'])
  })

  it('recognizes only supported discriminators', () => {
    for (const kind of ENTRY_KINDS) {
      expect(isEntryKind(kind)).toBe(true)
    }

    expect(isEntryKind('password')).toBe(false)
    expect(isEntryKind(undefined)).toBe(false)
  })
})

describe('legacy entry migration', () => {
  it('maps an existing entry to login without losing or converting fields', () => {
    const attachment = {
      id: 'attachment-1',
      name: 'recovery.txt',
      type: 'text/plain',
      size: 42,
      data: 'encoded',
      createdAt: 1_700_000_000_000
    }
    const legacy = {
      id: 'entry-1',
      name: 'Example',
      username: 'person@example.com',
      password: 'secret',
      category: 'Credit Card',
      tags: ['work'],
      notes: 'Keep every legacy field',
      attachments: [attachment],
      favorite: true,
      breachCount: null,
      createdAt: 1_700_000_000_001,
      updatedAt: 1_700_000_000_002
    }

    const migrated = migrateLegacyEntry(legacy)

    expect(migrated).toEqual({ ...legacy, kind: 'login' })
    expect(migrated.attachments[0]).toBe(attachment)
    expect(legacy).not.toHaveProperty('kind')
  })

  it('preserves an existing valid kind and replaces an invalid discriminator', () => {
    expect(migrateLegacyEntry({ id: '1', name: 'Note', kind: 'note' }).kind).toBe('note')
    expect(migrateLegacyEntry({ id: '2', name: 'Legacy', kind: 'password' }).kind).toBe('login')
  })

  it('migrates a collection without mutating its entries', () => {
    const entries = [
      { id: '1', name: 'First', username: 'one', password: 'secret' },
      { id: '2', name: 'Second', username: 'two', password: 'secret' }
    ]

    const migrated = migrateLegacyEntries(entries)

    expect(migrated.map((entry) => entry.kind)).toEqual(['login', 'login'])
    expect(migrated[0]).not.toBe(entries[0])
    expect(entries.every((entry) => !('kind' in entry))).toBe(true)
  })
})
