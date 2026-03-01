import { API_BASE } from '../config/api'
import { getCurrentDeviceId } from './deviceService'

export interface RemoteAuditLog {
  id: string
  action: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, any> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: number
}

export async function getAuditLogs(options?: {
  action?: string
  actions?: string[]
  limit?: number
  offset?: number
}): Promise<RemoteAuditLog[]> {
  const token = localStorage.getItem('safenode_token')
  if (!token) {
    throw new Error('Not authenticated')
  }

  const params = new URLSearchParams()
  if (options?.action) params.set('action', options.action)
  if (options?.actions?.length) params.set('actions', options.actions.join(','))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))

  const response = await fetch(`${API_BASE}/api/audit/logs?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Device-ID': getCurrentDeviceId()
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch audit logs' }))
    throw new Error(error.message || 'Failed to fetch audit logs')
  }

  const data = await response.json()
  return data.logs || []
}
