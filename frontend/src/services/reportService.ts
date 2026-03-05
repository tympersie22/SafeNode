import { API_BASE } from '../config/api'
import { getCurrentDeviceId } from './deviceService'

export interface ReportOverview {
  generatedAt: number
  periodDays: number
  summary: {
    securityEventCount: number
    blockedDeviceAttempts: number
    sessionTakeovers: number
    vaultAccessEvents: number
    activeDeviceCount: number
    pendingReapprovals: number
  }
  topActions: Array<{ action: string; count: number }>
  activitySeries: Array<{ date: string; count: number }>
  recentAlerts: Array<{
    action: string
    severity: 'high' | 'medium' | 'info'
    message: string
    createdAt: number
  }>
}

export interface ReportEvent {
  id: string
  action: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, any> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: number
  severity: 'high' | 'medium' | 'info'
}

export interface ReportEventsResponse {
  events: ReportEvent[]
  count: number
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('safenode_token')
  if (!token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${token}`,
    'X-Device-ID': getCurrentDeviceId()
  }
}

export async function getReportOverview(days = 30): Promise<ReportOverview> {
  const response = await fetch(`${API_BASE}/api/reports/overview?days=${days}`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to load report overview' }))
    throw new Error(error.message || 'Failed to load report overview')
  }
  return response.json()
}

export async function getReportEvents(params: {
  days?: number
  severity?: 'all' | 'high' | 'medium' | 'info'
  action?: string
  limit?: number
  offset?: number
}): Promise<ReportEventsResponse> {
  const query = new URLSearchParams()
  if (params.days) query.set('days', String(params.days))
  if (params.severity) query.set('severity', params.severity)
  if (params.action) query.set('action', params.action)
  if (typeof params.limit === 'number') query.set('limit', String(params.limit))
  if (typeof params.offset === 'number') query.set('offset', String(params.offset))

  const response = await fetch(`${API_BASE}/api/reports/events?${query.toString()}`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to load report events' }))
    throw new Error(error.message || 'Failed to load report events')
  }
  return response.json()
}

export async function exportReportCsv(params: {
  days?: number
  severity?: 'all' | 'high' | 'medium' | 'info'
  action?: string
}): Promise<void> {
  const query = new URLSearchParams()
  if (params.days) query.set('days', String(params.days))
  if (params.severity) query.set('severity', params.severity)
  if (params.action) query.set('action', params.action)

  const response = await fetch(`${API_BASE}/api/reports/export?${query.toString()}`, {
    headers: getHeaders()
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to export report CSV' }))
    throw new Error(error.message || 'Failed to export report CSV')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `safenode-report-${Date.now()}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
