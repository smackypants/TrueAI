import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

/**
 * `useKV` is aliased at the Vite layer but not in vitest config; mock it
 * with a thin in-memory replacement (one useState per key).
 */
vi.mock('@github/spark/hooks', () => ({
  useKV: <T,>(_key: string, initial: T) => useState<T>(initial),
}))

const { usePrefetch, useComponentPrefetch, useDataPrefetch } = await import('./use-prefetch')

describe('usePrefetch', () => {
  beforeEach(() => {
    // Pin Date.now so priority math is deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the expected API surface', () => {
    const { result } = renderHook(() => usePrefetch())
    expect(typeof result.current.trackTabAccess).toBe('function')
    expect(typeof result.current.getTopPrefetchCandidates).toBe('function')
    expect(typeof result.current.markAsPrefetched).toBe('function')
    expect(typeof result.current.isPrefetched).toBe('function')
    expect(typeof result.current.clearPrefetchCache).toBe('function')
    expect(typeof result.current.resetStats).toBe('function')
    expect(result.current.stats).toEqual({})
  })

  it('records an access count after two trackTabAccess calls', () => {
    const { result } = renderHook(() => usePrefetch())

    // First call seeds the timer; second call records elapsed time.
    act(() => {
      result.current.trackTabAccess('chat')
    })
    act(() => {
      vi.advanceTimersByTime(5_000)
      result.current.trackTabAccess('chat')
    })

    expect(result.current.stats?.chat?.accessCount).toBe(1)
    expect(result.current.stats?.chat?.avgTimeSpent).toBe(5_000)
    expect(result.current.stats?.chat?.prefetchPriority).toBeGreaterThan(0)
  })

  it('returns top candidates filtered by minAccessCount and threshold', () => {
    const { result } = renderHook(() => usePrefetch())

    // Record 3 accesses for "chat" so its priority crosses the threshold.
    act(() => result.current.trackTabAccess('chat'))
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(60_000)
        result.current.trackTabAccess('chat')
      })
    }

    const candidates = result.current.getTopPrefetchCandidates('agents')
    expect(candidates).toContain('chat')
    // Excludes the current tab.
    expect(candidates).not.toContain('agents')
  })

  it('mark/isPrefetched/clearPrefetchCache manage the in-memory set', () => {
    const { result } = renderHook(() => usePrefetch())
    expect(result.current.isPrefetched('chat')).toBe(false)
    act(() => result.current.markAsPrefetched('chat'))
    expect(result.current.isPrefetched('chat')).toBe(true)
    act(() => result.current.clearPrefetchCache())
    expect(result.current.isPrefetched('chat')).toBe(false)
  })

  it('resetStats clears stats and the prefetched cache', () => {
    const { result } = renderHook(() => usePrefetch())
    act(() => result.current.trackTabAccess('chat'))
    act(() => {
      vi.advanceTimersByTime(1000)
      result.current.trackTabAccess('chat')
    })
    act(() => result.current.markAsPrefetched('chat'))

    act(() => result.current.resetStats())
    expect(result.current.stats).toEqual({})
    expect(result.current.isPrefetched('chat')).toBe(false)
  })
})

describe('useComponentPrefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not prefetch when shouldPrefetch=false', async () => {
    const loadFn = vi.fn(async () => 'value')
    renderHook(() => useComponentPrefetch('cmp', loadFn, false))
    await vi.advanceTimersByTimeAsync(500)
    expect(loadFn).not.toHaveBeenCalled()
  })

  it('prefetches after the 100 ms delay when enabled', async () => {
    const loadFn = vi.fn(async () => 'value')
    const { result } = renderHook(() => useComponentPrefetch('cmp', loadFn, true))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(loadFn).toHaveBeenCalledTimes(1)
    expect(result.current.getCached()).toBe('value')
  })

  it('swallows loadFn errors and does not cache the result', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loadFn = vi.fn(async () => {
      throw new Error('boom')
    })
    const { result } = renderHook(() => useComponentPrefetch('cmp', loadFn, true))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(loadFn).toHaveBeenCalled()
    expect(result.current.getCached()).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })
})

describe('useDataPrefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('fetches data and caches it; subsequent fetchData hits the cache', async () => {
    const fetchFn = vi.fn(async () => ({ value: 1 }))
    const { result } = renderHook(() =>
      useDataPrefetch('k', fetchFn, { staleTime: 60_000 }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    // The auto-fetch effect runs once.
    expect(fetchFn).toHaveBeenCalledTimes(1)

    // Calling fetchData again within staleTime should not call fetchFn again.
    await act(async () => {
      await result.current.fetchData()
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('returns null from getCachedData once cacheTime has elapsed', async () => {
    const fetchFn = vi.fn(async () => ({ value: 1 }))
    const { result } = renderHook(() =>
      useDataPrefetch('k2', fetchFn, { staleTime: 1, cacheTime: 100 }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.getCachedData()).toEqual({ value: 1 })

    vi.setSystemTime(new Date('2024-01-01T00:00:01Z'))
    expect(result.current.getCachedData()).toBeNull()
  })

  it('invalidate() clears the cache', async () => {
    const fetchFn = vi.fn(async () => ({ value: 9 }))
    const { result } = renderHook(() =>
      useDataPrefetch('k3', fetchFn, { staleTime: 60_000 }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.isCached).toBe(true)
    // invalidate() is a synchronous setCache(null); assert the immediate
    // cleared state before the background re-fetch effect runs.
    act(() => {
      result.current.invalidate()
    })
    expect(result.current.isCached).toBe(false)
    // Flush the re-fetch effect that fires because cache is now null,
    // so it doesn't leak an act() warning to subsequent tests.
    await act(async () => {})
  })
})
