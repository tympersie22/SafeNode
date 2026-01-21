/**
 * Authentication Context
 * Single source of truth for authentication state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getToken, getCurrentUser, logout as authLogout, type User } from '../services/authService'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAuthInitialized: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Module-level initialization flag - ensures single initialization across all instances
// This is critical for React Strict Mode which double-invokes effects
let hasInitialized = false
let initPromise: Promise<User | null> | null = null

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthInitialized, setIsAuthInitialized] = useState(false)

  // CRITICAL: Initialize auth state exactly ONCE on mount
  // This is the ONLY place where /api/auth/me is called for hydration
  // Never re-hydrate after this - login() sets user directly, logout() clears it
  useEffect(() => {
    // Prevent duplicate initialization (React Strict Mode safety)
    if (hasInitialized) {
      // If already initialized, wait for the existing promise
      if (initPromise) {
        initPromise.then((userData) => {
          setUser(userData)
          setIsAuthInitialized(true)
        }).catch(() => {
          setUser(null)
          setIsAuthInitialized(true)
        })
      } else {
        // Initialization completed, just set initialized flag
        setIsAuthInitialized(true)
      }
      return
    }

    hasInitialized = true
    let isMounted = true

    const initAuth = async () => {
      const token = getToken()
      if (!token) {
        if (isMounted) {
          setIsAuthInitialized(true)
        }
        return
      }

      // Create initialization promise (shared across all instances)
      if (!initPromise) {
        initPromise = (async () => {
          try {
            // This is the ONLY call to getCurrentUser for hydration
            // Add timeout to prevent hanging indefinitely
            const timeoutPromise = new Promise<null>((_, reject) => {
              setTimeout(() => reject(new Error('Authentication check timeout')), 10000) // 10 second timeout
            })
            
            const userData = await Promise.race([
              getCurrentUser(),
              timeoutPromise
            ]) as User | null
            
            return userData
          } catch (error: any) {
            // If error message indicates USER_NOT_FOUND, this might be a new user
            // Don't immediately clear auth - the user might have just registered
            // Only clear if we're sure it's not a timing issue
            if (error.message?.includes('User not found') || error.message?.includes('USER_NOT_FOUND')) {
              console.warn('[AuthContext] User not found - this might be a new user. Will retry on next request.')
              // Don't clear auth immediately - let the user try to use the app
              // If it's a real issue, subsequent requests will fail and we can handle it then
              return null
            }
            
            // For timeout or connection errors, don't clear auth - might be backend issue
            if (error.message?.includes('timeout') || error.message?.includes('connect') || error.message?.includes('Failed to fetch')) {
              console.warn('[AuthContext] Connection issue during auth check:', error.message)
              // Keep token, user can try again
              return null
            }
            
            // For other errors, clear auth
            console.warn('[AuthContext] Authentication error:', error.message)
            authLogout()
            return null
          }
        })()
      }

      try {
        const userData = await initPromise
        if (isMounted) {
          setUser(userData)
          setIsAuthInitialized(true)
        }
      } catch (error) {
        if (isMounted) {
          setUser(null)
          setIsAuthInitialized(true)
        }
      }
    }

    // Ensure initialization always completes, even if there's an error
    // Add a safety timeout to force initialization after 15 seconds
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Initialization timeout - forcing completion')
        setUser(null)
        setIsAuthInitialized(true)
      }
    }, 15000) // 15 second safety timeout

    initAuth()
      .then(() => {
        clearTimeout(safetyTimeout)
      })
      .catch((error) => {
        clearTimeout(safetyTimeout)
        console.error('[AuthContext] Fatal error during initialization:', error)
        if (isMounted) {
          setUser(null)
          setIsAuthInitialized(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback((userData: User, token: string) => {
    // CRITICAL: login() sets user state directly - NO API call
    // Token should already be stored by authService.login() or authService.register()
    // This makes isAuthenticated true immediately without re-hydration
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('safenode_token', token)
    }
    setUser(userData)
    // Ensure initialized flag is set (should already be true, but be safe)
    setIsAuthInitialized(true)
  }, [])

  const logout = useCallback(() => {
    // CRITICAL: logout() clears user state directly - NO API call
    // Token is removed by authLogout()
    authLogout()
    setUser(null)
    // Keep isAuthInitialized true - we know the state (not authenticated)
    setIsAuthInitialized(true)
  }, [])

  // NOTE: refreshUser removed - AuthProvider is the single source of truth
  // Auth state is only set during initialization or explicit login/logout
  // Vault unlock does NOT trigger auth refresh (they are separate concerns)

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAuthInitialized,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

