import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isAuthInitialized: true,
    login: vi.fn(),
    logout: vi.fn()
  }))
}))

vi.mock('../src/sync/syncManager', () => ({
  syncManager: {
    subscribe: vi.fn(() => () => {}),
    start: vi.fn(),
    stop: vi.fn()
  },
  SyncStatus: {}
}))

vi.mock('../src/sync/backupManager', () => ({
  backupManager: {
    listBackups: vi.fn(() => Promise.resolve([]))
  }
}))

vi.mock('../src/storage/accountStorage', () => ({
  accountStorage: {
    init: vi.fn(() => Promise.resolve()),
    getActiveAccount: vi.fn(() => Promise.resolve(null))
  }
}))

describe('App Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders marketing home when unauthenticated', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    expect(await screen.findByRole('navigation', { name: /main navigation links/i })).toBeInTheDocument()
  })
})
