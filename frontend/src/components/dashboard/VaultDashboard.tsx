import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
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
  'rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/85'

const sectionCardClass =
  'rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/85'

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

    return [...filteredEntries].sort((a, b) => score(b) - score(a)).slice(0, 6)
  }, [filteredEntries])

  const statusTone =
    syncState.status === 'syncing'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : syncState.status === 'error'
        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(247,250,245,1)_0%,_rgba(241,247,239,1)_48%,_rgba(255,255,255,1)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,_rgba(5,15,10,1)_0%,_rgba(8,25,17,1)_48%,_rgba(15,23,42,1)_100%)]"
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Operations
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Vault Command Center
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              One working surface for vault health, session state, and credential triage. Navigation stays in the left sidebar. The dashboard body only shows what needs action now.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
            <div className="rounded-[22px] border border-white/80 bg-white/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operator</p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{userName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{userEmail}</p>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Plan envelope</p>
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
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{breachedEntries} breached, {weakEntries} weak, {healthSummary?.reusedCount ?? 0} reused</p>
          </div>

          <div className={metricCardClass}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Session state</span>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{sessionCountdownLabel || 'Active'}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Current sync: {syncState.lastSyncedLabel}</p>
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

      <section className={sectionCardClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operational strip</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Session and response controls</h3>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
            {syncState.status}
          </span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <div className="rounded-[20px] border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff8ef] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Wifi className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sync channel</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{syncState.lastSyncedLabel}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[20px] border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff8ef] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Passkeys</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{passkeySupported ? 'Available on this device' : 'Unavailable in this browser'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[20px] border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff8ef] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Travel mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isTravelModeEnabled ? 'Restricted' : 'Normal'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button onClick={onRunBreachScan} variant="outline" size="sm" loading={isScanningBreaches}>
              <ScanSearch className="h-4 w-4" />
              {isScanningBreaches ? 'Scanning' : 'Run breach scan'}
            </Button>
            <Button onClick={onStrengthenPasswords} variant="ghost" size="sm">
              <Sparkles className="h-4 w-4" />
              Strengthen weak
            </Button>
            <Button onClick={onOpenPasswordGenerator} variant="ghost" size="sm">
              Generate replacement
            </Button>
          </div>
        </div>

        {(breachScanError || lastBreachScanLabel) && (
          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {breachScanError ? breachScanError : `Last breach scan ${lastBreachScanLabel}`}
          </div>
        )}
      </section>

      {isTravelModeEnabled ? (
        <section className={sectionCardClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Travel Mode is active</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Vault entries are intentionally hidden on this surface. Disable Travel Mode to resume normal access.
              </p>
            </div>
            <Button onClick={onDisableTravelMode} variant="primary" size="sm">
              Disable Travel Mode
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className={sectionCardClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inventory focus</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Priority credentials</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">High-risk and high-value credentials are sorted into one compact list instead of oversized cards.</p>
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

            {quickEntries.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No entries in this view</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust your search or tag filter, or add a new secure record.</p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-800">
                {quickEntries.map((entry, index) => {
                  const badge = getEntryBadge(entry)
                  return (
                    <div
                      key={entry.id}
                      className={`grid gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] lg:items-center ${
                        index === quickEntries.length - 1 ? 'border-b-0' : ''
                      } ${index === 0 ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : 'bg-white dark:bg-slate-950/70'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {index === 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Priority
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{formatDomain(entry.url)}</span>
                        </div>
                        <p className="mt-3 truncate text-base font-semibold text-slate-900 dark:text-slate-100">{entry.name}</p>
                        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{entry.username || 'No username stored'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(entry.tags || []).slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
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
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className={sectionCardClass}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Watchtower</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">What needs action</h3>
                </div>
                <Button onClick={onOpenWatchtower} variant="outline" size="sm">
                  Open Watchtower
                </Button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { label: 'Compromised', value: breachedEntries, tone: 'text-rose-600 dark:text-rose-300' },
                  { label: 'Weak', value: weakEntries, tone: 'text-amber-600 dark:text-amber-300' },
                  { label: 'Reused', value: healthSummary?.reusedCount ?? 0, tone: 'text-sky-600 dark:text-sky-300' }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
                    <p className={`mt-3 text-3xl font-semibold ${stat.tone}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {priorityIssues.length === 0 ? (
                  <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    No high-priority password risks are open right now.
                  </div>
                ) : (
                  priorityIssues.map((issue) => (
                    <div key={`${issue.entryId}-${issue.type}`} className="rounded-[20px] border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{issue.entryName}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{issue.message}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${issue.severity === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <section className={sectionCardClass}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vault map</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Categories and tags</h3>
                </div>

                <div className="mt-5 space-y-4">
                  {topCategories.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
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

                <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
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
              </section>

              <section className={sectionCardClass}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Admin shortcuts</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Security and billing tools</h3>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Manage passkeys', description: 'WebAuthn and biometric access.', action: onOpenPasskeys, icon: <KeyRound className="h-4 w-4" /> },
                    { label: 'Audit trail', description: 'Sessions, blocked devices, events.', action: onOpenAudit, icon: <BellRing className="h-4 w-4" /> },
                    { label: 'Teams', description: 'Shared vaults and collaboration.', action: onOpenTeams, icon: <FolderKanban className="h-4 w-4" /> },
                    { label: 'Billing', description: 'Plan limits and upgrade path.', action: onOpenBilling, icon: <CreditCard className="h-4 w-4" /> }
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex items-center gap-3 rounded-[20px] border border-slate-200 px-4 py-4 text-left transition-colors hover:border-emerald-300 hover:bg-[#f8fbf7] dark:border-slate-800 dark:hover:border-emerald-900 dark:hover:bg-slate-900"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default VaultDashboard
