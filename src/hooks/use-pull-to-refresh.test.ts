import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePullToRefresh } from './use-pull-to-refresh'

interface FakeTouchTarget {
  scrollTop: number
}

/**
 * Build a synthetic React.TouchEvent. We only access `currentTarget` and
 * `touches[0].clientY` from the hook, so a partial fake is sufficient.
 */
function makeTouchEvent(target: FakeTouchTarget, clientY: number): React.TouchEvent {
  return {
    currentTarget: target as unknown as EventTarget & HTMLElement,
    touches: [{ clientY } as Touch] as unknown as React.TouchList,
  } as unknown as React.TouchEvent
}

describe('usePullToRefresh', () => {
  let onRefresh: () => Promise<void>

  beforeEach(() => {
    onRefresh = vi.fn(async () => {})
  })

  it('starts pulling only when scrollTop is 0 at touchstart', async () => {
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }))
    const target: FakeTouchTarget = { scrollTop: 50 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 100))
      result.current.handlers.onTouchMove(makeTouchEvent(target, 300))
    })
    expect(result.current.pullDistance).toBe(0)
    expect(result.current.shouldShowIndicator).toBe(false)
  })

  it('updates pullDistance as the user drags down (resistance applied)', () => {
    const onRefreshLocal = vi.fn(async () => {})
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: onRefreshLocal, threshold: 80, resistance: 2 }))
    const target: FakeTouchTarget = { scrollTop: 0 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 100))
    })
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 200)) // delta 100, /2 = 50
    })
    expect(result.current.pullDistance).toBe(50)
    expect(result.current.shouldShowIndicator).toBe(true)
    expect(result.current.progress).toBe((50 / 80) * 100)
  })

  it('caps pullDistance at threshold * 1.5', () => {
    const onRefreshLocal = vi.fn(async () => {})
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: onRefreshLocal, threshold: 80, resistance: 1 }))
    const target: FakeTouchTarget = { scrollTop: 0 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 0))
    })
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 1000))
    })
    expect(result.current.pullDistance).toBe(120) // 80 * 1.5
    expect(result.current.progress).toBe(100) // capped
  })

  it('cancels pulling and resets distance when the element scrolls away from the top', () => {
    const onRefreshLocal = vi.fn(async () => {})
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: onRefreshLocal, threshold: 80, resistance: 1 }))
    const target: FakeTouchTarget = { scrollTop: 0 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 0))
    })
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 50))
    })
    expect(result.current.pullDistance).toBe(50)
    // user scrolls — scrollTop goes positive, hook should bail and reset
    target.scrollTop = 10
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 60))
    })
    expect(result.current.pullDistance).toBe(0)
  })

  it('triggers onRefresh and toggles isRefreshing when threshold is met on touchend', async () => {
    let resolveRefresh: () => void = () => {}
    const refreshPromise = new Promise<void>(r => {
      resolveRefresh = r
    })
    const onRefreshLocal = vi.fn(() => refreshPromise)

    const { result } = renderHook(() => usePullToRefresh({ onRefresh: onRefreshLocal, threshold: 80, resistance: 1 }))
    const target: FakeTouchTarget = { scrollTop: 0 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 0))
    })
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 100))
    })
    expect(result.current.pullDistance).toBe(100)

    let endPromise: Promise<void> | undefined
    act(() => {
      endPromise = result.current.handlers.onTouchEnd()
    })
    await waitFor(() => expect(result.current.isRefreshing).toBe(true))
    expect(onRefreshLocal).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveRefresh()
      await endPromise
    })
    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.pullDistance).toBe(0)
  })

  it('snaps back to 0 without invoking onRefresh when below threshold', async () => {
    const onRefreshLocal = vi.fn(async () => {})
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: onRefreshLocal, threshold: 80, resistance: 1 }))
    const target: FakeTouchTarget = { scrollTop: 0 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 0))
    })
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 30))
    })
    expect(result.current.pullDistance).toBe(30)
    await act(async () => {
      await result.current.handlers.onTouchEnd()
    })
    expect(result.current.pullDistance).toBe(0)
    expect(result.current.isRefreshing).toBe(false)
    expect(onRefreshLocal).not.toHaveBeenCalled()
  })

  it('still resets isRefreshing when onRefresh rejects', async () => {
    const onRefreshLocal = vi.fn(async () => {
      throw new Error('refresh failed')
    })
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: onRefreshLocal, threshold: 80, resistance: 1 }))
    const target: FakeTouchTarget = { scrollTop: 0 }
    act(() => {
      result.current.handlers.onTouchStart(makeTouchEvent(target, 0))
    })
    act(() => {
      result.current.handlers.onTouchMove(makeTouchEvent(target, 200))
    })
    await act(async () => {
      await expect(result.current.handlers.onTouchEnd()).rejects.toThrow('refresh failed')
    })
    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.pullDistance).toBe(0)
  })
})
