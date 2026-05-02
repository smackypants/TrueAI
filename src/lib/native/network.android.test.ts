/**
 * Tests for the native (Capacitor Network) paths of `native/network`.
 * The existing `network.test.ts` covers only the web fallback (jsdom
 * `online`/`offline` events + `navigator.onLine`); this file mocks
 * `./platform` as native and `@capacitor/network` so we can exercise:
 *   - first-init `Network.getStatus()` + `addListener('networkStatusChange')`
 *   - cached-status replay on subscribe
 *   - listener fan-out on plugin-emitted status changes
 *   - error-tolerance: getStatus throws → fall back to fromBrowser
 *   - error-tolerance: addListener throws → ensureInitialized still completes
 *   - __resetNetworkForTests removes the native listener handle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

let getStatusMock: ReturnType<typeof vi.fn>
let addListenerMock: ReturnType<typeof vi.fn>
let removeMock: ReturnType<typeof vi.fn>
// Capture the listener registered by ensureInitialized so tests can drive
// it directly, exactly as the OS would when connectivity changes.
let capturedListener: ((s: { connected: boolean; connectionType: string }) => void) | null = null

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: (...args: unknown[]) => getStatusMock(...args),
    addListener: (event: string, cb: (s: { connected: boolean; connectionType: string }) => void) =>
      addListenerMock(event, cb),
  },
}))

beforeEach(() => {
  getStatusMock = vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' })
  removeMock = vi.fn().mockResolvedValue(undefined)
  capturedListener = null
  addListenerMock = vi.fn(
    async (_event: string, cb: (s: { connected: boolean; connectionType: string }) => void) => {
      capturedListener = cb
      return { remove: () => removeMock() }
    },
  )
  vi.resetModules()
})

describe('native/network (Android Capacitor paths)', () => {
  it('seeds cachedStatus from Network.getStatus on first call and registers a listener', async () => {
    const { getNetworkStatus, __resetNetworkForTests } = await import('./network')
    try {
      const s = await getNetworkStatus()
      expect(s.connected).toBe(true)
      expect(s.connectionType).toBe('wifi')
      expect(getStatusMock).toHaveBeenCalledTimes(1)
      expect(addListenerMock).toHaveBeenCalledWith(
        'networkStatusChange',
        expect.any(Function),
      )
    } finally {
      await __resetNetworkForTests()
    }
  })

  it('forwards plugin-emitted status changes to all subscribers', async () => {
    const { getNetworkStatus, onNetworkStatusChange, __resetNetworkForTests } =
      await import('./network')
    try {
      await getNetworkStatus() // initialise so capturedListener is set
      expect(capturedListener).toBeTypeOf('function')

      const updates: Array<{ connected: boolean; connectionType: string }> = []
      const unsub = onNetworkStatusChange((s) => updates.push(s))
      // Wait one microtask for the cached-status replay.
      await Promise.resolve()
      updates.length = 0

      capturedListener?.({ connected: false, connectionType: 'none' })
      expect(updates).toEqual([{ connected: false, connectionType: 'none' }])

      capturedListener?.({ connected: true, connectionType: 'cellular' })
      expect(updates).toEqual([
        { connected: false, connectionType: 'none' },
        { connected: true, connectionType: 'cellular' },
      ])

      unsub()
    } finally {
      await __resetNetworkForTests()
    }
  })

  it('falls back to fromBrowser when Network.getStatus throws inside refreshNative', async () => {
    getStatusMock = vi.fn().mockRejectedValue(new Error('plugin offline'))
    addListenerMock = vi.fn(
      async (_event: string, cb: (s: { connected: boolean; connectionType: string }) => void) => {
        capturedListener = cb
        return { remove: () => removeMock() }
      },
    )
    vi.resetModules()

    const { getNetworkStatus, __resetNetworkForTests } = await import('./network')
    try {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
      const s = await getNetworkStatus()
      // refreshNative caught the error → returns fromBrowser → connected=true, connectionType='unknown'
      expect(s.connected).toBe(true)
      expect(s.connectionType).toBe('unknown')
    } finally {
      await __resetNetworkForTests()
    }
  })

  it('ensureInitialized is resilient when addListener throws', async () => {
    addListenerMock = vi.fn().mockRejectedValue(new Error('addListener failed'))
    vi.resetModules()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { getNetworkStatus, __resetNetworkForTests } = await import('./network')
    try {
      // Must not throw, and must still produce a status from refreshNative.
      const s = await getNetworkStatus()
      expect(typeof s.connected).toBe('boolean')
      expect(errSpy).toHaveBeenCalled()
    } finally {
      await __resetNetworkForTests()
      errSpy.mockRestore()
    }
  })

  it('__resetNetworkForTests removes the registered native listener handle', async () => {
    const { getNetworkStatus, __resetNetworkForTests } = await import('./network')
    await getNetworkStatus()
    await __resetNetworkForTests()
    expect(removeMock).toHaveBeenCalledTimes(1)
  })

  it('__resetNetworkForTests swallows errors from handle.remove()', async () => {
    removeMock = vi.fn().mockRejectedValue(new Error('remove failed'))
    addListenerMock = vi.fn(
      async (_event: string, cb: (s: { connected: boolean; connectionType: string }) => void) => {
        capturedListener = cb
        return { remove: () => removeMock() }
      },
    )
    vi.resetModules()

    const { getNetworkStatus, __resetNetworkForTests } = await import('./network')
    await getNetworkStatus()
    // Must resolve without throwing despite remove() rejecting.
    await expect(__resetNetworkForTests()).resolves.toBeUndefined()
  })
})
