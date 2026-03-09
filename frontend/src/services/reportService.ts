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

export interface ReportStreamSnapshot {
  generatedAt: number
  periodDays: number
  summary: ReportOverview['summary']
  events: ReportEvent[]
}

export interface ReportStreamHandlers {
  onReady?: (payload: { connectedAt: number }) => void
  onSnapshot: (payload: ReportStreamSnapshot) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('safenode_token')
  if (!token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${token}`,
    'X-Device-ID': getCurrentDeviceId()
  }
}

function buildQuery(params: {
  days?: number
  severity?: 'all' | 'high' | 'medium' | 'info'
  action?: string
  limit?: number
  offset?: number
  includeSystem?: boolean
  includeSessionActivity?: boolean
  includeInformational?: boolean
  source?: 'manual' | 'auto'
}) {
  const query = new URLSearchParams()
  if (params.days) query.set('days', String(params.days))
  if (params.severity) query.set('severity', params.severity)
  if (params.action) query.set('action', params.action)
  if (typeof params.limit === 'number') query.set('limit', String(params.limit))
  if (typeof params.offset === 'number') query.set('offset', String(params.offset))
  if (typeof params.includeSystem === 'boolean') query.set('includeSystem', String(params.includeSystem))
  if (typeof params.includeSessionActivity === 'boolean') query.set('includeSessionActivity', String(params.includeSessionActivity))
  if (typeof params.includeInformational === 'boolean') query.set('includeInformational', String(params.includeInformational))
  if (params.source) query.set('source', params.source)
  return query
}

export async function getReportOverview(params: {
  days?: number
  includeSystem?: boolean
  includeSessionActivity?: boolean
  includeInformational?: boolean
} = {}): Promise<ReportOverview> {
  const query = new URLSearchParams()
  query.set('days', String(params.days ?? 30))
  if (typeof params.includeSystem === 'boolean') query.set('includeSystem', String(params.includeSystem))
  if (typeof params.includeSessionActivity === 'boolean') query.set('includeSessionActivity', String(params.includeSessionActivity))
  if (typeof params.includeInformational === 'boolean') query.set('includeInformational', String(params.includeInformational))

  const response = await fetch(`${API_BASE}/api/reports/overview?${query.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store'
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
  includeSystem?: boolean
  includeSessionActivity?: boolean
  includeInformational?: boolean
  source?: 'manual' | 'auto'
}): Promise<ReportEventsResponse> {
  const query = buildQuery(params)

  const response = await fetch(`${API_BASE}/api/reports/events?${query.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store'
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to load report events' }))
    throw new Error(error.message || 'Failed to load report events')
  }
  return response.json()
}

export function openReportStream(params: {
  days?: number
  severity?: 'all' | 'high' | 'medium' | 'info'
  action?: string
  includeSystem?: boolean
  includeSessionActivity?: boolean
  includeInformational?: boolean
}, handlers: ReportStreamHandlers): () => void {
  const query = buildQuery(params)
  const controller = new AbortController()
  const token = localStorage.getItem('safenode_token')
  if (!token) throw new Error('Not authenticated')

  void (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/reports/stream?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Device-ID': getCurrentDeviceId(),
          Accept: 'text/event-stream'
        },
        cache: 'no-store',
        signal: controller.signal
      })

      if (!response.ok || !response.body) {
        let message = 'Failed to open report stream'
        try {
          const parsed = await response.json()
          message = parsed?.message || message
        } catch {
          // Ignore parse errors for non-JSON response bodies.
        }
        handlers.onError?.(message)
        handlers.onEnd?.()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          boundary = buffer.indexOf('\n\n')

          const lines = rawEvent.split('\n')
          let eventType = 'message'
          const dataParts: string[] = []

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              dataParts.push(line.slice(5).trim())
            }
          }

          if (dataParts.length === 0) continue
          const payloadRaw = dataParts.join('\n')

          try {
            const payload = JSON.parse(payloadRaw)
            if (eventType === 'ready') handlers.onReady?.(payload)
            if (eventType === 'snapshot') handlers.onSnapshot(payload)
            if (eventType === 'error') handlers.onError?.(payload?.message || 'Stream error')
            if (eventType === 'end') handlers.onEnd?.()
          } catch {
            handlers.onError?.('Invalid stream payload')
          }
        }
      }

      handlers.onEnd?.()
    } catch (error: any) {
      if (controller.signal.aborted) return
      handlers.onError?.(error?.message || 'Report stream connection failed')
      handlers.onEnd?.()
    }
  })()

  return () => controller.abort()
}

export async function exportReportCsv(params: {
  days?: number
  severity?: 'all' | 'high' | 'medium' | 'info'
  action?: string
  includeSystem?: boolean
  includeSessionActivity?: boolean
  includeInformational?: boolean
}): Promise<void> {
  const query = new URLSearchParams()
  if (params.days) query.set('days', String(params.days))
  if (params.severity) query.set('severity', params.severity)
  if (params.action) query.set('action', params.action)
  if (typeof params.includeSystem === 'boolean') query.set('includeSystem', String(params.includeSystem))
  if (typeof params.includeSessionActivity === 'boolean') query.set('includeSessionActivity', String(params.includeSessionActivity))
  if (typeof params.includeInformational === 'boolean') query.set('includeInformational', String(params.includeInformational))

  const response = await fetch(`${API_BASE}/api/reports/export?${query.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store'
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
