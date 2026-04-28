import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  isOffline,
  onOnlineStatusChange,
  skipWaiting,
  onBackgroundSync,
  onPeriodicSync,
  getCacheSize,
  clearCache,
  preloadAssets,
  register,
  unregister,
  registerBackgroundSync,
  registerPeriodicSync,
} from './serviceWorker'
import { getNetworkStatus, __resetNetworkForTests } from './native/network'

// Helper to temporarily override navigator.serviceWorker.
function stubServiceWorker(mockSW: Record<string, unknown>): () => void {
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: mockSW,
  })
  return () => {
    if (original) {
      Object.defineProperty(navigator, 'serviceWorker', original)
    } else {
      delete (navigator as unknown as Record<string, unknown>)['serviceWorker']
    }
  }
}

/**
 * Build a minimal ServiceWorkerContainer-like mock. Provides `addEventListener`,
 * `removeEventListener`, a null `controller`, and working `register`/`ready`.
 */
function makeMockSW(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    controller: null,
    ready: Promise.resolve({ unregister: vi.fn() }),
    register: vi.fn().mockResolvedValue({
      scope: '/',
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getRegistrations: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// isOffline / onOnlineStatusChange — delegate to native/network module
// ─────────────────────────────────────────────────────────────────────────────
describe('isOffline', () => {
  beforeEach(async () => {
    await __resetNetworkForTests()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    })
  })

  afterEach(async () => {
    await __resetNetworkForTests()
  })

  it('returns false when navigator.onLine is true', async () => {
    await getNetworkStatus()
    expect(isOffline()).toBe(false)
  })

  it('returns true when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    await getNetworkStatus()
    expect(isOffline()).toBe(true)
  })
})

