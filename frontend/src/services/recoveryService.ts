import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  createRecoveryKitCode,
  encryptWithKey,
  generateSalt,
  generateVaultKey,
  importVaultKey,
  wrapVaultKeyWithPassword
} from '../crypto/crypto'
import { API_BASE } from '../config/api'
import { getCurrentDeviceHeaders } from './deviceService'
import { keychainService } from '../utils/keychain'
import { unlockVault, type WrappedVaultAccessProfile } from './vaultService'
import { vaultStorage } from '../storage/vaultStorage'

export interface RecoveryUpgradeResult {
  recoveryKit: string
  vaultAccessMode: 'wrapped_key'
  recoveryKitConfigured: true
}

async function getLocalMasterPassword(masterPassword?: string): Promise<string> {
  if (masterPassword) return masterPassword

  const stored = await keychainService.get('safenode', 'master_password')
  if (!stored) {
    throw new Error('Unlock your vault on this device before enabling recovery migration.')
  }

  return stored
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
