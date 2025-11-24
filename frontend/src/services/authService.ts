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

/**
 * Store authentication token in localStorage
 */
function setToken(token: string): void {
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
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }))
    const errorMessage = error.message || error.error || 'Registration failed'
    
    // Log error to Sentry
    captureException(new Error(errorMessage), { context: 'registration', email: credentials.email })
    
    throw new Error(errorMessage)
  }

  const data: AuthResponse = await response.json()
  setToken(data.token)
  return data
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  })

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
  setToken(data.token)
  
  // Set user context in Sentry
  setSentryUser({
    id: data.user.id,
    email: data.user.email,
    username: data.user.displayName
  })
  
  return data
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
 */
export async function getCurrentUser(): Promise<User> {
  const token = getToken()
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      removeToken()
      throw new Error('Authentication expired')
    }
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch user')
  }

  return await response.json()
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

