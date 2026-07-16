import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LifeBuoy, MailCheck, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { getCurrentUser, type User } from '../../services/authService'
import { getAccountSuccessor, type AccountSuccessor } from '../../services/accountSuccessorService'
import { getDevices, type Device } from '../../services/deviceService'
import { listPasskeys } from '../../api/passkeys'
import { vaultStorage, type VaultMetadata } from '../../storage/vaultStorage'
import { upgradeVaultAccess } from '../../services/recoveryService'
import { hasVaultSessionSecret } from '../../services/vaultSession'

type RecoveryState = 'ready' | 'attention' | 'missing'

type RecoveryItem = {
  id: string
  label: string
  detail: string
  state: RecoveryState
  actionLabel: string
  action: () => void
}

const stateClasses: Record<RecoveryState, string> = {
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  attention: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  missing: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
}

const stateLabels: Record<RecoveryState, string> = {
  ready: 'Ready',
  attention: 'Needs review',
  missing: 'Missing'
}

export const RecoveryCenterSettings: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [successor, setSuccessor] = useState<AccountSuccessor | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [passkeyCount, setPasskeyCount] = useState(0)
  const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata | null>(null)
  const [trustedDeviceReady, setTrustedDeviceReady] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [latestRecoveryKit, setLatestRecoveryKit] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [currentUser, successorRecord, deviceOverview, passkeys] = await Promise.all([
          getCurrentUser(),
          getAccountSuccessor().catch(() => null),
          getDevices().catch(() => ({ devices: [], pendingApprovals: [] })),
          listPasskeys().catch(() => [])
        ])

        await vaultStorage.init()
        const metadata = await vaultStorage.getVaultMetadata()
        if (!mounted) return

        setUser(currentUser)
        setSuccessor(successorRecord)
        setDevices(deviceOverview.devices)
        setPasskeyCount(passkeys.length)
        setVaultMetadata(metadata)
        setTrustedDeviceReady(hasVaultSessionSecret())
      } catch (err: any) {
        if (!mounted) return
        setError(err.message || 'Failed to load recovery readiness')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const recoveryItems = useMemo<RecoveryItem[]>(() => {
    const emailState: RecoveryState = user?.emailVerified ? 'ready' : 'missing'
    const passkeyState: RecoveryState = passkeyCount > 0 ? 'ready' : 'missing'
    const vaultModelState: RecoveryState =
      user?.vaultAccessMode === 'wrapped_key'
        ? user?.recoveryKitConfigured ? 'ready' : 'attention'
        : user?.hasVault ? 'attention' : 'missing'
    const factorState: RecoveryState =
      user?.twoFactorEnabled || user?.biometricEnabled ? 'ready' : 'attention'
    const deviceUnlockState: RecoveryState =
      trustedDeviceReady ? 'ready' : user?.recoveryKitConfigured ? 'attention' : 'missing'
    const deviceState: RecoveryState =
      devices.length >= 2 ? 'ready' : devices.length === 1 ? 'attention' : 'missing'
    const successorState: RecoveryState = successor?.status === 'active' ? 'ready' : 'attention'
    const backupState: RecoveryState = vaultMetadata ? 'ready' : 'attention'

    return [
      {
        id: 'vault-model',
        label: 'Vault access model',
        detail:
          user?.vaultAccessMode === 'wrapped_key'
            ? user?.recoveryKitConfigured
              ? 'Wrapped vault key and recovery kit are configured'
              : 'Wrapped vault key is active, but recovery kit still needs to be stored'
            : user?.hasVault
              ? 'Legacy passphrase-only vault still needs migration to the wrapped access model'
              : 'No vault access profile available yet',
        state: vaultModelState,
        actionLabel: user?.vaultAccessMode === 'wrapped_key' ? 'Review migration' : 'Upgrade access model',
        action: () => navigate('/settings?tab=recovery')
      },
      {
        id: 'passkeys',
        label: 'Primary sign-in',
        detail: passkeyCount > 0 ? `${passkeyCount} passkey${passkeyCount === 1 ? '' : 's'} registered` : 'No passkeys registered yet',
        state: passkeyState,
        actionLabel: 'Manage passkeys',
        action: () => navigate('/settings?tab=security')
      },
      {
        id: 'email',
        label: 'Identity proof',
        detail: user?.emailVerified ? 'Email is verified for recovery and notifications' : 'Verify your email so recovery notices can reach you',
        state: emailState,
        actionLabel: 'Open identity settings',
        action: () => navigate('/settings?tab=security')
      },
      {
        id: 'factors',
        label: 'Fallback factors',
        detail: user?.twoFactorEnabled || user?.biometricEnabled ? 'Additional verification factors are configured' : 'Set up 2FA or an authenticator-backed device factor',
        state: factorState,
        actionLabel: 'Open identity settings',
        action: () => navigate('/settings?tab=security')
      },
      {
        id: 'device-unlock',
        label: 'Current device trust',
        detail: trustedDeviceReady
          ? 'The vault is currently unlocked in this browser session'
          : user?.recoveryKitConfigured
            ? 'Use a passkey when vault unlock is enrolled on this device, or fall back to your vault passphrase or recovery kit.'
            : 'Current device recovery still needs to be configured',
        state: deviceUnlockState,
        actionLabel: 'Review unlock path',
        action: () => navigate('/vault')
      },
      {
        id: 'devices',
        label: 'Trusted devices',
        detail: devices.length > 0 ? `${devices.length} active device${devices.length === 1 ? '' : 's'} registered` : 'No active devices detected',
        state: deviceState,
        actionLabel: 'Review devices',
        action: () => navigate('/settings?tab=devices')
      },
      {
        id: 'successor',
        label: 'Successor continuity',
        detail: successor?.status === 'active' ? `Successor designated: ${successor.successorEmail}` : 'No successor configured for continuity events',
        state: successorState,
        actionLabel: 'Open account continuity',
        action: () => navigate('/settings?tab=account')
      },
      {
        id: 'backup',
        label: 'Encrypted export readiness',
        detail: vaultMetadata ? `Local encrypted vault present at version ${vaultMetadata.version}` : 'No local encrypted vault metadata found yet',
        state: backupState,
        actionLabel: 'Open vault & recovery',
        action: () => navigate('/settings?tab=data')
      }
    ]
  }, [devices.length, navigate, passkeyCount, successor, trustedDeviceReady, user?.biometricEnabled, user?.emailVerified, user?.hasVault, user?.recoveryKitConfigured, user?.twoFactorEnabled, user?.vaultAccessMode, vaultMetadata])

  const readinessScore = useMemo(() => {
    if (recoveryItems.length === 0) return 0
    const total = recoveryItems.reduce((acc, item) => {
      if (item.state === 'ready') return acc + 1
      if (item.state === 'attention') return acc + 0.5
      return acc
    }, 0)
    return Math.round((total / recoveryItems.length) * 100)
  }, [recoveryItems])

  const needsAttention = recoveryItems.filter((item) => item.state !== 'ready')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          <LifeBuoy className="h-6 w-6" />
          Recovery Center
        </h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Measure whether this account can survive device loss, sign-in disruption, and continuity events without weakening the vault boundary.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </motion.div>
      )}

      <SaasCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recovery posture</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Account continuity readiness</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              A strong recovery posture means passkeys, verified identity, active devices, export readiness, and a continuity plan are all in place.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-right dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Readiness</p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{readinessScore}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">percent of core recovery controls in place</p>
          </div>
        </div>
      </SaasCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { icon: <KeyRound className="h-5 w-5" />, label: 'Passkeys', value: `${passkeyCount}`, meta: passkeyCount === 1 ? 'credential registered' : 'credentials registered' },
            { icon: <ShieldCheck className="h-5 w-5" />, label: 'This session', value: trustedDeviceReady ? 'Unlocked' : 'Needs unlock', meta: trustedDeviceReady ? 'vault secret is held in memory only' : 'unlock with passphrase or recovery kit when needed' },
            { icon: <Smartphone className="h-5 w-5" />, label: 'Trusted devices', value: `${devices.length}`, meta: devices.length === 1 ? 'device enrolled' : 'devices enrolled' },
            { icon: <Users className="h-5 w-5" />, label: 'Successor', value: successor?.status === 'active' ? 'Set' : 'Unset', meta: successor?.status === 'active' ? 'continuity contact configured' : 'continuity contact missing' },
            { icon: <MailCheck className="h-5 w-5" />, label: 'Verified email', value: user?.emailVerified ? 'Ready' : 'Missing', meta: user?.emailVerified ? 'notification channel confirmed' : 'identity proof incomplete' },
            { icon: <LifeBuoy className="h-5 w-5" />, label: 'Fallback factors', value: user?.twoFactorEnabled || user?.biometricEnabled ? 'Ready' : 'Needs work', meta: user?.twoFactorEnabled ? '2FA configured' : user?.biometricEnabled ? 'biometric enabled' : 'no fallback factor configured' },
            { icon: <LifeBuoy className="h-5 w-5" />, label: 'Export readiness', value: vaultMetadata ? 'Ready' : 'Review', meta: vaultMetadata ? 'local encrypted vault metadata present' : 'verify local export and backup path' }
          ].map((stat) => (
          <SaasCard key={stat.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {stat.icon}
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.meta}</p>
          </SaasCard>
        ))}
      </div>

      <SaasCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recovery checklist</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Each control below maps to a real screen in Safenode. Finish the missing items and this account becomes much harder to lose.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading recovery readiness…</p>
          ) : (
            recoveryItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${stateClasses[item.state]}`}>
                      {stateLabels[item.state]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.detail}</p>
                </div>
                <SaasButton variant={item.state === 'ready' ? 'secondary' : 'primary'} size="sm" onClick={item.action}>
                  {item.actionLabel}
                </SaasButton>
              </div>
            ))
          )}
        </div>
      </SaasCard>

      <SaasCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What to fix next</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Safenode should help you recover without ever pretending the backend can decrypt your vault for you.
            </p>
          </div>
          <SaasButton variant="outline" size="sm" onClick={() => navigate('/settings?tab=data')}>
            Review vault & recovery
          </SaasButton>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {needsAttention.length === 0 ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
              This account has the core recovery controls in place. Next step: keep more than one active device available and periodically verify your encrypted export path.
            </p>
          ) : (
            needsAttention.map((item) => (
              <p key={item.id} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}:</span> {item.detail}
              </p>
            ))
          )}
        </div>
      </SaasCard>

      {user?.hasVault && (
        <SaasCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Modern vault recovery model</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Move legacy vaults to a wrapped-key model, or refresh recovery coverage for already-migrated vaults. Safenode will relock the vault after the upgrade so the next unlock uses the new access profile.
              </p>
            </div>
            <SaasButton
              variant="primary"
              size="sm"
              isLoading={isUpgrading}
              onClick={async () => {
                setIsUpgrading(true)
                setError(null)
                try {
                  const result = await upgradeVaultAccess()
                  setLatestRecoveryKit(result.recoveryKit)
                  setTrustedDeviceReady(true)
                  const refreshedUser = await getCurrentUser()
                  setUser(refreshedUser)
                  await vaultStorage.init()
                  setVaultMetadata(await vaultStorage.getVaultMetadata())
                } catch (err: any) {
                  setError(err.message || 'Failed to upgrade recovery access')
                } finally {
                  setIsUpgrading(false)
                }
              }}
            >
              {user.vaultAccessMode === 'wrapped_key' ? 'Refresh recovery kit' : 'Upgrade vault access'}
            </SaasButton>
          </div>

          {latestRecoveryKit && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Save this recovery kit now
              </p>
              <p className="mt-3 break-all rounded-xl bg-white/80 px-4 py-3 font-mono text-sm text-amber-900 shadow-sm dark:bg-slate-950/40 dark:text-amber-100">
                {latestRecoveryKit}
              </p>
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                This kit is what keeps the vault recoverable if a passkey-backed device or local passphrase is no longer available.
              </p>
              <div className="mt-4">
                <SaasButton
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(latestRecoveryKit)
                  }}
                >
                  Copy recovery kit
                </SaasButton>
              </div>
            </div>
          )}
        </SaasCard>
      )}
    </div>
  )
}

export default RecoveryCenterSettings
