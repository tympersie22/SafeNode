/**
 * API Configuration
 * Centralized API base URL configuration
 * 
 * In development: Uses Vite proxy (relative URLs)
 * In production: Uses VITE_API_URL environment variable (required)
 */

// Get environment variables
const env = import.meta.env
const mode = env.MODE || env.NODE_ENV || 'development'
const viteApiUrl = env.VITE_API_URL
const mobileApiUrl = env.VITE_MOBILE_API_URL
const PROD_API_FALLBACK = 'https://safe-node-99hv-backend.vercel.app'

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

function normalizeApiOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as CapacitorWindow).Capacitor?.isNativePlatform?.())
}

/**
 * Get API base URL
 * 
 * Priority:
 * 1. VITE_API_URL env var (required in production)
 * 2. In development: Empty string (uses Vite proxy from vite.config.mjs)
 */
export function getApiBase(): string {
  if (isNativeApp()) {
    const configuredOrigin = mobileApiUrl || viteApiUrl
    if (!configuredOrigin) {
      throw new Error('[API Config] VITE_MOBILE_API_URL is required for native builds')
    }

    const normalizedOrigin = normalizeApiOrigin(configuredOrigin)
    if (!normalizedOrigin.startsWith('https://')) {
      throw new Error('[API Config] Native API origin must use HTTPS')
    }
    return normalizedOrigin
  }

  // In production, VITE_API_URL must be set
  if (mode === 'production' || mode === 'prod') {
    if (!viteApiUrl || viteApiUrl.trim() === '') {
      console.error(`[API Config] VITE_API_URL is required in production but not set; falling back to ${PROD_API_FALLBACK}`)
      return PROD_API_FALLBACK
    }
    return normalizeApiOrigin(viteApiUrl)
  }
  
  // In development, use empty string to leverage Vite proxy
  // Vite proxy in vite.config.mjs forwards /api/* to http://127.0.0.1:4000/api/*
  return ''
}

// Export the API base URL
export const API_BASE = getApiBase()

// Log configuration for debugging (only in development)
if (typeof window !== 'undefined' && (mode === 'development' || mode === 'dev')) {
  console.log('[API Config] Mode:', mode)
  console.log('[API Config] VITE_API_URL:', viteApiUrl || 'not set')
  console.log('[API Config] API_BASE:', API_BASE || '(using Vite proxy - relative URLs)')
  
  if (!API_BASE) {
    console.log('[API Config] Using Vite proxy - requests to /api/* will be forwarded to http://127.0.0.1:4000/api/*')
    console.log('[API Config] withCredentials: true (cookies enabled)')
  }
}
