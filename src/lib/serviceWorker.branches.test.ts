/**
 * Branch-coverage gap-fill for `src/lib/serviceWorker.ts`.
 *
 * The existing `serviceWorker.test.ts` covers most of the `navigator.serviceWorker`
 * present + controller-present happy paths. This file fills the remaining
 * branches: `serviceWorker` absent from `navigator`, the `installingWorker`
 * null guard, statechange while still installing, the controllerchange
 * reload listener, the `getCacheSize` controller-present path (incl. the
 * inner controller-disappeared race), the `checkForUpdates` interval body,
 * and the `preloadAssets` cache-put / fetch-not-ok / fetch-throw arms.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCache,
  getCacheSize,
  onBackgroundSync,
  onPeriodicSync,
  preloadAssets,
  register,
  unregister,
} from './serviceWorker'

function withDeletedServiceWorker(): () => void {
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
  delete (navigator as unknown as Record<string, unknown>)['serviceWorker']
  return () => {
    if (original) Object.defineProperty(navigator, 'serviceWorker', original)
  }
}

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

describe('serviceWorker — no-SW branches', () => {
  let restore: () => void
  beforeEach(() => {
    restore = withDeletedServiceWorker()
  })
  afterEach(() => {
    restore()
  })

  it('register() is a no-op when serviceWorker is not in navigator', async () => {
    await expect(register()).resolves.toBeUndefined()
  })

  it('unregister() is a no-op when serviceWorker is not in navigator', async () => {
    await expect(unregister()).resolves.toBeUndefined()
  })

  it('getCacheSize() returns 0 when serviceWorker is not in navigator', async () => {
    await expect(getCacheSize()).resolves.toBe(0)
  })

  it('clearCache() resolves when serviceWorker is not in navigator', async () => {
    await expect(clearCache()).resolves.toBeUndefined()
  })

  it('preloadAssets() resolves when serviceWorker is not in navigator', async () => {
    await expect(preloadAssets(['/x'])).resolves.toBeUndefined()
  })

  it('onBackgroundSync() returns a no-op cleanup when serviceWorker is not in navigator', () => {
    const cleanup = onBackgroundSync(() => {})
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })

  it('onPeriodicSync() returns a no-op cleanup when serviceWorker is not in navigator', () => {
    const cleanup = onPeriodicSync(() => {})
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })
})

describe('register — additional branches', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    logSpy.mockRestore()
  })

  it('updatefound: returns early when registration.installing is null', async () => {
    const onSuccess = vi.fn()
    const onUpdate = vi.fn()
    const updateFoundListeners: Array<() => void> = []
    const reg = {
      scope: '/',
      waiting: null,
      installing: null, // ← triggers the `if (!installingWorker) return` guard
      addEventListener: vi.fn((_e: string, h: () => void) => updateFoundListeners.push(h)),
      update: vi.fn(),
    }
    const mockSW = {
      controller: null,
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn().mockResolvedValue(reg),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const restore = stubServiceWorker(mockSW)
    try {
      register({ onSuccess, onUpdate })
      window.dispatchEvent(new Event('load'))
      // Drain microtasks so the registered promise resolves.
      await vi.advanceTimersByTimeAsync(0)
      // Now fire updatefound — installingWorker is null so the inner listener
      // attachment is skipped silently.
      updateFoundListeners.forEach((h) => h())
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onUpdate).not.toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  it('statechange while still installing does not invoke onSuccess/onUpdate', async () => {
    const onSuccess = vi.fn()
    const onUpdate = vi.fn()
    const stateChangeListeners: Array<() => void> = []
    const updateFoundListeners: Array<() => void> = []

    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn((_e: string, h: () => void) => stateChangeListeners.push(h)),
    }
    const reg = {
      scope: '/',
      waiting: null,
      installing: installingWorker,
      addEventListener: vi.fn((_e: string, h: () => void) => updateFoundListeners.push(h)),
      update: vi.fn(),
    }
    const mockSW = {
      controller: null,
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn().mockResolvedValue(reg),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const restore = stubServiceWorker(mockSW)
    try {
      register({ onSuccess, onUpdate })
      window.dispatchEvent(new Event('load'))
      await vi.advanceTimersByTimeAsync(0)
      updateFoundListeners.forEach((h) => h())
      // Fire statechange while still 'installing' — the inner branch should NOT fire callbacks.
      stateChangeListeners.forEach((h) => h())
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onUpdate).not.toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  it('attaches a controllerchange listener that reloads the page', async () => {
    const reloadSpy = vi.fn()
    // jsdom's window.location.reload is non-configurable; redefine the whole
    // location object instead so we can intercept reload().
    const origLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...origLocation, reload: reloadSpy } as unknown as Location,
    })

    const controllerChangeHandlers: Array<() => void> = []
    const mockSW = {
      controller: null,
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn().mockResolvedValue({
        scope: '/',
        waiting: null,
        installing: null,
        addEventListener: vi.fn(),
        update: vi.fn(),
      }),
      addEventListener: vi.fn((event: string, h: () => void) => {
        if (event === 'controllerchange') controllerChangeHandlers.push(h)
      }),
      removeEventListener: vi.fn(),
    }
    const restore = stubServiceWorker(mockSW)
    try {
      register()
      // controllerchange listener is attached synchronously after `if ('serviceWorker' in navigator)`.
      expect(controllerChangeHandlers.length).toBe(1)
      controllerChangeHandlers[0]()
      expect(reloadSpy).toHaveBeenCalled()
    } finally {
      restore()
      Object.defineProperty(window, 'location', { configurable: true, value: origLocation })
    }
  })

  it('checkForUpdates: the 60s interval calls registration.update()', async () => {
    const updateFn = vi.fn()
    const reg = {
      scope: '/',
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: updateFn,
    }
    const mockSW = {
      controller: null,
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn().mockResolvedValue(reg),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const restore = stubServiceWorker(mockSW)
    try {
      register()
      window.dispatchEvent(new Event('load'))
      await vi.advanceTimersByTimeAsync(0)
      // Advance past the 60s interval; registration.update should fire.
      await vi.advanceTimersByTimeAsync(60_000)
      expect(updateFn).toHaveBeenCalled()
    } finally {
      restore()
    }
  })
})

describe('getCacheSize — controller-present branches', () => {
  let restoreSW: () => void

  beforeEach(() => {
    // Provide a minimal MessageChannel.
    class MC {
      port1: { onmessage: ((ev: { data: { size: number } }) => void) | null } = { onmessage: null }
      port2 = {}
    }
    vi.stubGlobal('MessageChannel', MC as unknown as typeof MessageChannel)
  })
  afterEach(() => {
    restoreSW?.()
    vi.unstubAllGlobals()
  })

  it('resolves with the size posted back via MessageChannel', async () => {
    let capturedChannel: { port1: { onmessage: ((ev: { data: { size: number } }) => void) | null } } | null = null
    const postMessage = vi.fn((_msg: unknown, transfer: unknown[]) => {
      // The channel's port2 is the second entry. We held a reference via the
      // MessageChannel constructor stub — but easier: reach into navigator.
      capturedChannel = (transfer as unknown as { port1: { onmessage: ((ev: { data: { size: number } }) => void) | null } }[])[0] as never
    })
    const mockSW = {
      controller: { postMessage },
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    restoreSW = stubServiceWorker(mockSW)

    // The transfer[0] in production is `messageChannel.port2`; we don't get
    // direct access. Instead, intercept by overriding postMessage to grab the
    // *channel* indirectly — easier: rebuild MessageChannel to expose port1
    // globally.
    let lastChannel: { port1: { onmessage: ((ev: { data: { size: number } }) => void) | null }, port2: object } | null = null
    const MakeMC = function () {
      const inst = { port1: { onmessage: null as ((ev: { data: { size: number } }) => void) | null }, port2: {} }
      lastChannel = inst
      return inst
    }
    vi.stubGlobal('MessageChannel', MakeMC as unknown as typeof MessageChannel)

    const promise = getCacheSize()
    expect(postMessage).toHaveBeenCalled()
    expect(lastChannel).not.toBeNull()
    // Simulate the SW responding via the port.
    lastChannel!.port1.onmessage!({ data: { size: 4242 } })
    void capturedChannel
    await expect(promise).resolves.toBe(4242)
  })

  it('resolves with 0 when the controller disappears between the outer and inner check', async () => {
    // controller is present at the outer `if`, then becomes null before the
    // inner `if (navigator.serviceWorker.controller)` re-check inside the Promise.
    let calls = 0
    const sw = {
      get controller() {
        calls++
        // First (outer) call returns truthy; subsequent calls return null.
        return calls === 1 ? { postMessage: vi.fn() } : null
      },
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    restoreSW = stubServiceWorker(sw as unknown as Record<string, unknown>)
    await expect(getCacheSize()).resolves.toBe(0)
  })
})

describe('clearCache — message-filter branch', () => {
  it('ignores non-CACHE_CLEARED messages', async () => {
    const messageListeners: Array<(e: MessageEvent) => void> = []
    const sw = {
      controller: { postMessage: vi.fn() },
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn(),
      addEventListener: vi.fn((_e: string, h: (ev: MessageEvent) => void) => {
        messageListeners.push(h)
      }),
      removeEventListener: vi.fn(),
    }
    const restore = stubServiceWorker(sw)
    try {
      const p = clearCache()
      await new Promise((r) => setTimeout(r, 0))
      // Fire two messages: one without `data`, one with the wrong type. Both
      // should be ignored. Then the correct one resolves the promise.
      messageListeners.forEach((h) => h(new MessageEvent('message')))
      messageListeners.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'OTHER' } })),
      )
      messageListeners.forEach((h) =>
        h(new MessageEvent('message', { data: { type: 'CACHE_CLEARED' } })),
      )
      await expect(p).resolves.toBeUndefined()
    } finally {
      restore()
    }
  })
})

describe('preloadAssets — caches-present branches', () => {
  let putMock: ReturnType<typeof vi.fn>
  let restoreSW: () => void
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    putMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({ put: putMock }),
    } as unknown as CacheStorage)
  })
  afterEach(() => {
    restoreSW?.()
    vi.unstubAllGlobals()
    warnSpy.mockRestore()
  })

  it('caches successful (response.ok) fetches and skips non-ok and threw fetches', async () => {
    const sw = {
      controller: null,
      ready: Promise.resolve({ unregister: vi.fn() }),
      register: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    restoreSW = stubServiceWorker(sw)

    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u === '/ok') return new Response('ok', { status: 200 })
      if (u === '/notok') return new Response('no', { status: 404 })
      throw new Error('boom')
    })
    vi.stubGlobal('fetch', fetchMock)

    await preloadAssets(['/ok', '/notok', '/throw'])
    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock).toHaveBeenCalledWith('/ok', expect.any(Response))
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to preload: /throw'),
      expect.any(Error),
    )
  })
})
