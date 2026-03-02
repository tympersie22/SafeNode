import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BellRing,
  Clock3,
  Copy,
  CreditCard,
  FolderKanban,
  Globe,
  KeyRound,
  Layers3,
  LockKeyhole,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tags,
  UserCog,
  Wifi
} from 'lucide-react'
import Button from '../ui/Button'
import type { VaultEntry } from '../../types/vault'
import type { PasswordHealthSummary } from '../../health/passwordHealth'
import type { SyncStatus } from '../../sync/syncManager'

interface VaultDashboardProps {
  entries: VaultEntry[]
  filteredEntries: VaultEntry[]
  activeTag: string | null
  onTagChange: (tag: string | null) => void
  allTags: string[]
  topTags: string[]
  tagUsage: Record<string, number>
  showAllTags: boolean
  onToggleShowAllTags: () => void
  healthSummary: PasswordHealthSummary | null
  isScanningBreaches: boolean
  onRunBreachScan: () => void
  breachScanError: string | null
  lastBreachScanLabel: string | null
  syncState: {
    status: SyncStatus
    lastSyncedLabel: string
  }
  sessionCountdownLabel: string | null
  isTravelModeEnabled: boolean
  onDisableTravelMode: () => void
  onAddEntry: () => void
  onOpenWatchtower: () => void
  onOpenPasskeys: () => void
  onOpenTeams: () => void
  onOpenAudit: () => void
  onOpenBilling: () => void
  onOpenSettings: () => void
  onOpenPasswordGenerator: () => void
  onStrengthenPasswords: () => void
  onSelectEntry: (entry: VaultEntry) => void
  onCopyPassword: (entry: VaultEntry) => void
  onShare: (entry: VaultEntry) => void
  onEdit: (entry: VaultEntry) => void
  userName: string
  userEmail: string
  userPlan: string
  passkeySupported: boolean
}

const metricCardClass =
  'rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/85'

const sectionCardClass =
  'rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/85'

