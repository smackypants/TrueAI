import { useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  renderTime: number
  componentName: string
  timestamp: number
}

export function usePerformanceMonitor(componentName: string, enabled = false) {
  const renderStartTime = useRef<number>(0)
  const metricsRef = useRef<PerformanceMetrics[]>([])

  useEffect(() => {
    if (!enabled) return

    renderStartTime.current = performance.now()

    return () => {
      const renderTime = performance.now() - renderStartTime.current

      if (renderTime > 16) {
        const metric: PerformanceMetrics = {
          renderTime,
          componentName,
          timestamp: Date.now()
        }
        metricsRef.current.push(metric)

        if (renderTime > 50) {
          console.warn(
            `[Performance] Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
          )
        }
      }
    }
  })

  const getMetrics = useCallback(() => {
    return [...metricsRef.current]
  }, [])

  const clearMetrics = useCallback(() => {
    metricsRef.current = []
  }, [])

  const getAverageRenderTime = useCallback(() => {
    if (metricsRef.current.length === 0) return 0
    const total = metricsRef.current.reduce((sum, m) => sum + m.renderTime, 0)
    return total / metricsRef.current.length
  }, [])

  return {
    getMetrics,
    clearMetrics,
    getAverageRenderTime
  }
}
