import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellRing,
  ChevronDown,
  ChevronUp,
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
  onOpenRecovery: () => void
  onOpenPasswordGenerator: () => void
  onStrengthenPasswords: () => void
  onSelectEntry: (entry: VaultEntry) => void
  onCopyPassword: (entry: VaultEntry) => void
  onShare: (entry: VaultEntry) => void
  onEdit: (entry: VaultEntry) => void
  passkeySupported: boolean
}

const metricCardClass =
  'rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/85'

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

function getCategoryIcon(entry: VaultEntry) {
  switch (entry.category) {
    case 'credit-card':
      return <CreditCard className="h-4 w-4" />
    case 'note':
      return <FolderKanban className="h-4 w-4" />
    case 'otp':
      return <KeyRound className="h-4 w-4" />
    case 'file':
      return <Layers3 className="h-4 w-4" />
    case 'password':
    default:
      return <LockKeyhole className="h-4 w-4" />
  }
}

function formatUpdatedAt(timestamp?: number): string {
  if (!timestamp) return 'No recent update'
  const diffMs = Date.now() - timestamp
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Updated just now'
  if (diffHours < 24) return `Updated ${diffHours}h ago`
  if (diffDays < 7) return `Updated ${diffDays}d ago`
  return `Updated ${new Date(timestamp).toLocaleDateString()}`
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
  onOpenRecovery,
  onOpenPasswordGenerator,
  onStrengthenPasswords,
  onSelectEntry,
  onCopyPassword,
  onShare,
  onEdit,
  passkeySupported
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false)

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
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(247,250,245,1)_0%,_rgba(241,247,239,1)_48%,_rgba(255,255,255,1)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,_rgba(5,15,10,1)_0%,_rgba(8,25,17,1)_48%,_rgba(15,23,42,1)_100%)]"
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Identity posture
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Identity Control Center
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              One working surface for sign-in posture, recovery readiness, device state, and secret triage. Navigation stays in the left sidebar. This surface only shows what needs action now.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={metricCardClass}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Secrets</span>
              <Layers3 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{entries.length}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{filteredEntries.length} in current view</p>
          </div>

          <div className={metricCardClass}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Posture</span>
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{healthSummary?.score ?? 100}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{breachedEntries} breached, {weakEntries} weak</p>
          </div>

          <div className={metricCardClass}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Session</span>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{sessionCountdownLabel || 'Active'}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sync: {syncState.lastSyncedLabel}</p>
          </div>

          <div className={metricCardClass}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Protected domains</span>
              <Globe className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{monitoredDomains}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{totpEntries} with 2FA, {allTags.length} tags indexed</p>
          </div>
        </div>
      </motion.section>

      <section className={sectionCardClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Security posture</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Priority remediation queue</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A compact remediation view for the highest-risk credentials, reuse issues, and current identity posture.</p>
          </div>
          <Button onClick={onOpenWatchtower} variant="outline" size="sm">
            Open posture view
          </Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Compromised', value: breachedEntries, tone: 'text-rose-600 dark:text-rose-300' },
                { label: 'Weak', value: weakEntries, tone: 'text-amber-600 dark:text-amber-300' },
                { label: 'Reused', value: healthSummary?.reusedCount ?? 0, tone: 'text-sky-600 dark:text-sky-300' }
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px]" title={stat.label}>
                    {stat.label}
                  </p>
                  <p className={`mt-2 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Security posture score</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Combined view of breach exposure, reuse, and weak secret posture.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{healthSummary?.score ?? 100}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">current baseline</p>
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.5fr)_120px_160px] gap-4 border-b border-slate-200 bg-slate-50/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 lg:grid">
            <span>Issue</span>
            <span>Severity</span>
            <span>Action</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {priorityIssues.length === 0 ? (
              <div className="px-5 py-6">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No urgent password issues</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  No high-priority password risks are open right now.
                </p>
              </div>
            ) : (
              priorityIssues.map((issue, index) => (
                <div
                  key={`${issue.entryName}-${issue.message}`}
                  className={`grid gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 lg:grid-cols-[minmax(0,1.5fr)_120px_160px] lg:items-center lg:px-5 ${
                    index === priorityIssues.length - 1 ? 'border-b-0' : ''
                  } ${index === 0 ? 'bg-rose-50/40 dark:bg-rose-950/10' : 'bg-white dark:bg-slate-950/70'}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 ? (
                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          Immediate
                        </span>
                      ) : null}
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{issue.entryName}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{issue.message}</p>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      issue.severity === 'high'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button onClick={onOpenWatchtower} variant="ghost" size="sm">
                      Review
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Identity controls</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Session, passkey, and response controls</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>
              {syncState.status}
            </span>
            <Button onClick={() => setFiltersOpen((prev) => !prev)} variant="outline" size="sm">
              <Tags className="h-4 w-4" />
              Filters
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-800">
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
          <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff8ef] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Passkey posture</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{passkeySupported ? 'Available on this device' : 'Unavailable in this browser'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-800">
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
            <Button onClick={onRunBreachScan} variant="outline" size="sm" className="min-w-[84px] justify-center rounded-full px-3 py-1 text-[12px] leading-none" loading={isScanningBreaches}>
              <ScanSearch className="h-4.5 w-4.5" />
              {isScanningBreaches ? 'Scanning' : 'Run scan'}
            </Button>
            <Button onClick={onStrengthenPasswords} variant="ghost" size="sm" className="rounded-full px-3 py-1 text-[12px] leading-none">
              <Sparkles className="h-4.5 w-4.5" />
              Strengthen secrets
            </Button>
            <Button onClick={onOpenPasswordGenerator} variant="ghost" size="sm" className="rounded-full px-3 py-1 text-[12px] leading-none">
              <KeyRound className="h-4.5 w-4.5" />
              Generate secret
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="overflow-hidden"
            >
              <div className="mt-5 grid gap-6 border-t border-slate-200 pt-5 dark:border-slate-800 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Categories</p>
                  </div>
                  {topCategories.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
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

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tags</p>
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
                    {allTags.length > 5 && (
                      <button onClick={onToggleShowAllTags} className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-900">
                        {showAllTags ? 'Collapse tags' : 'Show all tags'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                Sensitive records are intentionally hidden on this surface. Disable Travel Mode to resume normal access.
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Identity vault</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Priority secrets and records</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A compact working queue for passwords, notes, TOTP records, cards, and operational secrets.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={onAddEntry} variant="primary" size="sm">
                  <LockKeyhole className="h-4 w-4" />
                  Add secret
                </Button>
              </div>
            </div>

            {quickEntries.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No records in this view</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust your search or tag filter, or add a new secret, note, or secure record.</p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Secret queue</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {quickEntries.length} highest-priority records shown. Sorted by breach risk, weak secrets, and freshness.
                    </p>
                  </div>
                  <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
                    Compact vault view
                  </div>
                </div>

                <div className="hidden grid-cols-[minmax(0,1.7fr)_120px_150px_180px_180px] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 lg:grid">
                  <span>Record</span>
                  <span>State</span>
                  <span>Updated</span>
                  <span>Tags</span>
                  <span className="text-right">Actions</span>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {quickEntries.map((entry, index) => {
                  const badge = getEntryBadge(entry)
                  return (
                    <div
                      key={entry.id}
                      className={`grid gap-3 border-b border-slate-200 px-4 py-4 transition-colors hover:bg-slate-50/90 dark:border-slate-800 dark:hover:bg-slate-900/60 lg:grid-cols-[minmax(0,1.7fr)_120px_150px_180px_180px] lg:items-center lg:px-5 ${
                        index === quickEntries.length - 1 ? 'border-b-0' : ''
                      } ${index === 0 ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : ''}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            {getCategoryIcon(entry)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                          {index === 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Priority
                            </span>
                          )}
                              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
                                {entry.category.replace('-', ' ')}
                              </span>
                              <span className="hidden text-xs text-slate-300 dark:text-slate-700 sm:inline">•</span>
                              <span className="truncate text-xs text-slate-500 dark:text-slate-400">{formatDomain(entry.url)}</span>
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-[15px]">{entry.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="truncate">{entry.username || 'No username stored'}</span>
                              {entry.totpSecret && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">2FA</span>}
                              {entry.breachCount ? <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{entry.breachCount} breach</span> : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatUpdatedAt(entry.updatedAt)}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(entry.tags || []).slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                            {tag}
                          </span>
                        ))}
                        {(entry.tags || []).length > 2 ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                            +{(entry.tags || []).length - 2}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button onClick={() => onSelectEntry(entry)} variant="outline" size="sm">
                          Open
                        </Button>
                        <Button onClick={() => onCopyPassword(entry)} variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
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
              </div>
            )}
          </section>

          <section className={sectionCardClass}>
            <div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Access and governance</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Identity, team, and plan tools</h3>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Manage passkeys', description: 'WebAuthn, biometrics, and sign-in posture.', action: onOpenPasskeys, icon: <KeyRound className="h-4 w-4" /> },
                  { label: 'Recovery center', description: 'Continuity posture, exports, and successor readiness.', action: onOpenRecovery, icon: <ShieldCheck className="h-4 w-4" /> },
                  { label: 'Audit trail', description: 'Sessions, blocked devices, and security events.', action: onOpenAudit, icon: <BellRing className="h-4 w-4" /> },
                  { label: 'Team secrets', description: 'Shared vaults, members, and collaboration.', action: onOpenTeams, icon: <FolderKanban className="h-4 w-4" /> },
                  { label: 'Plan & access', description: 'Plan limits, seats, and upgrade path.', action: onOpenBilling, icon: <CreditCard className="h-4 w-4" /> }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-3 rounded-[18px] border border-slate-200 px-4 py-4 text-left transition-colors hover:border-emerald-300 hover:bg-[#f8fbf7] dark:border-slate-800 dark:hover:border-emerald-900 dark:hover:bg-slate-900"
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
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default VaultDashboard
