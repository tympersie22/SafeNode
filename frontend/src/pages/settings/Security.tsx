/**
 * Security Settings Page
 * Manage 2FA, email verification, and security preferences
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { SaasInput } from '../../ui/SaasInput'
import { Shield, Lock } from 'lucide-react'
import { setup2FA, verify2FACode, disable2FA, resendEmailVerification } from '../../services/twoFactorService'
import { getCurrentUser } from '../../services/authService'

export const SecuritySettings: React.FC = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [totpSetup, setTotpSetup] = useState<any>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser()
      setUser(userData)
      setTwoFactorEnabled(userData?.twoFactorEnabled || false)
    } catch (err: any) {
      setError(err.message || 'Failed to load user data')
    }
  }

  const handleSetup2FA = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const setup = await setup2FA()
      setTotpSetup(setup)
      setShow2FASetup(true)
    } catch (err: any) {
      setError(err.message || 'Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await verify2FACode(verificationCode)
      setSuccess('2FA enabled successfully!')
      setShow2FASetup(false)
      setTwoFactorEnabled(true)
      await loadUserData()
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setError('Password is required')
      return
    }

    if (!disableCode && !totpSetup?.backupCodes) {
      setError('Please provide a 2FA code or backup code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await disable2FA(disablePassword, disableCode || undefined, undefined)
      setSuccess('2FA disabled successfully')
      setShowDisable2FA(false)
      setTwoFactorEnabled(false)
      await loadUserData()
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setLoading(true)
    setError(null)

    try {
      await resendEmailVerification()
      setSuccess('Verification email sent! Check your inbox.')
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Security Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your account security and authentication preferences
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl"
        >
          <p className="text-error-600 dark:text-error-400 text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
        >
          <p className="text-green-600 dark:text-green-400 text-sm font-medium">{success}</p>
        </motion.div>
      )}

      {/* Email Verification */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Email Verification
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Verify your email address to secure your account
            </p>
            {user?.emailVerified ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Email verified</span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Your email is not verified. Please check your inbox for a verification link.
                </p>
                <SaasButton variant="secondary" size="sm" onClick={handleResendVerification} isLoading={loading}>
                  Resend Verification Email
                </SaasButton>
              </div>
            )}
          </div>
        </div>
      </SaasCard>

      {/* Two-Factor Authentication */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Two-Factor Authentication (2FA)
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Add an extra layer of security to your account
            </p>
            
            {!twoFactorEnabled && !show2FASetup && (
              <SaasButton variant="primary" onClick={handleSetup2FA} isLoading={loading}>
                Enable 2FA
              </SaasButton>
            )}

            {twoFactorEnabled && !showDisable2FA && (
              <div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">2FA is enabled</span>
                </div>
                <SaasButton variant="secondary" size="sm" onClick={() => setShowDisable2FA(true)}>
                  Disable 2FA
                </SaasButton>
              </div>
            )}

            {/* 2FA Setup Flow */}
            {show2FASetup && totpSetup && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                  </p>
                  <div className="flex justify-center mb-4">
                    <img src={totpSetup.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Or enter this key manually:
                  </p>
                  <code className="block text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded mb-4">
                    {totpSetup.manualEntryKey}
                  </code>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      ⚠️ Save your backup codes
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-yellow-700 dark:text-yellow-300">
                      {totpSetup.backupCodes?.map((code: string, idx: number) => (
                        <div key={idx}>{code}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <SaasInput
                    label="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <SaasButton
                    variant="primary"
                    fullWidth
                    className="mt-4"
                    onClick={handleVerify2FA}
                    isLoading={loading}
                  >
                    Verify and Enable 2FA
                  </SaasButton>
                  <SaasButton
                    variant="secondary"
                    fullWidth
                    className="mt-2"
                    onClick={() => {
                      setShow2FASetup(false)
                      setTotpSetup(null)
                    }}
                  >
                    Cancel
                  </SaasButton>
                </div>
              </motion.div>
            )}

            {/* Disable 2FA Flow */}
            {showDisable2FA && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  To disable 2FA, enter your password and a 2FA code or backup code:
                </p>
                <SaasInput
                  label="Password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <SaasInput
                  label="2FA Code or Backup Code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="Enter 2FA code or backup code"
                />
                <div className="flex gap-2">
                  <SaasButton
                    variant="primary"
                    onClick={handleDisable2FA}
                    isLoading={loading}
                  >
                    Disable 2FA
                  </SaasButton>
                  <SaasButton
                    variant="secondary"
                    onClick={() => {
                      setShowDisable2FA(false)
                      setDisablePassword('')
                      setDisableCode('')
                    }}
                  >
                    Cancel
                  </SaasButton>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </SaasCard>
    </div>
  )
}

