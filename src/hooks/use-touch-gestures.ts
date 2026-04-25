import { useEffect, useRef, useState } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useSwipeGesture(handlers: SwipeHandlers, threshold = 50) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.current) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }

    const deltaX = touchEnd.x - touchStartRef.current.x
    const deltaY = touchEnd.y - touchStartRef.current.y

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
      }
    }

    touchStartRef.current = null
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  }
}

export function useLongPress(callback: () => void, delay = 500) {
  const [isPressed, setIsPressed] = useState(false)
  const timerRef = useRef<number | null>(null)

  const start = () => {
    setIsPressed(true)
    timerRef.current = window.setTimeout(() => {
      callback()
    }, delay)
  }

  const cancel = () => {
    setIsPressed(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    isPressed,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel
    }
  }
}
