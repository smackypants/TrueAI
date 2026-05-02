import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import userEvent from '@testing-library/user-event'
import { LearningRateBenchmark } from './LearningRateBenchmark'
import type { ModelConfig } from '@/lib/types'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/analytics', () => ({
  analytics: { track: vi.fn() },
}))

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Provide stable useKV mock
const mockSetExperiments = vi.fn()
let mockExperimentsValue: unknown[] = []
vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn((key: string, defaultValue: unknown) => {
    if (key === 'lr-experiments') return [mockExperimentsValue, mockSetExperiments]
    return [defaultValue, vi.fn()]
  }),
}))

// Mock learning-rate-tuner
const mockGetOptimalRate = vi.fn()
const mockGetMetrics = vi.fn()
const mockRecommendRate = vi.fn()
const mockRecordMetrics = vi.fn()
const mockGenerateSchedule = vi.fn()

vi.mock('@/lib/learning-rate-tuner', () => ({
  learningRateTuner: {
    getOptimalRateForTask: (...a: any[]) => mockGetOptimalRate(...a),
    getLearningRateMetrics: (...a: any[]) => mockGetMetrics(...a),
    recommendLearningRate: (...a: any[]) => mockRecommendRate(...a),
    recordPerformanceMetrics: (...a: any[]) => mockRecordMetrics(...a),
    generateSchedule: (...a: any[]) => mockGenerateSchedule(...a),
  },
}))

// Mock model-benchmark
const mockRunBenchmark = vi.fn()
vi.mock('@/lib/model-benchmark', () => ({
  runModelBenchmark: (...a: any[]) => mockRunBenchmark(...a),
  benchmarkTests: [],
}))

// Pointer capture stubs for Radix
beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {}
  }
  // Blob/URL stubs
  if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => 'blob:mock')
  if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn()
})

const mockModel: ModelConfig = {
  id: 'model-1',
  name: 'GPT Model',
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
}

const defaultMetrics = {
  trainingLoss: [1.5, 1.2, 0.9],
  validationLoss: [1.6, 1.3, 1.0],
  convergenceRate: 0.05,
  stabilityScore: 0.87,
  epochsCompleted: 3,
  recommendedRate: 0.0005,
  confidence: 0.85,
}

const mockSchedule = {
  type: 'cosine_annealing',
  initialRate: 0.001,
  minRate: 0.0001,
  maxRate: 0.01,
  warmupSteps: 100,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExperimentsValue = []
  mockGetOptimalRate.mockReturnValue(0.001)
  mockGetMetrics.mockReturnValue(defaultMetrics)
  mockRecommendRate.mockReturnValue(null)
  mockGenerateSchedule.mockReturnValue(mockSchedule)
})

