/**
 * Test Setup for Frontend
 * Global test configuration and mocks
 */

import { beforeAll, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'
import { webcrypto } from 'crypto'

// Mock environment variables
beforeAll(() => {
  process.env.VITE_API_URL = 'http://localhost:4000'
  process.env.VITE_SENTRY_DSN = ''
  process.env.NODE_ENV = 'test'
})

// Polyfill IntersectionObserver for Framer Motion - prevent breaking tests
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback?: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Store callback and options but don't actually observe
    this._callback = callback
    this._options = options
  }
  private _callback?: IntersectionObserverCallback
  private _options?: IntersectionObserverInit
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Ensure IntersectionObserver is available on window
if (typeof window !== 'undefined') {
  (window as any).IntersectionObserver = global.IntersectionObserver
}

// Polyfill ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Use Node's real WebCrypto in tests so crypto unit tests behave like runtime
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: webcrypto
})
Object.defineProperty(window, 'crypto', {
  configurable: true,
  value: webcrypto
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

// Disable Framer Motion animations in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  
  // Create a simple component wrapper that just returns the element
  const createMotionComponent = (tag: string) => {
    return React.forwardRef((props: any, ref: any) => {
      const {
        whileHover,
        whileTap,
        whileFocus,
        whileInView,
        initial,
        animate,
        exit,
        transition,
        layout,
        viewport,
        variants,
        ...domProps
      } = props
      return React.createElement(tag, { ...domProps, ref })
    })
  }
  
  return {
    ...actual,
    motion: {
      div: createMotionComponent('div'),
      button: createMotionComponent('button'),
      input: createMotionComponent('input'),
      form: createMotionComponent('form'),
      p: createMotionComponent('p'),
      span: createMotionComponent('span'),
      header: createMotionComponent('header'),
      section: createMotionComponent('section'),
      nav: createMotionComponent('nav'),
      footer: createMotionComponent('footer'),
      main: createMotionComponent('main'),
      article: createMotionComponent('article'),
      aside: createMotionComponent('aside'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      h4: createMotionComponent('h4'),
      h5: createMotionComponent('h5'),
      h6: createMotionComponent('h6'),
      ul: createMotionComponent('ul'),
      ol: createMotionComponent('ol'),
      li: createMotionComponent('li'),
      a: createMotionComponent('a'),
      img: createMotionComponent('img'),
      svg: createMotionComponent('svg'),
      path: createMotionComponent('path'),
      circle: createMotionComponent('circle'),
      rect: createMotionComponent('rect'),
      g: createMotionComponent('g'),
    },
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => true, // Always return true in tests to disable animations
    useAnimate: () => [{ current: null }, vi.fn()],
    useMotionValue: () => ({ get: vi.fn(), set: vi.fn() }),
    useTransform: () => vi.fn(),
    useSpring: () => ({ get: vi.fn(), set: vi.fn() }),
    useAnimation: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    }),
  }
})
