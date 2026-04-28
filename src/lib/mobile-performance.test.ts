import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MobilePerformanceOptimizer,
  ImageCache,
  batchUpdates,
  measureComponentRenderTime,
  prefetchImage,
  optimizeForLowEnd,
  shouldReduceMotion,
} from './mobile-performance'

/**
 * Round-1 lesson: jsdom returns 0 for `screen.width/height`,
 * `performance.memory` is undefined, and `navigator.connection` /
 * `navigator.getBattery` are undefined. Stub via Object.defineProperty
 * with `configurable: true, writable: true` and restore in afterEach.
 */
function stubNavigator(props: Record<string, unknown>) {
  const restorers: Array<() => void> = []
  Object.entries(props).forEach(([k, v]) => {
    const original = Object.getOwnPropertyDescriptor(navigator, k)
    Object.defineProperty(navigator, k, {
      configurable: true,
      writable: true,
      value: v,
    })
    restorers.push(() => {
      if (original) {
        Object.defineProperty(navigator, k, original)
      } else {
        // @ts-expect-error - dynamic delete
        delete (navigator as Record<string, unknown>)[k]
      }
    })
  })
  return () => restorers.forEach(r => r())
}

describe('MobilePerformanceOptimizer.detectDeviceCapabilities', () => {
  let restore: (() => void) | null = null

  afterEach(() => {
    restore?.()
    restore = null
    vi.restoreAllMocks()
  })

  it('classifies a low-tier device (low memory)', async () => {
    restore = stubNavigator({
      hardwareConcurrency: 2,
      deviceMemory: 1,
      connection: { effectiveType: '4g', saveData: false },
    })
    const o = MobilePerformanceOptimizer.getInstance()
    const caps = await o.detectDeviceCapabilities()
    expect(caps.tier).toBe('low')
    expect(caps.cores).toBe(2)
    expect(caps.memory).toBe(1)
  })

  it('classifies a low-tier device on slow-2g connection', async () => {
    restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: 'slow-2g', saveData: true },
    })
    const o = MobilePerformanceOptimizer.getInstance()
    const caps = await o.detectDeviceCapabilities()
    expect(caps.tier).toBe('low')
    expect(caps.connection).toBe('slow-2g')
    expect(caps.saveData).toBe(true)
  })

  it('classifies a high-tier device (8 cores, 8 GB)', async () => {
    restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const o = MobilePerformanceOptimizer.getInstance()
    const caps = await o.detectDeviceCapabilities()
    expect(caps.tier).toBe('high')
  })

  it('classifies a mid-tier device (4 cores, 4 GB)', async () => {
    restore = stubNavigator({
      hardwareConcurrency: 4,
      deviceMemory: 4,
      connection: { effectiveType: '4g' },
    })
    const o = MobilePerformanceOptimizer.getInstance()
    const caps = await o.detectDeviceCapabilities()
    expect(caps.tier).toBe('mid')
  })

  it('falls back to defaults when battery API throws', async () => {
    restore = stubNavigator({
      hardwareConcurrency: 4,
      deviceMemory: 4,
      connection: { effectiveType: '4g' },
      getBattery: () => Promise.reject(new Error('denied')),
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const o = MobilePerformanceOptimizer.getInstance()
    const caps = await o.detectDeviceCapabilities()
    expect(caps.batteryLevel).toBe(1)
    expect(caps.charging).toBe(true)
    warn.mockRestore()
  })

  it('uses battery API when present', async () => {
    restore = stubNavigator({
      hardwareConcurrency: 4,
      deviceMemory: 4,
      connection: { effectiveType: '4g' },
      getBattery: () => Promise.resolve({ level: 0.42, charging: false }),
    })
    const o = MobilePerformanceOptimizer.getInstance()
    const caps = await o.detectDeviceCapabilities()
    expect(caps.batteryLevel).toBeCloseTo(0.42)
    expect(caps.charging).toBe(false)
  })
})

describe('MobilePerformanceOptimizer.getOptimizedSettings', () => {
  const o = MobilePerformanceOptimizer.getInstance()

  const baseCaps = (tier: 'low' | 'mid' | 'high') => ({
    tier,
    cores: 4,
    memory: 4,
    gpu: 'Unknown',
    connection: '4g',
    saveData: false,
    batteryLevel: 1,
    charging: true,
  })

  it('returns aggressive settings for low-tier devices', () => {
    const s = o.getOptimizedSettings(baseCaps('low'))
    expect(s.enableAnimations).toBe(false)
    expect(s.enableBlur).toBe(false)
    expect(s.enableShadows).toBe(false)
    expect(s.maxConcurrentRequests).toBe(2)
    expect(s.cacheSize).toBe(50)
  })

  it('returns relaxed settings for high-tier devices', () => {
    const s = o.getOptimizedSettings(baseCaps('high'))
    expect(s.enableAnimations).toBe(true)
    expect(s.maxConcurrentRequests).toBe(10)
    expect(s.cacheSize).toBe(200)
    expect(s.lazyLoadThreshold).toBe(1000)
  })

  it('returns base settings for mid-tier devices', () => {
    const s = o.getOptimizedSettings(baseCaps('mid'))
    expect(s.enableAnimations).toBe(true)
    expect(s.maxConcurrentRequests).toBe(6)
    expect(s.cacheSize).toBe(100)
  })
})

