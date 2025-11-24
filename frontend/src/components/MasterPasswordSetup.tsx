/**
 * Master Password Setup Component
 * Handles master password creation after account registration
 * This is separate from account password (used for login)
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SaasButton, SaasInput, SaasCard } from '../ui'
import { Shield } from '../icons/Shield'
import { Lock } from '../icons/Lock'
import { VaultDoor } from '../icons/VaultDoor'
import { initializeVault } from '../services/vaultService'
import { generateSecurePassword } from '../crypto/crypto'
import PasswordStrengthMeter from './PasswordStrengthMeter'

interface MasterPasswordSetupProps {
  onComplete: () => void
  onSkip?: () => void
  email?: string
}

export const MasterPasswordSetup: React.FC<MasterPasswordSetupProps> = ({
  onComplete,
  onSkip,
  email
}) => {
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'create' | 'confirm' | 'success'>('create')
  const [useGenerated, setUseGenerated] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    passwordInputRef.current?.focus()
  }, [])

  const handleGeneratePassword = async () => {
    const generated = await generateSecurePassword(24, {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: false,
      excludeAmbiguous: false,
      requireEachType: true
    })
    setMasterPassword(generated)
    setConfirmPassword(generated)
    setUseGenerated(true)
  }

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 12) {
      return { valid: false, message: 'Master password must be at least 12 characters' }
    }
    if (password.length > 128) {
      return { valid: false, message: 'Master password must be less than 128 characters' }
    }
    // Check for at least one uppercase, lowercase, number, and symbol
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Master password must contain at least one uppercase letter' }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Master password must contain at least one lowercase letter' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Master password must contain at least one number' }
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Master password must contain at least one symbol' }
    }
    return { valid: true }
  }

  const handleCreatePassword = () => {
    const validation = validatePassword(masterPassword)
    if (!validation.valid) {
      setError(validation.message || 'Invalid password')
      return
    }
    setError(null)
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await initializeVault(masterPassword)
      setStep('success')
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to initialize vault. Please try again.')
      setStep('create')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <SaasCard className="text-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-gradient-to-br from-brand-600 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Vault Created Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your encrypted vault is ready. You can now start adding passwords and secure notes.
          </p>
        </SaasCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <SaasCard className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-safenode-blue-lg">
            <VaultDoor className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {step === 'create' ? 'Create Master Password' : 'Confirm Master Password'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {step === 'create'
              ? 'Your master password encrypts your vault. Choose a strong password and keep it secure.'
              : 'Please confirm your master password to complete vault setup.'}
          </p>
        </div>

        {/* Warning */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Important: Master Password Cannot Be Recovered
              </p>
              <p className="text-amber-800 dark:text-amber-200">
                If you forget your master password, your vault cannot be decrypted. We cannot recover it for you.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          >
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
          </motion.div>
        )}

        {step === 'create' ? (
          <div className="space-y-6">
            <div>
              <SaasInput
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                label="Master Password"
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Create a strong master password (min. 12 characters)"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
              />
              
              {masterPassword && (
                <div className="mt-3">
                  <PasswordStrengthMeter password={masterPassword} />
                </div>
              )}

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="mt-3 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
              >
                Generate Strong Password
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Password Requirements:
              </h3>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• At least 12 characters (recommended: 16+)</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Include numbers and symbols</li>
                <li>• Avoid dictionary words or personal information</li>
              </ul>
            </div>

            <SaasButton
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleCreatePassword}
              disabled={!masterPassword || masterPassword.length < 12}
            >
              Continue
            </SaasButton>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Skip for now (setup later)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <SaasInput
              type={showConfirm ? 'text' : 'password'}
              label="Confirm Master Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError(null)
              }}
              placeholder="Re-enter your master password"
              required
              error={
                confirmPassword && masterPassword !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="flex gap-4">
              <SaasButton
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setStep('create')
                  setConfirmPassword('')
                  setError(null)
                }}
                disabled={isLoading}
              >
                Back
              </SaasButton>
              <SaasButton
                variant="gradient"
                size="lg"
                className="flex-1"
                onClick={handleConfirm}
                loading={isLoading}
                disabled={
                  !confirmPassword ||
                  masterPassword !== confirmPassword ||
                  isLoading
                }
              >
                {isLoading ? 'Creating Vault...' : 'Create Vault'}
              </SaasButton>
            </div>
          </div>
        )}
      </SaasCard>
    </motion.div>
  )
}

