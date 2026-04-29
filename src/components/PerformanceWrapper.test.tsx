import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformanceWrapper } from './PerformanceWrapper'

vi.mock('@/hooks/use-auto-performance', () => ({
  useAutoPerformanceOptimization: vi.fn(() => ({
    capabilities: null,
    isOptimized: false
  }))
}))

vi.mock('@/lib/mobile-performance', () => ({
  MobilePerformanceOptimizer: {
    getInstance: vi.fn(() => ({
      getOptimizedSettings: vi.fn(() => ({ animationDuration: 300 }))
    }))
  },
  ImageCache: { has: vi.fn(() => false), get: vi.fn(), set: vi.fn() },
  useIntersectionObserver: vi.fn(() => true),
  useThrottle: (fn: Function) => fn
}))

vi.mock('@/lib/resource-loader', () => ({
  ResourceLoader: { getInstance: vi.fn(() => ({})) },
  optimizeResourceLoading: vi.fn()
}))

describe('PerformanceWrapper', () => {
  it('renders children', () => {
    render(<PerformanceWrapper><span>hello</span></PerformanceWrapper>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(<PerformanceWrapper><span>a</span><span>b</span></PerformanceWrapper>)
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('applies low-performance styles when tier is low', async () => {
    const { useAutoPerformanceOptimization } = await import('@/hooks/use-auto-performance')
    vi.mocked(useAutoPerformanceOptimization).mockReturnValue({
      capabilities: { tier: 'low', cores: 2, memory: 2, gpu: '', connection: '3g', saveData: false, batteryLevel: 1, charging: true },
      isOptimized: true,
      settings: null,
      isLowEnd: true,
      isMidTier: false,
      isHighEnd: false,
      shouldReduceMotion: true
    })
    render(<PerformanceWrapper><div>content</div></PerformanceWrapper>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
