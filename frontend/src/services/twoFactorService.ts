/**
 * Two-Factor Authentication Service
 * Handles 2FA setup and management for account login
 */
import { API_BASE } from '../config/api'
import { getCurrentDeviceId } from './deviceService'

export interface TOTPSetup {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
  backupCodes: string[]
}

export interface Verify2FAResult {
  success: boolean
  message?: string
}

/**
 * Setup 2FA - Generate secret and QR code
 */
export async function setup2FA(): Promise<TOTPSetup> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/2fa/setup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Device-ID': getCurrentDeviceId()
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to setup 2FA')
  }

  const data = await response.json()
  return data
}

/**
 * Verify 2FA code and enable 2FA
 */
export async function verify2FACode(code: string): Promise<Verify2FAResult> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Device-ID': getCurrentDeviceId()
    },
    body: JSON.stringify({ code })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to verify 2FA code')
  }

  return await response.json()
}

/**
 * Disable 2FA
 */
export async function disable2FA(
  password: string,
  code?: string,
  backupCode?: string
): Promise<Verify2FAResult> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Device-ID': getCurrentDeviceId()
    },
    body: JSON.stringify({
      password,
      code,
      backupCode
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to disable 2FA')
  }

  return await response.json()
}

/**
 * Resend email verification
 */
export async function resendEmailVerification(): Promise<void> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/send-verification`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Device-ID': getCurrentDeviceId()
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to send verification email')
  }
}
