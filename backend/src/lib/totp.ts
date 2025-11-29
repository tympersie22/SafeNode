/**
 * TOTP (Time-based One-Time Password) Library
 * Handles 2FA setup and verification for account login
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Configure TOTP settings
authenticator.options = {
  step: 30, // 30-second time windows
  window: 1, // Allow 1 time step tolerance
  digits: 6 // 6-digit codes
}

export interface TOTPSecret {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}

export interface TOTPVerifyResult {
  valid: boolean
  delta?: number // Time delta if window > 1
}

/**
 * Generate a new TOTP secret for a user
 */
export async function generateTOTPSecret(userId: string, email: string, issuer: string = 'SafeNode'): Promise<TOTPSecret> {
  const secret = authenticator.generateSecret()
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret)
  
  // Generate QR code data URL
  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 256,
    margin: 2
  })
  
  // Format manual entry key with spaces (standard format: XXXX XXXX XXXX XXXX)
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret
  
  return {
    secret,
    qrCodeUrl,
    manualEntryKey
  }
}

/**
 * Verify a TOTP code
 */
export function verifyTOTP(secret: string, token: string): TOTPVerifyResult {
  try {
    const isValid = authenticator.verify({
      secret,
      token
    })
    
    if (isValid) {
      return {
        valid: true,
        delta: 0 // TOTP verified successfully, no time drift
      }
    }
    
    return { valid: false }
  } catch (error) {
    return { valid: false }
  }
}

/**
 * Generate backup codes for 2FA recovery
 * Returns array of 10 single-use codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  const { randomBytes } = require('crypto')
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Verify a backup code
 * Removes used code from array
 */
export function verifyBackupCode(backupCodes: string[], code: string): { valid: boolean; remainingCodes: string[] } {
  const normalizedCode = code.toUpperCase().trim()
  const index = backupCodes.indexOf(normalizedCode)
  
  if (index === -1) {
    return {
      valid: false,
      remainingCodes: backupCodes
    }
  }
  
  // Remove used code
  const remaining = [...backupCodes]
  remaining.splice(index, 1)
  
  return {
    valid: true,
    remainingCodes: remaining
  }
}

/**
 * Generate current TOTP code (for display)
 */
export function generateCurrentTOTPCode(secret: string): string {
  return authenticator.generate(secret)
}

