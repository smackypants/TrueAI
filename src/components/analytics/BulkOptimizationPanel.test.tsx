/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { BulkOptimizationPanel } from './BulkOptimizationPanel'
import { bulkOptimizationManager } from '@/lib/bulk-optimization'
import type { ModelConfig } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mockModel: ModelConfig = {
  id: 'model-1', name: 'Test Model', provider: 'ollama',
  temperature: 0.7, maxTokens: 2000, topP: 0.9,
  frequencyPenalty: 0, presencePenalty: 0,
}

const speedBundle: any = {
  id: 'speed-boost', name: 'Speed Boost', description: 'Make it faster',
  category: 'performance', icon: '⚡',
  actions: [
    { id: 'a1', type: 'adjust_parameters', target: 'model', description: 'Lower temp', reversible: true },
    { id: 'a2', type: 'enable_feature', target: 'system', description: 'Enable cache', reversible: false },
  ],
  affectedModels: ['model-1'],
  estimatedImpact: { performance: '+30% faster', efficiency: 'Less memory' },
  createdAt: 1, priority: 1,
}
const qualityBundle: any = {
  id: 'quality-enhancement', name: 'Quality Plus', description: 'Better outputs',
  category: 'quality', icon: '✨',
  actions: [{ id: 'b1', type: 'adjust_parameters', target: 'model', description: 'Boost top_p', reversible: true }],
  affectedModels: ['model-1'],
  estimatedImpact: { quality: 'Higher coherence' },
  createdAt: 2, priority: 1,
}

const successResult: any = {
  bundleId: 'speed-boost', success: true,
  appliedActions: ['a1', 'a2'], failedActions: [], rollbackAvailable: true,
  timestamp: Date.now(),
  metrics: { executionTime: 1234, affectedModels: 1, parameterChanges: 2 },
}

