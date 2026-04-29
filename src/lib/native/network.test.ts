import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getNetworkStatus,
  getNetworkStatusSync,
  isOffline,
  onNetworkStatusChange,
  __resetNetworkForTests,
} from './network'

describe('native/network (web fallback)', () => {
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

  it('reports connected when navigator.onLine is true', async () => {
    const status = await getNetworkStatus()
    expect(status.connected).toBe(true)
  })

  it('reports disconnected when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    const status = await getNetworkStatus()
    expect(status.connected).toBe(false)
    expect(status.connectionType).toBe('none')
  })

  it('isOffline returns the inverse of connected', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    // Trigger initialisation so cached status reflects offline.
    await getNetworkStatus()
    expect(isOffline()).toBe(true)
  })

  it('getNetworkStatusSync returns a sane default before init', () => {
    const status = getNetworkStatusSync()
    expect(typeof status.connected).toBe('boolean')
  })

  it('onNetworkStatusChange fires with current status on subscribe', async () => {
    let received: boolean | null = null
    const unsubscribe = onNetworkStatusChange((s) => {
      received = s.connected
    })
    // Wait a microtask for the cached-status replay.
    await new Promise((r) => setTimeout(r, 10))
    expect(received).not.toBeNull()
    unsubscribe()
  })

  it('online/offline window events update subscribers', async () => {
    // Initialise so listeners are registered.
    await getNetworkStatus()
    let connected: boolean | null = null
    const unsubscribe = onNetworkStatusChange((s) => {
      connected = s.connected
    })
    window.dispatchEvent(new Event('offline'))
    await new Promise((r) => setTimeout(r, 0))
    expect(connected).toBe(false)
    window.dispatchEvent(new Event('online'))
    await new Promise((r) => setTimeout(r, 0))
    expect(connected).toBe(true)
    unsubscribe()
  })

  it('unsubscribed listeners stop receiving updates', async () => {
    await getNetworkStatus()
    const cb = vi.fn()
    const unsubscribe = onNetworkStatusChange(cb)
    await new Promise((r) => setTimeout(r, 0))
    cb.mockClear()
    unsubscribe()
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
    await new Promise((r) => setTimeout(r, 0))
    expect(cb).not.toHaveBeenCalled()
  })

  it('listener errors are caught and logged without breaking other subscribers', async () => {
    await getNetworkStatus()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = vi.fn()
    const throwing = vi.fn(() => {
      throw new Error('boom')
    })
    const u1 = onNetworkStatusChange(throwing)
    const u2 = onNetworkStatusChange(ok)
    // Drain initial replays.
    await new Promise((r) => setTimeout(r, 0))
    throwing.mockClear()
    ok.mockClear()

    window.dispatchEvent(new Event('offline'))
    await new Promise((r) => setTimeout(r, 0))

    expect(throwing).toHaveBeenCalled()
    expect(ok).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
    u1()
    u2()
    errorSpy.mockRestore()
  })

  it('getNetworkStatusSync returns the cached status after initialisation', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    await getNetworkStatus()
    const sync = getNetworkStatusSync()
    expect(sync.connected).toBe(false)
    expect(sync.connectionType).toBe('none')
  })
})
