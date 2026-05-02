import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPerformanceScanner } = vi.hoisted(() => ({
  mockPerformanceScanner: {
    loadScanHistory: vi.fn().mockResolvedValue(undefined),
    // Component calls performComprehensiveScan(events, models, profiles)
    // — not `scan()` directly. See PerformanceScanPanel.tsx runScan().
    performComprehensiveScan: vi.fn().mockResolvedValue({
      id: 'scan-1',
      timestamp: Date.now(),
      insights: [],
      optimizations: [],
      bottlenecks: [],
      modelEfficiency: [],
      hardwareSpecs: {
        tier: 'medium',
        performanceScore: 250,
        hardwareConcurrency: 4,
        screen: { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
      },
      summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      score: 85,
      // Post-scan render reads scanResult.estimatedImprovements.* and
      // scanResult.currentMetrics.* across the result tabs. Without these
      // the re-render throws TypeErrors and Vitest logs an Unhandled Error
      // (the click assertion still passes because waitFor only checks the
      // spy). Provide zeroed shapes so the panel renders cleanly.
      estimatedImprovements: {
        responseTimeReduction: 0,
        errorRateReduction: 0,
        throughputIncrease: 0,
        tokenEfficiencyGain: 0,
        overallScore: 0,
      },
      currentMetrics: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        successRate: 100,
        errorRate: 0,
        systemLoad: 0,
        modelEfficiency: {},
      },
      metadata: {},
    }),
    applyOptimizations: vi.fn().mockResolvedValue({ updated: [], applied: 0 }),
    getScanHistory: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('@/lib/performance-scanner', () => ({
  performanceScanner: mockPerformanceScanner,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
})) as any[]

describe('PerformanceScanPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    // Heading reads "Performance Scanner" — query the explicit role to
    // disambiguate from other "performance scan" mentions in the body.
    expect(
      screen.getByRole('heading', { name: /performance scanner/i })
    ).toBeInTheDocument()
  })

  it('shows "Run Full Scan" button (disabled when not enough data)', () => {
    render(
      <PerformanceScanPanel
        events={[]}
        models={[]}
        profiles={[]}
        onApplyOptimizations={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: /run full scan/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it('calls performanceScanner.scan when Run Full Scan clicked with enough data', async () => {
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
    fireEvent.click(btn)
    await waitFor(() =>
      expect(mockPerformanceScanner.performComprehensiveScan).toHaveBeenCalledOnce(),
    )
  })
})
