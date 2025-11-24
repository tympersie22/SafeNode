/**
 * Test Setup for Frontend
 * Global test configuration and mocks
 */

import { beforeAll, vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables
beforeAll(() => {
  process.env.VITE_API_URL = 'http://localhost:4000'
  process.env.VITE_SENTRY_DSN = ''
})

// Mock WebCrypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      importKey: vi.fn(),
      generateKey: vi.fn()
    },
    getRandomValues: vi.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    })
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

