import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

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
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []

  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any // eslint-disable-line @typescript-eslint/no-explicit-any

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// IndexedDB is intentionally NOT mocked. jsdom doesn't ship a working
// implementation, and a partial stub (e.g. `{ open: vi.fn() }` returning
// `undefined`) caused every kv-store-touching test to log a noisy
// `[kv-store] IndexedDB unavailable, falling back to localStorage` stack
// trace as the kv-store tried to attach `onupgradeneeded` to an undefined
// request. By leaving `globalThis.indexedDB` unset, the kv-store's
// `hasIndexedDB()` check correctly returns false in tests and the
// localStorage fallback is taken silently.
//
// Tests that need a working (or deliberately failing) IDB — e.g.
// kv-store.test.ts's setSecure regression test — install their own
// `window.indexedDB` via `Object.defineProperty` and restore it in
// `finally`.

// Mock spark global
declare global {
  // @ts-expect-error - spark is a test mock
  var spark: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

// @ts-expect-error - spark is a test mock
globalThis.spark = {
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  user: vi.fn(),
}
