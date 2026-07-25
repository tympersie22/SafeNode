import { describe, expect, it, vi } from 'vitest'
import { stripTransientVaultFields, type Vault } from '../src/services/vaultService'

const mocked = vi.hoisted(() => ({
  encrypt: vi.fn(async () => ({
    encrypted: new Uint8Array([1, 2, 3]).buffer,
    iv: new Uint8Array([4, 5, 6]).buffer,
    salt: new Uint8Array(32).buffer,
  })),
}))

vi.mock('../src/crypto/crypto', async () => {
  const actual = await vi.importActual<typeof import('../src/crypto/crypto')>('../src/crypto/crypto')
  return {
    ...actual,
    encrypt: mocked.encrypt,
  }
})

describe('vault export hygiene', () => {

  it('removes transient underscore-prefixed fields before exporting', async () => {
    const { exportVault } = await import('../src/services/vaultExportService')
    const salt = new Uint8Array(32).buffer
    const masterPassword = 'CorrectHorseBatteryStaple!'
    const vault: Vault & Record<string, unknown> = {
      entries: [],
      version: 3,
      _salt: 'transient-salt',
      _rawVaultKey: 'transient-key',
      _accessProfile: { accessMode: 'wrapped_key' } as any,
      _sessionOnlyFlag: true,
    }

    await exportVault(vault, masterPassword, salt)

    expect(mocked.encrypt).toHaveBeenCalledWith(
      JSON.stringify({
        entries: [],
        version: 3,
      }),
      masterPassword,
      salt
    )
  })

  it('strips every underscore-prefixed top-level field from persistable vault data', () => {
    const persistable = stripTransientVaultFields({
      entries: [],
      version: 1,
      _salt: 'hidden',
      _rawVaultKey: 'hidden',
      _accessProfile: { accessMode: 'wrapped_key' } as any,
      _anythingElse: 'hidden',
    })

    expect(persistable).toEqual({
      entries: [],
      version: 1,
    })
  })
})
