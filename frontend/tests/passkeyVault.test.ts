import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  arrayBufferToBase64,
  decryptWithKey,
  encryptWithKey,
  exportVaultKey,
  generateSalt,
  generateVaultKey,
  importVaultKey,
  wrapVaultKeyWithPasskeyPrf,
} from '../src/crypto/crypto'
import {
  enrollPasskeyVaultUnlock,
  unlockVaultWithPasskey,
} from '../src/services/passkeyVault'

const mocked = vi.hoisted(() => ({
  authenticateWithPasskey: vi.fn(),
  listPasskeyVaultUnlocks: vi.fn(),
  savePasskeyVaultUnlock: vi.fn(),
  fetchLatestVaultPayload: vi.fn(),
  vaultStorage: {
    init: vi.fn(async () => undefined),
    createVault: vi.fn((...args: any[]) => ({ args })),
    storeVault: vi.fn(async () => undefined),
  },
}))

vi.mock('../src/api/passkeys', () => ({
  authenticateWithPasskey: mocked.authenticateWithPasskey,
  listPasskeyVaultUnlocks: mocked.listPasskeyVaultUnlocks,
  savePasskeyVaultUnlock: mocked.savePasskeyVaultUnlock,
}))

vi.mock('../src/storage/vaultStorage', () => ({
  vaultStorage: mocked.vaultStorage,
}))

vi.mock('../src/services/vaultService', async () => {
  const actual = await vi.importActual<typeof import('../src/services/vaultService')>('../src/services/vaultService')
  return {
    ...actual,
    fetchLatestVaultPayload: mocked.fetchLatestVaultPayload,
  }
})

describe('passkeyVault service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => (
      key === 'safenode_token' ? 'test-token' : null
    ))
  })

  it('enrolls a PRF wrap for an existing credential', async () => {
    const vaultKey = await generateVaultKey()
    const rawVaultKey = arrayBufferToBase64(await exportVaultKey(vaultKey))
    const prfOutput = await generateSalt(32)

    mocked.authenticateWithPasskey.mockResolvedValue({
      credentialId: 'cred-1',
      clientExtensionResults: {
        prf: {
          results: {
            first: prfOutput,
          },
        },
      },
    })

    await enrollPasskeyVaultUnlock(rawVaultKey, 'cred-1')

    expect(mocked.authenticateWithPasskey).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialIds: ['cred-1'],
      })
    )
    expect(mocked.savePasskeyVaultUnlock).toHaveBeenCalledWith(
      'cred-1',
      expect.objectContaining({
        prfSalt: expect.any(String),
        prfWrappedVaultKey: expect.any(String),
        prfWrappedVaultKeyIV: expect.any(String),
      })
    )
  })

  it('unlocks the vault from a PRF-wrapped passkey credential', async () => {
    window.localStorage.setItem('safenode_token', 'test-token')
    const vaultKey = await generateVaultKey()
    const prfOutput = await generateSalt(32)
    const prfSalt = await generateSalt(32)
    const wrapped = await wrapVaultKeyWithPasskeyPrf(vaultKey, prfOutput, prfSalt)
    const vaultPayload = { entries: [], version: 7 }
    const encryptedVault = await encryptWithKey(JSON.stringify(vaultPayload), vaultKey)

    mocked.listPasskeyVaultUnlocks.mockResolvedValue([
      {
        credentialId: 'cred-1',
        friendlyName: 'Primary passkey',
        prfReady: true,
        prfSalt: arrayBufferToBase64(prfSalt),
        prfWrappedVaultKey: arrayBufferToBase64(wrapped.encrypted),
        prfWrappedVaultKeyIV: arrayBufferToBase64(wrapped.iv),
        createdAt: Date.now(),
      },
    ])

    mocked.authenticateWithPasskey.mockResolvedValue({
      credentialId: 'cred-1',
      clientExtensionResults: {
        prf: {
          results: {
            first: prfOutput,
          },
        },
      },
    })

    mocked.fetchLatestVaultPayload.mockResolvedValue({
      exists: true,
      encryptedVault: arrayBufferToBase64(encryptedVault.encrypted),
      iv: arrayBufferToBase64(encryptedVault.iv),
      salt: arrayBufferToBase64(await generateSalt(32)),
      version: 7,
      accessMode: 'wrapped_key',
      wrappedVaultKey: 'server-passphrase-wrap',
      wrappedVaultKeyIV: 'server-passphrase-wrap-iv',
      recoveryWrappedVaultKey: 'server-recovery-wrap',
      recoveryWrappedVaultKeyIV: 'server-recovery-wrap-iv',
      recoverySalt: 'server-recovery-salt',
      recoveryKitConfigured: true,
    })

    const result = await unlockVaultWithPasskey()

    expect(result.vault.entries).toEqual([])
    expect(result.vault._accessProfile?.accessMode).toBe('wrapped_key')
    expect(result.vault._rawVaultKey).toBeTruthy()
    expect(mocked.vaultStorage.storeVault).toHaveBeenCalled()

    const imported = await importVaultKey(
      (await exportVaultKey(vaultKey)).slice(0)
    )
    const decrypted = await decryptWithKey(
      {
        encrypted: encryptedVault.encrypted,
        iv: encryptedVault.iv,
      },
      imported
    )
    expect(JSON.parse(decrypted)).toEqual(vaultPayload)
  })
})
