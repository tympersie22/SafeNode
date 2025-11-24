/**
 * Vault Export/Import Service
 * Handles encrypted vault export and import functionality
 */

import { Vault, EncryptedVault } from './vaultService'
import { encrypt, decrypt, base64ToArrayBuffer, arrayBufferToBase64 } from '../crypto/crypto'

/**
 * Export vault as encrypted JSON file
 */
export async function exportVault(
  vault: Vault,
  masterPassword: string,
  salt: ArrayBuffer
): Promise<Blob> {
  // Encrypt the vault again with the master password
  const vaultJson = JSON.stringify(vault)
  const encrypted = await encrypt(vaultJson, masterPassword, salt)

  // Create export object
  const exportData: EncryptedVault = {
    encryptedVault: arrayBufferToBase64(encrypted.encrypted),
    iv: arrayBufferToBase64(encrypted.iv),
    salt: arrayBufferToBase64(salt),
    version: vault.version || 1,
    exportedAt: Date.now(),
    format: 'safenode-vault-v1'
  }

  // Create blob and return
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  return blob
}

/**
 * Import vault from encrypted JSON file
 */
export async function importVault(
  file: File,
  masterPassword: string
): Promise<{ vault: Vault; salt: ArrayBuffer }> {
  // Read file content
  const text = await file.text()
  const exportData: EncryptedVault & { exportedAt?: number; format?: string } = JSON.parse(text)

  // Validate format
  if (exportData.format !== 'safenode-vault-v1') {
    throw new Error('Invalid vault format. Expected safenode-vault-v1.')
  }

  // Decrypt vault
  const salt = base64ToArrayBuffer(exportData.salt)
  const encrypted = base64ToArrayBuffer(exportData.encryptedVault)
  const iv = base64ToArrayBuffer(exportData.iv)

  const decrypted = await decrypt(
    {
      encrypted,
      iv,
      salt
    },
    masterPassword
  )

  const vault: Vault = JSON.parse(decrypted)

  return { vault, salt }
}

/**
 * Download vault as encrypted JSON file
 */
export async function downloadVault(
  vault: Vault,
  masterPassword: string,
  salt: ArrayBuffer,
  filename?: string
): Promise<void> {
  const blob = await exportVault(vault, masterPassword, salt)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `safenode-vault-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Validate vault import file before importing
 */
export async function validateImportFile(file: File): Promise<{
  valid: boolean
  error?: string
  format?: string
  exportedAt?: number
}> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.format !== 'safenode-vault-v1') {
      return {
        valid: false,
        error: 'Invalid vault format. Expected safenode-vault-v1.',
        format: data.format
      }
    }

    if (!data.encryptedVault || !data.iv || !data.salt) {
      return {
        valid: false,
        error: 'Invalid vault structure. Missing required fields.'
      }
    }

    return {
      valid: true,
      format: data.format,
      exportedAt: data.exportedAt
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Failed to parse vault file.'
    }
  }
}

