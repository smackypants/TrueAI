/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { LearningRateDashboard } from './LearningRateDashboard'
import { learningRateTuner } from '@/lib/learning-rate-tuner'
import type { FineTuningJob, ModelConfig } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const mockMetrics = {
  currentRate: 0.001,
  recommendedRate: 0.0005,
  confidence: 0.85,
  trainingLoss: [0.5, 0.4, 0.35, 0.3],
  validationLoss: [],
  gradientNorm: [],
  convergenceRate: 0.05,
  stabilityScore: 0.9,
  epochsCompleted: 2,
  timeElapsed: 60_000,
  successRate: 0.95,
}

const baseJob: FineTuningJob = {
  id: 'job-1',
  modelId: 'model-1',
  datasetId: 'dataset-1',
  status: 'running',
  progress: 50,
  epochs: 3,
  learningRate: 0.001,
  batchSize: 8,
  startedAt: Date.now() - 60_000,
  metrics: { loss: [0.5, 0.4, 0.35, 0.3], accuracy: [], epoch: 2, step: 100 },
}

const mockModel: ModelConfig = {
  id: 'model-1', name: 'Test Model', provider: 'ollama',
  temperature: 0.7, maxTokens: 2000, topP: 0.9,
  frequencyPenalty: 0, presencePenalty: 0, size: 500_000_000,
}

describe('LearningRateDashboard', () => {
  beforeAll(() => {
    HTMLElement.prototype.hasPointerCapture = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })
  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(learningRateTuner, 'getLearningRateMetrics').mockReturnValue(mockMetrics as any)
    vi.spyOn(learningRateTuner, 'analyzeLoss').mockReturnValue({ trend: 'decreasing' } as any)
    vi.spyOn(learningRateTuner, 'recommendLearningRate').mockReturnValue(null as any)
    vi.spyOn(learningRateTuner, 'generateSchedule').mockReturnValue({
      type: 'cosine_annealing', initialRate: 0.001, minRate: 0.00001, maxRate: 0.01,
      warmupSteps: 100, decayFactor: 0.5,
    } as any)
    vi.spyOn(learningRateTuner, 'applySchedule').mockImplementation((s: any, e: number) => s.maxRate * Math.exp(-e / 10))
  })

  it('empty state when no jobs', () => {
    render(<LearningRateDashboard models={[]} fineTuningJobs={[]} onUpdateJobLearningRate={vi.fn()} />)
    expect(screen.getByText(/no fine-tuning jobs/i)).toBeInTheDocument()
  })

  it('renders heading + Auto-Tune badge (Off) + Enable button when there are jobs', () => {
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /learning rate fine-tuning/i })).toBeInTheDocument()
    expect(screen.getByText(/auto-tune off/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^enable$/i })).toBeInTheDocument()
  })

  it('Enable/Disable toggles auto-tune badge', async () => {
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^enable$/i }))
    expect(screen.getByText(/auto-tune on/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^disable$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))
    expect(screen.getByText(/auto-tune off/i)).toBeInTheDocument()
  })

  it('selecting a job renders Tabs with Metrics content (current/recommended/confidence/stability)', async () => {
    const user = userEvent.setup()
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={vi.fn()} />)
    const trigger = (await screen.findByText('Choose a job...')).closest('[role="combobox"]') as HTMLElement
    await user.click(trigger)
    const opt = await screen.findByRole('option', { name: /Test Model/i })
    await user.click(opt)
    await waitFor(() => expect(screen.getByText(/current metrics/i)).toBeInTheDocument())
    expect(screen.getByText(/current rate/i)).toBeInTheDocument()
    expect(screen.getByText(/recommended/i)).toBeInTheDocument()
    expect(screen.getAllByText('0.001000').length).toBeGreaterThan(0)
    expect(screen.getByText('0.000500')).toBeInTheDocument()
    expect(screen.getByText(/loss trend/i)).toBeInTheDocument()
  })

  it('Adjustments tab shows empty-state copy when no auto-tune adjustments', async () => {
    const user = userEvent.setup()
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={vi.fn()} />)
    const trigger = (await screen.findByText('Choose a job...')).closest('[role="combobox"]') as HTMLElement
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Test Model/i }))
    await user.click(screen.getByRole('tab', { name: /adjustments/i }))
    expect(await screen.findByText(/no adjustments made yet/i)).toBeInTheDocument()
  })

  it('Schedule tab: Generate Schedule populates fields + visualization + toast.success', async () => {
    const user = userEvent.setup()
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={vi.fn()} />)
    const trigger = (await screen.findByText('Choose a job...')).closest('[role="combobox"]') as HTMLElement
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Test Model/i }))
    await user.click(screen.getByRole('tab', { name: /schedule/i }))
    expect(screen.getByText(/generate a learning rate schedule/i)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /generate schedule/i }))
    })
    expect(toast.success).toHaveBeenCalledWith('Learning rate schedule generated')
    expect(screen.getByText(/schedule type/i)).toBeInTheDocument()
    expect(screen.getByText(/cosine annealing/i)).toBeInTheDocument()
    expect(screen.getByText(/warmup steps/i)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText(/decay factor/i)).toBeInTheDocument()
  })

  it('Manual tab: invalid rate → toast.error; valid rate → onUpdateJobLearningRate + toast.success', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={onUpdate} />)
    const trigger = (await screen.findByText('Choose a job...')).closest('[role="combobox"]') as HTMLElement
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Test Model/i }))
    await user.click(screen.getByRole('tab', { name: /manual/i }))

    // Invalid: clear → 0
    const input = screen.getByLabelText(/custom learning rate/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(toast.error).toHaveBeenCalledWith('Invalid learning rate')
    expect(onUpdate).not.toHaveBeenCalled()

    // Valid
    fireEvent.change(input, { target: { value: '0.005' } })
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(onUpdate).toHaveBeenCalledWith('job-1', 0.005)
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Learning rate set to'))
  })

  it('Manual tab quick-preset buttons call onUpdateJobLearningRate with preset rate', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={onUpdate} />)
    const trigger = (await screen.findByText('Choose a job...')).closest('[role="combobox"]') as HTMLElement
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Test Model/i }))
    await user.click(screen.getByRole('tab', { name: /manual/i }))
    fireEvent.click(screen.getByRole('button', { name: '0.0001' }))
    expect(onUpdate).toHaveBeenCalledWith('job-1', 0.0001)
  })

  it('auto-tune effect: when enabled and recommendLearningRate returns high-confidence adjustment, calls onUpdateJobLearningRate + toast.success', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    ;(learningRateTuner.recommendLearningRate as any).mockReturnValue({
      oldRate: 0.001, newRate: 0.0005, reason: 'Loss plateau',
      confidence: 0.9, expectedImprovement: '+10% conv', strategy: 'reduce',
      timestamp: Date.now(),
    })
    render(<LearningRateDashboard models={[mockModel]} fineTuningJobs={[baseJob]} onUpdateJobLearningRate={onUpdate} />)
    // Select job
    const trigger = (await screen.findByText('Choose a job...')).closest('[role="combobox"]') as HTMLElement
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Test Model/i }))
    // Enable auto-tune
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^enable$/i }))
    })
    expect(onUpdate).toHaveBeenCalledWith('job-1', 0.0005)
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Learning rate adjusted'),
      expect.objectContaining({ description: 'Loss plateau' })
    )
    // Adjustments tab now shows the entry
    await user.click(screen.getByRole('tab', { name: /adjustments/i }))
    expect(await screen.findByText('Loss plateau')).toBeInTheDocument()
    expect(screen.getByText(/reduce/i)).toBeInTheDocument()
  })
})
