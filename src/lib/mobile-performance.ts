import { useEffect, useRef, useCallback, useState } from 'react'

export interface PerformanceMetrics {
  fps: number
  memory: number
  renderTime: number
  interactionDelay: number
  bundleSize: number
}

export interface DeviceCapabilities {
  tier: 'low' | 'mid' | 'high'
  cores: number
  memory: number
  gpu: string
  connection: string
  saveData: boolean
  batteryLevel: number
  charging: boolean
}

export class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer
  private frameCount = 0
  private lastFrameTime = performance.now()
  private fps = 60
  private deviceTier: DeviceCapabilities['tier'] = 'mid'
  private listeners: Set<(metrics: PerformanceMetrics) => void> = new Set()

  static getInstance(): MobilePerformanceOptimizer {
    if (!this.instance) {
      this.instance = new MobilePerformanceOptimizer()
    }
    return this.instance
  }

  async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    const cores = navigator.hardwareConcurrency || 4
    const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4
    
    let batteryLevel = 1
    let charging = true
    
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery?.()
        if (battery) {
          batteryLevel = battery.level
          charging = battery.charging
        }
      } catch (_e) {
        console.warn('Battery API not available')
      }
    }

    const connection = (navigator as { connection?: { effectiveType?: string; saveData?: boolean } }).connection || (navigator as { mozConnection?: { effectiveType?: string; saveData?: boolean } }).mozConnection || (navigator as { webkitConnection?: { effectiveType?: string; saveData?: boolean } }).webkitConnection
    const effectiveType = connection?.effectiveType || '4g'
    const saveData = connection?.saveData || false

    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    const debugInfo = gl ? (gl as WebGLRenderingContext & { getExtension(name: string): { UNMASKED_RENDERER_WEBGL: number } | null }).getExtension('WEBGL_debug_renderer_info') : null
    const gpu = debugInfo && gl ? (gl as WebGLRenderingContext & { getParameter(pname: number): string }).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown'

    let tier: DeviceCapabilities['tier'] = 'mid'
    
    const score = cores * 10 + memory * 5
    
    if (score < 30 || memory < 2 || effectiveType === 'slow-2g' || effectiveType === '2g') {
      tier = 'low'
    } else if (score > 60 && memory >= 6) {
      tier = 'high'
    }

    this.deviceTier = tier

    return {
      tier,
      cores,
      memory,
      gpu,
      connection: effectiveType,
      saveData,
      batteryLevel,
      charging
    }
  }

  getOptimizedSettings(capabilities: DeviceCapabilities) {
    const baseSettings = {
      enableAnimations: true,
      animationDuration: 300,
      enableBlur: true,
      enableShadows: true,
      maxConcurrentRequests: 6,
      preloadImages: true,
      lazyLoadThreshold: 500,
      debounceDelay: 150,
      throttleDelay: 100,
      virtualScrollEnabled: true,
      cacheSize: 100
    }

    if (capabilities.tier === 'low') {
      return {
        ...baseSettings,
        enableAnimations: false,
        animationDuration: 150,
        enableBlur: false,
        enableShadows: false,
        maxConcurrentRequests: 2,
        preloadImages: false,
        lazyLoadThreshold: 200,
        debounceDelay: 300,
        throttleDelay: 200,
        cacheSize: 50
      }
    }

    if (capabilities.tier === 'high') {
      return {
        ...baseSettings,
        animationDuration: 400,
        maxConcurrentRequests: 10,
        lazyLoadThreshold: 1000,
        debounceDelay: 100,
        throttleDelay: 50,
        cacheSize: 200
      }
    }

    return baseSettings
  }

  startFPSMonitoring() {
    const measureFPS = () => {
      this.frameCount++
      const now = performance.now()
      const elapsed = now - this.lastFrameTime

      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed)
        this.frameCount = 0
        this.lastFrameTime = now

        this.notifyListeners()
      }

      requestAnimationFrame(measureFPS)
    }

    requestAnimationFrame(measureFPS)
  }

  getFPS(): number {
    return this.fps
  }

  getDeviceTier(): DeviceCapabilities['tier'] {
    return this.deviceTier
  }

  getMemoryUsage(): number {
    if ((performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    }
    return 0
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners() {
    const metrics: PerformanceMetrics = {
      fps: this.fps,
      memory: this.getMemoryUsage(),
      renderTime: 0,
      interactionDelay: 0,
      bundleSize: 0
    }
    
    this.listeners.forEach(listener => listener(metrics))
  }
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    renderTime: 0,
    interactionDelay: 0,
    bundleSize: 0
  })

  useEffect(() => {
    const optimizer = MobilePerformanceOptimizer.getInstance()
    const unsubscribe = optimizer.subscribe(setMetrics)
    return () => {
      unsubscribe()
    }
  }, [])

  return metrics
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)

  useEffect(() => {
    const optimizer = MobilePerformanceOptimizer.getInstance()
    optimizer.detectDeviceCapabilities().then(setCapabilities)
  }, [])

  return capabilities
}

export function useOptimizedAnimation(enabled: boolean = true) {
  const [shouldAnimate, setShouldAnimate] = useState(enabled)
  
  useEffect(() => {
    const optimizer = MobilePerformanceOptimizer.getInstance()
    const tier = optimizer.getDeviceTier()
    setShouldAnimate(enabled && tier !== 'low')
  }, [enabled])

  return shouldAnimate
}

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 100
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRun.current >= delay) {
        lastRun.current = now
        return callback(...args)
      }
    },
    [callback, delay]
  ) as T
}

export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 150
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  ) as T
}

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementRef, options.threshold, options.rootMargin])

  return isIntersecting
}

export function prefetchImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

export function optimizeForLowEnd(): boolean {
  const optimizer = MobilePerformanceOptimizer.getInstance()
  return optimizer.getDeviceTier() === 'low'
}

export function shouldReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || optimizeForLowEnd()
}

export async function measureComponentRenderTime(
  componentName: string,
  renderFn: () => void
): Promise<number> {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  const duration = end - start

  if (duration > 16) {
    console.warn(`Component ${componentName} took ${duration.toFixed(2)}ms to render (target: 16ms)`)
  }

  return duration
}

export function batchUpdates<T>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => void,
  delay: number = 0
) {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  batches.forEach((batch, index) => {
    setTimeout(() => processFn(batch), index * delay)
  })
}

export class ImageCache {
  private static cache = new Map<string, string>()
  private static maxSize = 50

  static set(key: string, value: string) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  static get(key: string): string | undefined {
    return this.cache.get(key)
  }

  static has(key: string): boolean {
    return this.cache.has(key)
  }

  static clear() {
    this.cache.clear()
  }
}
