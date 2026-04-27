import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeGesture, useLongPress } from './use-touch-gestures'

describe('useSwipeGesture hook', () => {
  const mockHandlers = {
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
    onSwipeUp: vi.fn(),
    onSwipeDown: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect swipe right gesture', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 50))

    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 200, clientY: 105 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    expect(mockHandlers.onSwipeRight).toHaveBeenCalledTimes(1)
    expect(mockHandlers.onSwipeLeft).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeUp).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeDown).not.toHaveBeenCalled()
  })

  it('should detect swipe left gesture', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 50))

    const touchStartEvent = {
      touches: [{ clientX: 200, clientY: 100 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 100, clientY: 105 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    expect(mockHandlers.onSwipeLeft).toHaveBeenCalledTimes(1)
    expect(mockHandlers.onSwipeRight).not.toHaveBeenCalled()
  })

  it('should detect swipe up gesture', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 50))

    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 105, clientY: 100 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    expect(mockHandlers.onSwipeUp).toHaveBeenCalledTimes(1)
    expect(mockHandlers.onSwipeDown).not.toHaveBeenCalled()
  })

  it('should detect swipe down gesture', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 50))

    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 105, clientY: 200 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    expect(mockHandlers.onSwipeDown).toHaveBeenCalledTimes(1)
    expect(mockHandlers.onSwipeUp).not.toHaveBeenCalled()
  })

  it('should not trigger gesture below threshold', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 50))

    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 130, clientY: 105 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    expect(mockHandlers.onSwipeRight).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeLeft).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeUp).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeDown).not.toHaveBeenCalled()
  })

  it('should respect custom threshold', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 100))

    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 170, clientY: 100 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    // 70px movement is below 100px threshold
    expect(mockHandlers.onSwipeRight).not.toHaveBeenCalled()
  })

  it('should not trigger handler if not provided', () => {
    const partialHandlers = {
      onSwipeRight: vi.fn()
    }

    const { result } = renderHook(() => useSwipeGesture(partialHandlers, 50))

    const touchStartEvent = {
      touches: [{ clientX: 200, clientY: 100 }]
    } as unknown as React.TouchEvent

    const touchEndEvent = {
      changedTouches: [{ clientX: 100, clientY: 105 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchStart(touchStartEvent)
      result.current.onTouchEnd(touchEndEvent)
    })

    // Should not throw even though onSwipeLeft is not defined
    expect(partialHandlers.onSwipeRight).not.toHaveBeenCalled()
  })

  it('should handle touchEnd without touchStart', () => {
    const { result } = renderHook(() => useSwipeGesture(mockHandlers, 50))

    const touchEndEvent = {
      changedTouches: [{ clientX: 200, clientY: 100 }]
    } as unknown as React.TouchEvent

    act(() => {
      result.current.onTouchEnd(touchEndEvent)
    })

    // Should not trigger any handlers
    expect(mockHandlers.onSwipeRight).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeLeft).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeUp).not.toHaveBeenCalled()
    expect(mockHandlers.onSwipeDown).not.toHaveBeenCalled()
  })
})

describe('useLongPress hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should trigger callback after long press', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, 500))

    expect(result.current.isPressed).toBe(false)

    act(() => {
      result.current.handlers.onMouseDown()
    })

    expect(result.current.isPressed).toBe(true)
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not trigger callback if released early', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, 500))

    act(() => {
      result.current.handlers.onMouseDown()
    })

    expect(result.current.isPressed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.handlers.onMouseUp()
    })

    expect(result.current.isPressed).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should cancel on mouse leave', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, 500))

    act(() => {
      result.current.handlers.onMouseDown()
    })

    act(() => {
      result.current.handlers.onMouseLeave()
    })

    expect(result.current.isPressed).toBe(false)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should work with touch events', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, 500))

    act(() => {
      result.current.handlers.onTouchStart()
    })

    expect(result.current.isPressed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(result.current.isPressed).toBe(false)
  })

  it('should respect custom delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, 1000))

    act(() => {
      result.current.handlers.onMouseDown()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cleanup timer on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useLongPress(callback, 500))

    act(() => {
      result.current.handlers.onMouseDown()
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should allow multiple presses', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useLongPress(callback, 500))

    // First press
    act(() => {
      result.current.handlers.onMouseDown()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.handlers.onMouseUp()
    })

    // Second press
    act(() => {
      result.current.handlers.onMouseDown()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(2)
  })
})
