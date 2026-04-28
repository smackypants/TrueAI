import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@github/spark/hooks', () => ({
  useKV: <T,>(_key: string, initial: T) => useState<T>(initial),
}))

const { useTabPreloader, useResourcePreloader } = await import('./use-tab-preloader')

describe('useTabPreloader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exposes the public API surface', () => {
    const onPreload = vi.fn(async () => {})
    const { result } = renderHook(() => useTabPreloader(['a', 'b', 'c'], 'a', onPreload))
    expect(typeof result.current.handleTabHover).toBe('function')
    expect(typeof result.current.handleTabLeave).toBe('function')
    expect(typeof result.current.preloadTab).toBe('function')
    expect(result.current.metrics).toBeDefined()
    // queueSize starts at 0 (queue is empty).
    expect(result.current.queueSize).toBe(0)
  })

  it('handleTabHover schedules a preload after the configured delay', async () => {
    const onPreload = vi.fn(async () => {})
    const { result } = renderHook(() => useTabPreloader(['a', 'b'], 'a', onPreload))

    act(() => result.current.handleTabHover('b'))
    // Default delayMs is 300; before then the call has not happened.
    expect(onPreload).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })
    expect(onPreload).toHaveBeenCalledWith('b')
  })

  it('handleTabHover ignores the current tab (no extra preload)', async () => {
    const onPreload = vi.fn(async () => {})
    // Use 5 tabs with current at index 2 so adjacency doesn't pull in 'a'.
    const { result } = renderHook(() => useTabPreloader(['a', 'b', 'c', 'd', 'e'], 'c', onPreload))
    act(() => result.current.handleTabHover('c')) // hover the current tab — no-op
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    // Adjacency may have preloaded 'b' and 'd' but never 'c'.
    expect(onPreload.mock.calls.map(c => c[0])).not.toContain('c')
  })

  it('handleTabLeave cancels a pending hover preload', async () => {
    const onPreload = vi.fn(async () => {})
    // 'e' is not adjacent to 'c', so adjacency won't preload it.
    const { result } = renderHook(() => useTabPreloader(['a', 'b', 'c', 'd', 'e'], 'c', onPreload))
    act(() => result.current.handleTabHover('e'))
    act(() => result.current.handleTabLeave())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(onPreload.mock.calls.map(c => c[0])).not.toContain('e')
  })

  it('preloadAdjacentTabs schedules preloads for left + right neighbours', async () => {
    const onPreload = vi.fn(async () => {})
    renderHook(() => useTabPreloader(['a', 'b', 'c'], 'b', onPreload))
    // The effect runs preloadAdjacentTabs which schedules setTimeouts.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    const calls = onPreload.mock.calls.map(c => c[0])
    expect(calls).toContain('a')
    expect(calls).toContain('c')
  })

  it('preloadTab dedupes a tab already in the queue', async () => {
    let resolveFn: (() => void) | null = null
    const onPreload = vi.fn(
      () =>
        new Promise<void>(res => {
          resolveFn = res
        }),
    )
    const { result } = renderHook(() => useTabPreloader(['a', 'b'], 'a', onPreload))
    act(() => {
      result.current.preloadTab('b')
      result.current.preloadTab('b')
    })
    expect(onPreload).toHaveBeenCalledTimes(1)
    // Resolve the in-flight call so we leave the test in a clean state.
    resolveFn?.()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  })

  it('preloadTab swallows onPreload errors and logs a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onPreload = vi.fn(async () => {
      throw new Error('fail')
    })
    const { result } = renderHook(() => useTabPreloader(['a', 'b'], 'a', onPreload))
    await act(async () => {
      await result.current.preloadTab('b')
    })
    expect(warn).toHaveBeenCalled()
  })
})

describe('useResourcePreloader', () => {
  it('exposes the resource API and isPreloaded reflects internal state', () => {
    const { result } = renderHook(() => useResourcePreloader())
    expect(typeof result.current.preloadImage).toBe('function')
    expect(typeof result.current.preloadImages).toBe('function')
    expect(typeof result.current.preloadScript).toBe('function')
    expect(typeof result.current.preloadStyle).toBe('function')
    expect(typeof result.current.preloadFont).toBe('function')
    expect(result.current.isPreloaded('http://x.test/a.png')).toBe(false)
  })

  it('preloadImage resolves on Image.onload', async () => {
    const { result } = renderHook(() => useResourcePreloader())
    // Stub Image so .onload fires synchronously after assigning .src.
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''
      set src(v: string) {
        this._src = v
        // Defer to the next microtask.
        queueMicrotask(() => this.onload?.())
      }
      get src(): string {
        return this._src
      }
    }
    const original = globalThis.Image
    // @ts-expect-error override for test
    globalThis.Image = FakeImage as unknown as typeof Image

    const p = result.current.preloadImage('http://x.test/a.png')
    await expect(p).resolves.toBeUndefined()
    expect(result.current.isPreloaded('http://x.test/a.png')).toBe(true)
    // Calling again should resolve immediately (cached).
    await expect(result.current.preloadImage('http://x.test/a.png')).resolves.toBeUndefined()

    // @ts-expect-error restore
    globalThis.Image = original
  })

  it('preloadImages resolves all results regardless of individual failures', async () => {
    const { result } = renderHook(() => useResourcePreloader())
    class FakeImage {
      onload: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      set src(v: string) {
        if (v.includes('bad')) {
          queueMicrotask(() => this.onerror?.(new Error('bad')))
        } else {
          queueMicrotask(() => this.onload?.())
        }
      }
    }
    const original = globalThis.Image
    // @ts-expect-error override
    globalThis.Image = FakeImage as unknown as typeof Image
    await expect(
      result.current.preloadImages(['http://x.test/a.png', 'http://x.test/bad.png']),
    ).resolves.toBeUndefined()
    // @ts-expect-error restore
    globalThis.Image = original
  })
})