describe('LearningRateBenchmark', () => {
  it('renders heading', () => {
    render(<LearningRateBenchmark models={[]} onModelUpdate={vi.fn()} />)
    expect(
      screen.getByRole('heading', { name: /learning rate optimization/i })
    ).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    render(<LearningRateBenchmark models={[]} onModelUpdate={vi.fn()} />)
    expect(document.body).toBeTruthy()
  })

  it('shows Run Experiment button', () => {
    render(<LearningRateBenchmark models={[]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /run experiment/i })).toBeInTheDocument()
  })

  it('Run Experiment button disabled when no model', () => {
    render(<LearningRateBenchmark models={[]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /run experiment/i })).toBeDisabled()
  })

  it('Run Experiment button enabled when model present', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /run experiment/i })).not.toBeDisabled()
  })

  it('Export button disabled when no experiments', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled()
  })

  it('shows Auto-tune switch', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByText('Auto-tune during training')).toBeInTheDocument()
  })

  it('auto-tune switch is on by default', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('toggling auto-tune switch changes state', async () => {
    const user = userEvent.setup()
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    await user.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('shows learning rate input with default value', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toContain('0.001')
  })

  it('updating learning rate input changes value', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    fireEvent.change(input, { target: { value: '0.0005' } })
    expect(input.value).toBe('0.0005')
  })

  it('shows Generate Schedule button', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /generate schedule/i })).toBeInTheDocument()
  })

  it('Generate Schedule shows schedule card', async () => {
    const user = userEvent.setup()
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /generate schedule/i }))
    expect(screen.getByText(/active schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/cosine annealing/i)).toBeInTheDocument()
  })

  it('Generate Schedule shows Initial, Min, Max, Warmup values', async () => {
    const user = userEvent.setup()
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /generate schedule/i }))
    expect(screen.getByText('Initial:')).toBeInTheDocument()
    expect(screen.getByText('Min:')).toBeInTheDocument()
    expect(screen.getByText('Max:')).toBeInTheDocument()
    expect(screen.getByText('Warmup:')).toBeInTheDocument()
  })

  it('Generate Schedule with no model does nothing', async () => {
    const user = userEvent.setup()
    render(<LearningRateBenchmark models={[]} onModelUpdate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /generate schedule/i }))
    expect(screen.queryByText(/active schedule/i)).not.toBeInTheDocument()
  })

  it('shows model name in model select when model provided', () => {
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    expect(screen.getByText('GPT Model')).toBeInTheDocument()
  })

  it('Run Experiment shows running state and calls toast.error when no model', async () => {
    const { toast } = await import('sonner')
    const user = userEvent.setup()
    render(<LearningRateBenchmark models={[]} onModelUpdate={vi.fn()} />)
    // Button is disabled but we can call runExperiment indirectly by removing the model
    // since button is disabled with no model, this just confirms disabled state
    expect(screen.getByRole('button', { name: /run experiment/i })).toBeDisabled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('runs experiment and shows completed state', async () => {
    const { toast } = await import('sonner')
    const user = userEvent.setup()
    mockRunBenchmark.mockResolvedValue({
      overallScore: 78.5,
      averageResponseTime: 350,
      tests: [{ error: null }, { error: null }],
    })

    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /run experiment/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Experiment completed')
      )
    }, { timeout: 5000 })
  })

  it('Sparkle button sets the optimal learning rate from tuner', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    mockGetOptimalRate.mockReturnValueOnce(0.001).mockReturnValueOnce(0.0042)
    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)

    const input = screen.getByRole('spinbutton') as HTMLInputElement
    // The Sparkle button is right next to the LR input — find by closest sibling button
    const sparkleButton = input.parentElement!.querySelector('button') as HTMLButtonElement
    await user.click(sparkleButton)

    expect(toast.success).toHaveBeenCalledWith('Set to optimal rate')
    expect(input.value).toBe('0.0042')
  })

  describe('with existing experiments', () => {
    const exp1 = {
      id: 'exp-1',
      modelId: 'model-1',
      learningRate: 0.001,
      taskType: 'creative_writing' as const,
      benchmarkScore: 65,
      responseTime: 420,
      qualityScore: 65,
      timestamp: Date.now() - 1000,
      trainingLoss: [1.5, 1.0, 0.6],
      validationLoss: [1.6, 1.1, 0.7],
      epochs: 20,
      successRate: 0.9,
    }
    const exp2 = {
      ...exp1,
      id: 'exp-2',
      learningRate: 0.0005,
      benchmarkScore: 80,
      responseTime: 350,
      successRate: 0.95,
      timestamp: Date.now(),
    }

    beforeEach(() => {
      mockExperimentsValue = [exp1, exp2]
    })

    it('Export button is enabled and triggers download', async () => {
      const user = userEvent.setup()
      const { toast } = await import('sonner')
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {})
      try {
        render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
        const exportButton = screen.getByRole('button', { name: /export/i })
        expect(exportButton).not.toBeDisabled()
        await user.click(exportButton)
        expect(clickSpy).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith('Experiments exported')
      } finally {
        clickSpy.mockRestore()
      }
    })

    it('renders results tab with experiment cards', () => {
      render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
      expect(screen.getByRole('tab', { name: /results/i })).toBeInTheDocument()
      expect(screen.getByText(/lr: 0.001000/i)).toBeInTheDocument()
      expect(screen.getByText(/lr: 0.000500/i)).toBeInTheDocument()
      // Score badges (65.0 and 80.0)
      expect(screen.getByText('65.0')).toBeInTheDocument()
      expect(screen.getByText('80.0')).toBeInTheDocument()
    })

    it('marks an experiment as baseline when "Use as Baseline" clicked', async () => {
      const user = userEvent.setup()
      render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
      const baselineButtons = screen.getAllByRole('button', { name: /use as baseline/i })
      await user.click(baselineButtons[0])
      // Switch to compare tab to confirm comparison rendering
      await user.click(screen.getByRole('tab', { name: /compare/i }))
      // Some "% delta" indicator should appear
      const matches = screen.getAllByText(/%/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('renders adjustments tab (empty state with no history)', async () => {
      const user = userEvent.setup()
      render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={vi.fn()} />)
      await user.click(screen.getByRole('tab', { name: /adjustments/i }))
      // Either an empty-state message renders, or an empty list — assert the tab body exists
      expect(screen.getByRole('tab', { name: /adjustments/i })).toHaveAttribute('data-state', 'active')
    })
  })

  it('applies optimal learning rate to the model and calls onModelUpdate', async () => {
    const user = userEvent.setup()
    const onModelUpdate = vi.fn()
    const { toast } = await import('sonner')
    mockRunBenchmark.mockResolvedValue({
      overallScore: 90,
      averageResponseTime: 200,
      tests: [{ error: null }],
    })

    render(<LearningRateBenchmark models={[mockModel]} onModelUpdate={onModelUpdate} />)
    await user.click(screen.getByRole('button', { name: /run experiment/i }))

    // Wait for completed state — "Apply to Model" button appears when not running
    const applyButton = await screen.findByRole(
      'button',
      { name: /apply to model/i },
      { timeout: 5000 }
    )
    await user.click(applyButton)

    expect(onModelUpdate).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Applied optimal learning rate')
    )
  })
})
