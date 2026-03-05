import React, { useEffect, useMemo, useState } from 'react'
import { getReportEvents, getReportOverview, exportReportCsv, type ReportEvent, type ReportOverview } from '../../services/reportService'

const DAYS_OPTIONS = [7, 30, 90, 180]

function severityTone(severity: 'high' | 'medium' | 'info'): string {
  if (severity === 'high') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  if (severity === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase())
}

export const ReportsSettings: React.FC = () => {
  const [days, setDays] = useState(30)
  const [severity, setSeverity] = useState<'all' | 'high' | 'medium' | 'info'>('all')
  const [action, setAction] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<ReportOverview | null>(null)
  const [events, setEvents] = useState<ReportEvent[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [overviewData, eventsData] = await Promise.all([
          getReportOverview(days),
          getReportEvents({ days, severity, action: action || undefined, limit: 100, offset: 0 })
        ])
        if (!cancelled) {
          setOverview(overviewData)
          setEvents(eventsData.events || [])
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load reports')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [days, severity, action])

  const actionOptions = useMemo(() => {
    const set = new Set(events.map((event) => event.action))
    return Array.from(set).sort()
  }, [events])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Security Reports</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Operational reporting for security events, blocked device access, session takeover activity, and audit trends.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>Window</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              {DAYS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} days</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>Severity</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="info">Info</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>Action</span>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="">All actions</option>
              {actionOptions.map((option) => (
                <option key={option} value={option}>{formatAction(option)}</option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={async () => {
                setIsExporting(true)
                try {
                  await exportReportCsv({ days, severity, action: action || undefined })
                } catch (err: any) {
                  setError(err.message || 'Failed to export report')
                } finally {
                  setIsExporting(false)
                }
              }}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
              disabled={isExporting}
            >
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Security Events', value: overview?.summary.securityEventCount ?? 0 },
          { label: 'Blocked Device Attempts', value: overview?.summary.blockedDeviceAttempts ?? 0 },
          { label: 'Session Takeovers', value: overview?.summary.sessionTakeovers ?? 0 },
          { label: 'Vault Access Events', value: overview?.summary.vaultAccessEvents ?? 0 },
          { label: 'Active Devices', value: overview?.summary.activeDeviceCount ?? 0 },
          { label: 'Pending Reapprovals', value: overview?.summary.pendingReapprovals ?? 0 }
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity Report</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {overview ? `Generated ${new Date(overview.generatedAt).toLocaleString()}` : 'Loading...'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Resource</th>
                <th className="py-2 pr-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!isLoading && events.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No matching events in this time window.
                  </td>
                </tr>
              )}
              {events.map((event) => (
                <tr key={event.id} className="text-sm text-slate-700 dark:text-slate-200">
                  <td className="py-3 pr-4 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-4">{formatAction(event.action)}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${severityTone(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{event.resourceType || '-'}</td>
                  <td className="py-3 pr-4">{event.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
