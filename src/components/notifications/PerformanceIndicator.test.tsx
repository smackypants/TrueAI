import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformanceIndicator } from './PerformanceIndicator'

vi.mock('@/hooks/use-performance-optimization', () => ({
  usePerformanceOptimization: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { usePerformanceOptimization } from '@/hooks/use-performance-optimization'
import React from 'react'

const baseCapabilities = {
  cores: 4,
  memory: 8192,
  connectionType: '4g',
  batteryLevel: null as number | null,
  isCharging: false,
  devicePixelRatio: 1,
}

function setupMock(overrides: Partial<ReturnType<typeof usePerformanceOptimization>>) {
  vi.mocked(usePerformanceOptimization).mockReturnValue({
    performanceScore: 80,
    capabilities: baseCapabilities,
    isLowEndDevice: false,
    isSlowConnection: false,
    isLowBattery: false,
    tier: 'high',
    getOptimizedSettings: vi.fn(() => ({ animationDuration: 300 })),
    ...overrides,
  } as ReturnType<typeof usePerformanceOptimization>)
}

describe('PerformanceIndicator', () => {
  it('renders Performance heading', () => {
    setupMock({})
    render(<PerformanceIndicator />)
    expect(screen.getByText('Performance')).toBeInTheDocument()
  })

  it('renders Excellent label for score >= 80', () => {
    setupMock({ performanceScore: 85 })
    render(<PerformanceIndicator />)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  it('renders Good label for score in 60-79 range', () => {
    setupMock({ performanceScore: 65 })
    render(<PerformanceIndicator />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  it('renders Limited label for score below 60', () => {
    setupMock({ performanceScore: 45 })
    render(<PerformanceIndicator />)
    expect(screen.getByText('Limited')).toBeInTheDocument()
  })

  it('renders score as percentage', () => {
    setupMock({ performanceScore: 72 })
    render(<PerformanceIndicator />)
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('renders CPU section with core count', () => {
    setupMock({ capabilities: { ...baseCapabilities, cores: 8 } })
    render(<PerformanceIndicator />)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('8 cores')).toBeInTheDocument()
  })

  it('renders Network section with connection type', () => {
    setupMock({ capabilities: { ...baseCapabilities, connectionType: 'wifi' } })
    render(<PerformanceIndicator />)
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('wifi')).toBeInTheDocument()
  })

  it('does not render Battery section when batteryLevel is null', () => {
    setupMock({ capabilities: { ...baseCapabilities, batteryLevel: null } })
    render(<PerformanceIndicator />)
    expect(screen.queryByText('Battery')).not.toBeInTheDocument()
  })

  it('renders Battery section when batteryLevel is available', () => {
    setupMock({ capabilities: { ...baseCapabilities, batteryLevel: 75 } })
    render(<PerformanceIndicator />)
    expect(screen.getByText('Battery')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows warning notice when isLowEndDevice is true', () => {
    setupMock({ isLowEndDevice: true, performanceScore: 40 })
    render(<PerformanceIndicator />)
    expect(screen.getByText(/performance features reduced/i)).toBeInTheDocument()
  })

  it('shows slow connection warning when isSlowConnection is true', () => {
    setupMock({ isSlowConnection: true, performanceScore: 60 })
    render(<PerformanceIndicator />)
    expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument()
  })

  it('shows low battery warning when isLowBattery is true', () => {
    setupMock({ isLowBattery: true, performanceScore: 60 })
    render(<PerformanceIndicator />)
    expect(screen.getByText(/low battery mode active/i)).toBeInTheDocument()
  })

  it('does not show warning notice when all conditions are normal', () => {
    setupMock({ isLowEndDevice: false, isSlowConnection: false, isLowBattery: false })
    render(<PerformanceIndicator />)
    expect(screen.queryByText(/performance features reduced/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/slow connection detected/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/low battery mode active/i)).not.toBeInTheDocument()
  })
})
