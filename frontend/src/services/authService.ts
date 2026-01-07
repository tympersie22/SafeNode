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

import { API_BASE } from '../config/api'

// Promise mutex to prevent duplicate getCurrentUser calls
let getCurrentUserPromise: Promise<User> | null = null
let getCurrentUserPromiseResolve: ((user: User) => void) | null = null
let getCurrentUserPromiseReject: ((error: Error) => void) | null = null

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
  clearGetCurrentUserCache()
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
    }, 90000) // 90 second timeout (safety net for argon2 hashing)
    
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
    setToken(data.token)
    clearGetCurrentUserCache() // Clear cache so next getCurrentUser fetches fresh data
    
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
    }, 90000) // 90 second timeout (safety net for argon2 hashing)
    
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
    setToken(data.token)
    // Clear getCurrentUser cache so next call fetches fresh data
    clearGetCurrentUserCache()
    
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
  clearGetCurrentUserCache()
}

/**
 * Get current user information
 * 
 * CRITICAL: Uses promise mutex to ensure only ONE request is made at a time.
 * All concurrent callers receive the same promise, preventing duplicate API calls.
 * This is essential for production to avoid race conditions and unnecessary load.
 */
export async function getCurrentUser(): Promise<User> {
  // If there's already a pending request, return the same promise
  if (getCurrentUserPromise) {
    return getCurrentUserPromise
  }

  // Create new promise for this request
  getCurrentUserPromise = new Promise<User>((resolve, reject) => {
    getCurrentUserPromiseResolve = resolve
    getCurrentUserPromiseReject = reject
  })

  // Execute the actual request
  const executeRequest = async (): Promise<User> => {
    const token = getToken()
    
    if (!token) {
      throw new Error('Not authenticated')
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort()
        }
      }, 30000) // 30 second timeout (reasonable for production)

      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 401) {
          const error = await response.json().catch(() => ({ message: 'Authentication expired' }))
          
          // If error code is USER_NOT_FOUND, clear auth storage and force re-login
          if (error.code === 'USER_NOT_FOUND') {
            console.warn('[authService] User not found - clearing auth storage')
          removeToken()
            clearGetCurrentUserCache()
            throw new Error('User not found - please log in again')
          }
          
          // Token is invalid - DO NOT auto-logout, just throw error
          // Let the caller decide what to do (AuthProvider will handle it)
          throw new Error(error.message || 'Authentication expired')
        }
        const error = await response.json().catch(() => ({ message: 'Failed to fetch user' }))
        throw new Error(error.message || error.error || 'Failed to fetch user')
      }

      const userData = await response.json()
      return userData
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server is not responding')
      }
      
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      }
      
      throw error
    }
  }

  // Execute request and handle result
  executeRequest()
    .then((userData) => {
      // Resolve all waiting promises
      if (getCurrentUserPromiseResolve) {
        getCurrentUserPromiseResolve(userData)
      }
      // Clear cache after resolving
      getCurrentUserPromise = null
      getCurrentUserPromiseResolve = null
      getCurrentUserPromiseReject = null
    })
    .catch((error: any) => {
      // Reject all waiting promises
      if (getCurrentUserPromiseReject) {
        getCurrentUserPromiseReject(error)
      }
      // Clear cache after rejecting
      getCurrentUserPromise = null
      getCurrentUserPromiseResolve = null
      getCurrentUserPromiseReject = null
    })

  // Return the promise (all callers will get the same one)
  return getCurrentUserPromise
}

/**
 * Clear the getCurrentUser promise cache
 * Call this when you know the user state has changed (login/logout)
 */
export function clearGetCurrentUserCache(): void {
  getCurrentUserPromise = null
  getCurrentUserPromiseResolve = null
  getCurrentUserPromiseReject = null
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