function formatDomain(url?: string): string {
  if (!url) return 'No domain'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getEntryBadge(entry: VaultEntry): { label: string; tone: string } {
  if (entry.breachCount && entry.breachCount > 0) {
    return { label: 'Breached', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' }
  }
  if (entry.totpSecret) {
    return { label: '2FA', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' }
  }
  if ((entry.password || '').length >= 16) {
    return { label: 'Strong', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' }
  }
  return { label: 'Review', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' }
}

export const VaultDashboard: React.FC<VaultDashboardProps> = ({
  entries,
  filteredEntries,
  activeTag,
  onTagChange,
  allTags,
  topTags,
  tagUsage,
  showAllTags,
  onToggleShowAllTags,
  healthSummary,
  isScanningBreaches,
  onRunBreachScan,
  breachScanError,
  lastBreachScanLabel,
  syncState,
  sessionCountdownLabel,
  isTravelModeEnabled,
  onDisableTravelMode,
  onAddEntry,
  onOpenWatchtower,
  onOpenPasskeys,
  onOpenTeams,
  onOpenAudit,
  onOpenBilling,
  onOpenSettings,
  onOpenPasswordGenerator,
  onStrengthenPasswords,
  onSelectEntry,
  onCopyPassword,
  onShare,
  onEdit,
  userName,
  userEmail,
  userPlan,
  passkeySupported
}) => {
  const topCategories = useMemo(() => {
    const counts = entries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.category || 'Uncategorized'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [entries])

  const priorityIssues = healthSummary?.issues.slice(0, 3) || []
  const weakEntries = filteredEntries.filter((entry) => (entry.password || '').length < 12).length
  const totpEntries = entries.filter((entry) => !!entry.totpSecret).length
  const breachedEntries = entries.filter((entry) => (entry.breachCount || 0) > 0).length
  const monitoredDomains = new Set(entries.map((entry) => formatDomain(entry.url)).filter(Boolean)).size

  const quickEntries = useMemo(() => {
    const score = (entry: VaultEntry) => {
      const breachWeight = (entry.breachCount || 0) > 0 ? 100 : 0
      const weakWeight = (entry.password || '').length < 12 ? 40 : 0
      const noTotpWeight = entry.totpSecret ? 0 : 10
      const updatedAt = entry.passwordUpdatedAt ? new Date(entry.passwordUpdatedAt).getTime() : 0
      return breachWeight + weakWeight + noTotpWeight + updatedAt / 10_000_000_000
    }

    return [...filteredEntries].sort((a, b) => score(b) - score(a)).slice(0, 8)
  }, [filteredEntries])

  const statusTone =
    syncState.status === 'syncing'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : syncState.status === 'error'
        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_320px]">
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[34px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(247,250,245,1)_0%,_rgba(241,247,239,1)_48%,_rgba(255,255,255,1)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,_rgba(5,15,10,1)_0%,_rgba(8,25,17,1)_48%,_rgba(15,23,42,1)_100%)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure Operations
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                  Vault Command Center
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Secure inventory first. High-risk credentials, session state, device trust, and identity controls are organized in a clear operating order.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operator</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{userName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
                </div>
                <div className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Plan Envelope</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{userPlan}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Device-bound vault session policy active</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className={metricCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vault entries</span>
                  <Layers3 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{entries.length}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{filteredEntries.length} visible in the active filter</p>
              </div>

              <div className={metricCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Watchtower score</span>
                  <ShieldAlert className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{healthSummary?.score ?? 100}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {breachedEntries} breached, {weakEntries} weak, {healthSummary?.reusedCount ?? 0} reused
                </p>
              </div>

              <div className={metricCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Identity layer</span>
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{totpEntries}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Entries already paired with TOTP. {passkeySupported ? 'Passkeys available on this device.' : 'Passkeys unavailable on this device.'}
                </p>
              </div>

              <div className={metricCardClass}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Surface coverage</span>
                  <Globe className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{monitoredDomains}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{allTags.length} tags across {topCategories.length} active categories</p>
              </div>
            </div>
          </motion.section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
            <div className={sectionCardClass}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inventory focus</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Priority credentials</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Entries are sorted by exposure and remediation urgency so the most important records stay at the top.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={onAddEntry} variant="primary" size="sm">
                    <LockKeyhole className="h-4 w-4" />
                    Add secure entry
                  </Button>
                  <Button onClick={onOpenSettings} variant="outline" size="sm">
                    <UserCog className="h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </div>

              {isTravelModeEnabled ? (
                <div className="mt-6 rounded-[26px] border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">Travel Mode is active</p>
                      <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
                        Vault entries are intentionally hidden on this surface. Disable Travel Mode to resume normal access.
                      </p>
                    </div>
                    <Button onClick={onDisableTravelMode} variant="primary" size="sm">
                      Disable Travel Mode
                    </Button>
                  </div>
                </div>
              ) : quickEntries.length === 0 ? (
                <div className="mt-6 rounded-[26px] border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No entries in this view</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust your search or tag filter, or add a new secure record.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {quickEntries.map((entry, index) => {
                    const badge = getEntryBadge(entry)
                    return (
                      <motion.div
                        key={entry.id}
                        layout
                        className={`rounded-[26px] border p-5 transition-colors dark:border-slate-800 ${
                          index === 0
                            ? 'border-emerald-300 bg-[linear-gradient(180deg,_#fafdf8_0%,_#f4fbf3_100%)] dark:border-emerald-900 dark:bg-slate-900/80'
                            : 'border-slate-200 bg-[#fafbf8] hover:border-emerald-300 dark:bg-slate-900/70 dark:hover:border-emerald-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  Priority
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span>
                            </div>
                            <p className="mt-3 truncate text-base font-semibold text-slate-900 dark:text-slate-100">{entry.name}</p>
                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{entry.username || 'No username stored'}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDomain(entry.url)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(entry.tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Button onClick={() => onSelectEntry(entry)} variant="outline" size="sm">
                            Open
                          </Button>
                          <Button onClick={() => onCopyPassword(entry)} variant="ghost" size="sm">
                            <Copy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Button onClick={() => onShare(entry)} variant="ghost" size="sm">
                            Share
                          </Button>
                          <Button onClick={() => onEdit(entry)} variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={sectionCardClass}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Filters</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Vault map</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Categories and tags stay available, but compressed into one stable filter block.</p>
              </div>

              <div className="mt-5 space-y-4">
                {topCategories.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Add entries to start building category analytics.
                  </div>
                ) : (
                  topCategories.map(([category, count], index) => {
                    const width = `${Math.max(18, Math.round((count / Math.max(...topCategories.map(([, value]) => value))) * 100))}%`
                    return (
                      <div key={category}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{category}</span>
                          <span className="text-slate-500 dark:text-slate-400">{count}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${index % 3 === 0 ? 'bg-emerald-400' : index % 3 === 1 ? 'bg-sky-400' : 'bg-amber-400'}`}
                            style={{ width }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tag clusters</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use tags as the routing layer for fast vault operations.</p>
                  </div>
                  {allTags.length > 5 && (
                    <button onClick={onToggleShowAllTags} className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {showAllTags ? 'Collapse' : 'Expand'}
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => onTagChange(null)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTag === null ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800'}`}
                  >
                    All entries
                  </button>
                  {(showAllTags ? allTags : topTags).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onTagChange(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTag === tag ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800'}`}
                    >
                      {tag} <span className="opacity-70">({tagUsage[tag]})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={sectionCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Session rail</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Live safeguards</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
                {syncState.status}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  icon: <Clock3 className="h-4 w-4" />,
                  label: 'Session lock',
                  value: sessionCountdownLabel || 'Active',
                  detail: 'Auto-lock countdown for the current unlocked vault session.'
                },
                {
                  icon: <Wifi className="h-4 w-4" />,
                  label: 'Sync channel',
                  value: syncState.lastSyncedLabel,
                  detail: syncState.status === 'syncing' ? 'Pushing encrypted changes now.' : 'Latest remote sync heartbeat.'
                },
                {
                  icon: <ShieldCheck className="h-4 w-4" />,
                  label: 'Travel mode',
                  value: isTravelModeEnabled ? 'Restricted' : 'Normal',
                  detail: isTravelModeEnabled ? 'Vault contents are intentionally hidden.' : 'Full vault view enabled on this device.'
                },
                {
                  icon: <KeyRound className="h-4 w-4" />,
                  label: 'Passkeys',
                  value: passkeySupported ? 'Available' : 'Unavailable',
                  detail: passkeySupported ? 'Platform authenticators can be used on this device.' : 'Browser does not expose WebAuthn.'
                }
              ].map((item) => (
                <div key={item.label} className="rounded-[22px] border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff8ef] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={sectionCardClass}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Response queue</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">What needs action</h3>
            </div>
            <div className="mt-5 space-y-3">
              {[
                {
                  title: breachedEntries > 0 ? 'Compromised passwords need rotation' : 'Breach posture is clean',
                  detail: breachedEntries > 0 ? `${breachedEntries} entries have been observed in known breaches.` : 'No compromised entries detected in the current vault sample.',
                  cta: breachedEntries > 0 ? 'Open Watchtower' : 'Run another scan',
                  onClick: breachedEntries > 0 ? onOpenWatchtower : onRunBreachScan,
                  icon: <ShieldAlert className="h-4 w-4" />
                },
                {
                  title: weakEntries > 0 ? 'Weak credentials can be strengthened' : 'Password strength baseline is healthy',
                  detail: weakEntries > 0 ? `${weakEntries} entries fall below the target length threshold.` : 'Most stored passwords meet the current strength heuristic.',
                  cta: weakEntries > 0 ? 'Strengthen passwords' : 'Generate a new password',
                  onClick: weakEntries > 0 ? onStrengthenPasswords : onOpenPasswordGenerator,
                  icon: <Sparkles className="h-4 w-4" />
                },
                {
                  title: totpEntries > 0 ? 'Second factor already seeded on some records' : 'Expand second-factor coverage',
                  detail: totpEntries > 0 ? `${totpEntries} entries already include TOTP material.` : 'Add more MFA-backed entries or passkeys for stronger recovery.',
                  cta: passkeySupported ? 'Open Passkeys' : 'Open Settings',
                  onClick: passkeySupported ? onOpenPasskeys : onOpenSettings,
                  icon: <KeyRound className="h-4 w-4" />
                }
              ].map((item) => (
                <div key={item.title} className="rounded-[22px] border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
                      <button onClick={item.onClick} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {item.cta}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {breachScanError ? breachScanError : lastBreachScanLabel ? `Last breach scan ${lastBreachScanLabel}` : 'No breach scan has been run yet.'}
              </div>
            </div>
          </section>

          <section className={sectionCardClass}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operations</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Identity & admin</h3>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Device & audit trail', description: 'Inspect blocked devices and security events.', action: onOpenAudit, icon: <BellRing className="h-4 w-4" /> },
                { label: 'Teams & sharing', description: 'Open shared vaults and collaboration controls.', action: onOpenTeams, icon: <FolderKanban className="h-4 w-4" /> },
                { label: 'Billing & device tiers', description: 'Review plan limits and upgrade paths.', action: onOpenBilling, icon: <CreditCard className="h-4 w-4" /> }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex w-full items-center gap-3 rounded-[22px] border border-slate-200 px-4 py-4 text-left transition-colors hover:border-emerald-300 hover:bg-[#f8fbf7] dark:border-slate-800 dark:hover:border-emerald-900 dark:hover:bg-slate-900"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default VaultDashboard
