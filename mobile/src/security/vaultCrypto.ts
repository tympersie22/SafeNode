import QuickCrypto, { Buffer } from 'react-native-quick-crypto'
import type { PasskeyGetResult } from 'react-native-passkey'
import type { PasskeyVaultWrap } from '../api/passkeys'

const INFO = new TextEncoder().encode('safenode/passkey-vault-kek')

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return new Uint8Array(Buffer.from(normalized, 'base64'))
}

function toBytes(value: unknown): Uint8Array {
  if (typeof value === 'string') return decodeBase64(value)
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  if (Array.isArray(value)) return new Uint8Array(value)
  throw new Error('This authenticator did not return a usable PRF secret.')
}

async function deriveKek(prfOutput: Uint8Array, salt: Uint8Array) {
  const baseKey = await QuickCrypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey'])
  return QuickCrypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: INFO },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
}

async function decryptAesGcm(ciphertext: string, iv: string, key: Awaited<ReturnType<typeof deriveKek>>): Promise<Uint8Array> {
  const clear = await QuickCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(iv) },
    key,
    decodeBase64(ciphertext),
  )
  return new Uint8Array(clear)
}

export async function decryptVaultWithPrf(params: {
  assertion: PasskeyGetResult
  wrap: PasskeyVaultWrap
  encryptedVault: string
  vaultIV: string
}): Promise<{ payload: unknown; rawVaultKey: Uint8Array }> {
  const prfResult = params.assertion.clientExtensionResults?.prf?.results?.first
  if (!prfResult) throw new Error('This passkey did not provide PRF output. Use a PRF-capable device or a recovery method.')
  if (!params.wrap.prfSalt || !params.wrap.prfWrappedVaultKey || !params.wrap.prfWrappedVaultKeyIV) {
    throw new Error('The selected passkey does not have a vault-key wrap.')
  }

  const kek = await deriveKek(toBytes(prfResult), decodeBase64(params.wrap.prfSalt))
  const rawVaultKey = await decryptAesGcm(params.wrap.prfWrappedVaultKey, params.wrap.prfWrappedVaultKeyIV, kek)
  const vaultKey = await QuickCrypto.subtle.importKey('raw', rawVaultKey, { name: 'AES-GCM' }, false, ['decrypt'])
  const decrypted = await QuickCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(params.vaultIV) },
    vaultKey,
    decodeBase64(params.encryptedVault),
  )
  const text = new TextDecoder().decode(decrypted)
  return { payload: JSON.parse(text), rawVaultKey }
}
