import {
  authenticateWithPasskey,
  listPasskeyVaultUnlocks,
  savePasskeyVaultUnlock,
} from '../api/passkeys'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  decryptWithKey,
  exportVaultKey,
  generateSalt,
  importVaultKey,
  unwrapVaultKeyWithPasskeyPrf,
  wrapVaultKeyWithPasskeyPrf,
} from '../crypto/crypto'
import { vaultStorage } from '../storage/vaultStorage'
import {
  fetchLatestVaultPayload,
  toVaultAccessProfile,
  type Vault,
} from './vaultService'

const PASSKEY_PRF_UNSUPPORTED = 'This passkey does not support cryptographic vault unlock on this device.'
const PASSKEY_PRF_UNAVAILABLE = 'No passkey with vault-unlock wrapping is available yet. Use your vault passphrase or recovery kit.'

export class PasskeyVaultError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PasskeyVaultError'
  }
}

function getPrfFirstOutput(results: AuthenticationExtensionsClientOutputs): ArrayBuffer {
  const first = results.prf?.results?.first
  if (!first) {
    throw new PasskeyVaultError(PASSKEY_PRF_UNSUPPORTED)
  }

  if (first instanceof ArrayBuffer) {
    return first
  }

  if (ArrayBuffer.isView(first)) {
    return first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength)
  }

  throw new PasskeyVaultError(PASSKEY_PRF_UNSUPPORTED)
}

function persistEncryptedVault(
  data: {
    encryptedVault: string
    iv: string
    salt: string
    version?: number
  },
  accessProfile: ReturnType<typeof toVaultAccessProfile>
) {
  return vaultStorage.init().then(async () => {
    const storedVault = vaultStorage.createVault(
      data.encryptedVault,
      data.iv,
      data.salt,
      data.version ?? 0,
      accessProfile.accessMode === 'wrapped_key'
        ? {
            accessMode: accessProfile.accessMode,
            wrappedVaultKey: accessProfile.wrappedVaultKey,
            wrappedVaultKeyIV: accessProfile.wrappedVaultKeyIV,
            recoveryWrappedVaultKey: accessProfile.recoveryWrappedVaultKey,
            recoveryWrappedVaultKeyIV: accessProfile.recoveryWrappedVaultKeyIV,
            recoverySalt: accessProfile.recoverySalt,
            recoveryKitConfigured: accessProfile.recoveryKitConfigured,
          }
        : undefined
    )
    await vaultStorage.storeVault(storedVault)
  })
}

export async function enrollPasskeyVaultUnlock(
  rawVaultKeyBase64: string,
  credentialId: string
): Promise<void> {
  const prfSalt = await generateSalt(32)
  const assertion = await authenticateWithPasskey({
    credentialIds: [credentialId],
    extensions: {
      prf: {
        evalByCredential: {
          [credentialId]: {
            first: new Uint8Array(prfSalt),
          },
        },
      },
    },
  })

  const prfOutput = getPrfFirstOutput(assertion.clientExtensionResults)
  const vaultKey = await importVaultKey(base64ToArrayBuffer(rawVaultKeyBase64))
  const wrappedVaultKey = await wrapVaultKeyWithPasskeyPrf(vaultKey, prfOutput, prfSalt)

  await savePasskeyVaultUnlock(credentialId, {
    prfSalt: arrayBufferToBase64(prfSalt),
    prfWrappedVaultKey: arrayBufferToBase64(wrappedVaultKey.encrypted),
    prfWrappedVaultKeyIV: arrayBufferToBase64(wrappedVaultKey.iv),
  })
}

export async function enrollFirstAvailablePasskeyVaultUnlock(
  rawVaultKeyBase64: string
): Promise<{ credentialId: string } | null> {
  const passkeys = await listPasskeyVaultUnlocks()
  const candidate = passkeys.find((passkey) => !passkey.prfReady) ?? passkeys[0]

  if (!candidate) {
    return null
  }

  await enrollPasskeyVaultUnlock(rawVaultKeyBase64, candidate.credentialId)
  return { credentialId: candidate.credentialId }
}

export async function unlockVaultWithPasskey(): Promise<{
  vault: Vault
  salt: ArrayBuffer
  credentialId: string
}> {
  const passkeys = (await listPasskeyVaultUnlocks()).filter(
    (passkey) => passkey.prfReady && passkey.prfSalt && passkey.prfWrappedVaultKey && passkey.prfWrappedVaultKeyIV
  )

  if (passkeys.length === 0) {
    throw new PasskeyVaultError(PASSKEY_PRF_UNAVAILABLE)
  }

  const latestVault = await fetchLatestVaultPayload()
  if (!latestVault.exists || !latestVault.encryptedVault || !latestVault.iv || !latestVault.salt) {
    throw new PasskeyVaultError('Vault not initialized. Set up your vault passphrase or recovery kit first.')
  }

  const accessProfile = toVaultAccessProfile(latestVault)
  if (accessProfile.accessMode !== 'wrapped_key') {
    throw new PasskeyVaultError('This vault still uses the legacy passphrase-only model. Unlock with your vault passphrase to upgrade it first.')
  }

  const assertion = await authenticateWithPasskey({
    credentialIds: passkeys.map((passkey) => passkey.credentialId),
    extensions: {
      prf: {
        evalByCredential: Object.fromEntries(
          passkeys.map((passkey) => [
            passkey.credentialId,
            { first: base64ToArrayBuffer(passkey.prfSalt!) },
          ])
        ) as Record<string, AuthenticationExtensionsPRFValues>,
      },
    },
  })

  const matchedPasskey = passkeys.find((passkey) => passkey.credentialId === assertion.credentialId)
  if (!matchedPasskey?.prfSalt || !matchedPasskey.prfWrappedVaultKey || !matchedPasskey.prfWrappedVaultKeyIV) {
    throw new PasskeyVaultError(PASSKEY_PRF_UNAVAILABLE)
  }

  const prfOutput = getPrfFirstOutput(assertion.clientExtensionResults)
  const vaultKey = await unwrapVaultKeyWithPasskeyPrf({
    encrypted: base64ToArrayBuffer(matchedPasskey.prfWrappedVaultKey),
    iv: base64ToArrayBuffer(matchedPasskey.prfWrappedVaultKeyIV),
    prfOutput,
    salt: base64ToArrayBuffer(matchedPasskey.prfSalt),
  })

  const decrypted = await decryptWithKey(
    {
      encrypted: base64ToArrayBuffer(latestVault.encryptedVault),
      iv: base64ToArrayBuffer(latestVault.iv),
    },
    vaultKey
  )

  const vault = JSON.parse(decrypted) as Vault
  if (!vault || typeof vault !== 'object' || !Array.isArray(vault.entries)) {
    throw new PasskeyVaultError('Vault data is corrupted and cannot be decrypted.')
  }

  vault._salt = latestVault.salt
  vault._accessProfile = accessProfile
  vault._rawVaultKey = arrayBufferToBase64(await exportVaultKey(vaultKey))

  await persistEncryptedVault(
    {
      encryptedVault: latestVault.encryptedVault,
      iv: latestVault.iv,
      salt: latestVault.salt,
      version: latestVault.version,
    },
    accessProfile
  ).catch((error) => {
    console.warn('[passkeyVault] Failed to cache encrypted vault locally:', error)
  })

  return {
    vault,
    salt: base64ToArrayBuffer(latestVault.salt),
    credentialId: matchedPasskey.credentialId,
  }
}

export async function hasPasskeyVaultUnlock(): Promise<boolean> {
  const passkeys = await listPasskeyVaultUnlocks()
  return passkeys.some((passkey) => passkey.prfReady)
}
