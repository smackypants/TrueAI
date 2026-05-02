import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import { kvStore, __resetKvStoreForTests } from '@/lib/llm-runtime/kv-store'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

// Stub the BenchmarkComparison child so the parent's branch is what we test.
vi.mock('./BenchmarkComparison', () => ({
  BenchmarkComparison: ({ comparison }: { comparison: unknown }) => (
    <div data-testid="benchmark-comparison">{JSON.stringify(comparison)}</div>
  ),
}))

const mocks = vi.hoisted(() => ({
  scanHardware: vi.fn(),
  generateOptimizedSettings: vi.fn(),
  formatHardwareInfo: vi.fn(),
  runBenchmark: vi.fn(),
  compareBenchmarks: vi.fn(),
}))

vi.mock('@/lib/hardware-scanner', () => ({
  scanHardware: mocks.scanHardware,
  generateOptimizedSettings: mocks.generateOptimizedSettings,
  formatHardwareInfo: mocks.formatHardwareInfo,
}))

vi.mock('@/lib/benchmark', () => ({
  runBenchmark: mocks.runBenchmark,
  compareBenchmarks: mocks.compareBenchmarks,
}))

import { HardwareOptimizer } from './HardwareOptimizer'

const SPECS = {
  hardwareConcurrency: 8,
  maxTouchPoints: 0,
  platform: 'Linux x86_64',
  userAgent: 'jsdom',
  screen: { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
  performanceScore: 250,
  tier: 'high' as const,
  deviceMemory: 16,
}

const SETTINGS = {
  maxTokens: 4096,
  streamingChunkSize: 100,
  enableAnimations: true,
  enableBackgroundEffects: true,
  conversationHistoryLimit: 100,
  maxConcurrentAgents: 4,
  cacheSize: 200,
  imageQuality: 'high' as const,
  tier: 'high' as const,
  recommendations: ['Enable hardware acceleration', 'Use streaming responses'],
}

const COMPARISON = {
  before: { id: 'b', label: 'Default', metrics: { renderTime: 100, interactionLatency: 50, memoryUsage: 200, fps: 60, scrollPerformance: 90, tokenProcessingSpeed: 1000 } },
  after: { id: 'a', label: 'Optimized', metrics: { renderTime: 60, interactionLatency: 30, memoryUsage: 150, fps: 60, scrollPerformance: 95, tokenProcessingSpeed: 1500 } },
  improvements: { renderTime: 40, interactionLatency: 40, memoryUsage: 25, fps: 0, scrollPerformance: 5, tokenProcessingSpeed: 50, overallScore: 25 },
}

beforeEach(async () => {
  vi.clearAllMocks()
  __resetKvStoreForTests()
  // Reset persisted KV state across tests so each test starts with a clean slate.
  await kvStore.delete('hardware-specs')
  await kvStore.delete('optimized-settings')
  await kvStore.delete('auto-optimize')
  await kvStore.delete('benchmark-comparison')
  // Default mock implementations: resolve with our fixtures.
  mocks.scanHardware.mockResolvedValue(SPECS)
  mocks.generateOptimizedSettings.mockReturnValue(SETTINGS)
  mocks.formatHardwareInfo.mockReturnValue('**CPU**\n8 cores\n**RAM**\n16 GB')
  mocks.runBenchmark.mockResolvedValue({ id: 'r', label: 'L', metrics: { renderTime: 0, interactionLatency: 0, memoryUsage: 0, fps: 0, scrollPerformance: 0, tokenProcessingSpeed: 0 } })
  mocks.compareBenchmarks.mockReturnValue(COMPARISON)
})

afterEach(() => {
  vi.useRealTimers()
})

async function renderAndWaitForScan(props: Parameters<typeof HardwareOptimizer>[0] = {}) {
  await act(async () => {
    render(<HardwareOptimizer {...props} />)
  })
  // performScan does `await new Promise(r => setTimeout(r, 800))` before scanHardware,
  // and waitFor itself flushes pending state updates after the assertion passes.
  await waitFor(() => expect(mocks.scanHardware).toHaveBeenCalled(), { timeout: 2000 })
}

describe('HardwareOptimizer', () => {
  it('renders empty state and Scan Device button when no scan has run', async () => {
    // Disable auto-scan: pre-set `auto-optimize` to false so the mount effect
    // skips performScan. We need to also seed hardware-specs as null (default).
    await kvStore.set('auto-optimize', false)
    render(<HardwareOptimizer />)
    expect(screen.getByText('Hardware Optimization')).toBeInTheDocument()
    expect(screen.getByText('No hardware scan performed')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /scan device/i })
    ).toBeInTheDocument()
  })

  it('auto-scans on mount and renders results, recommendations, and apply settings', async () => {
    const onSettingsApplied = vi.fn()
    await renderAndWaitForScan({ onSettingsApplied })
    // Scan completed → results render
    expect(mocks.scanHardware).toHaveBeenCalled()
    expect(mocks.generateOptimizedSettings).toHaveBeenCalledWith(SPECS)
    expect(toast.info).toHaveBeenCalledWith('Scanning device hardware...')
    expect(toast.success).toHaveBeenCalledWith('Hardware scan complete - HIGH tier detected')
    // Auto-optimize is true by default, so onSettingsApplied was called from the scan.
    expect(onSettingsApplied).toHaveBeenCalledWith(SETTINGS)
    // Cards render the metrics
    expect(screen.getAllByText('high').length).toBeGreaterThan(0)
    expect(screen.getByText('250')).toBeInTheDocument() // performance score
    expect(screen.getByText('8')).toBeInTheDocument() // cpu cores
    expect(screen.getByText('16 GB')).toBeInTheDocument()
    // Optimized settings card
    expect(screen.getByText('4096')).toBeInTheDocument() // maxTokens
    expect(screen.getAllByText('100').length).toBeGreaterThan(0) // chunk size + history both 100
    // "Enabled" appears for Animations
    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0)
    // Recommendations card
    expect(screen.getByText('Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Enable hardware acceleration')).toBeInTheDocument()

    // Apply Settings button → calls onSettingsApplied again with success toast
    onSettingsApplied.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /apply settings/i }))
    expect(onSettingsApplied).toHaveBeenCalledWith(SETTINGS)
    expect(toast.success).toHaveBeenCalledWith('Optimized settings applied')
  })

  it('toggles auto-optimize switch and Show/Hide Details', async () => {
    await renderAndWaitForScan()
    // Toggle Show Details
    const showBtn = screen.getByRole('button', { name: /show details/i })
    await act(async () => { fireEvent.click(showBtn) })
    // Renders the formatted hardware info (lines from formatHardwareInfo)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('8 cores')).toBeInTheDocument()
    // Now button reads Hide
    const hideBtn = screen.getByRole('button', { name: /hide details/i })
    await act(async () => { fireEvent.click(hideBtn) })
    // Toggle auto-optimize switch off
    const sw = screen.getByRole('switch', { name: /auto-optimize on startup/i })
    await act(async () => { fireEvent.click(sw) })
    expect(sw).not.toBeChecked()
  })

  it('handles scan error: toasts error and stays in empty state', async () => {
    mocks.scanHardware.mockRejectedValueOnce(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => { render(<HardwareOptimizer />) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to scan hardware'))
    expect(screen.getByText('No hardware scan performed')).toBeInTheDocument()
    errSpy.mockRestore()
  })

  it('Run Benchmark: calls runBenchmark twice, compareBenchmarks, and renders comparison', async () => {
    await renderAndWaitForScan()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run benchmark/i }))
    })
    // The handler runs two `await runBenchmark(...)` calls separated by an
    // intentional `await new Promise(r => setTimeout(r, 500))`. waitFor polls
    // until the second call has fired (and compareBenchmarks has been
    // invoked), so we don't need to hard-code that 500ms delay here.
    await waitFor(() => expect(mocks.runBenchmark).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.compareBenchmarks).toHaveBeenCalled())
    expect(screen.getByTestId('benchmark-comparison')).toBeInTheDocument()
    // overallScore=25 → > 10 → success message includes "25%"
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('25% overall improvement'))
  })

  it('Run Benchmark with minor improvement (<=10) toasts the minor message', async () => {
    mocks.compareBenchmarks.mockReturnValueOnce({ ...COMPARISON, improvements: { ...COMPARISON.improvements, overallScore: 5 } })
    await renderAndWaitForScan()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run benchmark/i }))
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Minor 5% improvement')),
    )
  })

  it('Run Benchmark with zero improvement toasts "already optimal"', async () => {
    mocks.compareBenchmarks.mockReturnValueOnce({ ...COMPARISON, improvements: { ...COMPARISON.improvements, overallScore: 0 } })
    await renderAndWaitForScan()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run benchmark/i }))
    })
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Benchmark complete! Settings are already optimal'),
    )
  })

  it('Run Benchmark error path: toasts error', async () => {
    await renderAndWaitForScan()
    mocks.runBenchmark.mockRejectedValueOnce(new Error('bench fail'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run benchmark/i }))
    })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Benchmark failed'))
    errSpy.mockRestore()
  })

  it('renders the low tier branch via tier badge', async () => {
    mocks.scanHardware.mockResolvedValueOnce({ ...SPECS, tier: 'low' as const })
    await renderAndWaitForScan()
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('renders the medium tier branch via tier badge', async () => {
    mocks.scanHardware.mockResolvedValueOnce({ ...SPECS, tier: 'medium' as const })
    await renderAndWaitForScan()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('renders the ultra tier branch via tier badge', async () => {
    mocks.scanHardware.mockResolvedValueOnce({ ...SPECS, tier: 'ultra' as const })
    await renderAndWaitForScan()
    expect(screen.getByText('ultra')).toBeInTheDocument()
  })
})
