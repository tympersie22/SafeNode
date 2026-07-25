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
import { VaultAccessError, unlockVault, vaultExists } from '../services/vaultService'
import DeviceLimitPanel from './DeviceLimitPanel'
import DeviceReapprovalPanel from './DeviceReapprovalPanel'
import { recoverVaultWithKit, upgradeVaultAccess } from '../services/recoveryService'
import { logout } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import { SaasButton, SaasInput, SaasCard } from '../ui'
import { Vault, Eye, EyeOff, LogOut, ShieldCheck, LifeBuoy } from 'lucide-react'
import { base64ToArrayBuffer } from '../crypto/crypto'
import { API_BASE } from '../config/api'
import { getCurrentDeviceHeaders } from '../services/deviceService'
import { devLog, devWarn } from '../utils/debug'
import { hasPasskeyVaultUnlock, unlockVaultWithPasskey } from '../services/passkeyVault'
import { showToast } from './ui/Toast'

interface UnlockVaultProps {
  onVaultUnlocked: (vault: any, masterPassword: string, salt: ArrayBuffer) => void
  onSetupMasterPassword?: () => void
  onLogout?: () => void
  vaultPresenceHint?: boolean | null
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
  vaultPresenceHint = null,
}) => {
  const [masterPassword, setMasterPassword] = useState('')
  const [recoveryKit, setRecoveryKit] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showRecoveryKit, setShowRecoveryKit] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unlockMode, setUnlockMode] = useState<'passphrase' | 'recovery'>('passphrase')
  const [passkeyReady, setPasskeyReady] = useState(false)
  const [showFallbackMethods, setShowFallbackMethods] = useState(false)
  const [migrationState, setMigrationState] = useState<{
    recoveryKit: string
    vault: any
    salt: ArrayBuffer
  } | null>(null)

  /**
   * hasVault tri-state:
   *   null  = vault existence check in-flight → render skeleton
   *   false = no vault found → auto-trigger setup (useEffect below)
   *   true  = vault exists  → render unlock form
   */
  const [hasVault, setHasVault] = useState<boolean | null>(vaultPresenceHint)

  // Rate-limiting state
  const [unlockAttempts, setUnlockAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

  const [deviceLimit, setDeviceLimit] = useState<{
    devices: Array<{ id: string; deviceId: string; name: string; platform: string; lastSeen: number; isCurrent?: boolean }>
    current: number
    limit: number
    planName?: string
    recommendedPlanName?: string
  } | null>(null)

  // Set when this device was removed and must be re-approved (email-link escape).
  const [reapproval, setReapproval] = useState<{ message?: string } | null>(null)

  const { user } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  // Dedup: prevent concurrent / per-user duplicate checks
  const lastCheckedUserId = useRef<string | null>(null)
  const checkInProgress = useRef(false)

  // Keep a stable ref for the setup callback to avoid stale closures
  const setupCallbackRef = useRef(onSetupMasterPassword)
  useEffect(() => { setupCallbackRef.current = onSetupMasterPassword }, [onSetupMasterPassword])

  useEffect(() => {
    if (typeof vaultPresenceHint === 'boolean') {
      setHasVault(vaultPresenceHint)
    }
  }, [vaultPresenceHint])

  // ── Check vault existence (re-runnable so we can retry after a device swap) ──
  const runVaultCheck = useCallback((force = false) => {
    if (!user?.id) {
      lastCheckedUserId.current = null
      setHasVault(null)
      return
    }

    if (typeof vaultPresenceHint === 'boolean' && !force) {
      lastCheckedUserId.current = user.id
      return
    }

    if (!force && (user.id === lastCheckedUserId.current || checkInProgress.current)) return

    checkInProgress.current = true
    lastCheckedUserId.current = user.id
    setDeviceLimit(null)
    setReapproval(null)

    vaultExists()
      .then((exists) => setHasVault(exists))
      .catch((err) => {
        devWarn('[UnlockVault] vault existence check failed:', err)
        if (err instanceof VaultAccessError) {
          if (err.code === 'DEVICE_REAPPROVAL_REQUIRED') {
            // Removed device: offer an email re-approval link instead of a dead end.
            setReapproval({ message: err.message })
            setError(null)
          } else if (err.status === 403 && Array.isArray(err.details?.devices) && err.details.devices.length > 0) {
            // Device-limit lockout: offer self-service device removal instead of a dead end.
            setDeviceLimit({
              devices: err.details.devices,
              current: err.details.current,
              limit: err.details.limit,
              planName: err.details.currentPlanName,
              recommendedPlanName: err.details.recommendedPlanName
            })
            setError(null)
          } else if (err.status === 403) {
            setError(err.message || 'This device is not approved to access your existing vault yet.')
          } else if (err.status === 401) {
            setError(err.message || 'Your session is no longer active. Please sign in again.')
          } else {
            setError(err.message || 'Unable to verify your existing vault right now.')
          }
        } else {
          setError('Unable to verify your existing vault right now.')
        }

        // Never convert an access or network error into "no vault".
        // If we have a positive hint from auth, preserve it. Otherwise keep the
        // user on the current unlock path instead of destructive setup.
        setHasVault(true)
      })
      .finally(() => {
        checkInProgress.current = false
      })
  }, [user?.id, vaultPresenceHint])

  // ── Check vault existence once per user ────────────────────────────────────
  useEffect(() => {
    runVaultCheck()
  }, [runVaultCheck])

  useEffect(() => {
    let active = true

    // Availability is decided by the server-authoritative passkey vault-unlock
    // check (a PRF-ready record only exists when the account is in wrapped_key
    // mode), NOT by the possibly-stale cached user.vaultAccessMode. Relying on the
    // cached mode would lock out a user who just bootstrapped a passkey but whose
    // auth profile hasn't refreshed yet.
    if (
      hasVault !== true ||
      typeof window === 'undefined' ||
      !('PublicKeyCredential' in window)
    ) {
      setPasskeyReady(false)
      return
    }

    hasPasskeyVaultUnlock()
      .then((ready) => {
        if (active) {
          setPasskeyReady(ready)
        }
      })
      .catch((error) => {
        console.warn('[UnlockVault] Failed to check passkey vault unlock availability:', error)
        if (active) {
          setPasskeyReady(false)
        }
      })

    return () => {
      active = false
    }
  }, [hasVault, user?.id])

  useEffect(() => {
    if (!passkeyReady) {
      setShowFallbackMethods(true)
    }
  }, [passkeyReady])

  // ── Auto-proceed to setup when no vault found ──────────────────────────────
  useEffect(() => {
    if (hasVault === false) {
      devLog('[UnlockVault] No vault found — auto-routing to master-password setup')
      // Defer one tick so the skeleton renders cleanly before parent re-renders
      const t = setTimeout(() => setupCallbackRef.current?.(), 0)
      return () => clearTimeout(t)
    }
  }, [hasVault])

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

  const handleRecoveryUnlock = useCallback(async () => {
    if (!recoveryKit.trim()) {
      setError('Please enter your recovery kit')
      return
    }
    if (hasVault !== true) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await recoverVaultWithKit(recoveryKit)
      setUnlockAttempts(0)
      setLockoutUntil(null)
      onVaultUnlocked(result.vault, result.deviceSecret, result.salt)
    } catch (err: any) {
      console.error('Recovery unlock failed:', err)
      setError(err.message || 'Recovery unlock failed. Please check your recovery kit and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [recoveryKit, hasVault, onVaultUnlocked])

  const handlePasskeyUnlock = useCallback(async () => {
    if (!passkeyReady || hasVault !== true) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await unlockVaultWithPasskey()
      setUnlockAttempts(0)
      setLockoutUntil(null)
      onVaultUnlocked(result.vault, '', result.salt)
    } catch (err: any) {
      console.error('Passkey vault unlock failed:', err)
      setError(err.message || 'Passkey vault unlock failed. Use your vault passphrase or recovery kit.')
    } finally {
      setIsLoading(false)
    }
  }, [passkeyReady, hasVault, onVaultUnlocked])

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
      if (vault?._accessProfile?.accessMode === 'passphrase') {
        const upgrade = await upgradeVaultAccess(masterPassword)
        const migratedVault = await unlockVault(masterPassword)
        const migratedSalt = await getSalt(migratedVault)
        setMigrationState({
          recoveryKit: upgrade.recoveryKit,
          vault: migratedVault,
          salt: migratedSalt,
        })
        return
      }
      if (vault?._accessProfile?.accessMode === 'wrapped_key' && !passkeyReady) {
        showToast.info('Open Passkeys after unlock to enable cryptographic passkey vault unlock on this device.')
      }
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
  }, [masterPassword, lockoutUntil, hasVault, unlockAttempts, getSalt, onVaultUnlocked, passkeyReady])

  const recoveryAvailable = user?.vaultAccessMode === 'wrapped_key' && Boolean(user?.recoveryKitConfigured)

  // ── Enter key ──────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && !(lockoutUntil && Date.now() < lockoutUntil)) {
        if (unlockMode === 'recovery' && recoveryKit.trim()) {
          handleRecoveryUnlock()
        } else if (unlockMode === 'passphrase' && masterPassword) {
          handleUnlock()
        }
      }
    },
    [handleRecoveryUnlock, handleUnlock, isLoading, lockoutUntil, masterPassword, recoveryKit, unlockMode]
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
              {passkeyReady
                ? 'Use your passkey for instant cryptographic unlock. Your passphrase and recovery kit stay available as fallback.'
                : recoveryAvailable
                  ? 'Use your vault passphrase or recovery kit to restore access.'
                  : 'Enter your vault passphrase to access your encrypted vault.'}
            </p>
          </div>

          {/* Removed device — email-based re-approval escape */}
          {reapproval && (
            <div className="mb-6">
              <DeviceReapprovalPanel message={reapproval.message} />
            </div>
          )}

          {/* Device limit reached — self-service device removal */}
          {deviceLimit && (
            <div className="mb-6">
              <DeviceLimitPanel
                devices={deviceLimit.devices}
                current={deviceLimit.current}
                limit={deviceLimit.limit}
                planName={deviceLimit.planName}
                recommendedPlanName={deviceLimit.recommendedPlanName}
                onResolved={() => runVaultCheck(true)}
              />
            </div>
          )}

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

          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-300" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {migrationState
                    ? 'Wrapped-key upgrade is ready'
                    : passkeyReady
                      ? 'Passkey vault unlock is ready'
                      : 'Vault unlock stays local'}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {migrationState
                    ? 'This vault was upgraded from the legacy passphrase-only model. Save the recovery kit below before you continue into the workspace.'
                    : passkeyReady
                    ? 'This device can derive a vault-wrapping key from your passkey without storing the vault secret locally. If the passkey path is unavailable, use your vault passphrase or recovery kit.'
                    : 'Passkeys sign you in to Safenode. Your vault secret still stays local to this browser session, so use your vault passphrase or recovery kit when access material has not been enrolled for passkey unlock.'}
                </p>
              </div>
            </div>
          </div>

          {migrationState && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Recovery kit
              </p>
              <p className="mt-3 break-all rounded-xl bg-white/80 px-4 py-3 font-mono text-sm text-amber-900 shadow-sm dark:bg-slate-950/40 dark:text-amber-100">
                {migrationState.recoveryKit}
              </p>
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                Store this now. It is the fallback bridge for a new device or a passkey that has not been enrolled for vault unlock yet.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <SaasButton
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(migrationState.recoveryKit)
                    showToast.success('Recovery kit copied')
                  }}
                >
                  Copy recovery kit
                </SaasButton>
                <SaasButton
                  variant="primary"
                  onClick={() => {
                    const pending = migrationState
                    setMigrationState(null)
                    if (!passkeyReady) {
                      showToast.info('Open Passkeys after unlock to enable cryptographic passkey vault unlock on this device.')
                    }
                    onVaultUnlocked(pending.vault, masterPassword, pending.salt)
                  }}
                >
                  Continue to vault
                </SaasButton>
              </div>
            </div>
          )}

          {passkeyReady && (
            <div className="mb-5">
              <SaasButton
                type="button"
                variant="gradient"
                size="lg"
                className="w-full min-h-[52px] touch-manipulation rounded-2xl"
                onClick={handlePasskeyUnlock}
                loading={isLoading}
                disabled={isLoading || isLockedOut || Boolean(migrationState)}
              >
                {isLoading ? 'Unlocking…' : 'Unlock with Passkey'}
              </SaasButton>
              <button
                type="button"
                onClick={() => setShowFallbackMethods((value) => !value)}
                className="mt-3 w-full text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {showFallbackMethods ? 'Hide other methods' : 'Use another method'}
              </button>
            </div>
          )}

          {(showFallbackMethods || !passkeyReady) && recoveryAvailable && (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  setUnlockMode('passphrase')
                  setError(null)
                }}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  unlockMode === 'passphrase'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Vault passphrase
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnlockMode('recovery')
                  setError(null)
                }}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  unlockMode === 'recovery'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Recovery kit
              </button>
            </div>
          )}

          {/* Password / recovery input */}
          {(showFallbackMethods || !passkeyReady) && (
          <div className="space-y-4">
            {unlockMode === 'passphrase' ? (
              <>
                <div>
                  <SaasInput
                    type={showPassword ? 'text' : 'password'}
                    label="Vault Passphrase"
                    value={masterPassword}
                    onChange={(e) => { setMasterPassword(e.target.value); setError(null) }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your vault passphrase"
                    required
                    autoFocus={!passkeyReady}
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
                  variant="gradient"
                  size="lg"
                  className="w-full min-h-[50px] touch-manipulation rounded-2xl"
                  onClick={handleUnlock}
                  loading={isLoading}
                  disabled={!masterPassword || isLoading || isLockedOut || Boolean(migrationState)}
                >
                  {isLoading ? 'Unlocking…' : 'Unlock with Passphrase'}
                </SaasButton>
              </>
            ) : (
              <>
                <div>
                  <SaasInput
                    type={showRecoveryKit ? 'text' : 'password'}
                    label="Recovery Kit"
                    value={recoveryKit}
                    onChange={(e) => { setRecoveryKit(e.target.value.toUpperCase()); setError(null) }}
                    onKeyDown={handleKeyDown}
                    placeholder="ABCDE-12345-..."
                    required
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowRecoveryKit((v) => !v)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={showRecoveryKit ? 'Hide recovery kit' : 'Show recovery kit'}
                      >
                        {showRecoveryKit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Recovery unlock restores access for the current session only. You will use your passphrase or recovery kit again after the session ends.
                  </p>
                </div>

                <SaasButton
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full min-h-[50px] touch-manipulation rounded-2xl"
                  onClick={handleRecoveryUnlock}
                  loading={isLoading}
                  disabled={!recoveryKit.trim() || isLoading || isLockedOut || Boolean(migrationState)}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center">
                    <LifeBuoy className="h-4.5 w-4.5" />
                  </span>
                  {isLoading ? 'Restoring access…' : 'Recover and Trust This Device'}
                </SaasButton>
              </>
            )}
          </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>AES-256-GCM · zero-knowledge · recovery restores access without asking the server to decrypt the vault</span>
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
