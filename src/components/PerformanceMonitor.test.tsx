import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PerformanceMonitor } from './PerformanceMonitor'

const mockStartFPSMonitoring = vi.fn()

vi.mock('@/lib/mobile-performance', () => ({
  usePerformanceMonitor: vi.fn(),
  useDeviceCapabilities: vi.fn(),
  MobilePerformanceOptimizer: {
    getInstance: vi.fn(() => ({ startFPSMonitoring: mockStartFPSMonitoring })),
  },
}))

import { usePerformanceMonitor, useDeviceCapabilities } from '@/lib/mobile-performance'

const baseMetrics = { fps: 60, memory: 45, renderTime: 0, interactionDelay: 0, bundleSize: 0 }
const baseCapabilities = {
  tier: 'high' as const,
  cores: 4,
  memory: 8,
  gpu: 'unknown',
  connection: '4g',
  batteryLevel: 1,
  charging: true,
  saveData: false,
}

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.mocked(usePerformanceMonitor).mockReturnValue(baseMetrics)
    vi.mocked(useDeviceCapabilities).mockReturnValue(baseCapabilities)
    mockStartFPSMonitoring.mockClear()
  })

  it('renders collapsed state with FPS button initially', () => {
    render(<PerformanceMonitor />)
    expect(screen.getByText('60 FPS')).toBeInTheDocument()
  })

  it('calls startFPSMonitoring on mount', () => {
    render(<PerformanceMonitor />)
    expect(mockStartFPSMonitoring).toHaveBeenCalled()
  })

  it('expands when FPS button is clicked', () => {
    render(<PerformanceMonitor />)
    const fpsButton = screen.getByRole('button', { name: /60 fps/i })
    fireEvent.click(fpsButton)
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument()
  })

  it('shows FPS in expanded view', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /60 fps/i }))
    expect(screen.getAllByText('60').length).toBeGreaterThan(0)
  })

  it('shows Memory percentage in expanded view', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows device tier badge in expanded view', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('shows CPU cores in expanded view', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('CPU Cores')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows connection type in expanded view', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('4g')).toBeInTheDocument()
  })

  it('collapses when close button is clicked', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('Performance Monitor')).not.toBeInTheDocument()
  })

  it('shows Data Saver warning when saveData is true', () => {
    vi.mocked(useDeviceCapabilities).mockReturnValue({ ...baseCapabilities, saveData: true })
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('Data Saver mode is active')).toBeInTheDocument()
  })

  it('does not show Data Saver warning when saveData is false', () => {
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.queryByText('Data Saver mode is active')).not.toBeInTheDocument()
  })

  it('renders MID tier badge for mid-tier device', () => {
    vi.mocked(useDeviceCapabilities).mockReturnValue({ ...baseCapabilities, tier: 'mid' })
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('MID')).toBeInTheDocument()
  })

  it('renders LOW tier badge for low-tier device', () => {
    vi.mocked(useDeviceCapabilities).mockReturnValue({ ...baseCapabilities, tier: 'low' })
    render(<PerformanceMonitor />)
    fireEvent.click(screen.getByRole('button', { name: /fps/i }))
    expect(screen.getByText('LOW')).toBeInTheDocument()
  })
})
