/**
 * UnlockVault Component
 *
 * Clean 3-state vault gateway:
 *   hasVault === null   → loading skeleton  (API call in-flight)
 *   hasVault === false  → auto-routes to setup via onSetupMasterPassword()
 *   hasVault === true   → unlock form (existing user enters master password)
 *
 * Never shows the unlock form to a brand-new user, eliminating the
 * registration-flash UX bug where "Unlock Your Vault" briefly appeared
 * before "Set Up Master Password".
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { unlockVault, vaultExists } from '../services/vaultService'
import { logout } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import { SaasButton, SaasInput, SaasCard } from '../ui'
import { Vault, Lock, Eye, EyeOff, LogOut, ShieldCheck, Fingerprint } from 'lucide-react'
import { base64ToArrayBuffer } from '../crypto/crypto'
import { API_BASE } from '../config/api'
import { keychainService } from '../utils/keychain'
import { getCurrentDeviceHeaders } from '../services/deviceService'
import { devLog, devWarn } from '../utils/debug'

const loadPasskeyApi = () => import('../api/passkeys')
const loadBiometricAuthService = async () => (await import('../utils/biometricAuth')).biometricAuthService

const PasskeyIcon = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="4" className="fill-current opacity-10" />
    <path d="M9 12a3 3 0 1 1 6 0c0 1.1-.6 1.9-1.4 2.4v1.6h-3.2v-1.6A2.82 2.82 0 0 1 9 12Z" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17.5 9.5h1.5M17.5 12h2M17.5 14.5h1.5" className="stroke-current" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

interface UnlockVaultProps {
  onVaultUnlocked: (vault: any, masterPassword: string, salt: ArrayBuffer) => void
  onSetupMasterPassword?: () => void
  onLogout?: () => void
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const VaultCheckingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6 animate-pulse">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 mx-auto" />
          <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-64 mx-auto" />
        </div>
        <div className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  </div>
)

// ─── Main component ────────────────────────────────────────────────────────────
export const UnlockVault: React.FC<UnlockVaultProps> = ({
  onVaultUnlocked,
  onSetupMasterPassword,
  onLogout,
}) => {
  const [masterPassword, setMasterPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  /**
   * hasVault tri-state:
   *   null  = vault existence check in-flight → render skeleton
   *   false = no vault found → auto-trigger setup (useEffect below)
   *   true  = vault exists  → render unlock form
   */
  const [hasVault, setHasVault] = useState<boolean | null>(null)

  // Rate-limiting state
  const [unlockAttempts, setUnlockAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

  // Biometric / passkey state
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [passkeyAvailable, setPasskeyAvailable] = useState(false)
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)

  const { user } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  // Dedup: prevent concurrent / per-user duplicate checks
  const lastCheckedUserId = useRef<string | null>(null)
  const checkInProgress = useRef(false)

  // Keep a stable ref for the setup callback to avoid stale closures
  const setupCallbackRef = useRef(onSetupMasterPassword)
  useEffect(() => { setupCallbackRef.current = onSetupMasterPassword }, [onSetupMasterPassword])

  // ── Check vault existence once per user ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      lastCheckedUserId.current = null
      setHasVault(null)
      return
    }

    if (user.id === lastCheckedUserId.current || checkInProgress.current) return

    checkInProgress.current = true
    lastCheckedUserId.current = user.id

    vaultExists()
      .then((exists) => setHasVault(exists))
      .catch((err) => {
        devWarn('[UnlockVault] vault existence check failed:', err)
        // On any error treat as "no vault" so user can always reach setup
        setHasVault(false)
      })
      .finally(() => {
        checkInProgress.current = false
      })
  }, [user?.id])

  // ── Auto-proceed to setup when no vault found ──────────────────────────────
  useEffect(() => {
    if (hasVault === false) {
      devLog('[UnlockVault] No vault found — auto-routing to master-password setup')
      // Defer one tick so the skeleton renders cleanly before parent re-renders
      const t = setTimeout(() => setupCallbackRef.current?.(), 0)
      return () => clearTimeout(t)
    }
  }, [hasVault])

  // ── Biometric availability ─────────────────────────────────────────────────
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const biometricAuthService = await loadBiometricAuthService()
        const caps = await biometricAuthService.isAvailable()
        setBiometricAvailable(caps.available)
        const enabled = localStorage.getItem('safenode_biometric_enabled') === 'true'
        const hasStoredPassword = await keychainService.get('safenode', 'master_password')
        setBiometricEnabled(enabled && caps.available && !!hasStoredPassword)
      } catch (err) {
        devWarn('Biometric check failed:', err)
        setBiometricAvailable(false)
        setBiometricEnabled(false)
      }
    }
    const timer = window.setTimeout(() => {
      checkBiometric()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [])

  // ── Passkey availability (only when vault exists — skip for new users) ──────
  useEffect(() => {
    // Don't check passkeys until we know the user has a vault
    if (hasVault !== true) return
    if (!user?.id || typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
      setPasskeyAvailable(false)
      setPasskeyEnabled(false)
      return
    }

    const checkPasskeys = async () => {
      try {
        const { listPasskeys } = await loadPasskeyApi()
        const [storedPassword, passkeys] = await Promise.all([
          keychainService.get('safenode', 'master_password'),
          listPasskeys().catch(() => [])
        ])
        setPasskeyAvailable(true)
        setPasskeyEnabled(Boolean(storedPassword) && passkeys.length > 0)
      } catch (err) {
        devWarn('Passkey check failed:', err)
        setPasskeyAvailable(true)
        setPasskeyEnabled(false)
      }
    }
    const timer = window.setTimeout(() => {
      checkPasskeys()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [user?.id, hasVault]) // Only run when hasVault becomes true

  // ── Lockout timer ──────────────────────────────────────────────────────────
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  /**
   * Extract the vault salt as ArrayBuffer.
   * unlockVault() now attaches _salt to the vault object (already fetched),
   * so we avoid a redundant GET /api/auth/vault/salt round-trip.
   * Falls back to a direct fetch only if _salt is somehow absent.
   */
  const getSalt = useCallback(async (vault: any): Promise<ArrayBuffer> => {
    if (vault?._salt) {
      return base64ToArrayBuffer(vault._salt)
    }
    // Fallback: fetch separately (should not normally be reached)
    const saltRes = await fetch(`${API_BASE}/api/auth/vault/salt`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('safenode_token')}`,
        ...getCurrentDeviceHeaders()
      }
    })
    if (!saltRes.ok) throw new Error('Failed to get vault salt')
    const { salt } = await saltRes.json()
    return base64ToArrayBuffer(salt)
  }, [])

  // ── Biometric unlock ───────────────────────────────────────────────────────
  const handleBiometricUnlock = useCallback(async () => {
    if (!biometricEnabled) return
    setIsLoading(true)
    setError(null)

    try {
      const biometricAuthService = await loadBiometricAuthService()
      const result = await biometricAuthService.authenticate('Unlock SafeNode vault', {
        enableML: true,
        userId: user?.id || 'user',
        collectBehavioral: true
      })
      if (!result.success) throw new Error(result.error || 'Biometric authentication failed')

      const storedPassword = await keychainService.get('safenode', 'master_password')
      if (!storedPassword) throw new Error('Master password not found. Please unlock with password first.')

      const vault = await unlockVault(storedPassword)
      const salt = await getSalt(vault)

      setUnlockAttempts(0)
      setLockoutUntil(null)
      onVaultUnlocked(vault, storedPassword, salt)
    } catch (err: any) {
      console.error('Biometric unlock failed:', err)
      setError(err.message || 'Biometric authentication failed. Please use your master password.')
    } finally {
      setIsLoading(false)
    }
  }, [biometricEnabled, user?.id, getSalt, onVaultUnlocked])

  // ── Passkey unlock ─────────────────────────────────────────────────────────
  const handlePasskeyUnlock = useCallback(async () => {
    if (!passkeyEnabled) return
    setIsLoading(true)
    setError(null)

    try {
      const { authenticateWithPasskey } = await loadPasskeyApi()
      await authenticateWithPasskey()

      const storedPassword = await keychainService.get('safenode', 'master_password')
      if (!storedPassword) throw new Error('Unlock with your master password once on this device before using passkeys.')

      const vault = await unlockVault(storedPassword)
      const salt = await getSalt(vault)

      setUnlockAttempts(0)
      setLockoutUntil(null)
      onVaultUnlocked(vault, storedPassword, salt)
    } catch (err: any) {
      console.error('Passkey unlock failed:', err)
      setError(err.message || 'Passkey authentication failed. Please use your master password.')
    } finally {
      setIsLoading(false)
    }
  }, [passkeyEnabled, getSalt, onVaultUnlocked])

  // ── Master-password unlock ─────────────────────────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!masterPassword) { setError('Please enter your master password'); return }
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60)
      setError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`)
      return
    }
    if (hasVault !== true) return   // Guard: only unlock when vault confirmed

    setIsLoading(true)
    setError(null)

    try {
      const vault = await unlockVault(masterPassword)
      const salt = await getSalt(vault)

      setUnlockAttempts(0)
      setLockoutUntil(null)
      onVaultUnlocked(vault, masterPassword, salt)
    } catch (err: any) {
      console.error('Unlock failed:', err)

      const newAttempts = unlockAttempts + 1
      setUnlockAttempts(newAttempts)

      if (newAttempts >= 3) {
        setLockoutUntil(Date.now() + 15 * 60 * 1000)
        setError('Too many failed attempts. Vault locked for 15 minutes.')
      } else {
        const remaining = 3 - newAttempts
        const msg = err.message || ''
        if (msg.includes('Incorrect master password') || msg.includes('Decryption failed') || msg.includes('wrong password')) {
          setError(`Incorrect master password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`)
        } else if (msg.includes('Not authenticated') || msg.includes('401')) {
          setError('Session expired. Please sign in again.')
        } else if (msg.includes('network') || msg.includes('fetch')) {
          setError('Network error. Check your connection and try again.')
        } else {
          setError(`Failed to unlock vault: ${msg}`)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [masterPassword, lockoutUntil, hasVault, unlockAttempts, getSalt, onVaultUnlocked])

  // ── Enter key ──────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && masterPassword && !(lockoutUntil && Date.now() < lockoutUntil)) {
        handleUnlock()
      }
    },
    [handleUnlock, isLoading, masterPassword, lockoutUntil]
  )

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleGoToLanding = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('[UnlockVault] logout error:', err)
    } finally {
      setIsLoggingOut(false)
      onLogout?.()
    }
  }, [onLogout])

  const isLockedOut = Boolean(lockoutUntil && Date.now() < lockoutUntil)

  // ─────────────────────────────────────────────────────────────────────────────
  // Render states
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Still checking vault existence (or auto-routing to setup for new users)
  if (hasVault === null || hasVault === false) {
    return <VaultCheckingSkeleton />
  }

  // 2. Vault exists — show unlock form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 flex items-center justify-center p-4">
      <motion.div
        key="unlock"
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <SaasCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={prefersReducedMotion ? undefined : { scale: 0 }}
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

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl"
                role="alert"
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
          </AnimatePresence>

          {/* Passkey / Biometric quick-unlock */}
          {(passkeyEnabled || biometricEnabled) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 space-y-3"
            >
              {passkeyEnabled && (
                <SaasButton
                  type="button"
                  variant="gradient"
                  size="md"
                  className="w-full min-h-[44px] touch-manipulation rounded-2xl px-4 py-2.5 text-sm"
                  onClick={handlePasskeyUnlock}
                  loading={isLoading}
                  disabled={isLoading || isLockedOut}
                >
                  <span className="mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center text-white">
                    <PasskeyIcon />
                  </span>
                  {isLoading ? 'Authenticating…' : 'Unlock with Passkey'}
                </SaasButton>
              )}
              {biometricEnabled && (
                <SaasButton
                  type="button"
                  variant={passkeyEnabled ? 'outline' : 'gradient'}
                  size="md"
                  className="w-full min-h-[44px] touch-manipulation rounded-2xl px-4 py-2.5 text-sm"
                  onClick={handleBiometricUnlock}
                  loading={isLoading}
                  disabled={isLoading || isLockedOut}
                >
                  <span className={`mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center ${passkeyEnabled ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}>
                    <Fingerprint className="h-6 w-6" />
                  </span>
                  {isLoading ? 'Authenticating…' : 'Unlock with Biometric'}
                </SaasButton>
              )}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">or</p>
            </motion.div>
          )}

          {/* Password input */}
          <div className="space-y-4">
            <div>
              <SaasInput
                type={showPassword ? 'text' : 'password'}
                label="Master Password"
                value={masterPassword}
                onChange={(e) => { setMasterPassword(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                placeholder="Enter your master password"
                required
                autoFocus={!biometricEnabled && !passkeyEnabled}
                className={error && error.includes('Incorrect') ? 'border-red-500 focus:ring-red-500' : ''}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              {unlockAttempts > 0 && unlockAttempts < 3 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ {3 - unlockAttempts} attempt{3 - unlockAttempts !== 1 ? 's' : ''} remaining before lockout
                </p>
              )}
            </div>

            <SaasButton
              type="button"
              variant={biometricEnabled || passkeyEnabled ? 'outline' : 'gradient'}
              size="lg"
              className="w-full min-h-[50px] touch-manipulation rounded-2xl"
              onClick={handleUnlock}
              loading={isLoading}
              disabled={!masterPassword || isLoading || isLockedOut}
            >
              {isLoading ? 'Unlocking…' : 'Unlock with Password'}
            </SaasButton>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>AES-256-GCM · zero-knowledge · your password never leaves this device</span>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoToLanding}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isLoggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </SaasCard>
      </motion.div>
    </div>
  )
}

export default UnlockVault
