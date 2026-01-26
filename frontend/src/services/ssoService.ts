/currentOrigin**
 * SSO Service
 * Handles OAuth2 SSO login flows (Google, Microsoft, GitHub)
 */

import { setUser as setSentryUser, captureException } from './sentryService'
import { setToken } from './authService'

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'

export interface SSOProvider {
  id: string
  name: string
  type: 'oauth' | 'saml'
  enabled: boolean
}

export interface SSOProvidersResponse {
  success: boolean
  providers: SSOProvider[]
}

/**
 * Get available SSO providers
 */
export async function getSSOProviders(): Promise<SSOProvider[]> {
  try {
    const response = await fetch(`${API_BASE}/api/sso/providers`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch SSO providers')
    }

    const data: SSOProvidersResponse = await response.json()
    return data.providers || []
  } catch (error: any) {
    captureException(error, { context: 'sso', action: 'get_providers' })
    return []
  }
}

/**
 * Initiate SSO login flow
 * Redirects user to OAuth provider
 */
export function initiateSSOLogin(provider: 'google' | 'microsoft' | 'github'): void {
  try {
    // Build redirect URI for callback
const redirectUri = `${API_BASE}/api/sso/callback/${provider}`
    
    // Redirect to backend SSO login endpoint
    const loginUrl = `${API_BASE}/api/sso/login/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`
    
    // Store provider in sessionStorage for callback handling
    sessionStorage.setItem('sso_provider', provider)
    
    // Redirect to OAuth provider
    window.location.href = loginUrl
  } catch (error: any) {
    captureException(error, { context: 'sso', action: 'initiate_login', provider })
    throw new Error(`Failed to initiate ${provider} login`)
  }
}

/**
 * Handle SSO callback
 * Called after OAuth redirect with token in URL
 */
export async function handleSSOCallback(): Promise<{ token: string; userId: string } | null> {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const userId = urlParams.get('user_id')
    const error = urlParams.get('error')

    if (error) {
      throw new Error(error)
    }

    if (!token || !userId) {
      throw new Error('Missing token or user ID in SSO callback')
    }

    // Store token
    setToken(token)

    // Set user context in Sentry
    setSentryUser({
      id: userId,
      email: '', // Will be fetched from /api/auth/me
    })

    // Clean up session storage
    sessionStorage.removeItem('sso_provider')

    return { token, userId }
  } catch (error: any) {
    captureException(error, { context: 'sso', action: 'handle_callback' })
    throw error
  }
}

/**
 * Check if we're in an SSO callback flow
 */
export function isSSOCallback(): boolean {
  return window.location.pathname.includes('/auth/sso/callback')
}

/**
 * Get SSO provider from session storage
 */
export function getStoredSSOProvider(): string | null {
  return sessionStorage.getItem('sso_provider')
}

