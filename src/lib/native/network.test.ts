import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
})
