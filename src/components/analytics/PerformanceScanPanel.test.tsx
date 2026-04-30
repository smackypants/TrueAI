/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

// Build a default empty scan result. Individual tests override fields via
// mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce().
const makeEmptyScanResult = () => ({
  id: 'scan-1',
  timestamp: Date.now(),
  insights: [],
  optimizations: [],
  bottlenecks: [],
  modelEfficiency: [],
  hardwareSpecs: {
    tier: 'medium',
    hardwareConcurrency: 4,
    maxTouchPoints: 0,
    platform: 'Linux',
    userAgent: 'jsdom',
    performanceScore: 70,
    screen: { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
  },
  summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
  score: 85,
  metadata: {},
  estimatedImprovements: {
    overallScore: 60,
    responseTimeReduction: 20,
    errorRateReduction: 10,
    throughputIncrease: 15,
    tokenEfficiencyGain: 5,
  },
  currentMetrics: {
    avgResponseTime: 1200,
    p95ResponseTime: 2500,
    p99ResponseTime: 4000,
    successRate: 97.5,
    errorRate: 2.5,
    systemLoad: 45,
    modelEfficiency: {},
  },
})

const { mockPerformanceScanner } = vi.hoisted(() => ({
  mockPerformanceScanner: {
    loadScanHistory: vi.fn().mockResolvedValue(undefined),
    performComprehensiveScan: vi.fn(),
    applyOptimizations: vi.fn(),
    getScanHistory: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('@/lib/performance-scanner', () => ({
  performanceScanner: mockPerformanceScanner,
}))

vi.mock('@/lib/hardware-scanner', () => ({
  formatHardwareInfo: () => 'CPU: 4 cores\nPlatform: Linux\nTier: medium',
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { PerformanceScanPanel } from './PerformanceScanPanel'

// Build at least 10 events so the "Run Full Scan" button is enabled.
// PerformanceScanPanel disables the scan button until events.length >= 10
// (see "Not Enough Data" guard).
const seededEvents = Array.from({ length: 12 }, (_, i) => ({
  id: `evt-${i}`,
  type: 'chat_message_sent',
  category: 'chat',
  action: 'send',
  timestamp: Date.now() - i * 1000,
})) as any[]

describe('PerformanceScanPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceScanner.loadScanHistory.mockResolvedValue(undefined)
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValue(makeEmptyScanResult())
    mockPerformanceScanner.applyOptimizations.mockResolvedValue({ updated: [], applied: 0 })
  })

  it('renders heading', () => {
    render(
      <PerformanceScanPanel
        events={[]}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    expect(
      screen.getByRole('heading', { name: /performance scanner/i })
    ).toBeInTheDocument()
  })

  it('shows "Run Full Scan" button (disabled) and "Not Enough Data" alert when events.length < 10', () => {
    render(
      <PerformanceScanPanel
        events={[]}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: /run full scan/i })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument()
    expect(screen.getByText(/current: 0/i)).toBeInTheDocument()
  })

  it('calls performComprehensiveScan when Run Full Scan clicked with enough data + renders score card and 4 sub-metric cards', async () => {
    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: /run full scan/i })
    expect(btn).not.toBeDisabled()
    await act(async () => { fireEvent.click(btn) })
    await waitFor(() =>
      expect(mockPerformanceScanner.performComprehensiveScan).toHaveBeenCalledOnce(),
    )
    expect(toast.success).toHaveBeenCalledWith('Performance scan completed')
    // Overall score card + 4 sub-metric cards
    expect(screen.getByText(/overall improvement potential/i)).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText(/response time/i)).toBeInTheDocument()
    expect(screen.getByText(/throughput/i)).toBeInTheDocument()
    expect(screen.getByText(/token efficiency/i)).toBeInTheDocument()
    // Optimizations tab is default; empty state
    expect(screen.getByText(/system running optimally/i)).toBeInTheDocument()
  })

  it('scan failure path: toast.error + console.error swallowed', async () => {
    mockPerformanceScanner.performComprehensiveScan.mockRejectedValueOnce(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to run performance scan'),
    )
    errSpy.mockRestore()
  })

  it('renders Auto-Optimize banner + Apply All triggers applyOptimizations(autoApplicable subset)', async () => {
    const onApply = vi.fn()
    const result = makeEmptyScanResult()
    result.optimizations = [
      {
        id: 'opt-1', type: 'adjust_parameter', priority: 'high',
        description: 'Reduce maxTokens', changes: { maxTokens: 1024 },
        expectedGain: '15% faster', confidence: 0.9, autoApplicable: true,
      },
      {
        id: 'opt-2', type: 'change_model_config', priority: 'medium',
        description: 'Switch backend', changes: {},
        expectedGain: '10% faster', confidence: 0.8, autoApplicable: false,
      },
    ] as any
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce(result)
    mockPerformanceScanner.applyOptimizations.mockResolvedValueOnce({ updated: [], applied: 1 })

    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={onApply}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByText(/auto-optimize available/i)).toBeInTheDocument())
    expect(screen.getByText(/1 optimizations can be applied automatically/i)).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /apply all/i }))
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Applied 1 optimizations'))
    expect(mockPerformanceScanner.applyOptimizations).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'opt-1', autoApplicable: true })],
      [],
    )
    expect(onApply).toHaveBeenCalled()
  })

  it('Apply All failure path: toast.error', async () => {
    const result = makeEmptyScanResult()
    result.optimizations = [{
      id: 'opt-1', type: 'adjust_parameter', priority: 'high',
      description: 'X', changes: {}, expectedGain: '', confidence: 0.9, autoApplicable: true,
    }] as any
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce(result)
    mockPerformanceScanner.applyOptimizations.mockRejectedValueOnce(new Error('apply boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByText(/auto-optimize available/i)).toBeInTheDocument())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /apply all/i }))
    })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to apply optimizations'))
    errSpy.mockRestore()
  })

  it('renders optimizations list with priority/type/auto badges + per-opt Apply button → applyOptimization() flow', async () => {
    const onApply = vi.fn()
    const result = makeEmptyScanResult()
    result.optimizations = [{
      id: 'opt-1', type: 'adjust_parameter', priority: 'critical',
      description: 'Reduce maxTokens',
      targetModel: 'm1',
      changes: { maxTokens: 512 },
      expectedGain: '20% faster',
      confidence: 0.85,
      autoApplicable: false,
    }] as any
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce(result)
    mockPerformanceScanner.applyOptimizations.mockResolvedValueOnce({ updated: [{ id: 'm1' } as any], applied: 1 })

    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[{ id: 'm1', name: 'My Model' } as any]}
        profiles={[]}
        onApplyOptimizations={onApply}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByText('Reduce maxTokens')).toBeInTheDocument())
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('adjust_parameter')).toBeInTheDocument()
    expect(screen.getByText(/20% faster/)).toBeInTheDocument()
    expect(screen.getByText(/Confidence: 85%/)).toBeInTheDocument()
    expect(screen.getByText(/Target: My Model/)).toBeInTheDocument()
    // JSON changes pre block
    expect(screen.getByText(/"maxTokens": 512/)).toBeInTheDocument()

    // Click Apply
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Applied: Reduce maxTokens'))
    expect(onApply).toHaveBeenCalled()
    // After apply, the "Applied" badge appears for that opt
    await waitFor(() => expect(screen.getByText('Applied')).toBeInTheDocument())
  })

  it('per-opt apply failure path: toast.error', async () => {
    const result = makeEmptyScanResult()
    result.optimizations = [{
      id: 'opt-1', type: 'adjust_parameter', priority: 'low',
      description: 'X', changes: {}, expectedGain: '', confidence: 0.5, autoApplicable: false,
    }] as any
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce(result)
    mockPerformanceScanner.applyOptimizations.mockRejectedValueOnce(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByRole('button', { name: /^apply$/i })).toBeInTheDocument())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to apply optimization'))
    errSpy.mockRestore()
  })

  it('Bottlenecks tab: empty + populated states (severity badges, affected-models lookup)', async () => {
    const user = userEvent.setup()
    const result = makeEmptyScanResult()
    result.bottlenecks = [
      {
        id: 'b1', type: 'model_config', severity: 'critical',
        description: 'Misconfigured model',
        impact: 'High latency',
        affectedModels: ['m1'],
        detectedAt: Date.now(),
      },
      {
        id: 'b2', type: 'hardware', severity: 'medium',
        description: 'Low-tier device',
        impact: 'Slower inference',
        affectedModels: [],
        detectedAt: Date.now(),
      },
    ] as any
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce(result)

    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[{ id: 'm1', name: 'My Model' } as any]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByText(/overall improvement potential/i)).toBeInTheDocument())

    // Switch to Bottlenecks tab — Radix Tabs needs userEvent (pointer events)
    // for the active state to update reliably in jsdom.
    await user.click(screen.getByRole('tab', { name: /bottlenecks/i }))

    await waitFor(() => expect(screen.getByText('Misconfigured model')).toBeInTheDocument())
    expect(screen.getByText('High latency')).toBeInTheDocument()
    expect(screen.getByText('Low-tier device')).toBeInTheDocument()
    expect(screen.getByText('My Model')).toBeInTheDocument() // affected-model lookup
  })

  it('Current Metrics tab: response/p95/p99/success/error/system-load + per-model efficiency wastedTokens > 500 alert', async () => {
    const user = userEvent.setup()
    const result = makeEmptyScanResult()
    result.currentMetrics.modelEfficiency = {
      m1: {
        modelId: 'm1', modelName: 'M1', parameterEfficiency: 75,
        avgResponseTime: 800, tokensPerSecond: 12.3, requestCount: 50,
        wastedTokens: 1200, optimalMaxTokens: 800,
      },
    } as any
    mockPerformanceScanner.performComprehensiveScan.mockResolvedValueOnce(result)

    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByText(/overall improvement potential/i)).toBeInTheDocument())

    await user.click(screen.getByRole('tab', { name: /current metrics/i }))

    await waitFor(() => expect(screen.getByText(/avg response time/i)).toBeInTheDocument())
    expect(screen.getByText('1.20s')).toBeInTheDocument()
    expect(screen.getByText('2.50s')).toBeInTheDocument()
    expect(screen.getByText('4.00s')).toBeInTheDocument()
    expect(screen.getByText('97.5%')).toBeInTheDocument()
    expect(screen.getByText('2.5%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    // Per-model efficiency
    expect(screen.getByText('M1')).toBeInTheDocument()
    expect(screen.getByText('75% Efficiency')).toBeInTheDocument()
    // wastedTokens > 500 → alert with optimalMaxTokens=800
    expect(screen.getByText(/reducing maxtokens to 800/i)).toBeInTheDocument()
  })

  it('Hardware Info tab: tier text + formatHardwareInfo pre block', async () => {
    const user = userEvent.setup()
    render(
      <PerformanceScanPanel
        events={seededEvents}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /run full scan/i }))
    })
    await waitFor(() => expect(screen.getByText(/overall improvement potential/i)).toBeInTheDocument())

    await user.click(screen.getByRole('tab', { name: /hardware info/i }))

    await waitFor(() => expect(screen.getByText(/hardware specifications/i)).toBeInTheDocument())
    const heading = screen.getByText(/hardware specifications/i).closest('div')
    expect(heading).toBeTruthy()
    expect(within(heading!.parentElement!).getByText(/medium/)).toBeInTheDocument()
    // formatHardwareInfo (mocked) output appears in the pre
    expect(screen.getByText(/CPU: 4 cores/)).toBeInTheDocument()
  })
})
