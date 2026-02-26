/**
 * API Client Utility
 * Centralized HTTP client with correlation ID support and error handling
 */

import { captureException } from '../services/sentryService'

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'

// Generate or retrieve correlation ID from session storage
function getCorrelationId(): string {
  let correlationId = sessionStorage.getItem('correlation_id')
  if (!correlationId) {
    correlationId = crypto.randomUUID()
    sessionStorage.setItem('correlation_id', correlationId)
  }
  return correlationId
}

// Update correlation ID from response header
function updateCorrelationId(response: Response): void {
  const newCorrelationId = response.headers.get('X-Correlation-ID')
  if (newCorrelationId) {
    sessionStorage.setItem('correlation_id', newCorrelationId)
  }
}

export interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean
  skipCorrelationId?: boolean
}

/**
 * Make an API request with correlation ID and error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requireAuth = false, skipCorrelationId = false, headers = {}, ...fetchOptions } = options

  // Get token if auth is required
  const token = requireAuth ? localStorage.getItem('safenode_token') : null
  if (requireAuth && !token) {
    throw new Error('Authentication required')
  }

  // Build headers as a record (compatible with HeadersInit)
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>)
  }

  // Add correlation ID
  if (!skipCorrelationId) {
    requestHeaders['X-Correlation-ID'] = getCorrelationId()
  }

  // Add auth token
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers: requestHeaders,
      credentials: 'include'
    })

    // Update correlation ID from response
    updateCorrelationId(response)

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `Request failed with status ${response.status}`
      }))

      // Handle rate limit errors with retry information
      if (response.status === 429 || errorData.error === 'rate_limit_exceeded') {
        const retryAfter = errorData.retryAfter || response.headers.get('Retry-After') || '15'
        const error = new Error(errorData.message || 'Rate limit exceeded')
        ;(error as any).status = response.status
        ;(error as any).code = errorData.code || errorData.error
        ;(error as any).retryAfter = parseInt(retryAfter, 10)
        ;(error as any).isRateLimit = true
        throw error
      }

      // Log to Sentry (but not 401s for security)
      if (response.status !== 401 && response.status !== 429) {
        captureException(new Error(errorData.message || errorData.error), {
          context: 'api_request',
          endpoint,
          status: response.status,
          correlationId: response.headers.get('X-Correlation-ID')
        })
      }

      const error = new Error(errorData.message || errorData.error || 'Request failed')
      ;(error as any).status = response.status
      ;(error as any).code = errorData.code || errorData.error
      throw error
    }

    // Parse JSON response
    const data = await response.json()
    return data as T
  } catch (error: any) {
    // Re-throw if already an Error
    if (error instanceof Error) {
      throw error
    }

    // Wrap other errors
    throw new Error(error?.message || 'Network request failed')
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'GET'
  })
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  })
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'DELETE'
  })
}
