/**
 * Password Reset Service
 * Manages password reset tokens and reset flow
 * Pattern follows emailVerificationService.ts
 */

import { randomBytes } from 'crypto'
import { getPrismaClient } from '../db/prisma'
import { emailService } from './emailService'
import { findUserByEmail, updateUser } from './userService'
import { hashPassword } from '../utils/password'

const RESET_TOKEN_EXPIRY_HOURS = 1 // 1 hour (matches email template text)

/**
 * Generate a secure reset token
 */
function generateResetToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Create password reset token and send email
 * Always returns success to avoid revealing if user exists
 */
export async function createPasswordResetToken(email: string): Promise<{ success: boolean }> {
  const prisma = getPrismaClient()

  // Find user by email
  const user = await findUserByEmail(email.toLowerCase().trim())

  if (!user) {
    // Don't reveal if user exists — always return success
    return { success: true }
  }

  // Generate token
  const token = generateResetToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  // Delete any existing unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null
    }
  })

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt
    }
  })

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user.email, token, user.displayName)
  } catch (error: any) {
    console.error('Failed to send password reset email:', error)
    // Don't throw — token is still created
  }

  return { success: true }
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<{
  valid: boolean
  userId?: string
  error?: string
}> {
  const prisma = getPrismaClient()

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  })

  if (!resetToken) {
    return { valid: false, error: 'Invalid or expired reset token' }
  }

  if (resetToken.usedAt) {
    return { valid: false, error: 'This reset link has already been used' }
  }

  if (resetToken.expiresAt < new Date()) {
    return { valid: false, error: 'This reset link has expired. Please request a new one.' }
  }

  return { valid: true, userId: resetToken.userId }
}

/**
 * Reset user password using a valid token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{
  success: boolean
  error?: string
}> {
  const prisma = getPrismaClient()

  // Verify the token first
  const verification = await verifyPasswordResetToken(token)
  if (!verification.valid || !verification.userId) {
    return { success: false, error: verification.error || 'Invalid token' }
  }

  try {
    // Hash the new password using the same utility as registration
    const passwordHash = await hashPassword(newPassword)

    // Update user password and increment tokenVersion to invalidate all existing sessions
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }
      }
    })

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to reset password:', error)
    return { success: false, error: 'Failed to reset password. Please try again.' }
  }
}