describe('BulkOptimizationPanel', () => {
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
    vi.spyOn(bulkOptimizationManager, 'getAvailableBundles').mockReturnValue([speedBundle, qualityBundle])
    vi.spyOn(bulkOptimizationManager, 'getBundleHistory').mockReturnValue([])
    vi.spyOn(bulkOptimizationManager, 'applyBundle').mockResolvedValue(successResult)
    vi.spyOn(bulkOptimizationManager, 'rollbackBundle').mockResolvedValue(true)
    vi.spyOn(bulkOptimizationManager, 'getPresetBundles').mockReturnValue([speedBundle])
  })

  it('renders heading and bundle cards', () => {
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /bulk optimizations/i })).toBeInTheDocument()
    expect(screen.getByText('Speed Boost')).toBeInTheDocument()
    expect(screen.getByText('Quality Plus')).toBeInTheDocument()
  })

  it('category filter narrows visible bundles', async () => {
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^performance$/i }))
    expect(screen.getByText('Speed Boost')).toBeInTheDocument()
    expect(screen.queryByText('Quality Plus')).not.toBeInTheDocument()
    // Switch to quality
    fireEvent.click(screen.getByRole('button', { name: /^quality$/i }))
    expect(screen.queryByText('Speed Boost')).not.toBeInTheDocument()
    expect(screen.getByText('Quality Plus')).toBeInTheDocument()
    // Empty case for 'efficiency' — neither bundle matches
    fireEvent.click(screen.getByRole('button', { name: /^efficiency$/i }))
    expect(await screen.findByText(/no bundles available/i)).toBeInTheDocument()
    expect(screen.getByText(/no optimization bundles in the efficiency category/i)).toBeInTheDocument()
  })

  it('selecting a bundle shows Apply Selected; clicking it calls applyBundle + onApplyBundle + toast.success', async () => {
    const onApplyBundle = vi.fn().mockResolvedValue(undefined)
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={onApplyBundle} />)
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
    const apply = screen.getByRole('button', { name: /apply selected/i })
    await act(async () => { fireEvent.click(apply) })
    expect(bulkOptimizationManager.applyBundle).toHaveBeenCalled()
    expect(onApplyBundle).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Successfully applied 1 optimization bundle/))
  })

  it('applyBundle error path surfaces toast.error', async () => {
    ;(bulkOptimizationManager.applyBundle as any).mockRejectedValue(new Error('boom'))
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /apply selected/i })) })
    expect(toast.error).toHaveBeenCalledWith('Failed to apply optimization bundles')
  })

  it('View Details opens dialog with actions, impact, affected models, and Select/Deselect toggle', async () => {
    const user = userEvent.setup()
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    const detailsBtns = screen.getAllByRole('button', { name: /view details/i })
    await user.click(detailsBtns[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Actions \(2\)/)).toBeInTheDocument()
    expect(within(dialog).getByText('Lower temp')).toBeInTheDocument()
    expect(within(dialog).getByText('Enable cache')).toBeInTheDocument()
    expect(within(dialog).getByText(/Estimated Impact/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Affected Models \(1\)/)).toBeInTheDocument()
    expect(within(dialog).getByText('Test Model')).toBeInTheDocument()
    // Click Select Bundle → toggles selection and closes dialog
    await user.click(within(dialog).getByRole('button', { name: /^select bundle$/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
  })

  it('Presets tab: Apply Preset success path', async () => {
    const user = userEvent.setup()
    const onApplyBundle = vi.fn().mockResolvedValue(undefined)
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={onApplyBundle} />)
    await user.click(screen.getByRole('tab', { name: /presets/i }))
    const applyBtns = await screen.findAllByRole('button', { name: /apply preset/i })
    await act(async () => { fireEvent.click(applyBtns[0]) })
    expect(bulkOptimizationManager.getPresetBundles).toHaveBeenCalled()
    expect(bulkOptimizationManager.applyBundle).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Successfully applied ".+" preset/))
  })

  it('Presets tab: empty preset shows toast.error', async () => {
    const user = userEvent.setup()
    ;(bulkOptimizationManager.getPresetBundles as any).mockReturnValue([])
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /presets/i }))
    const applyBtns = await screen.findAllByRole('button', { name: /apply preset/i })
    await act(async () => { fireEvent.click(applyBtns[0]) })
    expect(toast.error).toHaveBeenCalledWith('No bundles available for this preset')
  })

  it('History tab: empty state when no history', async () => {
    const user = userEvent.setup()
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(await screen.findByText(/no history yet/i)).toBeInTheDocument()
  })

  it('History tab: shows entries with metrics + Rollback button calls rollbackBundle', async () => {
    const user = userEvent.setup()
    ;(bulkOptimizationManager.getBundleHistory as any).mockReturnValue([successResult])
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(await screen.findByText('Speed Boost')).toBeInTheDocument()
    expect(screen.getByText('1.2s')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /rollback/i })) })
    expect(bulkOptimizationManager.rollbackBundle).toHaveBeenCalledWith('speed-boost', [mockModel])
    expect(toast.success).toHaveBeenCalledWith('Successfully rolled back optimization')
  })

  it('History tab: rollback returning false → toast.error', async () => {
    const user = userEvent.setup()
    ;(bulkOptimizationManager.getBundleHistory as any).mockReturnValue([successResult])
    ;(bulkOptimizationManager.rollbackBundle as any).mockResolvedValue(false)
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /history/i }))
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: /rollback/i })) })
    expect(toast.error).toHaveBeenCalledWith('Failed to rollback optimization')
  })

  it('History tab: failed result shows failed-actions block', async () => {
    const user = userEvent.setup()
    const failedResult: any = {
      ...successResult, success: false,
      failedActions: [{ actionId: 'a1', error: 'oops' }, { actionId: 'a2', error: 'nope' }],
    }
    ;(bulkOptimizationManager.getBundleHistory as any).mockReturnValue([failedResult])
    render(<BulkOptimizationPanel models={[mockModel]} onApplyBundle={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: /history/i }))
    expect(await screen.findByText(/2 Failed Actions/)).toBeInTheDocument()
    expect(screen.getAllByText(/^Failed$/).length).toBeGreaterThan(0)
    expect(screen.getByText('oops')).toBeInTheDocument()
  })
})
