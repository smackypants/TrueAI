import { useState, useRef, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollElement = useRef<HTMLElement | null>(null)
  const isPulling = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    scrollElement.current = target
    
    if (target.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return
    
    const target = e.currentTarget as HTMLElement
    
    if (target.scrollTop > 0) {
      isPulling.current = false
      setPullDistance(0)
      return
    }

    const currentY = e.touches[0].clientY
    const distance = (currentY - startY.current) / resistance

    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5))
    }
  }, [isRefreshing, threshold, resistance])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) return

    isPulling.current = false

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh, isRefreshing])

  const shouldShowIndicator = pullDistance > 10 || isRefreshing
  const progress = Math.min((pullDistance / threshold) * 100, 100)

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    isRefreshing,
    pullDistance,
    shouldShowIndicator,
    progress
  }
}
