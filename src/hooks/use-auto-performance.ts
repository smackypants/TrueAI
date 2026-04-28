import { useEffect, useState } from 'react'
import { MobilePerformanceOptimizer, DeviceCapabilities } from '@/lib/mobile-performance'

interface PerformanceSettings {
  enableAnimations: boolean
  animationDuration: number
  enableBlur: boolean
  enableShadows: boolean
  maxConcurrentRequests: number
  preloadImages: boolean
  lazyLoadThreshold: number
  debounceDelay: number
  throttleDelay: number
  virtualScrollEnabled: boolean
  cacheSize: number
}

export function useAutoPerformanceOptimization() {
  const [settings, setSettings] = useState<PerformanceSettings | null>(null)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [isOptimized, setIsOptimized] = useState(false)

  useEffect(() => {
    const optimizer = MobilePerformanceOptimizer.getInstance()

    const initialize = async () => {
      const caps = await optimizer.detectDeviceCapabilities()
      setCapabilities(caps)

      const optimizedSettings = optimizer.getOptimizedSettings(caps)
      setSettings(optimizedSettings)
      setIsOptimized(true)

      if (caps.tier === 'low') {
        document.body.classList.add('low-end-device')
      }

      if (caps.saveData) {
        document.body.classList.add('save-data-mode')
      }
    }

    initialize()

    return () => {
      document.body.classList.remove('low-end-device')
      document.body.classList.remove('save-data-mode')
    }
  }, [])

  return {
    settings,
    capabilities,
    isOptimized,
    isLowEnd: capabilities?.tier === 'low',
    isMidTier: capabilities?.tier === 'mid',
    isHighEnd: capabilities?.tier === 'high',
    shouldReduceMotion: !!(capabilities?.tier === 'low' || capabilities?.saveData)
  }
}
