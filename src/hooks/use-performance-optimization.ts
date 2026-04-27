import { useEffect, useState, useCallback } from 'react'
import { useIsMobile } from './use-mobile'

interface PerformanceSettings {
  enableAnimations: boolean
  enableBlur: boolean
  enableShadows: boolean
  enableGradients: boolean
  reducedMotion: boolean
  optimizeImages: boolean
  lazyLoadThreshold: number
}

interface DeviceCapabilities {
  cores: number
  memory: number
  connectionType: string
  batteryLevel: number | null
  isCharging: boolean
  devicePixelRatio: number
}

export function usePerformanceOptimization() {
  const isMobile = useIsMobile()
  const [settings, setSettings] = useState<PerformanceSettings>({
    enableAnimations: true,
    enableBlur: true,
    enableShadows: true,
    enableGradients: true,
    reducedMotion: false,
    optimizeImages: true,
    lazyLoadThreshold: 200
  })

  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    cores: navigator.hardwareConcurrency || 4,
    memory: (navigator as any).deviceMemory || 4,
    connectionType: (navigator as any).connection?.effectiveType || '4g',
    batteryLevel: null,
    isCharging: false,
    devicePixelRatio: window.devicePixelRatio || 1
  })

  const detectCapabilities = useCallback(async () => {
    const cores = navigator.hardwareConcurrency || 4
    const memory = (navigator as any).deviceMemory || 4
    const connection = (navigator as any).connection
    const connectionType = connection?.effectiveType || '4g'
    
    let batteryLevel = null
    let isCharging = false

    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        batteryLevel = battery.level * 100
        isCharging = battery.charging
      }
    } catch (_e) {
      // Battery API not supported, ignore
    }

    setCapabilities({
      cores,
      memory,
      connectionType,
      batteryLevel,
      isCharging,
      devicePixelRatio: window.devicePixelRatio || 1
    })

    const isLowEndDevice = cores <= 2 || memory <= 2
    const isSlowConnection = connectionType === '2g' || connectionType === 'slow-2g'
    const isLowBattery = batteryLevel !== null && batteryLevel < 20 && !isCharging

    if (isMobile && (isLowEndDevice || isSlowConnection || isLowBattery)) {
      setSettings({
        enableAnimations: !isLowEndDevice,
        enableBlur: false,
        enableShadows: !isLowEndDevice,
        enableGradients: !isLowEndDevice,
        reducedMotion: isLowEndDevice,
        optimizeImages: true,
        lazyLoadThreshold: isSlowConnection ? 400 : 200
      })
    }
  }, [isMobile])

  useEffect(() => {
    detectCapabilities()

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      setSettings(prev => ({ ...prev, reducedMotion: true, enableAnimations: false }))
    }

    const handleConnectionChange = () => {
      detectCapabilities()
    }

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange)
      return () => {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [detectCapabilities])

  const getPerformanceScore = useCallback(() => {
    const { cores, memory, connectionType } = capabilities
    let score = 100

    if (cores <= 2) score -= 30
    else if (cores <= 4) score -= 15

    if (memory <= 2) score -= 30
    else if (memory <= 4) score -= 15

    if (connectionType === '2g' || connectionType === 'slow-2g') score -= 25
    else if (connectionType === '3g') score -= 15

    return Math.max(0, score)
  }, [capabilities])

  const shouldEnableFeature = useCallback((feature: keyof PerformanceSettings): boolean => {
    return settings[feature] as boolean
  }, [settings])

  const getOptimizedImageSize = useCallback((originalWidth: number, originalHeight: number) => {
    if (!settings.optimizeImages) return { width: originalWidth, height: originalHeight }

    const maxWidth = isMobile ? 800 : 1920
    const maxHeight = isMobile ? 600 : 1080

    let width = originalWidth
    let height = originalHeight

    if (width > maxWidth) {
      height = (maxWidth / width) * height
      width = maxWidth
    }

    if (height > maxHeight) {
      width = (maxHeight / height) * width
      height = maxHeight
    }

    return { width: Math.round(width), height: Math.round(height) }
  }, [isMobile, settings.optimizeImages])

  return {
    settings,
    capabilities,
    performanceScore: getPerformanceScore(),
    shouldEnableFeature,
    getOptimizedImageSize,
    isMobile,
    isLowEndDevice: capabilities.cores <= 2 || capabilities.memory <= 2,
    isSlowConnection: capabilities.connectionType === '2g' || capabilities.connectionType === 'slow-2g',
    isLowBattery: capabilities.batteryLevel !== null && capabilities.batteryLevel < 20 && !capabilities.isCharging
  }
}
