import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock asset imports
vi.mock('@/assets', () => ({
  emptyStateEnsemble: 'mock-ensemble-svg',
}))

import { EnsembleManager } from './EnsembleManager'
import type { EnsembleAgent } from '@/lib/types'

const makeEnsemble = (overrides: Partial<EnsembleAgent> = {}): EnsembleAgent => ({
  id: 'e1',
  name: 'Test Ensemble',
  models: ['gpt-4o', 'gpt-4o-mini'],
  strategy: 'consensus',
  createdAt: Date.now(),
  runs: [],
  ...overrides,
})

describe('EnsembleManager', () => {
  it('renders empty state when no ensembles', () => {
    render(
      <EnsembleManager
        ensembles={[]}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('No ensembles configured')).toBeInTheDocument()
  })

  it('shows Create Ensemble button in empty state', () => {
    render(
      <EnsembleManager
        ensembles={[]}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /create ensemble/i })).toBeInTheDocument()
  })

  it('calls onCreateEnsemble when Create button clicked in empty state', () => {
    const onCreateEnsemble = vi.fn()
    render(
      <EnsembleManager
        ensembles={[]}
        onCreateEnsemble={onCreateEnsemble}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /create ensemble/i }))
    expect(onCreateEnsemble).toHaveBeenCalledOnce()
  })

  it('renders ensemble card when ensembles provided', () => {
    const ensembles = [makeEnsemble({ name: 'My Ensemble' })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('My Ensemble')).toBeInTheDocument()
  })

  it('shows heading when ensembles are present', () => {
    const ensembles = [makeEnsemble()]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('Multi-Model Ensemble')).toBeInTheDocument()
  })

  it('calls onDeleteEnsemble when delete button clicked', () => {
    const onDeleteEnsemble = vi.fn()
    const ensembles = [makeEnsemble({ id: 'e1' })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={onDeleteEnsemble}
      />
    )
    // The delete button has no text label (only a Trash icon), so find it by its position
    // relative to the ensemble name
    const buttons = screen.getAllByRole('button')
    // The ghost button with a Trash icon is the delete button (small, icon-only)
    const deleteBtn = buttons.find(b => b.getAttribute('data-slot') === 'button' &&
      b.className.includes('ghost'))
    if (deleteBtn) {
      fireEvent.click(deleteBtn)
      expect(onDeleteEnsemble).toHaveBeenCalledWith('e1')
    } else {
      // Fallback: click second button (after "Create Ensemble")
      fireEvent.click(buttons[1])
      expect(onDeleteEnsemble).toHaveBeenCalled()
    }
  })

  it('shows strategy badge on ensemble card', () => {
    const ensembles = [makeEnsemble({ strategy: 'majority' })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('majority')).toBeInTheDocument()
  })

  it('shows model badges on ensemble card', () => {
    const ensembles = [makeEnsemble({ models: ['gpt-4o', 'claude-3'] })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('claude-3')).toBeInTheDocument()
  })

  it('shows Models (2) label with correct count', () => {
    const ensembles = [makeEnsemble({ models: ['gpt-4o', 'gpt-4o-mini'] })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('Models (2)')).toBeInTheDocument()
  })

  it('calls onCreateEnsemble from header button when ensembles present', () => {
    const onCreateEnsemble = vi.fn()
    const ensembles = [makeEnsemble()]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={onCreateEnsemble}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /create ensemble/i }))
    expect(onCreateEnsemble).toHaveBeenCalledOnce()
  })

  it('shows recent runs section when an ensemble has runs', () => {
    const run = {
      id: 'run1',
      ensembleId: 'e1',
      prompt: 'Test prompt',
      responses: [{ model: 'gpt-4o', response: 'OK', latency: 100 }],
      timestamp: Date.now(),
    }
    const ensembles = [makeEnsemble({ id: 'e1', runs: [run] })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('Recent Runs')).toBeInTheDocument()
    expect(screen.getByText('Test prompt')).toBeInTheDocument()
    expect(screen.getByText('1 models responded')).toBeInTheDocument()
  })

  it('shows last run date and total runs count when runs present', () => {
    const run = {
      id: 'run1',
      ensembleId: 'e1',
      prompt: 'Hello',
      responses: [],
      timestamp: new Date('2025-01-15').getTime(),
    }
    const ensembles = [makeEnsemble({ id: 'e1', runs: [run] })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('1 total runs')).toBeInTheDocument()
    expect(screen.getByText('Last Run')).toBeInTheDocument()
  })

  it('calls onRunEnsemble with prompt when Run Ensemble confirmed', () => {
    const onRunEnsemble = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'prompt').mockReturnValue('My test prompt')
    const ensembles = [makeEnsemble({ id: 'e1' })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={onRunEnsemble}
        onDeleteEnsemble={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /run ensemble/i }))
    expect(onRunEnsemble).toHaveBeenCalledWith('e1', 'My test prompt')
    vi.restoreAllMocks()
  })

  it('does NOT call onRunEnsemble when prompt is cancelled', () => {
    const onRunEnsemble = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    const ensembles = [makeEnsemble({ id: 'e1' })]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={onRunEnsemble}
        onDeleteEnsemble={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /run ensemble/i }))
    expect(onRunEnsemble).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('renders multiple ensemble cards', () => {
    const ensembles = [
      makeEnsemble({ id: 'e1', name: 'Ensemble A' }),
      makeEnsemble({ id: 'e2', name: 'Ensemble B' }),
    ]
    render(
      <EnsembleManager
        ensembles={ensembles}
        onCreateEnsemble={vi.fn()}
        onRunEnsemble={vi.fn()}
        onDeleteEnsemble={vi.fn()}
      />
    )
    expect(screen.getByText('Ensemble A')).toBeInTheDocument()
    expect(screen.getByText('Ensemble B')).toBeInTheDocument()
  })
})
