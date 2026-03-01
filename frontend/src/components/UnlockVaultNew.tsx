/**
 * UnlockVault Component (Updated)
 * Uses the new vaultService instead of old vaultStorage
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { unlockVault, vaultExists } from '../services/vaultService'
import { logout } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import { SaasButton, SaasInput, SaasCard } from '../ui'
import { Vault, Lock, Eye, EyeOff, LogOut } from 'lucide-react'
import { base64ToArrayBuffer } from '../crypto/crypto'
import { API_BASE } from '../config/api'
import { listPasskeys, authenticateWithPasskey } from '../api/passkeys'
import { keychainService } from '../utils/keychain'

interface UnlockVaultProps {
  onVaultUnlocked: (vault: any, masterPassword: string, salt: ArrayBuffer) => void
  onSetupMasterPassword?: () => void
  onLogout?: () => void
}

export const UnlockVault: React.FC<UnlockVaultProps> = ({ onVaultUnlocked, onSetupMasterPassword, onLogout }) => {
  const [masterPassword, setMasterPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [hasVault, setHasVault] = useState<boolean | null>(null)
  const { user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const lastCheckedUserId = useRef<string | null>(null)
  const checkInProgress = useRef(false)
  
  // Rate limiting state
  const [unlockAttempts, setUnlockAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [passkeyAvailable, setPasskeyAvailable] = useState(false)
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)

  useEffect(() => {
    // Check if vault exists only once per user
    // Prevent multiple simultaneous checks
    if (user?.id && user.id !== lastCheckedUserId.current && !checkInProgress.current) {
      checkInProgress.current = true
      lastCheckedUserId.current = user.id
      
      vaultExists()
        .then((exists) => {
          setHasVault(exists)
        })
        .catch((err) => {
          console.error('Failed to check vault:', err)
          setError('Failed to check vault status')
        })
        .finally(() => {
          checkInProgress.current = false
        })
    } else if (!user?.id) {
      // Reset when user is null
      lastCheckedUserId.current = null
      setHasVault(null)
    }
  }, [user?.id]) // Only depend on user.id, not the entire user object

  // Check biometric availability
  useEffect(() => {
      const checkBiometric = async () => {
        try {
        const { biometricAuthService } = await import('../utils/biometricAuth')
        
        const caps = await biometricAuthService.isAvailable()
        setBiometricAvailable(caps.available)
        
        // Check if biometric is enabled
        const enabled = localStorage.getItem('safenode_biometric_enabled') === 'true'
        const hasStoredPassword = await keychainService.get('safenode', 'master_password')
        setBiometricEnabled(enabled && caps.available && !!hasStoredPassword)
      } catch (error) {
        console.warn('Biometric check failed:', error)
        setBiometricAvailable(false)
        setBiometricEnabled(false)
      }
    }
    
    checkBiometric()
  }, [])

  useEffect(() => {
    const checkPasskeys = async () => {
      if (!user?.id || typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
        setPasskeyAvailable(false)
        setPasskeyEnabled(false)
        return
      }

      try {
        const [storedPassword, passkeys] = await Promise.all([
          keychainService.get('safenode', 'master_password'),
          listPasskeys().catch(() => [])
        ])
        setPasskeyAvailable(true)
        setPasskeyEnabled(Boolean(storedPassword) && passkeys.length > 0)
      } catch (error) {
        console.warn('Passkey check failed:', error)
        setPasskeyAvailable(true)
        setPasskeyEnabled(false)
      }
    }

    checkPasskeys()
  }, [user?.id])

  // Check lockout status
  useEffect(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60)
      setError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`)
    } else if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null)
      setUnlockAttempts(0)
      setError(null)
    }
  }, [lockoutUntil])

  const handleBiometricUnlock = async () => {
    if (!biometricEnabled) return
    
    setIsLoading(true)
    setError(null)

    try {
      const { biometricAuthService } = await import('../utils/biometricAuth')
      
      // Authenticate with biometric
      const result = await biometricAuthService.authenticate('Unlock SafeNode vault', {
        enableML: true,
        userId: user?.id || 'user',
        collectBehavioral: true
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Biometric authentication failed')
      }

      // Get stored master password from keychain
      const storedPassword = await keychainService.get('safenode', 'master_password')
      if (!storedPassword) {
        throw new Error('Master password not found. Please unlock with password first.')
      }

      // Unlock vault with stored password
      const vault = await unlockVault(storedPassword)
      
      // Get salt from server
      const saltResponse = await fetch(`${API_BASE}/api/auth/vault/salt`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('safenode_token')}`
        }
      })
      
      if (!saltResponse.ok) {
        throw new Error('Failed to get vault salt')
      }
      
      const saltData = await saltResponse.json()
      const salt = base64ToArrayBuffer(saltData.salt)

      // Reset attempts on success
      setUnlockAttempts(0)
      setLockoutUntil(null)
      setIsLoading(false)
      onVaultUnlocked(vault, storedPassword, salt)
    } catch (err: any) {
      console.error('Biometric unlock failed:', err)
      setError(err.message || 'Biometric authentication failed. Please use your master password.')
      setIsLoading(false)
    }
  }

  const handlePasskeyUnlock = async () => {
    if (!passkeyEnabled) return

    setIsLoading(true)
    setError(null)

    try {
      await authenticateWithPasskey()

      const storedPassword = await keychainService.get('safenode', 'master_password')
      if (!storedPassword) {
        throw new Error('Unlock with your master password once on this device before using passkeys.')
      }

      const vault = await unlockVault(storedPassword)
      const saltResponse = await fetch(`${API_BASE}/api/auth/vault/salt`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('safenode_token')}`
        }
      })

      if (!saltResponse.ok) {
        throw new Error('Failed to get vault salt')
      }

      const saltData = await saltResponse.json()
      const salt = base64ToArrayBuffer(saltData.salt)

      setUnlockAttempts(0)
      setLockoutUntil(null)
      setIsLoading(false)
      onVaultUnlocked(vault, storedPassword, salt)
    } catch (err: any) {
      console.error('Passkey unlock failed:', err)
      setError(err.message || 'Passkey authentication failed. Please use your master password.')
      setIsLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!masterPassword) {
      setError('Please enter your master password')
      return
    }

    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60)
      setError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`)
      return
    }

    // Don't try to unlock if vault doesn't exist
    if (hasVault === false) {
      setError('Vault not initialized. Please set up your master password first.')
      return
    }

    // Wait for vault existence check to complete
    if (hasVault === null) {
      setError('Checking vault status...')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Unlock vault using the new service
      const vault = await unlockVault(masterPassword)
      
      // Get salt from server for callback
      const saltResponse = await fetch(`${API_BASE}/api/auth/vault/salt`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('safenode_token')}`
        }
      })
      
      if (!saltResponse.ok) {
        throw new Error('Failed to get vault salt')
      }
      
      const saltData = await saltResponse.json()
      // Convert base64 salt string to ArrayBuffer (salt from server is base64 encoded)
      const salt = base64ToArrayBuffer(saltData.salt)

      // Reset attempts on success
      setUnlockAttempts(0)
      setLockoutUntil(null)
      
      // Immediately unlock vault and go straight to vault UI - no success screen
      setIsLoading(false)
      onVaultUnlocked(vault, masterPassword, salt)
    } catch (err: any) {
      console.error('Unlock failed:', err)
      
      // Rate limiting: 3 attempts, then 15 minute lockout
      const newAttempts = unlockAttempts + 1
      setUnlockAttempts(newAttempts)
      
      if (newAttempts >= 3) {
        const lockoutTime = Date.now() + (15 * 60 * 1000) // 15 minutes
        setLockoutUntil(lockoutTime)
        setError(`❌ Incorrect master password. Too many failed attempts. Try again in 15 minutes.`)
      } else {
        const remaining = 3 - newAttempts
        // Enhanced error messages with clear, user-friendly feedback
        const errorMessage = err.message || err.toString() || 'Unknown error'
        
        if (errorMessage.includes('Incorrect master password') || 
            errorMessage.includes('Decryption failed') || 
            errorMessage.includes('wrong password') ||
            errorMessage.includes('Invalid password')) {
          setError(`❌ Incorrect master password. Remaining attempts: ${remaining}/3`)
        } else if (errorMessage.includes('Not authenticated') || errorMessage.includes('401')) {
          setError('❌ Session expired. Please log in again.')
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
          setError('❌ Network error. Check your connection and try again.')
        } else if (errorMessage.includes('Vault not initialized')) {
          setError('❌ Vault not found. Please set up your master password first.')
        } else {
          setError(`❌ Failed to unlock vault: ${errorMessage}`)
        }
      }
      
      setIsLoading(false)
    }
  }


  const handleGoToHome = async () => {
    setIsLoggingOut(true)
    try {
      // Securely logout first (clears token and session)
      logout()
      
      
      // Clear user state in parent component (App.tsx)
      if (onLogout) {
        onLogout()
      }
      
      // NO NAVIGATION - PublicRoute will redirect unauthenticated users to /
      // This ensures route guards own all navigation decisions
    } catch (err) {
      console.error('Error during logout:', err)
      // Still clear user state even if logout has issues
      if (onLogout) {
        onLogout()
      }
    } finally {
      setIsLoggingOut(false)
    }
  }

  // If vault doesn't exist, show setup message
  if (hasVault === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 flex items-center justify-center p-4">
        <SaasCard className="max-w-md w-full p-8 text-center" onClick={undefined}>
          <Vault className="w-16 h-16 mx-auto mb-4 text-brand-600 dark:text-brand-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            No Vault Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your vault hasn't been initialized yet. Please set up your master password first.
          </p>
          <div className="relative z-10">
            <SaasButton
              type="button"
              variant="primary"
              size="lg"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[UnlockVault] Set Up Master Password button clicked')
                
                // Trigger master password setup via callback
                if (onSetupMasterPassword) {
                  console.log('[UnlockVault] Calling onSetupMasterPassword callback')
                  onSetupMasterPassword()
                } else {
                  console.warn('[UnlockVault] onSetupMasterPassword callback not provided')
                  // NO NAVIGATION - callback should be provided
                }
              }}
              className="cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Set Up Master Password'}
            </SaasButton>
          </div>
        </SaasCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 flex items-center justify-center p-4">
      <motion.div
            key="unlock"
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <SaasCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-secondary-500/20"
            >
              <Vault className="w-8 h-8 text-white" />
            </motion.div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Unlock Your Vault
            </h2>
                <p className="text-slate-600 dark:text-slate-400">
              Enter your master password to access your encrypted vault
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200 font-semibold">{error}</p>
                  {unlockAttempts > 0 && unlockAttempts < 3 && (
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                      Attempt {unlockAttempts} of 3
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Passkey/Biometric Unlock Buttons */}
          {(passkeyEnabled || biometricEnabled) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="space-y-3">
                {passkeyEnabled && (
                  <SaasButton
                    type="button"
                    variant="gradient"
                    size="lg"
                    className="w-full min-h-[48px] touch-manipulation"
                    onClick={handlePasskeyUnlock}
                    loading={isLoading}
                    disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a5 5 0 00-10 0v3a2 2 0 00-2 2v2a5 5 0 0010 0v-2a2 2 0 00-2-2V7a1 1 0 112 0v2h2V7z" />
                    </svg>
                    {isLoading ? 'Authenticating...' : 'Unlock with Passkey'}
                  </SaasButton>
                )}
                {biometricEnabled && (
                  <SaasButton
                    type="button"
                    variant={passkeyEnabled ? "outline" : "gradient"}
                    size="lg"
                    className="w-full min-h-[48px] touch-manipulation"
                    onClick={handleBiometricUnlock}
                    loading={isLoading}
                    disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.44l.054-.054A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {isLoading ? 'Authenticating...' : 'Unlock with Biometric'}
                  </SaasButton>
                )}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">or</p>
              </div>
            </motion.div>
          )}

          {/* Password Input */}
          <div className="space-y-6">
            <div>
              <SaasInput
                type={showPassword ? 'text' : 'password'}
                label="Master Password"
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading && masterPassword && !(lockoutUntil && Date.now() < lockoutUntil)) {
                    handleUnlock()
                  }
                }}
                placeholder="Enter your master password"
                required
                autoFocus={!biometricEnabled && !passkeyEnabled}
                className={error && error.includes('Incorrect') ? 'border-red-500 focus:ring-red-500' : ''}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
              />
              {unlockAttempts > 0 && unlockAttempts < 3 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ {3 - unlockAttempts} attempt{3 - unlockAttempts !== 1 ? 's' : ''} remaining before lockout
                </p>
              )}
            </div>

            <SaasButton
              type="button"
              variant={biometricEnabled || passkeyEnabled ? "outline" : "gradient"}
              size="lg"
              className="w-full min-h-[48px] touch-manipulation"
              onClick={handleUnlock}
              loading={isLoading}
              disabled={!masterPassword || isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
            >
              {isLoading ? 'Unlocking...' : 'Unlock with Password'}
            </SaasButton>
          </div>

          {/* Security Notice */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4" />
              <span>Your data is encrypted with AES-256-GCM. We never see your master password.</span>
            </div>
          </div>
        </SaasCard>
      </motion.div>
    </div>
  )
}

export default UnlockVault
