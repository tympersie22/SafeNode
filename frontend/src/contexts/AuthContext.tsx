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
            const userData = await getCurrentUser()
            return userData
          } catch (error: any) {
            // If error message indicates USER_NOT_FOUND, clear auth storage
            if (error.message?.includes('User not found') || error.message?.includes('USER_NOT_FOUND')) {
              console.warn('[AuthContext] User not found - clearing auth storage')
              authLogout()
              return null
            }
            // Token is invalid - clear it
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

    initAuth()

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

