import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getVaultStatus } from '../api/resources'
import { authenticateForVault, listPasskeyVaultWraps } from '../api/passkeys'
import { decryptVaultWithPrf } from '../security/vaultCrypto'
import { useAuth } from '../auth/AuthContext'

export interface NativeVaultEntry {
  id: string
  title?: string
  name?: string
  username?: string
  url?: string
  category?: string
  favorite?: boolean
}

interface VaultContextValue {
  entries: NativeVaultEntry[]
  unlocked: boolean
  unlocking: boolean
  error: string | null
  unlock(): Promise<void>
  lock(): void
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const { appLocked, user } = useAuth()
  const [entries, setEntries] = useState<NativeVaultEntry[]>([])
  const [unlocked, setUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rawKey = useRef<Uint8Array | null>(null)

  const lock = useCallback(() => {
    rawKey.current?.fill(0)
    rawKey.current = null
    setEntries([])
    setUnlocked(false)
    setError(null)
  }, [])

  useEffect(() => { if (appLocked || !user) lock() }, [appLocked, user, lock])

  const unlock = useCallback(async () => {
    setUnlocking(true)
    setError(null)
    try {
      const [latest, wraps] = await Promise.all([getVaultStatus(), listPasskeyVaultWraps()])
      if (!latest.exists || !latest.encryptedVault || !latest.iv) throw new Error('No encrypted vault is configured for this account.')
      const assertion = await authenticateForVault(wraps)
      const wrap = wraps.find((candidate) => candidate.credentialId === assertion.id)
      if (!wrap) throw new Error('The selected passkey is not enrolled for this vault.')
      const result = await decryptVaultWithPrf({ assertion, wrap, encryptedVault: latest.encryptedVault, vaultIV: latest.iv })
      const payload = result.payload as { entries?: NativeVaultEntry[] }
      if (!payload || !Array.isArray(payload.entries)) throw new Error('The decrypted vault payload is invalid.')
      rawKey.current?.fill(0)
      rawKey.current = result.rawVaultKey
      setEntries(payload.entries)
      setUnlocked(true)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Vault unlock failed.'
      setError(message)
      throw cause
    } finally {
      setUnlocking(false)
    }
  }, [])

  const value = useMemo(() => ({ entries, unlocked, unlocking, error, unlock, lock }), [entries, unlocked, unlocking, error, unlock, lock])
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) throw new Error('useVault must be used inside VaultProvider')
  return context
}
