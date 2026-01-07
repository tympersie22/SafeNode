/**
 * UnlockVault Component (Updated)
 * Uses the new vaultService instead of old vaultStorage
 */

import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { unlockVault, vaultExists } from '../services/vaultService'
import { logout } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import { SaasButton, SaasInput, SaasCard } from '../ui'
import { Vault, Lock, Eye, EyeOff, LogOut } from 'lucide-react'
import { base64ToArrayBuffer } from '../crypto/crypto'

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

  useEffect(() => {
    // Check if vault exists (user is already authenticated via ProtectedRoute)
    if (user) {
      vaultExists()
        .then((exists) => {
          setHasVault(exists)
        })
        .catch((err) => {
          console.error('Failed to check vault:', err)
          setError('Failed to check vault status')
        })
    }
  }, [user])

  const handleUnlock = async () => {
    if (!masterPassword) {
      setError('Please enter your master password')
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
      const saltResponse = await fetch('/api/auth/vault/salt', {
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

      // Immediately unlock vault and go straight to vault UI - no success screen
      setIsLoading(false)
      onVaultUnlocked(vault, masterPassword, salt)
    } catch (err: any) {
      console.error('Unlock failed:', err)
      setError(err.message || 'Failed to unlock vault. Please check your master password.')
      setIsLoading(false)
    }
  }


  const handleGoToLanding = async () => {
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Password Input */}
          <div className="space-y-6">
            <SaasInput
              type={showPassword ? 'text' : 'password'}
              label="Master Password"
              value={masterPassword}
              onChange={(e) => {
                setMasterPassword(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && masterPassword) {
                  handleUnlock()
                }
              }}
              placeholder="Enter your master password"
              required
              autoFocus
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

            <SaasButton
                  type="button"
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleUnlock}
              loading={isLoading}
              disabled={!masterPassword || isLoading}
            >
              {isLoading ? 'Unlocking...' : 'Unlock Vault'}
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