describe('onOnlineStatusChange', () => {
  beforeEach(async () => {
    await __resetNetworkForTests()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    })
  })

  afterEach(async () => {
    await __resetNetworkForTests()
  })

  it('returns an unsubscribe function', () => {
    const unsub = onOnlineStatusChange(() => {})
    expect(typeof unsub).toBe('function')
    unsub()
  })

  it('fires callback when network changes from online to offline', async () => {
    await getNetworkStatus()
    const received: boolean[] = []
    const unsub = onOnlineStatusChange((online) => received.push(online))

    window.dispatchEvent(new Event('offline'))
    await new Promise((r) => setTimeout(r, 10))

    unsub()
    expect(received).toContain(false)
  })

  it('fires callback when network changes from offline to online', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    await getNetworkStatus()

    const received: boolean[] = []
    const unsub = onOnlineStatusChange((online) => received.push(online))

    window.dispatchEvent(new Event('online'))
    await new Promise((r) => setTimeout(r, 10))

    unsub()
    expect(received).toContain(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// skipWaiting
// ─────────────────────────────────────────────────────────────────────────────
describe('skipWaiting', () => {
  it('does not throw when called with no arguments and no waiting SW', () => {
    const restore = stubServiceWorker(makeMockSW({ controller: null }))
    try {
      expect(() => skipWaiting()).not.toThrow()
    } finally {
      restore()
    }
  })

  it('posts SKIP_WAITING to the waiting SW when a registration is provided', () => {
    const postMessage = vi.fn()
    const mockRegistration = {
      waiting: { postMessage },
    } as unknown as ServiceWorkerRegistration
    // No need to stub navigator.serviceWorker — registration is passed directly.
    expect(() => skipWaiting(mockRegistration)).not.toThrow()
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('does not throw when registration has no waiting SW', () => {
    const mockRegistration = { waiting: null } as unknown as ServiceWorkerRegistration
    expect(() => skipWaiting(mockRegistration)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onBackgroundSync
// ─────────────────────────────────────────────────────────────────────────────
describe('onBackgroundSync', () => {
  it('returns a cleanup function that unregisters the listener', () => {
    const mockSW = makeMockSW()
    const restore = stubServiceWorker(mockSW)
    try {
      const cleanup = onBackgroundSync(() => {})
      expect(typeof cleanup).toBe('function')
      cleanup()
      expect(mockSW.removeEventListener).toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  it('fires callback on BACKGROUND_SYNC messages and ignores other types', () => {
    const handlers: Array<(e: MessageEvent) => void> = []
    const mockSW = makeMockSW({
      addEventListener: vi.fn((_event: string, handler: (e: MessageEvent) => void) => {
        handlers.push(handler)
      }),
      removeEventListener: vi.fn(),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      const calls: number[] = []
      const cleanup = onBackgroundSync(() => calls.push(1))

      handlers.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'BACKGROUND_SYNC' } }))
      )
      expect(calls).toHaveLength(1)

      // Unrelated message type — callback is NOT invoked
      handlers.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'PERIODIC_SYNC' } }))
      )
      expect(calls).toHaveLength(1)

      cleanup()
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onPeriodicSync
// ─────────────────────────────────────────────────────────────────────────────
describe('onPeriodicSync', () => {
  it('returns a cleanup function that unregisters the listener', () => {
    const mockSW = makeMockSW()
    const restore = stubServiceWorker(mockSW)
    try {
      const cleanup = onPeriodicSync(() => {})
      expect(typeof cleanup).toBe('function')
      cleanup()
      expect(mockSW.removeEventListener).toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  it('fires callback only on PERIODIC_SYNC messages', () => {
    const handlers: Array<(e: MessageEvent) => void> = []
    const mockSW = makeMockSW({
      addEventListener: vi.fn((_event: string, handler: (e: MessageEvent) => void) => {
        handlers.push(handler)
      }),
      removeEventListener: vi.fn(),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      const calls: number[] = []
      const cleanup = onPeriodicSync(() => calls.push(1))

      handlers.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'PERIODIC_SYNC' } }))
      )
      expect(calls).toHaveLength(1)

      // BACKGROUND_SYNC does NOT fire this callback
      handlers.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'BACKGROUND_SYNC' } }))
      )
      expect(calls).toHaveLength(1)

      cleanup()
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCacheSize
// ─────────────────────────────────────────────────────────────────────────────
describe('getCacheSize', () => {
  it('returns 0 when service worker has no controller', async () => {
    const restore = stubServiceWorker(makeMockSW({ controller: null }))
    try {
      expect(await getCacheSize()).toBe(0)
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// clearCache
// ─────────────────────────────────────────────────────────────────────────────
describe('clearCache', () => {
  it('resolves without throwing when service worker has no controller', async () => {
    const restore = stubServiceWorker(makeMockSW({ controller: null }))
    try {
      await expect(clearCache()).resolves.toBeUndefined()
    } finally {
      restore()
    }
  })

  it('posts CLEAR_CACHE and resolves when the SW responds CACHE_CLEARED', async () => {
    const messageListeners: Array<(e: MessageEvent) => void> = []
    const postMessage = vi.fn()

    const mockController = { postMessage }
    const mockSW = makeMockSW({
      controller: mockController,
      addEventListener: vi.fn((_event: string, handler: (e: MessageEvent) => void) => {
        messageListeners.push(handler)
      }),
      removeEventListener: vi.fn(),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      const clearPromise = clearCache()

      // Simulate the SW sending back CACHE_CLEARED
      await new Promise((r) => setTimeout(r, 0))
      messageListeners.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'CACHE_CLEARED' } }))
      )

      await expect(clearPromise).resolves.toBeUndefined()
      expect(postMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' })
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// preloadAssets
// ─────────────────────────────────────────────────────────────────────────────
describe('preloadAssets', () => {
  it('resolves without throwing when caches are unavailable', async () => {
    const restore = stubServiceWorker(makeMockSW({ controller: null }))
    try {
      await expect(preloadAssets(['https://example.com/a.js'])).resolves.toBeUndefined()
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
describe('register', () => {
  it('calls onSuccess when a new SW installs with no previous controller', async () => {
    const onSuccess = vi.fn()
    const stateChangeListeners: Array<() => void> = []
    const updateFoundListeners: Array<() => void> = []

    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        stateChangeListeners.push(handler)
      }),
    }

    const mockRegistration = {
      scope: '/',
      waiting: null,
      installing: installingWorker,
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        updateFoundListeners.push(handler)
      }),
    }

    const mockSW = makeMockSW({
      controller: null,
      register: vi.fn().mockResolvedValue(mockRegistration),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      register({ onSuccess })
      window.dispatchEvent(new Event('load'))
      await new Promise((r) => setTimeout(r, 20))

      updateFoundListeners.forEach((h) => h())

      installingWorker.state = 'installed'
      stateChangeListeners.forEach((h) => h())

      await new Promise((r) => setTimeout(r, 0))
      expect(onSuccess).toHaveBeenCalledWith(mockRegistration)
    } finally {
      restore()
    }
  })

  it('calls onUpdate when a new SW installs with an existing controller', async () => {
    const onUpdate = vi.fn()
    const stateChangeListeners: Array<() => void> = []
    const updateFoundListeners: Array<() => void> = []

    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        stateChangeListeners.push(handler)
      }),
    }

    const mockRegistration = {
      scope: '/',
      waiting: null,
      installing: installingWorker,
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        updateFoundListeners.push(handler)
      }),
    }

    const mockSW = makeMockSW({
      controller: { postMessage: vi.fn() },
      register: vi.fn().mockResolvedValue(mockRegistration),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      register({ onUpdate })
      window.dispatchEvent(new Event('load'))
      await new Promise((r) => setTimeout(r, 20))

      updateFoundListeners.forEach((h) => h())

      installingWorker.state = 'installed'
      stateChangeListeners.forEach((h) => h())

      await new Promise((r) => setTimeout(r, 0))
      expect(onUpdate).toHaveBeenCalledWith(mockRegistration)
    } finally {
      restore()
    }
  })

  it('calls onUpdate immediately when a waiting worker exists', async () => {
    const onUpdate = vi.fn()

    const mockRegistration = {
      scope: '/',
      waiting: { state: 'installed' },
      installing: null,
      addEventListener: vi.fn(),
    }

    const mockSW = makeMockSW({
      controller: { postMessage: vi.fn() },
      register: vi.fn().mockResolvedValue(mockRegistration),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      register({ onUpdate })
      window.dispatchEvent(new Event('load'))
      await new Promise((r) => setTimeout(r, 20))
      expect(onUpdate).toHaveBeenCalledWith(mockRegistration)
    } finally {
      restore()
    }
  })

  it('calls onError when registration fails', async () => {
    const onError = vi.fn()
    const mockSW = makeMockSW({
      controller: null,
      register: vi.fn().mockRejectedValue(new Error('registration failed')),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      register({ onError })
      window.dispatchEvent(new Event('load'))
      await new Promise((r) => setTimeout(r, 20))
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// unregister
// ─────────────────────────────────────────────────────────────────────────────
describe('unregister', () => {
  it('resolves without throwing when ready rejects', async () => {
    const mockSW = makeMockSW({
      ready: Promise.reject(new Error('not ready')),
    })
    const restore = stubServiceWorker(mockSW)
    try {
      await expect(unregister()).resolves.toBeUndefined()
    } finally {
      restore()
    }
  })

  it('calls registration.unregister when ready resolves', async () => {
    const unregisterFn = vi.fn().mockResolvedValue(true)
    const mockSW = makeMockSW({
      ready: Promise.resolve({ unregister: unregisterFn }),
    })
    const restore = stubServiceWorker(mockSW)

    try {
      await unregister()
      expect(unregisterFn).toHaveBeenCalled()
    } finally {
      restore()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// registerBackgroundSync
// ─────────────────────────────────────────────────────────────────────────────
describe('registerBackgroundSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when BackgroundSync is not supported (no sync on prototype)', async () => {
    // Stub ServiceWorkerRegistration so the prototype-access check doesn't throw.
    vi.stubGlobal('ServiceWorkerRegistration', { prototype: {} })

    const restore = stubServiceWorker(makeMockSW())
    try {
      expect(await registerBackgroundSync()).toBe(false)
    } finally {
      restore()
    }
  })

  it('returns true when the sync tag is successfully registered', async () => {
    const syncRegister = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('ServiceWorkerRegistration', {
      prototype: { sync: {} }, // presence of 'sync' enables the code path
    })
    const mockReady = Promise.resolve({ sync: { register: syncRegister } })
    const restore = stubServiceWorker({ ...makeMockSW(), ready: mockReady })
    try {
      const result = await registerBackgroundSync('my-sync-tag')
      expect(result).toBe(true)
      expect(syncRegister).toHaveBeenCalledWith('my-sync-tag')
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  it('returns false when sync.register rejects', async () => {
    const syncRegister = vi.fn().mockRejectedValue(new Error('sync failed'))
    vi.stubGlobal('ServiceWorkerRegistration', { prototype: { sync: {} } })
    const mockReady = Promise.resolve({ sync: { register: syncRegister } })
    const restore = stubServiceWorker({ ...makeMockSW(), ready: mockReady })
    try {
      expect(await registerBackgroundSync()).toBe(false)
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// registerPeriodicSync
// ─────────────────────────────────────────────────────────────────────────────
describe('registerPeriodicSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when PeriodicSync is not supported (no periodicSync on prototype)', async () => {
    vi.stubGlobal('ServiceWorkerRegistration', { prototype: {} })
    const restore = stubServiceWorker(makeMockSW())
    try {
      expect(await registerPeriodicSync()).toBe(false)
    } finally {
      restore()
    }
  })

  it('returns false when the permission is denied', async () => {
    vi.stubGlobal('ServiceWorkerRegistration', { prototype: { periodicSync: {} } })
    const periodicSyncRegister = vi.fn()
    const mockReady = Promise.resolve({ periodicSync: { register: periodicSyncRegister } })
    const restore = stubServiceWorker({ ...makeMockSW(), ready: mockReady })

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'denied' }),
      },
    })

    try {
      const result = await registerPeriodicSync()
      expect(result).toBe(false)
      expect(periodicSyncRegister).not.toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  it('returns true when the permission is granted and registration succeeds', async () => {
    vi.stubGlobal('ServiceWorkerRegistration', { prototype: { periodicSync: {} } })
    const periodicSyncRegister = vi.fn().mockResolvedValue(undefined)
    const mockReady = Promise.resolve({ periodicSync: { register: periodicSyncRegister } })
    const restore = stubServiceWorker({ ...makeMockSW(), ready: mockReady })

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    })

    try {
      const result = await registerPeriodicSync('test-tag', 3600000)
      expect(result).toBe(true)
      expect(periodicSyncRegister).toHaveBeenCalledWith('test-tag', { minInterval: 3600000 })
    } finally {
      restore()
    }
  })

  it('returns false when periodicSync.register rejects', async () => {
    vi.stubGlobal('ServiceWorkerRegistration', { prototype: { periodicSync: {} } })
    const periodicSyncRegister = vi.fn().mockRejectedValue(new Error('periodic sync failed'))
    const mockReady = Promise.resolve({ periodicSync: { register: periodicSyncRegister } })
    const restore = stubServiceWorker({ ...makeMockSW(), ready: mockReady })

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    })

    try {
      expect(await registerPeriodicSync()).toBe(false)
    } finally {
      restore()
    }
  })
})
