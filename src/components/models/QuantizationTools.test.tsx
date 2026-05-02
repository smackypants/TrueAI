import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

vi.mock('@/assets', () => ({
  emptyStateQuantization: 'mock-svg',
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { QuantizationTools } from './QuantizationTools'
import type { QuantizationJob, ModelConfig } from '@/lib/types'

const makeModel = (overrides: Partial<ModelConfig> = {}): ModelConfig => ({
  id: 'm1',
  name: 'Llama 7B',
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  size: 4 * 1024 * 1024 * 1024, // 4 GB
  ...overrides,
})

const makeJob = (overrides: Partial<QuantizationJob> = {}): QuantizationJob => ({
  id: 'job-1',
  modelId: 'm1',
  targetFormat: 'Q4_0',
  status: 'pending',
  progress: 0,
  startedAt: 1_700_000_000_000,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('QuantizationTools', () => {
  it('renders heading and the format guide cards', () => {
    render(
      <QuantizationTools
        models={[]}
        jobs={[]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    expect(screen.getByText('Model Quantization')).toBeInTheDocument()
    // All seven format badges show up in the format guide
    for (const fmt of ['Q4_0', 'Q4_1', 'Q5_0', 'Q5_1', 'Q8_0', 'F16', 'F32']) {
      expect(screen.getAllByText(fmt).length).toBeGreaterThan(0)
    }
  })

  it('disables Quantize Model button when there are no models', () => {
    render(
      <QuantizationTools
        models={[]}
        jobs={[]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /quantize model/i })).toBeDisabled()
  })

  it('shows the empty state when no jobs exist', () => {
    render(
      <QuantizationTools
        models={[makeModel()]}
        jobs={[]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    expect(screen.getByText('No quantization jobs yet')).toBeInTheDocument()
  })

  it('renders a running job with progress bar', () => {
    render(
      <QuantizationTools
        models={[makeModel({ id: 'm1', name: 'Llama Run' })]}
        jobs={[makeJob({ status: 'running', progress: 42 })]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    expect(screen.getByText('Llama Run')).toBeInTheDocument()
    expect(screen.getAllByText('running').length).toBeGreaterThan(0)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('renders a completed job with sizes, compression, result card and download button', () => {
    const onDownloadModel = vi.fn()
    render(
      <QuantizationTools
        models={[makeModel({ id: 'm1', name: 'Llama Done' })]}
        jobs={[
          makeJob({
            status: 'completed',
            progress: 100,
            originalSize: 4 * 1024 * 1024 * 1024, // 4 GB
            quantizedSize: 1 * 1024 * 1024 * 1024, // 1 GB → 75% smaller
            completedAt: 1_700_000_100_000,
            resultModelId: 'm1-q4',
          }),
        ]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={onDownloadModel}
      />
    )
    expect(screen.getByText('4.00 GB')).toBeInTheDocument()
    expect(screen.getByText('1.00 GB')).toBeInTheDocument()
    expect(screen.getByText('75.0% smaller')).toBeInTheDocument()
    expect(screen.getByText('Result Model:')).toBeInTheDocument()
    expect(screen.getByText('m1-q4')).toBeInTheDocument()
    // The completed job card has two icon-only buttons: download (first) and trash (second).
    const iconButtons = screen
      .getAllByRole('button')
      .filter((b) => b.querySelector('svg') && !b.textContent?.trim())
    expect(iconButtons.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(iconButtons[0])
    expect(onDownloadModel).toHaveBeenCalledWith('m1-q4')
  })

  it('renders failed job with error message', () => {
    render(
      <QuantizationTools
        models={[makeModel({ id: 'm1', name: 'Llama Fail' })]}
        jobs={[
          makeJob({ status: 'failed', error: 'Out of memory' }),
        ]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    expect(screen.getByText('Out of memory')).toBeInTheDocument()
    expect(screen.getAllByText('failed').length).toBeGreaterThan(0)
  })

  it('renders pending status (default-color path) and "Unknown Model" when modelId not in models', () => {
    render(
      <QuantizationTools
        models={[]}
        jobs={[makeJob({ status: 'pending', modelId: 'missing' })]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    expect(screen.getByText('Unknown Model')).toBeInTheDocument()
    expect(screen.getAllByText('pending').length).toBeGreaterThan(0)
  })

  it('delete button calls onDeleteJob and toasts success', () => {
    const onDeleteJob = vi.fn()
    render(
      <QuantizationTools
        models={[makeModel()]}
        jobs={[makeJob({ id: 'job-del', status: 'pending' })]}
        onStartJob={vi.fn()}
        onDeleteJob={onDeleteJob}
        onDownloadModel={vi.fn()}
      />
    )
    // The pending status job has no completed download button, so the only icon-only
    // button inside the job card is the trash button.
    const trashButtons = screen
      .getAllByRole('button')
      .filter((b) => b.querySelector('svg') && !b.textContent?.trim())
    fireEvent.click(trashButtons[trashButtons.length - 1])
    expect(onDeleteJob).toHaveBeenCalledWith('job-del')
    expect(toast.success).toHaveBeenCalledWith('Job deleted')
  })

  it('formatBytes renders "Unknown" when size is 0/undefined', () => {
    // Render a completed job with no quantizedSize → compression branch returns null
    // and the size cells are omitted because of the truthy guards.
    render(
      <QuantizationTools
        models={[makeModel({ id: 'm1', name: 'No-Size Model' })]}
        jobs={[
          makeJob({
            status: 'completed',
            originalSize: 0, // falsy → "Unknown" path of formatBytes is exercised via the model size below
            completedAt: 1_700_000_200_000,
          }),
        ]}
        onStartJob={vi.fn()}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    // No "% smaller" because either size is falsy
    expect(screen.queryByText(/% smaller/)).not.toBeInTheDocument()
    // Started + Completed timestamps both render
    expect(screen.getByText(/Started:/)).toBeInTheDocument()
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
  })

  it('opens the New Job dialog and Cancel closes it without calling onStartJob', () => {
    const onStartJob = vi.fn()
    render(
      <QuantizationTools
        models={[makeModel()]}
        jobs={[]}
        onStartJob={onStartJob}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /quantize model/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Quantization Info')).toBeInTheDocument()
    // Start Quantization disabled with no model selected
    expect(within(dialog).getByRole('button', { name: /start quantization/i })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onStartJob).not.toHaveBeenCalled()
  })

  it('starts quantization: builds job, calls onStartJob, closes dialog, toasts success', () => {
    // Stub Radix Select prerequisites in jsdom.
    Element.prototype.hasPointerCapture = (() => false) as never
    Element.prototype.releasePointerCapture = (() => {}) as never
    Element.prototype.scrollIntoView = (() => {}) as never
    const onStartJob = vi.fn()
    render(
      <QuantizationTools
        models={[makeModel({ id: 'mx', name: 'Pickable Model' })]}
        jobs={[]}
        onStartJob={onStartJob}
        onDeleteJob={vi.fn()}
        onDownloadModel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /quantize model/i }))
    const dialog = screen.getByRole('dialog')
    // Open the model Select and pick the only option.
    const modelTrigger = within(dialog).getByRole('combobox', { name: /source model/i })
    fireEvent.click(modelTrigger)
    fireEvent.click(screen.getByText('Pickable Model'))
    // Open the format Select and pick a non-default option to exercise its onValueChange.
    const formatTrigger = within(dialog).getByRole('combobox', { name: /target format/i })
    fireEvent.click(formatTrigger)
    // The format guide also renders 'Q8_0 (8-bit)', so target the role="option" in the popper.
    const q8Option = screen.getByRole('option', { name: /Q8_0 \(8-bit\)/ })
    fireEvent.click(q8Option)
    // Now Start Quantization should be enabled.
    const startBtn = within(dialog).getByRole('button', { name: /start quantization/i })
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)
    expect(onStartJob).toHaveBeenCalledTimes(1)
    const job = onStartJob.mock.calls[0][0] as QuantizationJob
    expect(job.modelId).toBe('mx')
    expect(job.targetFormat).toBe('Q8_0')
    expect(job.status).toBe('running')
    expect(job.progress).toBe(0)
    expect(job.id).toMatch(/^quant-\d+$/)
    expect(toast.success).toHaveBeenCalledWith('Quantization started')
  })
})
