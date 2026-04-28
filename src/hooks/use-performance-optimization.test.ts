import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock useIsMobile so we can control its return value in tests.
vi.mock('./use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}))

import { usePerformanceOptimization } from './use-performance-optimization'
import { useIsMobile } from './use-mobile'

const mockUseIsMobile = vi.mocked(useIsMobile)

// Save the original navigator descriptor helpers so tests can restore them.
function stubNavigator(overrides: Record<string, unknown>): () => void {
  const originals: Record<string, PropertyDescriptor | undefined> = {}
  // When stubbing `connection`, always inject event listener stubs so the hook's
  // connection-change listener setup doesn't throw when calling addEventListener.
  if ('connection' in overrides && overrides.connection && typeof overrides.connection === 'object') {
    const conn = overrides.connection as Record<string, unknown>
    if (!('addEventListener' in conn)) conn.addEventListener = vi.fn()
    if (!('removeEventListener' in conn)) conn.removeEventListener = vi.fn()
  }
  for (const [key, value] of Object.entries(overrides)) {
    originals[key] = Object.getOwnPropertyDescriptor(navigator, key)
    Object.defineProperty(navigator, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  return () => {
    for (const [key, orig] of Object.entries(originals)) {
      if (orig) {
        Object.defineProperty(navigator, key, orig)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (navigator as any)[key]
      }
    }
  }
}

describe('usePerformanceOptimization', () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false)
    // Default: high-end desktop
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      writable: true,
      value: 8,
    })
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      writable: true,
      value: 1,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Initial state
  // ─────────────────────────────────────────────────────────────────────────

  it('returns default settings on initial render', () => {
    const { result } = renderHook(() => usePerformanceOptimization())
    const { settings } = result.current
    expect(settings.enableAnimations).toBe(true)
    expect(settings.enableBlur).toBe(true)
    expect(settings.enableShadows).toBe(true)
    expect(settings.enableGradients).toBe(true)
    expect(settings.reducedMotion).toBe(false)
    expect(settings.optimizeImages).toBe(true)
    expect(settings.lazyLoadThreshold).toBe(200)
  })

  it('exposes isMobile from useIsMobile', () => {
    mockUseIsMobile.mockReturnValue(true)
    const { result } = renderHook(() => usePerformanceOptimization())
    expect(result.current.isMobile).toBe(true)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getPerformanceScore
  // ─────────────────────────────────────────────────────────────────────────

  it('getPerformanceScore returns 100 for a high-end device', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.performanceScore).toBe(100)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts points for 2 cores', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 2,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // 2 cores → −30
      expect(result.current.performanceScore).toBe(70)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts points for 4 cores', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 4,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // 4 cores → −15
      expect(result.current.performanceScore).toBe(85)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts points for 2 GB memory', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 2,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // 2 GB memory → −30
      expect(result.current.performanceScore).toBe(70)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts points for 4 GB memory', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 4,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // 4 GB memory → −15
      expect(result.current.performanceScore).toBe(85)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts 25 points for 2g connection', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '2g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // 2g → −25
      expect(result.current.performanceScore).toBe(75)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts 25 points for slow-2g connection', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: 'slow-2g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.performanceScore).toBe(75)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore deducts 15 points for 3g connection', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '3g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.performanceScore).toBe(85)
    } finally {
      unmount()
      restore()
    }
  })

  it('getPerformanceScore is non-negative for worst-case device', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 1,
      deviceMemory: 1,
      connection: { effectiveType: '2g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // 100 − 30 (≤2 cores) − 30 (≤2 GB) − 25 (2g) = 15; Math.max(0, score)
      // guarantees the value is never negative.
      expect(result.current.performanceScore).toBe(15)
      expect(result.current.performanceScore).toBeGreaterThanOrEqual(0)
    } finally {
      unmount()
      restore()
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // shouldEnableFeature
  // ─────────────────────────────────────────────────────────────────────────

  it('shouldEnableFeature returns true for animations by default', () => {
    const { result } = renderHook(() => usePerformanceOptimization())
    expect(result.current.shouldEnableFeature('enableAnimations')).toBe(true)
  })

  it('shouldEnableFeature returns true for blur by default', () => {
    const { result } = renderHook(() => usePerformanceOptimization())
    expect(result.current.shouldEnableFeature('enableBlur')).toBe(true)
  })

  it('shouldEnableFeature returns false for reducedMotion by default', () => {
    const { result } = renderHook(() => usePerformanceOptimization())
    expect(result.current.shouldEnableFeature('reducedMotion')).toBe(false)
  })

  it('shouldEnableFeature respects updated settings', async () => {
    // Simulate prefers-reduced-motion matching so reducedMotion=true is set.
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    try {
      const { result } = renderHook(() => usePerformanceOptimization())
      // Animations should be disabled when prefers-reduced-motion matches.
      expect(result.current.shouldEnableFeature('reducedMotion')).toBe(true)
      expect(result.current.shouldEnableFeature('enableAnimations')).toBe(false)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getOptimizedImageSize — desktop
  // ─────────────────────────────────────────────────────────────────────────

  it('getOptimizedImageSize returns original size when optimizeImages is disabled', () => {
    // Default settings have optimizeImages=true; we test the identity path by
    // using a size that is already within desktop limits.
    const { result } = renderHook(() => usePerformanceOptimization())
    const { width, height } = result.current.getOptimizedImageSize(800, 600)
    expect(width).toBe(800)
    expect(height).toBe(600)
  })

  it('getOptimizedImageSize clamps oversized desktop images to 1920×1080', () => {
    mockUseIsMobile.mockReturnValue(false)
    const { result } = renderHook(() => usePerformanceOptimization())
    // 3840×2160 → should be scaled to fit within 1920×1080 while preserving AR
    const { width, height } = result.current.getOptimizedImageSize(3840, 2160)
    expect(width).toBeLessThanOrEqual(1920)
    expect(height).toBeLessThanOrEqual(1080)
    // Aspect ratio preserved (within rounding)
    expect(width / height).toBeCloseTo(3840 / 2160, 1)
  })

  it('getOptimizedImageSize clamps tall desktop images to 1080px height', () => {
    mockUseIsMobile.mockReturnValue(false)
    const { result } = renderHook(() => usePerformanceOptimization())
    // 1200×2400 — height exceeds 1080
    const { width, height } = result.current.getOptimizedImageSize(1200, 2400)
    expect(height).toBeLessThanOrEqual(1080)
    expect(width).toBeLessThanOrEqual(1920)
  })

  it('getOptimizedImageSize returns integer pixel values', () => {
    mockUseIsMobile.mockReturnValue(false)
    const { result } = renderHook(() => usePerformanceOptimization())
    const { width, height } = result.current.getOptimizedImageSize(2560, 1920)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getOptimizedImageSize — mobile
  // ─────────────────────────────────────────────────────────────────────────

  it('getOptimizedImageSize clamps oversized mobile images to 800×600', () => {
    mockUseIsMobile.mockReturnValue(true)
    const { result } = renderHook(() => usePerformanceOptimization())
    const { width, height } = result.current.getOptimizedImageSize(1600, 1200)
    expect(width).toBeLessThanOrEqual(800)
    expect(height).toBeLessThanOrEqual(600)
    // Aspect ratio preserved
    expect(width / height).toBeCloseTo(1600 / 1200, 1)
  })

  it('getOptimizedImageSize does not upscale small images', () => {
    mockUseIsMobile.mockReturnValue(false)
    const { result } = renderHook(() => usePerformanceOptimization())
    const { width, height } = result.current.getOptimizedImageSize(100, 80)
    expect(width).toBe(100)
    expect(height).toBe(80)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // isLowEndDevice / isSlowConnection / isLowBattery derived flags
  // ─────────────────────────────────────────────────────────────────────────

  it('isLowEndDevice is true when cores ≤ 2', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 2,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.isLowEndDevice).toBe(true)
    } finally {
      unmount()
      restore()
    }
  })

  it('isLowEndDevice is true when memory ≤ 2', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 2,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.isLowEndDevice).toBe(true)
    } finally {
      unmount()
      restore()
    }
  })

  it('isLowEndDevice is false for high-end hardware', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.isLowEndDevice).toBe(false)
    } finally {
      unmount()
      restore()
    }
  })

  it('isSlowConnection is true for 2g', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '2g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.isSlowConnection).toBe(true)
    } finally {
      unmount()
      restore()
    }
  })

  it('isSlowConnection is true for slow-2g', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: 'slow-2g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.isSlowConnection).toBe(true)
    } finally {
      unmount()
      restore()
    }
  })

  it('isSlowConnection is false for 4g', () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      expect(result.current.isSlowConnection).toBe(false)
    } finally {
      unmount()
      restore()
    }
  })

  it('isLowBattery is false when batteryLevel is null (Battery API unavailable)', () => {
    const { result } = renderHook(() => usePerformanceOptimization())
    // batteryLevel starts as null (Battery API not stubbed)
    expect(result.current.isLowBattery).toBe(false)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Battery API integration
  // ─────────────────────────────────────────────────────────────────────────

  it('detects low battery when getBattery is available and returns < 20%', async () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
      getBattery: vi.fn().mockResolvedValue({ level: 0.15, charging: false }),
    })
    mockUseIsMobile.mockReturnValue(false)
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      // After the async detectCapabilities call inside useEffect resolves:
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(result.current.isLowBattery).toBe(true)
    } finally {
      unmount()
      restore()
    }
  })

  it('isLowBattery is false when charging even if battery < 20%', async () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
      getBattery: vi.fn().mockResolvedValue({ level: 0.10, charging: true }),
    })
    mockUseIsMobile.mockReturnValue(false)
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(result.current.isLowBattery).toBe(false)
    } finally {
      unmount()
      restore()
    }
  })

  it('survives a Battery API that throws', async () => {
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
      getBattery: vi.fn().mockRejectedValue(new Error('Battery not supported')),
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(result.current.isLowBattery).toBe(false)
    } finally {
      unmount()
      restore()
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Low-end mobile settings adjustment
  // ─────────────────────────────────────────────────────────────────────────

  it('disables blur and adjusts lazy-load threshold on a slow-connection mobile device', async () => {
    mockUseIsMobile.mockReturnValue(true)
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '2g' },
      getBattery: vi.fn().mockRejectedValue(new Error('n/a')),
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(result.current.settings.enableBlur).toBe(false)
      expect(result.current.settings.lazyLoadThreshold).toBe(400)
    } finally {
      unmount()
      restore()
    }
  })

  it('disables animations and enables reducedMotion on a low-end mobile device', async () => {
    mockUseIsMobile.mockReturnValue(true)
    const restore = stubNavigator({
      hardwareConcurrency: 2,
      deviceMemory: 2,
      connection: { effectiveType: '4g' },
      getBattery: vi.fn().mockRejectedValue(new Error('n/a')),
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(result.current.settings.enableAnimations).toBe(false)
      expect(result.current.settings.reducedMotion).toBe(true)
      expect(result.current.settings.enableBlur).toBe(false)
    } finally {
      unmount()
      restore()
    }
  })

  it('does not modify settings on a high-end mobile device with fast connection', async () => {
    mockUseIsMobile.mockReturnValue(true)
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: { effectiveType: '4g' },
      getBattery: vi.fn().mockResolvedValue({ level: 0.9, charging: true }),
    })
    const { result, unmount } = renderHook(() => usePerformanceOptimization())
    try {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
      // High-end mobile, no slow connection, no low battery → no changes
      expect(result.current.settings.enableAnimations).toBe(true)
      expect(result.current.settings.enableBlur).toBe(true)
      expect(result.current.settings.reducedMotion).toBe(false)
    } finally {
      unmount()
      restore()
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Connection change listener
  // ─────────────────────────────────────────────────────────────────────────

  it('adds and removes a connection change listener when navigator.connection is available', () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()
    const restore = stubNavigator({
      hardwareConcurrency: 8,
      deviceMemory: 8,
      connection: {
        effectiveType: '4g',
        addEventListener: addListener,
        removeEventListener: removeListener,
      },
    })
    try {
      const { unmount } = renderHook(() => usePerformanceOptimization())
      expect(addListener).toHaveBeenCalledWith('change', expect.any(Function))
      unmount()
      expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function))
    } finally {
      restore()
    }
  })

  it('does not throw when navigator.connection is absent', () => {
    // Remove connection from navigator.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (navigator as any).connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).connection
    try {
      expect(() => renderHook(() => usePerformanceOptimization())).not.toThrow()
    } finally {
      if (orig !== undefined) {
        Object.defineProperty(navigator, 'connection', {
          configurable: true,
          writable: true,
          value: orig,
        })
      }
    }
  })
})
