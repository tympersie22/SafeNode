import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Auth from '../src/pages/Auth'
import * as authService from '../src/services/authService'

const mockSetAuthUser = vi.fn()

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: mockSetAuthUser,
    isAuthenticated: false
  }))
}))

// Auth.tsx imports several named functions from authService; mock them all so
// the module resolves and each flow can be asserted independently.
vi.mock('../src/services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  signInWithPasskey: vi.fn(),
  signUpWithPasskey: vi.fn(),
  verifyLoginTwoFactor: vi.fn(),
  getCurrentUser: vi.fn()
}))

vi.mock('../src/services/ssoService', () => ({
  getSSOProviders: vi.fn(() => Promise.resolve([])),
  initiateSSOLogin: vi.fn(),
  handleSSOCallback: vi.fn(),
  isSSOCallback: vi.fn(() => false)
}))

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits legacy password login and updates auth context', async () => {
    ;(authService.login as any).mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 'u1', email: 'test@example.com' }
    })

    render(
      <BrowserRouter>
        <Auth initialMode="login" />
      </BrowserRouter>
    )

    // The UI is passkey-first; the password field lives behind the legacy toggle.
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /use password instead/i }))
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in to your account with a password/i }))

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!'
      })
      expect(mockSetAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
        'test-token'
      )
    })
  })

  it('switches to signup and submits passkey registration', async () => {
    ;(authService.signUpWithPasskey as any).mockResolvedValueOnce({
      token: 'signup-token',
      user: { id: 'u2', email: 'new@example.com' }
    })

    render(
      <BrowserRouter>
        <Auth initialMode="login" />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /switch to sign up form/i }))

    // Signup is passkey-first: it collects name + email, no password.
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'New User' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /create your safenode account with a passkey/i }))

    await waitFor(() => {
      expect(authService.signUpWithPasskey).toHaveBeenCalledWith({
        email: 'new@example.com',
        displayName: 'New User'
      })
      expect(mockSetAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
        'signup-token'
      )
    })
  })
})
