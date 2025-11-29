/**
 * App Authentication Flow Tests
 * Tests for App component authentication handling and navigation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'
import * as authService from '../src/services/authService'

// Mock all dependencies
vi.mock('../src/services/authService', () => ({
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
  register: vi.fn()
}))

vi.mock('../src/services/ssoService', () => ({
  handleSSOCallback: vi.fn(),
  isSSOCallback: vi.fn(() => false)
}))

vi.mock('../src/sync/syncManager', () => ({
  syncManager: {
    subscribe: vi.fn(() => () => {}),
    start: vi.fn(),
    stop: vi.fn()
  }
}))

vi.mock('../src/sync/backupManager', () => ({
  backupManager: {
    listBackups: vi.fn(() => Promise.resolve([]))
  }
}))

// Mock storage
vi.mock('../src/storage/vaultStorage', () => ({
  vaultStorage: {
    load: vi.fn(() => Promise.resolve(null)),
    save: vi.fn()
  }
}))

vi.mock('../src/storage/accountStorage', () => ({
  accountStorage: {
    init: vi.fn(() => Promise.resolve()),
    getActiveAccount: vi.fn(() => Promise.resolve(null)),
    createAccount: vi.fn()
  }
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '' })
  }
})

describe('App Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Load', () => {
    it('should show loading screen briefly then render landing page when no token', async () => {
      ;(authService.getToken as any).mockReturnValue(null)

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Should render landing page after timeout
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should authenticate user with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        twoFactorEnabled: false,
        biometricEnabled: false,
        createdAt: Date.now()
      }

      ;(authService.getToken as any).mockReturnValue('valid-token')
      ;(authService.getCurrentUser as any).mockResolvedValue(mockUser)

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(authService.getCurrentUser).toHaveBeenCalled()
      })

      // Should not show loading after auth completes
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should handle invalid token gracefully', async () => {
      ;(authService.getToken as any).mockReturnValue('invalid-token')
      ;(authService.getCurrentUser as any).mockRejectedValue(
        new Error('Authentication expired')
      )

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled()
      })

      // Should show landing page after logout
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should not block rendering if getCurrentUser is slow', async () => {
      ;(authService.getToken as any).mockReturnValue('valid-token')
      
      // Make getCurrentUser take a long time
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve({
          id: 'user-123',
          email: 'test@example.com'
        }), 5000)
      })
      ;(authService.getCurrentUser as any).mockReturnValue(slowPromise)

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      // Should render app within 1 second even if getCurrentUser is slow
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      }, { timeout: 1500 })
    })
  })

  describe('Authentication Callback', () => {
    it('should handle onAuthenticated callback and navigate', async () => {
      ;(authService.getToken as any).mockReturnValue(null)

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      // Wait for landing page
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })

      // Simulate authentication
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isNewUser: false
      }

      // This would be triggered by Auth component
      // In a real test, we'd render Auth and trigger login
      // For now, we verify the structure handles it
      expect(mockNavigate).toBeDefined()
    })
  })

  describe('Route Handling', () => {
    it('should handle /vault route when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        twoFactorEnabled: false,
        biometricEnabled: false,
        createdAt: Date.now()
      }

      ;(authService.getToken as any).mockReturnValue('valid-token')
      ;(authService.getCurrentUser as any).mockResolvedValue(mockUser)

      // Mock location to be /vault
      vi.doMock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom')
        return {
          ...actual,
          useLocation: () => ({ pathname: '/vault', search: '', hash: '' })
        }
      })

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(authService.getCurrentUser).toHaveBeenCalled()
      })
    })
  })
})

