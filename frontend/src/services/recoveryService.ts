import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  createRecoveryKitCode,
  decryptWithKey,
  encryptWithKey,
  exportVaultKey,
  generateSalt,
  generateVaultKey,
  importVaultKey,
  unwrapVaultKeyWithPassword,
  wrapVaultKeyWithPassword
} from '../crypto/crypto'
import { API_BASE } from '../config/api'
import { getCurrentDeviceHeaders } from './deviceService'
import { unlockVault, type Vault, type WrappedVaultAccessProfile } from './vaultService'
import { vaultStorage } from '../storage/vaultStorage'
import { getVaultSessionSecret } from './vaultSession'

export interface RecoveryUpgradeResult {
  recoveryKit: string
  vaultAccessMode: 'wrapped_key'
  recoveryKitConfigured: true
}

export interface RecoveryUnlockResult {
  vault: Vault
  deviceSecret: string
  salt: ArrayBuffer
}

async function getLocalMasterPassword(masterPassword?: string): Promise<string> {
  if (masterPassword) return masterPassword

  const sessionSecret = getVaultSessionSecret()
  if (!sessionSecret) {
    throw new Error('Enter your master password to enable recovery migration (required when you unlocked with a passkey).')
  }

  return sessionSecret
}

export async function upgradeVaultAccess(masterPassword?: string): Promise<RecoveryUpgradeResult> {
  const resolvedPassword = await getLocalMasterPassword(masterPassword)
  const vault = await unlockVault(resolvedPassword)

  if (!vault._salt) {
    throw new Error('Vault salt is missing. Unlock the vault again before migrating.')
  }

  const salt = base64ToArrayBuffer(vault._salt)
  const recoveryKit = createRecoveryKitCode()
  const recoverySalt = await generateSalt(32)
  const normalizedVault = {
    entries: vault.entries,
    version: vault.version
  }

  let vaultKey
  if (vault._rawVaultKey) {
    vaultKey = await importVaultKey(base64ToArrayBuffer(vault._rawVaultKey))
  } else {
    vaultKey = await generateVaultKey()
  }

  const encryptedVault = await encryptWithKey(JSON.stringify(normalizedVault), vaultKey)
  const wrappedForPassphrase = await wrapVaultKeyWithPassword(vaultKey, resolvedPassword, salt)
  const wrappedForRecovery = await wrapVaultKeyWithPassword(vaultKey, recoveryKit, recoverySalt)

  const accessProfile: WrappedVaultAccessProfile = {
    accessMode: 'wrapped_key',
    wrappedVaultKey: arrayBufferToBase64(wrappedForPassphrase.encrypted),
    wrappedVaultKeyIV: arrayBufferToBase64(wrappedForPassphrase.iv),
    recoveryWrappedVaultKey: arrayBufferToBase64(wrappedForRecovery.encrypted),
    recoveryWrappedVaultKeyIV: arrayBufferToBase64(wrappedForRecovery.iv),
    recoverySalt: arrayBufferToBase64(recoverySalt),
    recoveryKitConfigured: true
  }

  const token = localStorage.getItem('safenode_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const nextVersion = Math.max(0, Number(vault.version || 0)) + 1
  const response = await fetch(`${API_BASE}/api/auth/vault/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...getCurrentDeviceHeaders()
    },
    credentials: 'include',
    body: JSON.stringify({
      encryptedVault: arrayBufferToBase64(encryptedVault.encrypted),
      iv: arrayBufferToBase64(encryptedVault.iv),
      version: nextVersion,
      accessProfile
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update vault recovery profile' }))
    throw new Error(error.message || 'Failed to update vault recovery profile')
  }

  await vaultStorage.init()
  const storedVault = vaultStorage.createVault(
    arrayBufferToBase64(encryptedVault.encrypted),
    arrayBufferToBase64(encryptedVault.iv),
    vault._salt,
    nextVersion,
    accessProfile
  )
  await vaultStorage.storeVault(storedVault)

  window.dispatchEvent(new CustomEvent('safenode:vault-access-updated', {
    detail: { forceLock: true, accessMode: 'wrapped_key' }
  }))

  return {
    recoveryKit,
    vaultAccessMode: 'wrapped_key',
    recoveryKitConfigured: true
  }
}

export async function recoverVaultWithKit(recoveryKit: string): Promise<RecoveryUnlockResult> {
  const normalizedRecoveryKit = recoveryKit.trim()
  if (!normalizedRecoveryKit) {
    throw new Error('Enter your recovery kit to restore vault access on this device.')
  }

  const token = localStorage.getItem('safenode_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/vault/latest`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...getCurrentDeviceHeaders()
    },
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch vault for recovery' }))
    throw new Error(error.message || 'Failed to fetch vault for recovery')
  }

  const data = await response.json()
  if (!data.exists || !data.encryptedVault || !data.iv || !data.salt) {
    throw new Error('This account does not have a recoverable vault yet.')
  }

  if (!data.recoveryWrappedVaultKey || !data.recoveryWrappedVaultKeyIV || !data.recoverySalt) {
    throw new Error('Recovery is not configured for this vault yet. Use the existing passphrase path first.')
  }

  const salt = base64ToArrayBuffer(data.salt)
  const encryptedVault = base64ToArrayBuffer(data.encryptedVault)
  const iv = base64ToArrayBuffer(data.iv)
  const recoverySalt = base64ToArrayBuffer(data.recoverySalt)

  const vaultKey = await unwrapVaultKeyWithPassword(
    {
      encrypted: base64ToArrayBuffer(data.recoveryWrappedVaultKey),
      iv: base64ToArrayBuffer(data.recoveryWrappedVaultKeyIV),
      salt: recoverySalt
    },
    normalizedRecoveryKit
  )

  const decryptedVault = await decryptWithKey({ encrypted: encryptedVault, iv }, vaultKey)
  const parsedVault = JSON.parse(decryptedVault)
  if (!parsedVault || typeof parsedVault !== 'object' || !Array.isArray(parsedVault.entries)) {
    throw new Error('Recovered vault data is invalid.')
  }

  const deviceSecret = createRecoveryKitCode(24)
  const wrappedForDevice = await wrapVaultKeyWithPassword(vaultKey, deviceSecret, salt)

  const accessProfile: WrappedVaultAccessProfile = {
    accessMode: 'wrapped_key',
    wrappedVaultKey: arrayBufferToBase64(wrappedForDevice.encrypted),
    wrappedVaultKeyIV: arrayBufferToBase64(wrappedForDevice.iv),
    recoveryWrappedVaultKey: data.recoveryWrappedVaultKey,
    recoveryWrappedVaultKeyIV: data.recoveryWrappedVaultKeyIV,
    recoverySalt: data.recoverySalt,
    recoveryKitConfigured: true
  }

  const nextVersion = Math.max(0, Number(data.version || 0)) + 1
  const saveResponse = await fetch(`${API_BASE}/api/auth/vault/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...getCurrentDeviceHeaders()
    },
    credentials: 'include',
    body: JSON.stringify({
      encryptedVault: data.encryptedVault,
      iv: data.iv,
      version: nextVersion,
      accessProfile
    })
  })

  if (!saveResponse.ok) {
    const error = await saveResponse.json().catch(() => ({ message: 'Failed to re-trust this device for vault access' }))
    throw new Error(error.message || 'Failed to re-trust this device for vault access')
  }

  await vaultStorage.init()
  const storedVault = vaultStorage.createVault(
    data.encryptedVault,
    data.iv,
    data.salt,
    nextVersion,
    accessProfile
  )
  await vaultStorage.storeVault(storedVault)

  const rawVaultKey = arrayBufferToBase64(await exportVaultKey(vaultKey))
  const vault: Vault = {
    ...parsedVault,
    _salt: data.salt,
    _accessProfile: accessProfile,
    _rawVaultKey: rawVaultKey
  }

  return {
    vault,
    deviceSecret,
    salt
  }
}
