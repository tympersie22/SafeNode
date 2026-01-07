/**
 * API Configuration
 * Centralized API base URL configuration
 * 
 * In development: Uses Vite proxy (relative URLs)
 * In production: Uses VITE_API_URL environment variable (required)
 */

// Get environment variables
const env = (import.meta as any).env || {}
const mode = env.MODE || env.NODE_ENV || 'development'
const viteApiUrl = env.VITE_API_URL

/**
 * Get API base URL
 * 
 * Priority:
 * 1. VITE_API_URL env var (required in production)
 * 2. In development: Empty string (uses Vite proxy from vite.config.ts)
 */
export function getApiBase(): string {
  // In production, VITE_API_URL must be set
  if (mode === 'production' || mode === 'prod') {
    if (!viteApiUrl || viteApiUrl.trim() === '') {
      console.error('[API Config] VITE_API_URL is required in production but not set')
      // Fallback to empty string to prevent hardcoded localhost
      return ''
    }
    return viteApiUrl.trim()
  }
  
  // In development, use empty string to leverage Vite proxy
  // Vite proxy in vite.config.ts forwards /api/* to http://localhost:4000/api/*
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
    console.log('[API Config] Using Vite proxy - requests to /api/* will be forwarded to http://localhost:4000/api/*')
    console.log('[API Config] withCredentials: true (cookies enabled)')
  }
}

