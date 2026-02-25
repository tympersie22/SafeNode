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

vi.mock('../src/services/authService', () => ({
  login: vi.fn(),
  register: vi.fn()
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

  it('submits login and updates auth context', async () => {
    ;(authService.login as any).mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 'u1', email: 'test@example.com' }
    })

    render(
      <BrowserRouter>
        <Auth initialMode="login" />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in to your account/i }))

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

  it('switches to signup and submits registration', async () => {
    ;(authService.register as any).mockResolvedValueOnce({
      token: 'signup-token',
      user: { id: 'u2', email: 'new@example.com' }
    })

    render(
      <BrowserRouter>
        <Auth initialMode="login" />
      </BrowserRouter>
    )

    fireEvent.click(screen.getByText(/create account/i))

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'New User' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/create a strong master password/i), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'Password123!' } })
    fireEvent.click(screen.getByRole('button', { name: /create your safenode account/i }))

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'Password123!',
        displayName: 'New User'
      })
      expect(mockSetAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
        'signup-token'
      )
    })
  })
})