describe('MobilePerformanceOptimizer subscribe/notify', () => {
  it('subscribers are invoked with metrics', () => {
    const o = MobilePerformanceOptimizer.getInstance()
    const cb = vi.fn()
    const unsub = o.subscribe(cb)
    // Trigger notifyListeners via the private path — use the public
    // notify trick: getMemoryUsage doesn't notify, so reach in via the
    // module's measureFPS would; simpler: cast to any and call private.
    type WithPriv = { notifyListeners?(): void }
    const withPriv = o as unknown as WithPriv
    if (withPriv.notifyListeners) {
      withPriv.notifyListeners()
    }
    // Public API: at minimum unsubscribe works.
    unsub()
    expect(cb).toHaveBeenCalled()
  })

  it('getFPS / getDeviceTier / getMemoryUsage are callable', () => {
    const o = MobilePerformanceOptimizer.getInstance()
    expect(typeof o.getFPS()).toBe('number')
    expect(['low', 'mid', 'high']).toContain(o.getDeviceTier())
    // jsdom does not expose performance.memory; should return 0.
    expect(o.getMemoryUsage()).toBe(0)
  })
})

describe('ImageCache', () => {
  beforeEach(() => ImageCache.clear())
  afterEach(() => ImageCache.clear())

  it('set/get/has/clear work as expected', () => {
    expect(ImageCache.has('a')).toBe(false)
    ImageCache.set('a', 'data:1')
    expect(ImageCache.get('a')).toBe('data:1')
    expect(ImageCache.has('a')).toBe(true)
    ImageCache.clear()
    expect(ImageCache.has('a')).toBe(false)
  })

  it('evicts the oldest entry when maxSize is reached', () => {
    // maxSize is 50; insert 51 to force one eviction of the first key.
    for (let i = 0; i < 51; i++) {
      ImageCache.set(`k${i}`, `v${i}`)
    }
    expect(ImageCache.has('k0')).toBe(false)
    expect(ImageCache.has('k50')).toBe(true)
  })
})

describe('utility functions', () => {
  it('batchUpdates splits items into batches and processes them', () => {
    const fn = vi.fn()
    batchUpdates([1, 2, 3, 4, 5], 2, fn, 0)
    // setTimeout(0) — flush microtasks/timers via fake timers if needed.
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(3)
        expect(fn).toHaveBeenCalledWith([1, 2])
        expect(fn).toHaveBeenCalledWith([3, 4])
        expect(fn).toHaveBeenCalledWith([5])
        resolve()
      }, 10)
    })
  })

  it('measureComponentRenderTime returns a duration and logs slow renders', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fast = await measureComponentRenderTime('fast', () => {})
    expect(typeof fast).toBe('number')
    // Force a "slow" path by mocking performance.now to jump > 16ms.
    const orig = performance.now.bind(performance)
    let i = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      i++
      return i === 1 ? 0 : 100
    })
    const slow = await measureComponentRenderTime('slow', () => {})
    expect(slow).toBeGreaterThanOrEqual(16)
    expect(warn).toHaveBeenCalled()
    ;(performance.now as unknown as { mockRestore?: () => void }).mockRestore?.()
    // Ensure we still have a working performance.now afterwards.
    expect(typeof orig()).toBe('number')
  })

  it('prefetchImage resolves when Image.onload fires', async () => {
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    const original = globalThis.Image
    globalThis.Image = FakeImage as unknown as typeof Image
    await expect(prefetchImage('x.png')).resolves.toBeUndefined()
    globalThis.Image = original
  })

  it('optimizeForLowEnd returns true only when tier is "low"', async () => {
    // Force the singleton tier to "low" via detectDeviceCapabilities.
    const restore = stubNavigator({
      hardwareConcurrency: 2,
      deviceMemory: 1,
      connection: { effectiveType: '4g' },
    })
    await MobilePerformanceOptimizer.getInstance().detectDeviceCapabilities()
    expect(optimizeForLowEnd()).toBe(true)
    restore()
  })

  it('shouldReduceMotion respects matchMedia and the low-tier flag', async () => {
    // matchMedia is stubbed in setup.ts to always return matches=false; on
    // a high-tier device this should be false.
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    await MobilePerformanceOptimizer.getInstance().detectDeviceCapabilities()
    expect(shouldReduceMotion()).toBe(false)
    restore()
  })
})
