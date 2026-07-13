import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SaasButton, SaasCard } from '../ui'
import { VaultDoor } from '../icons/VaultDoor'
import { Shield } from '../icons/Shield'
import { generateSecurePassword, base64ToArrayBuffer } from '../crypto/crypto'
import { getVaultSalt, initializeVault, unlockVault } from '../services/vaultService'
import { showToast } from './ui/Toast'
import { enrollFirstAvailablePasskeyVaultUnlock } from '../services/passkeyVault'

interface PasskeyVaultBootstrapProps {
  email?: string
  onComplete: (vault?: any, deviceSecret?: string, salt?: ArrayBuffer) => void
}

export const PasskeyVaultBootstrap: React.FC<PasskeyVaultBootstrapProps> = ({
  email,
  onComplete,
}) => {
  const prefersReducedMotion = useReducedMotion()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryKit, setRecoveryKit] = useState<string | null>(null)
  const [vaultReady, setVaultReady] = useState<any | null>(null)
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null)
  const [vaultSalt, setVaultSalt] = useState<ArrayBuffer | null>(null)

  const handleBootstrap = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const generatedSecret = await generateSecurePassword(32, {
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false,
        requireEachType: true,
      })

      const initResult = await initializeVault(generatedSecret)
      const saltBase64 = await getVaultSalt()
      const salt = base64ToArrayBuffer(saltBase64)
      const unlockedVault = await unlockVault(generatedSecret)

      if (unlockedVault._rawVaultKey) {
        try {
          await enrollFirstAvailablePasskeyVaultUnlock(unlockedVault._rawVaultKey)
        } catch (enrollmentError: any) {
          console.warn('[PasskeyVaultBootstrap] Failed to enroll initial passkey vault unlock:', enrollmentError)
        }
      }

      setRecoveryKit(initResult.recoveryKit || null)
      setVaultReady(unlockedVault)
      setDeviceSecret(generatedSecret)
      setVaultSalt(salt)
    } catch (err: any) {
      setError(err.message || 'Failed to create your identity vault.')
    } finally {
      setIsLoading(false)
    }
  }

  const canContinue = Boolean(vaultReady && deviceSecret && vaultSalt)

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <SaasCard className="p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 shadow-safenode-blue-lg">
            {recoveryKit ? <Shield className="h-8 w-8 text-white" /> : <VaultDoor className="h-8 w-8 text-white" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {recoveryKit ? 'Recovery kit ready' : 'Finish your passkey setup'}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            {recoveryKit
              ? 'Your first passkey-backed vault unlock path is ready. Save the recovery kit before entering the workspace.'
              : `We’ll create a wrapped identity vault for ${email || 'this account'} and keep the temporary vault unlock secret in memory only for this session.`}
          </p>
        </div>

        {!recoveryKit && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">How this works</p>
              <ul className="mt-3 space-y-2 leading-6">
                <li>1. SafeNode creates a random vault key for this account.</li>
                <li>2. This browser holds the temporary unlock secret in memory only for the current session.</li>
                <li>3. You receive a recovery kit for future unlocks on new or restarted devices.</li>
              </ul>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <SaasButton
              variant="primary"
              className="w-full"
              onClick={handleBootstrap}
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Identity Vault...' : 'Create Identity Vault'}
            </SaasButton>
          </div>
        )}

        {recoveryKit && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Recovery kit
            </p>
            <p className="mt-3 break-all rounded-xl bg-white/80 px-4 py-3 font-mono text-sm text-amber-900 shadow-sm dark:bg-slate-950/40 dark:text-amber-100">
              {recoveryKit}
            </p>
            <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
              Store this away from your device. It is the bridge for new-device recovery without handing vault access back to the server.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <SaasButton
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(recoveryKit)
                  showToast.success('Recovery kit copied')
                }}
              >
                Copy Recovery Kit
              </SaasButton>
              <SaasButton
                variant="primary"
                disabled={!canContinue}
                onClick={() => onComplete(vaultReady, deviceSecret || undefined, vaultSalt || undefined)}
              >
                Continue to Identity Vault
              </SaasButton>
            </div>
          </div>
        )}
      </SaasCard>
    </motion.div>
  )
}

export default PasskeyVaultBootstrap
