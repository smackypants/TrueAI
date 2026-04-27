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

// Mock IndexedDB
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn(),
}
globalThis.indexedDB = indexedDB as unknown as IDBFactory

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
