/**
 * Logs Service
 * Handles system and application log retrieval (admin-only)
 */
import { API_BASE } from '../config/api'

export interface LogEntry {
  timestamp: number
  level: string
  message: string
  component?: string
  metadata?: any
  requestId?: string
}

export interface LogQuery {
  level?: 'error' | 'warn' | 'info' | 'debug'
  startDate?: Date
  endDate?: Date
  limit?: number
}

/**
 * Get system logs (admin-only)
 */
export async function getSystemLogs(query?: LogQuery): Promise<{
  logs: LogEntry[]
  count: number
  total: number
}> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const params = new URLSearchParams()
  if (query?.level) params.append('level', query.level)
  if (query?.startDate) params.append('startDate', query.startDate.toISOString())
  if (query?.endDate) params.append('endDate', query.endDate.toISOString())
  if (query?.limit) params.append('limit', query.limit.toString())

  const response = await fetch(`${API_BASE}/api/logs/system?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Admin access required')
    }
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch system logs')
  }

  return await response.json()
}

/**
 * Get application logs (admin-only)
 */
export async function getApplicationLogs(query?: LogQuery): Promise<{
  logs: LogEntry[]
  count: number
  total: number
  note?: string
}> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const params = new URLSearchParams()
  if (query?.level) params.append('level', query.level)
  if (query?.startDate) params.append('startDate', query.startDate.toISOString())
  if (query?.endDate) params.append('endDate', query.endDate.toISOString())
  if (query?.limit) params.append('limit', query.limit.toString())

  const response = await fetch(`${API_BASE}/api/logs/application?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Admin access required')
    }
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch application logs')
  }

  return await response.json()
}
