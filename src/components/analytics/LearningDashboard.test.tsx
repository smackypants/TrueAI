/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DEFAULT_THRESHOLDS } from '@/lib/confidence-thresholds'

const { mockLearningAlgorithm } = vi.hoisted(() => ({
  mockLearningAlgorithm: {
    calculateMetrics: vi.fn(),
    getLearningStats: vi.fn(),
    learnAndAdjustThresholds: vi.fn(),
    exportFeedbackHistory: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('@/lib/learning-algorithms', async () => {
  const actual = await vi.importActual<typeof import('@/lib/learning-algorithms')>(
    '@/lib/learning-algorithms'
  )
  return { ...actual, learningAlgorithm: mockLearningAlgorithm }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { LearningDashboard } from './LearningDashboard'
import { toast } from 'sonner'

const baseSeverity = (n = 0) => ({
  total: n, accepted: n, successful: n, avgConfidence: 0.8,
})
const mkMetrics = (totalFeedback = 50): any => ({
  totalFeedback,
  acceptanceRate: 75,
  successRate: 80,
  avgConfidence: 0.82,
  bySeverity: {
    critical: baseSeverity(10),
    high: baseSeverity(20),
    medium: baseSeverity(15),
    low: baseSeverity(5),
  },
  byActionType: {
    adjust_parameters: baseSeverity(20),
    change_model: baseSeverity(10),
    add_profile: baseSeverity(15),
    reduce_usage: baseSeverity(5),
  },
  thresholdAccuracy: {
    truePositives: 30, falsePositives: 5, trueNegatives: 10, falseNegatives: 5,
    precision: 0.85, recall: 0.86, f1Score: 0.85,
  },
})
const mkStats = (overrides: any = {}): any => ({
  totalAdjustments: 7,
  learningRate: 0.1,
  convergenceScore: 0.7,
  stabilityScore: 0.65,
  performanceImprovement: 12,
  recommendedLearningRate: 0.08,
  ...overrides,
})
const mkAdjustment = (severity: any = 'high', up = true): any => ({
  severity,
  oldThreshold: 0.7,
  newThreshold: up ? 0.8 : 0.6,
  reason: `tune ${severity}`,
  confidence: 0.9,
  expectedImprovement: 'better outcomes',
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  mockLearningAlgorithm.calculateMetrics.mockReturnValue(mkMetrics())
  mockLearningAlgorithm.getLearningStats.mockReturnValue(mkStats())
  mockLearningAlgorithm.learnAndAdjustThresholds.mockReturnValue([])
  mockLearningAlgorithm.exportFeedbackHistory.mockReturnValue('{"feedback":[]}')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LearningDashboard', () => {
  it('renders loading state when metrics or stats are null', () => {
    mockLearningAlgorithm.calculateMetrics.mockReturnValue(null as any)
    mockLearningAlgorithm.getLearningStats.mockReturnValue(null as any)
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    expect(screen.getByText(/Learning Algorithm/i)).toBeInTheDocument()
    expect(screen.getByText(/Collecting feedback/i)).toBeInTheDocument()
  })

  it('renders main dashboard with summary cards and metric values', () => {
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    expect(screen.getByText(/Adaptive Learning System/i)).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument() // totalFeedback
    expect(screen.getByText('75.0%')).toBeInTheDocument() // acceptanceRate
    expect(screen.getByText('80.0%')).toBeInTheDocument() // successRate
    expect(screen.getByText(/Excellent sample size/i)).toBeInTheDocument()
  })

  it('shows "Collecting data..." when totalFeedback < 50', () => {
    mockLearningAlgorithm.calculateMetrics.mockReturnValue(mkMetrics(20))
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    expect(screen.getByText(/Collecting data/i)).toBeInTheDocument()
  })

  it('Run Learning Cycle is disabled when totalFeedback < 10', () => {
    mockLearningAlgorithm.calculateMetrics.mockReturnValue(mkMetrics(5))
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Run Learning Cycle/i })).toBeDisabled()
  })

  it('Run Learning Cycle: no adjustments → "thresholds optimal" toast', async () => {
    vi.useFakeTimers()
    mockLearningAlgorithm.learnAndAdjustThresholds.mockReturnValue([])
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Run Learning Cycle/i }))
    expect(screen.getByText(/Learning\.\.\./i)).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
    expect(toast.success).toHaveBeenCalledWith(
      'Thresholds are already optimal',
      expect.any(Object),
    )
  })

  it('Run Learning Cycle: with adjustments + auto-apply enabled → applyAdjustments fires', async () => {
    vi.useFakeTimers()
    const adj = mkAdjustment('high', true)
    mockLearningAlgorithm.learnAndAdjustThresholds.mockReturnValue([adj])
    const onChange = vi.fn()
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Run Learning Cycle/i }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholds: expect.objectContaining({
          high: expect.objectContaining({ minConfidence: 0.8 }),
        }),
      }),
    )
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/Applied 1 threshold adjustments/),
      expect.any(Object),
    )
  })

  it('Run Learning Cycle: with adjustments + auto-apply disabled → suggestions card + Apply All button', async () => {
    const adj = mkAdjustment('high', false) // down arrow branch
    mockLearningAlgorithm.learnAndAdjustThresholds.mockReturnValue([adj])
    const onChange = vi.fn()
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={onChange} />)
    // Disable auto-apply by clicking the header switch (first switch in the doc)
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: /Run Learning Cycle/i }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
    vi.useRealTimers()
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringMatching(/1 threshold adjustments suggested/),
      expect.any(Object),
    )
    expect(screen.getByText(/Suggested Adjustments/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Apply All 1/i }))
    expect(onChange).toHaveBeenCalled()
  })

  it('Breakdown tab renders per-severity and per-action-type cards', async () => {
    const user = userEvent.setup()
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /Breakdown/i }))
    expect(screen.getByText(/Performance by Severity/i)).toBeInTheDocument()
    expect(screen.getByText(/Performance by Action Type/i)).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText(/adjust parameters/i)).toBeInTheDocument()
  })

  it('Breakdown tab handles zero-total / zero-accepted divisions safely', async () => {
    const user = userEvent.setup()
    const m = mkMetrics(50)
    m.bySeverity.low = { total: 0, accepted: 0, successful: 0, avgConfidence: 0 }
    m.byActionType.reduce_usage = { total: 0, accepted: 0, successful: 0, avgConfidence: 0 }
    mockLearningAlgorithm.calculateMetrics.mockReturnValue(m)
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /Breakdown/i }))
    expect(screen.getAllByText(/0 samples/).length).toBeGreaterThan(0)
  })

  it('Settings tab: learning rate slider, export button, reset button', async () => {
    const user = userEvent.setup()
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /Learning Settings/i }))
    expect(screen.getByText(/Recommended: 0\.080/)).toBeInTheDocument()

    // Stub URL.createObjectURL/revokeObjectURL + anchor click for export
    const origCreate = (URL as any).createObjectURL
    const origRevoke = (URL as any).revokeObjectURL
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:mock')
    ;(URL as any).revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      fireEvent.click(screen.getByRole('button', { name: /Export Data/i }))
      expect(mockLearningAlgorithm.exportFeedbackHistory).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Learning data exported')
      expect(clickSpy).toHaveBeenCalled()
    } finally {
      ;(URL as any).createObjectURL = origCreate
      ;(URL as any).revokeObjectURL = origRevoke
      clickSpy.mockRestore()
    }

    fireEvent.click(screen.getByRole('button', { name: /Reset Algorithm/i }))
    expect(mockLearningAlgorithm.reset).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Learning algorithm reset')
  })

  it('renders TrendDown branch when performanceImprovement is negative', () => {
    mockLearningAlgorithm.getLearningStats.mockReturnValue(mkStats({ performanceImprovement: -5 }))
    render(<LearningDashboard thresholdConfig={DEFAULT_THRESHOLDS} onThresholdConfigChange={vi.fn()} />)
    expect(screen.getByText(/-5\.0%/)).toBeInTheDocument()
  })
})

