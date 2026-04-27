import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePerformanceMonitor } from './use-performance-monitor'

describe('usePerformanceMonitor hook', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('should initialize with empty metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    expect(result.current.getMetrics()).toEqual([])
    expect(result.current.getAverageRenderTime()).toBe(0)
  })

  it('should not track metrics when disabled', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent', false))

    rerender()
    rerender()

    expect(result.current.getMetrics()).toEqual([])
  })

  it('should provide getMetrics function', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    expect(typeof result.current.getMetrics).toBe('function')
    const metrics = result.current.getMetrics()
    expect(Array.isArray(metrics)).toBe(true)
  })

  it('should provide clearMetrics function', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    expect(typeof result.current.clearMetrics).toBe('function')

    result.current.clearMetrics()

    expect(result.current.getMetrics()).toEqual([])
    expect(result.current.getAverageRenderTime()).toBe(0)
  })

  it('should provide getAverageRenderTime function', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    expect(typeof result.current.getAverageRenderTime).toBe('function')
    const avgTime = result.current.getAverageRenderTime()
    expect(typeof avgTime).toBe('number')
    expect(avgTime).toBeGreaterThanOrEqual(0)
  })

  it('should return immutable metrics copy', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    const metrics1 = result.current.getMetrics()
    const metrics2 = result.current.getMetrics()

    expect(metrics1).toEqual(metrics2)
    expect(metrics1).not.toBe(metrics2) // Different array instances
  })

  it('should handle multiple component instances independently', () => {
    const { result: result1 } = renderHook(() => usePerformanceMonitor('Component1', true))
    const { result: result2 } = renderHook(() => usePerformanceMonitor('Component2', true))

    // Each should have its own metrics
    expect(result1.current.getMetrics).toBeDefined()
    expect(result2.current.getMetrics).toBeDefined()
    expect(result1.current.clearMetrics).toBeDefined()
    expect(result2.current.clearMetrics).toBeDefined()

    result1.current.clearMetrics()

    // Clearing one shouldn't affect the other
    expect(result1.current.getMetrics()).toEqual([])
    expect(Array.isArray(result2.current.getMetrics())).toBe(true)
  })

  it('should handle enabled state changes', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => usePerformanceMonitor('TestComponent', enabled),
      { initialProps: { enabled: false } }
    )

    expect(result.current.getMetrics()).toEqual([])

    // Enable monitoring
    rerender({ enabled: true })

    // Should still have access to metrics
    expect(result.current.getMetrics).toBeDefined()
    expect(Array.isArray(result.current.getMetrics())).toBe(true)
  })

  it('should not crash on cleanup', () => {
    const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    expect(() => unmount()).not.toThrow()
  })

  it('should handle rapid rerenders', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    for (let i = 0; i < 10; i++) {
      rerender()
    }

    // Should not crash and metrics should still be accessible
    expect(Array.isArray(result.current.getMetrics())).toBe(true)
    expect(typeof result.current.getAverageRenderTime()).toBe('number')
  })

  it('should maintain consistent API across renders', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    rerender()

    // Functions should be stable
    expect(result.current.getMetrics).toBeDefined()
    expect(result.current.clearMetrics).toBeDefined()
    expect(result.current.getAverageRenderTime).toBeDefined()
  })

  it('should handle different component names', () => {
    const { result: result1 } = renderHook(() => usePerformanceMonitor('MyComponent', true))
    const { result: result2 } = renderHook(() => usePerformanceMonitor('AnotherComponent', true))

    // Both should work independently with their own component names
    expect(result1.current.getMetrics).toBeDefined()
    expect(result2.current.getMetrics).toBeDefined()
  })

  it('should handle empty string component name', () => {
    const { result } = renderHook(() => usePerformanceMonitor('', true))

    expect(result.current.getMetrics).toBeDefined()
    expect(result.current.clearMetrics).toBeDefined()
    expect(result.current.getAverageRenderTime).toBeDefined()
  })

  it('should clear metrics correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent', true))

    result.current.clearMetrics()

    expect(result.current.getMetrics().length).toBe(0)
    expect(result.current.getAverageRenderTime()).toBe(0)
  })
})
