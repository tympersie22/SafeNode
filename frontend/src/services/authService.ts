/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */

import { setUser as setSentryUser, clearUser as clearSentryUser, captureException } from './sentryService'

export interface User {
  id: string
  email: string
  displayName?: string
  emailVerified: boolean
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  subscriptionStatus: 'active' | 'cancelled' | 'past_due'
  twoFactorEnabled: boolean
  biometricEnabled: boolean
  lastLoginAt?: number
  createdAt: number
}

export interface AuthResponse {
  success: boolean
  token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'

// Log API base URL at module load for debugging
if (typeof window !== 'undefined') {
  console.log('[authService] API_BASE:', API_BASE)
  console.log('[authService] VITE_API_URL env:', (import.meta as any).env?.VITE_API_URL)
}

/**
 * Store authentication token in localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem('safenode_token', token)
}

/**
 * Get authentication token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('safenode_token')
}

/**
 * Remove authentication token from localStorage
 */
function removeToken(): void {
  localStorage.removeItem('safenode_token')
}

/**
 * Get authorization header
 */
export function getAuthHeader(): string | null {
  const token = getToken()
  return token ? `Bearer ${token}` : null
}

/**
 * Register a new user account
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  console.log('[authService] register called for:', credentials.email)
  try {
    // Use AbortController only for timeout (necessary for preventing hanging requests)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort()
      }
    }, 30000) // 30 second timeout
    
    console.log('[authService] Making register request to:', `${API_BASE}/api/auth/register`)
    let response: Response
    try {
      response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
      signal: controller.signal
    })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('Registration request timed out. Please try again.')
      }
      throw fetchError
    }
    
    clearTimeout(timeoutId)
    console.log('[authService] Register response status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }))
      const errorMessage = error.message || error.error || 'Registration failed'
      console.error('[authService] Register error:', errorMessage)
      
      // Log error to Sentry
      captureException(new Error(errorMessage), { context: 'registration', email: credentials.email })
      
      throw new Error(errorMessage)
    }

    const data: AuthResponse = await response.json()
    console.log('[authService] Register success, response:', { success: data.success, hasToken: !!data.token, userId: data.user?.id })
    
    // Ensure token exists and is a string
    if (!data.token || typeof data.token !== 'string') {
      console.error('[authService] Invalid register response - token missing')
      throw new Error('Invalid response: token missing or invalid')
    }
    
    // Store token immediately
    console.log('[authService] Storing token in localStorage')
    setToken(data.token)
    console.log('[authService] Token stored successfully')
    
    return data
  } catch (error: any) {
    console.error('[authService] Register exception:', error)
    
    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      throw new Error('Registration request timed out. Please try again.')
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:4000')
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    console.log('[authService] Making login request to:', `${API_BASE}/api/auth/login`)
    console.log('[authService] Request body:', { email: credentials.email, password: '***' })
    
    // Use AbortController only for timeout (necessary for preventing hanging requests)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort()
      }
    }, 30000) // 30 second timeout
    
    let response: Response
    try {
      response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader() || '' // Include existing token if available
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
        signal: controller.signal
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      // Handle abort errors gracefully
      if (fetchError.name === 'AbortError') {
        throw new Error('Login request timed out. Please try again.')
      }
      throw fetchError
    }
    
    clearTimeout(timeoutId)
    console.log('[authService] Response received:', response.status, response.statusText)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }))
    const errorMessage = error.message || error.error || 'Login failed'
    
    // Log error to Sentry (but don't log 401s with full details for security)
    if (response.status !== 401) {
      captureException(new Error(errorMessage), { context: 'login', status: response.status })
    }
    
    // Provide more helpful error messages
    if (response.status === 401) {
      throw new Error('Invalid email or password. Please check your credentials and try again.')
    } else if (response.status === 500) {
      throw new Error('Server error. Please try again later.')
    }
    
    throw new Error(errorMessage)
  }

    const data: AuthResponse = await response.json()
    console.log('[authService] Login success, response:', { success: data.success, hasToken: !!data.token, userId: data.user?.id })
    
    // Ensure token exists and is a string
    if (!data.token || typeof data.token !== 'string') {
      console.error('[authService] Invalid login response - token missing')
      throw new Error('Invalid response: token missing or invalid')
    }
    
    // Store token immediately - CRITICAL for navigation to work
    console.log('[authService] Storing token in localStorage')
    setToken(data.token)
    console.log('[authService] Token stored successfully')
    
    // Set user context in Sentry
    setSentryUser({
      id: data.user.id,
      email: data.user.email,
      username: data.user.displayName
    })
    
    return data
  } catch (error: any) {
    console.error('[authService] Login exception:', error)
    
    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      throw new Error('Login request timed out. Please try again.')
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:4000')
    }
    
    // Re-throw other errors
    throw error
  }
}

/**
 * Logout (clear token)
 */
export function logout(): void {
  removeToken()
  clearSentryUser()
}

/**
 * Get current user information
 * Non-blocking - has timeout to prevent freeze
 */
export async function getCurrentUser(): Promise<User> {
  console.log('[authService] getCurrentUser called')
  const token = getToken()
  console.log('[authService] Token exists:', !!token)
  
  if (!token) {
    console.error('[authService] No token found')
    // Return immediately without making request
    throw new Error('Not authenticated')
  }

  console.log('[authService] Making request to /api/auth/me')
  console.log('[authService] Request URL:', `${API_BASE}/api/auth/me`)
  console.log('[authService] Authorization header:', `Bearer ${token.substring(0, 20)}...`)

  try {
    // Each request gets its own AbortController - never shared
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        console.warn('[authService] getCurrentUser timeout - aborting request')
        controller.abort()
      }
    }, 30000) // 30 second timeout - increased from 5

    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    console.log('[authService] Response status:', response.status, response.statusText)

    if (!response.ok) {
      console.error('[authService] Request failed with status:', response.status)
      if (response.status === 401) {
        console.error('[authService] 401 Unauthorized - removing token')
        removeToken()
        throw new Error('Authentication expired')
      }
      const error = await response.json().catch(() => ({ message: 'Failed to fetch user' }))
      console.error('[authService] Error response:', error)
      throw new Error(error.message || error.error || 'Failed to fetch user')
    }

    const userData = await response.json()
    console.log('[authService] User data received:', userData)
    return userData
  } catch (error: any) {
    console.error('[authService] getCurrentUser error:', error)
    
    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server is not responding')
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      throw new Error('Unable to connect to server. Please check if the backend is running.')
    }
    throw error
  }
}

/**
 * Verify token validity
 */
export async function verifyToken(token: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  return data.valid === true
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null
}

