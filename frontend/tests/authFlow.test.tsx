/**
 * Authentication Flow Tests
 * Tests for complete authentication flow including navigation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Auth from '../src/pages/Auth'
import * as authService from '../src/services/authService'

// Mock authService
vi.mock('../src/services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  getToken: vi.fn(() => null),
  setToken: vi.fn()
}))

// Mock SSO service
vi.mock('../src/services/ssoService', () => ({
  handleSSOCallback: vi.fn(),
  isSSOCallback: vi.fn(() => false),
  initiateSSOLogin: vi.fn(),
  getSSOProviders: vi.fn(() => Promise.resolve([]))
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/auth', search: '', hash: '' })
  }
})

describe('Authentication Flow', () => {
  const mockOnAuthenticated = vi.fn()
  const mockOnBackToLanding = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Login Flow', () => {
    it('should successfully login and call onAuthenticated', async () => {
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

      ;(authService.login as any).mockResolvedValueOnce({
        success: true,
        token: 'test-token',
        user: mockUser
      })

      render(
        <BrowserRouter>
          <Auth 
            onAuthenticated={mockOnAuthenticated}
            onBackToLanding={mockOnBackToLanding}
            initialMode="login"
          />
        </BrowserRouter>
      )

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      // Wait for authentication to complete
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!'
        })
      })

      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockUser,
            isNewUser: false
          })
        )
      })

      // Verify navigation was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/vault', { replace: true })
      })
    })

    it('should handle login errors', async () => {
      ;(authService.login as any).mockRejectedValueOnce(
        new Error('Invalid email or password')
      )

      render(
        <BrowserRouter>
          <Auth 
            onAuthenticated={mockOnAuthenticated}
            onBackToLanding={mockOnBackToLanding}
            initialMode="login"
          />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'WrongPassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })

      expect(mockOnAuthenticated).not.toHaveBeenCalled()
    })
  })

  describe('Signup Flow', () => {
    it('should successfully signup and call onAuthenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        displayName: 'New User',
        emailVerified: false,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        twoFactorEnabled: false,
        biometricEnabled: false,
        createdAt: Date.now()
      }

      ;(authService.register as any).mockResolvedValueOnce({
        success: true,
        token: 'test-token',
        user: mockUser
      })

      render(
        <BrowserRouter>
          <Auth 
            onAuthenticated={mockOnAuthenticated}
            onBackToLanding={mockOnBackToLanding}
            initialMode="signup"
          />
        </BrowserRouter>
      )

      // Switch to signup if needed
      const switchButton = screen.queryByText(/create account/i)
      if (switchButton) {
        fireEvent.click(switchButton)
      }

      // Fill in signup form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const displayNameInput = screen.queryByLabelText(/display name/i) || screen.queryByLabelText(/name/i)
      const submitButton = screen.getByRole('button', { name: /sign up|create account/i })

      if (displayNameInput) {
        fireEvent.change(displayNameInput, { target: { value: 'New User' } })
      }
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockUser,
            isNewUser: true,
            needsMasterPassword: true
          })
        )
      })

      // Verify navigation was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/vault', { replace: true })
      })
    })
  })

  describe('Mode Switching', () => {
    it('should switch from login to signup', () => {
      render(
        <BrowserRouter>
          <Auth 
            onAuthenticated={mockOnAuthenticated}
            onBackToLanding={mockOnBackToLanding}
            initialMode="login"
          />
        </BrowserRouter>
      )

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()

      const switchButton = screen.getByText(/create account/i)
      fireEvent.click(switchButton)

      expect(screen.getByText(/create account|sign up/i)).toBeInTheDocument()
    })

    it('should switch from signup to login', () => {
      render(
        <BrowserRouter>
          <Auth 
            onAuthenticated={mockOnAuthenticated}
            onBackToLanding={mockOnBackToLanding}
            initialMode="signup"
          />
        </BrowserRouter>
      )

      const switchButton = screen.getByText(/sign in|log in/i)
      fireEvent.click(switchButton)

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      let resolveLogin: any
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      ;(authService.login as any).mockReturnValueOnce(loginPromise)

      render(
        <BrowserRouter>
          <Auth 
            onAuthenticated={mockOnAuthenticated}
            onBackToLanding={mockOnBackToLanding}
            initialMode="login"
          />
        </BrowserRouter>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      })

      // Resolve login
      resolveLogin({
        success: true,
        token: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' }
      })

      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
      })
    })
  })
})

