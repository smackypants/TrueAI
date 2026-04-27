import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAutoPerformanceOptimization } from './use-auto-performance'
import { MobilePerformanceOptimizer, DeviceCapabilities } from '@/lib/mobile-performance'

vi.mock('@/lib/mobile-performance', () => {
  const mockDetectDeviceCapabilities = vi.fn()
  const mockGetOptimizedSettings = vi.fn()

  return {
    MobilePerformanceOptimizer: {
      getInstance: vi.fn(() => ({
        detectDeviceCapabilities: mockDetectDeviceCapabilities,
        getOptimizedSettings: mockGetOptimizedSettings,
      })),
    },
    DeviceCapabilities: {},
  }
})

describe('useAutoPerformanceOptimization hook', () => {
  let mockOptimizerInstance: {
    detectDeviceCapabilities: ReturnType<typeof vi.fn>
    getOptimizedSettings: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockOptimizerInstance = {
      detectDeviceCapabilities: vi.fn(),
      getOptimizedSettings: vi.fn(),
    }

    vi.mocked(MobilePerformanceOptimizer.getInstance).mockReturnValue(
      mockOptimizerInstance as unknown as ReturnType<typeof MobilePerformanceOptimizer.getInstance>
    )

    document.body.className = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.body.className = ''
  })

  it('should initialize with null values', () => {
    mockOptimizerInstance.detectDeviceCapabilities.mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useAutoPerformanceOptimization())

    expect(result.current.settings).toBeNull()
    expect(result.current.capabilities).toBeNull()
    expect(result.current.isOptimized).toBe(false)
  })

  it('should detect high-end device capabilities', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'high',
      cores: 8,
      memory: 8,
      gpu: 'High-end GPU',
      connection: '4g',
      saveData: false,
      batteryLevel: 0.9,
      charging: true,
    }

    const mockSettings = {
      enableAnimations: true,
      animationDuration: 400,
      enableBlur: true,
      enableShadows: true,
      maxConcurrentRequests: 10,
      preloadImages: true,
      lazyLoadThreshold: 1000,
      debounceDelay: 100,
      throttleDelay: 50,
      virtualScrollEnabled: true,
      cacheSize: 200,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue(mockSettings)

    const { result } = renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(result.current.isOptimized).toBe(true)
    })

    expect(result.current.capabilities).toEqual(mockCapabilities)
    expect(result.current.settings).toEqual(mockSettings)
    expect(result.current.isHighEnd).toBe(true)
    expect(result.current.isMidTier).toBe(false)
    expect(result.current.isLowEnd).toBe(false)
    expect(result.current.shouldReduceMotion).toBe(false)
  })

  it('should detect low-end device capabilities', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'low',
      cores: 2,
      memory: 1,
      gpu: 'Basic GPU',
      connection: '3g',
      saveData: false,
      batteryLevel: 0.3,
      charging: false,
    }

    const mockSettings = {
      enableAnimations: false,
      animationDuration: 150,
      enableBlur: false,
      enableShadows: false,
      maxConcurrentRequests: 2,
      preloadImages: false,
      lazyLoadThreshold: 200,
      debounceDelay: 300,
      throttleDelay: 200,
      virtualScrollEnabled: true,
      cacheSize: 50,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue(mockSettings)

    const { result } = renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(result.current.isOptimized).toBe(true)
    })

    expect(result.current.capabilities).toEqual(mockCapabilities)
    expect(result.current.settings).toEqual(mockSettings)
    expect(result.current.isLowEnd).toBe(true)
    expect(result.current.isMidTier).toBe(false)
    expect(result.current.isHighEnd).toBe(false)
    expect(result.current.shouldReduceMotion).toBe(true)
  })

  it('should detect mid-tier device capabilities', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'mid',
      cores: 4,
      memory: 4,
      gpu: 'Mid-range GPU',
      connection: '4g',
      saveData: false,
      batteryLevel: 0.7,
      charging: true,
    }

    const mockSettings = {
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
      cacheSize: 100,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue(mockSettings)

    const { result } = renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(result.current.isOptimized).toBe(true)
    })

    expect(result.current.isMidTier).toBe(true)
    expect(result.current.isLowEnd).toBe(false)
    expect(result.current.isHighEnd).toBe(false)
    expect(result.current.shouldReduceMotion).toBe(false)
  })

  it('should add low-end-device class for low-end devices', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'low',
      cores: 2,
      memory: 1,
      gpu: 'Basic GPU',
      connection: '3g',
      saveData: false,
      batteryLevel: 0.3,
      charging: false,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue({
      enableAnimations: false,
      animationDuration: 150,
      enableBlur: false,
      enableShadows: false,
      maxConcurrentRequests: 2,
      preloadImages: false,
      lazyLoadThreshold: 200,
      debounceDelay: 300,
      throttleDelay: 200,
      virtualScrollEnabled: true,
      cacheSize: 50,
    })

    renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(document.body.classList.contains('low-end-device')).toBe(true)
    })
  })

  it('should add save-data-mode class when saveData is enabled', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'mid',
      cores: 4,
      memory: 4,
      gpu: 'Mid-range GPU',
      connection: '4g',
      saveData: true,
      batteryLevel: 0.7,
      charging: true,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue({
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
      cacheSize: 100,
    })

    const { result } = renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(document.body.classList.contains('save-data-mode')).toBe(true)
    })

    expect(result.current.shouldReduceMotion).toBe(true)
  })

  it('should call optimizer getInstance only once', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'mid',
      cores: 4,
      memory: 4,
      gpu: 'Mid-range GPU',
      connection: '4g',
      saveData: false,
      batteryLevel: 0.7,
      charging: true,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue({
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
      cacheSize: 100,
    })

    renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(mockOptimizerInstance.detectDeviceCapabilities).toHaveBeenCalledTimes(1)
    })

    expect(MobilePerformanceOptimizer.getInstance).toHaveBeenCalledTimes(1)
  })

  it('should have consistent boolean flags', async () => {
    const mockCapabilities: DeviceCapabilities = {
      tier: 'high',
      cores: 8,
      memory: 8,
      gpu: 'High-end GPU',
      connection: '4g',
      saveData: false,
      batteryLevel: 0.9,
      charging: true,
    }

    mockOptimizerInstance.detectDeviceCapabilities.mockResolvedValue(mockCapabilities)
    mockOptimizerInstance.getOptimizedSettings.mockReturnValue({
      enableAnimations: true,
      animationDuration: 400,
      enableBlur: true,
      enableShadows: true,
      maxConcurrentRequests: 10,
      preloadImages: true,
      lazyLoadThreshold: 1000,
      debounceDelay: 100,
      throttleDelay: 50,
      virtualScrollEnabled: true,
      cacheSize: 200,
    })

    const { result } = renderHook(() => useAutoPerformanceOptimization())

    await waitFor(() => {
      expect(result.current.isOptimized).toBe(true)
    })

    // Only one tier should be true
    const tierFlags = [result.current.isLowEnd, result.current.isMidTier, result.current.isHighEnd]
    expect(tierFlags.filter(Boolean).length).toBe(1)
  })
})
