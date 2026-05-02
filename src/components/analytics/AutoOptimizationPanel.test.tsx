/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUseAnalytics, mockAutoOptimizer, mockThresholdManager } = vi.hoisted(() => ({
  mockUseAnalytics: vi.fn(),
  mockAutoOptimizer: {
    analyzeAndOptimize: vi.fn(),
    generateAutoTuneRecommendations: vi.fn(),
  },
  mockThresholdManager: {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    shouldAutoImplement: vi.fn(),
    recordImplementation: vi.fn(),
  },
}))

vi.mock('@/lib/analytics', () => ({ useAnalytics: mockUseAnalytics }))
vi.mock('@/lib/auto-optimizer', () => ({ autoOptimizer: mockAutoOptimizer }))
vi.mock('@/lib/confidence-thresholds', async () => {
  const actual = await vi.importActual<typeof import('@/lib/confidence-thresholds')>(
    '@/lib/confidence-thresholds'
  )
  return { ...actual, thresholdManager: mockThresholdManager }
})
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

// Stub the recommendations viewer to keep the viewer-tab surface deterministic
vi.mock('./OptimizationRecommendationsViewer', () => ({
  OptimizationRecommendationsViewer: (props: any) => (
    <div data-testid="rec-viewer">
      <span data-testid="viewer-insights">{props.insights.length}</span>
      <span data-testid="viewer-analyzing">{String(props.isAnalyzing)}</span>
      <button onClick={() => props.onApplyAll()}>viewer-apply-all</button>
      <button onClick={() => props.insights[0] && props.onApplyInsight(props.insights[0])}>
        viewer-apply-first
      </button>
      <button
        onClick={() =>
          props.autoTuneRecommendations[0] &&
          props.models[0] &&
          props.onApplyAutoTune(props.autoTuneRecommendations[0], props.models[0].id)
        }
      >
        viewer-apply-autotune
      </button>
    </div>
  ),
}))

import { AutoOptimizationPanel } from './AutoOptimizationPanel'
import { DEFAULT_THRESHOLDS } from '@/lib/confidence-thresholds'
import { toast } from 'sonner'

const mkEvents = (n: number, type = 'chat_message_sent'): any[] =>
  Array.from({ length: n }, (_, i) => ({ id: `e${i}`, type, timestamp: i }))

const mockModel: any = {
  id: 'm1', name: 'Model One', provider: 'ollama',
  temperature: 0.7, maxTokens: 1000, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0,
}

const insightHigh: any = {
  id: 'i-high', title: 'Cut latency', description: 'Latency too high',
  type: 'performance', severity: 'high', confidence: 0.9, impact: '+30% faster',
  recommendation: 'Reduce maxTokens', affectedModels: ['m1'],
  suggestedAction: { type: 'adjust_parameters', changes: { maxTokens: 500 } },
}
const insightCritical: any = { ...insightHigh, id: 'i-crit', severity: 'critical', title: 'Critical' }
const insightMedium: any = { ...insightHigh, id: 'i-med', severity: 'medium', title: 'Medium one' }
const insightLowNoAction: any = { ...insightHigh, id: 'i-low', severity: 'low', title: 'Low one', suggestedAction: undefined }

const autoTune: any = {
  taskType: 'general_chat', confidence: 0.8, reasoning: 'tune it',
  currentParams: { temperature: 0.7, maxTokens: 1000, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
  recommendedParams: { temperature: 0.5, maxTokens: 800, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
  expectedImprovements: { quality: 'better' },
}

const baseProps = () => ({
  models: [mockModel],
  profiles: [],
  onApplyOptimization: vi.fn(),
  onApplyAutoTune: vi.fn(),
  onCreateProfile: vi.fn(),
  thresholdConfig: DEFAULT_THRESHOLDS,
  onThresholdConfigChange: vi.fn(),
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAnalytics.mockReturnValue({ events: [], getMetrics: vi.fn().mockResolvedValue(null) })
  mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([])
  mockAutoOptimizer.generateAutoTuneRecommendations.mockReturnValue([])
  mockThresholdManager.getConfig.mockReturnValue(DEFAULT_THRESHOLDS)
  mockThresholdManager.shouldAutoImplement.mockReturnValue({ allowed: false, requiresConfirmation: false })
})

describe('AutoOptimizationPanel', () => {
  it('renders both tabs and viewer is the default', async () => {
    await act(async () => { render(<AutoOptimizationPanel {...baseProps()} />) })
    expect(screen.getByRole('tab', { name: /view & apply/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /controls/i })).toBeInTheDocument()
    expect(screen.getByTestId('rec-viewer')).toBeInTheDocument()
  })

  it('analyze button does nothing for <10 events', async () => {
    const user = userEvent.setup()
    await act(async () => { render(<AutoOptimizationPanel {...baseProps()} />) })
    await user.click(screen.getByRole('tab', { name: /controls/i }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /analyze/i })) })
    expect(mockAutoOptimizer.analyzeAndOptimize).not.toHaveBeenCalled()
  })

  it('on mount with ≥10 events runs analysis and populates insights + auto-tune list', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightHigh, insightCritical, insightMedium, insightLowNoAction])
    mockAutoOptimizer.generateAutoTuneRecommendations.mockReturnValue([autoTune])
    await act(async () => { render(<AutoOptimizationPanel {...baseProps()} />) })
    await waitFor(() => expect(mockAutoOptimizer.analyzeAndOptimize).toHaveBeenCalled())
    expect(screen.getByTestId('viewer-insights').textContent).toBe('4')
    expect(toast.success).toHaveBeenCalledWith('Found 4 optimization opportunities')
  })

  it('analyzeAndOptimize rejection is logged but does not crash; isAnalyzing returns to false', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockRejectedValue(new Error('boom'))
    await act(async () => { render(<AutoOptimizationPanel {...baseProps()} />) })
    await waitFor(() => expect(errSpy).toHaveBeenCalled())
    expect(screen.getByTestId('viewer-analyzing').textContent).toBe('false')
    errSpy.mockRestore()
  })

  it('Controls tab: toggling Auto-learn and Auto-implement updates threshold config', async () => {
    const user = userEvent.setup()
    const onCfg = vi.fn()
    await act(async () => {
      render(<AutoOptimizationPanel {...baseProps()} onThresholdConfigChange={onCfg} />)
    })
    await user.click(screen.getByRole('tab', { name: /controls/i }))
    // Auto-implement switch
    await user.click(screen.getByRole('switch', { name: /enabled|disabled/i }))
    expect(onCfg).toHaveBeenCalledWith(expect.objectContaining({ autoImplementEnabled: true }))
    // Auto-learn switch toggles internal state (no callback) — just clicking should not throw
    await user.click(screen.getByLabelText(/auto-learn/i))
  })

  it('handleApplyInsight (via mocked viewer) calls onApplyOptimization and records implementation', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightHigh])
    mockThresholdManager.shouldAutoImplement.mockReturnValue({ allowed: false, requiresConfirmation: true })
    const props = baseProps()
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(screen.getByTestId('viewer-insights').textContent).toBe('1'))
    await act(async () => { fireEvent.click(screen.getByText('viewer-apply-first')) })
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining('Applying optimization'),
      expect.any(Object),
    )
    expect(props.onApplyOptimization).toHaveBeenCalledWith(insightHigh)
    expect(mockThresholdManager.recordImplementation).toHaveBeenCalledWith('i-high', 0.9, 'high', false)
    expect(toast.success).toHaveBeenCalledWith('Optimization applied')
  })

  it('handleApplyAutoTune (via viewer) forwards to onApplyAutoTune and toasts', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([])
    mockAutoOptimizer.generateAutoTuneRecommendations.mockReturnValue([autoTune])
    const props = baseProps()
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(mockAutoOptimizer.generateAutoTuneRecommendations).toHaveBeenCalled())
    await act(async () => { fireEvent.click(screen.getByText('viewer-apply-autotune')) })
    expect(props.onApplyAutoTune).toHaveBeenCalledWith(autoTune, 'm1')
    expect(toast.success).toHaveBeenCalledWith('Auto-tuned for general chat')
  })

  it('handleApplyAll: empty insights → toast.info', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([])
    await act(async () => { render(<AutoOptimizationPanel {...baseProps()} />) })
    await act(async () => { fireEvent.click(screen.getByText('viewer-apply-all')) })
    expect(toast.info).toHaveBeenCalledWith('No insights to apply')
  })

  it('handleApplyAll with insights and auto-tune recs applies each plus auto-tune to all models', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightHigh, insightCritical])
    mockAutoOptimizer.generateAutoTuneRecommendations.mockReturnValue([autoTune])
    const props = baseProps()
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(screen.getByTestId('viewer-insights').textContent).toBe('2'))
    await act(async () => {
      fireEvent.click(screen.getByText('viewer-apply-all'))
      // handleApplyAll has a 300ms delay between insights + final auto-tune fan-out
      await new Promise(r => setTimeout(r, 1000))
    })
    expect(props.onApplyOptimization).toHaveBeenCalledTimes(2)
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/Applied 2 optimizations/),
      expect.any(Object),
    )
    expect(props.onApplyAutoTune).toHaveBeenCalledWith(autoTune, 'm1')
    expect(toast.success).toHaveBeenCalledWith('Auto-tune applied to all models')
  })

  it('autoImplementInsights: with autoImplementEnabled and allowed, applies and notifies', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightHigh])
    mockAutoOptimizer.generateAutoTuneRecommendations.mockReturnValue([autoTune])
    mockThresholdManager.shouldAutoImplement.mockReturnValue({ allowed: true, requiresConfirmation: false })
    const enabledCfg = { ...DEFAULT_THRESHOLDS, autoImplementEnabled: true, requireConfirmation: false }
    const props = { ...baseProps(), thresholdConfig: enabledCfg }
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(props.onApplyOptimization).toHaveBeenCalledWith(insightHigh))
    expect(mockThresholdManager.recordImplementation).toHaveBeenCalledWith('i-high', 0.9, 'high', true)
    // First model auto-tune branch fires after the 500ms inter-action delay
    await act(async () => { await new Promise(r => setTimeout(r, 700)) })
    expect(props.onApplyAutoTune).toHaveBeenCalledWith(autoTune, 'm1')
  })

  it('autoImplementInsights: skips when requiresConfirmation+requireConfirmation', async () => {
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightHigh])
    mockThresholdManager.shouldAutoImplement.mockReturnValue({ allowed: true, requiresConfirmation: true })
    const enabledCfg = { ...DEFAULT_THRESHOLDS, autoImplementEnabled: true, requireConfirmation: true }
    const props = { ...baseProps(), thresholdConfig: enabledCfg }
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(mockAutoOptimizer.analyzeAndOptimize).toHaveBeenCalled())
    expect(props.onApplyOptimization).not.toHaveBeenCalled()
  })

  it('learning progress text reflects events', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue({ events: mkEvents(20), getMetrics: vi.fn() })
    await act(async () => { render(<AutoOptimizationPanel {...baseProps()} />) })
    await user.click(screen.getByRole('tab', { name: /controls/i }))
    expect(screen.getByText(/40% \(20 interactions\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Need 30 more interactions/i)).toBeInTheDocument()
  })

  it('Controls tab: renders InsightCard + AutoTuneCard, expand toggles, Apply Fix flows', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightCritical, insightHigh, insightMedium, insightLowNoAction])
    mockAutoOptimizer.generateAutoTuneRecommendations.mockReturnValue([autoTune])
    mockThresholdManager.shouldAutoImplement.mockReturnValue({ allowed: false, requiresConfirmation: false })
    const props = baseProps()
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(mockAutoOptimizer.analyzeAndOptimize).toHaveBeenCalled())
    await user.click(screen.getByRole('tab', { name: /controls/i }))
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Cut latency')).toBeInTheDocument()
    expect(screen.getByText('Medium one')).toBeInTheDocument()
    expect(screen.getByText('Low one')).toBeInTheDocument()
    // Expand the first InsightCard
    const moreBtns = screen.getAllByRole('button', { name: /more details/i })
    await user.click(moreBtns[0])
    expect(await screen.findByText(/RECOMMENDATION/)).toBeInTheDocument()
    expect(screen.getByText(/EXPECTED IMPACT/)).toBeInTheDocument()
    // Apply Fix on the critical insight (first card with suggestedAction)
    const applyFixBtns = screen.getAllByRole('button', { name: /apply fix/i })
    await act(async () => { fireEvent.click(applyFixBtns[0]) })
    expect(props.onApplyOptimization).toHaveBeenCalled()
    // AutoTuneCard renders with task type label
    expect(screen.getByText(/GENERAL CHAT/i)).toBeInTheDocument()
    // Expand AutoTuneCard
    const remainingMore = screen.getAllByRole('button', { name: /more details/i })
    await user.click(remainingMore[remainingMore.length - 1])
    expect(await screen.findByText(/PARAMETER CHANGES/)).toBeInTheDocument()
    expect(screen.getByText(/EXPECTED IMPROVEMENTS/)).toBeInTheDocument()
    // Click the Auto-Tune button in the AutoTuneCard
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^auto-tune$/i })) })
    expect(props.onApplyAutoTune).toHaveBeenCalledWith(autoTune, 'm1')
  })

  it('Controls tab: Apply All button at the top of the insights list works', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue({ events: mkEvents(15), getMetrics: vi.fn() })
    mockAutoOptimizer.analyzeAndOptimize.mockResolvedValue([insightHigh])
    const props = baseProps()
    await act(async () => { render(<AutoOptimizationPanel {...props} />) })
    await waitFor(() => expect(mockAutoOptimizer.analyzeAndOptimize).toHaveBeenCalled())
    await user.click(screen.getByRole('tab', { name: /controls/i }))
    const applyAllBtn = screen.getByRole('button', { name: /apply all/i })
    await act(async () => {
      fireEvent.click(applyAllBtn)
      await new Promise(r => setTimeout(r, 600))
    })
    expect(props.onApplyOptimization).toHaveBeenCalledWith(insightHigh)
  })
})

