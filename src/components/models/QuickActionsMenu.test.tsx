import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionsMenu } from './QuickActionsMenu'
import type { ModelConfig } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const mockModel: ModelConfig = {
  id: 'm1', name: 'Test Model', provider: 'ollama',
  temperature: 0.7, maxTokens: 2000, topP: 0.9,
  frequencyPenalty: 0, presencePenalty: 0
}

describe('QuickActionsMenu', () => {
  it('renders the Quick Settings trigger button', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    expect(screen.getByText('Quick Settings')).toBeInTheDocument()
  })

  it('opens sheet on button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    expect(screen.getByText('Presets')).toBeInTheDocument()
  })

  it('shows model name in sheet description', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    expect(screen.getByText(/Test Model/)).toBeInTheDocument()
  })

  it('shows all four presets', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    expect(screen.getByText('Creative')).toBeInTheDocument()
    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getByText('Precise')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
  })

  it('calls onUpdate when Apply Settings clicked', () => {
    const onUpdate = vi.fn()
    render(<QuickActionsMenu model={mockModel} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    fireEvent.click(screen.getByText('Apply Settings'))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }))
  })

  it('increments temperature on + button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[0])
    expect(screen.getByText('0.80')).toBeInTheDocument()
  })

  it('decrements temperature on - button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const minusButtons = screen.getAllByText('-')
    fireEvent.click(minusButtons[0])
    expect(screen.getByText('0.60')).toBeInTheDocument()
  })

  it('clamps temperature at 0 when decrementing past minimum', () => {
    const cold = { ...mockModel, temperature: 0.05 }
    render(<QuickActionsMenu model={cold} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const minusButtons = screen.getAllByText('-')
    fireEvent.click(minusButtons[0])
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('increments maxTokens on + button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const plusButtons = screen.getAllByText('+')
    // plusButtons[1] is the maxTokens + button (order: temp+, maxTokens+, topP+)
    fireEvent.click(plusButtons[1])
    expect(screen.getByText('2100')).toBeInTheDocument()
  })

  it('applies Creative preset and shows Active badge', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const creativeCard = screen.getByText('Creative').closest('[data-slot="card"]') as HTMLElement
    fireEvent.click(creativeCard)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('resets to original model state on Reset click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    // Bump temperature first
    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[0])
    // Now reset
    fireEvent.click(screen.getByText('Reset'))
    expect(screen.getByText('0.70')).toBeInTheDocument()
  })

  it('saves updated settings via Apply Settings after preset', () => {
    const onUpdate = vi.fn()
    render(<QuickActionsMenu model={mockModel} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const preciseCard = screen.getByText('Precise').closest('[data-slot="card"]') as HTMLElement
    fireEvent.click(preciseCard)
    fireEvent.click(screen.getByText('Apply Settings'))
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.3 })
    )
  })

  it('applying preset clears previous Active badge when another preset is clicked', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const creativeCard = screen.getByText('Creative').closest('[data-slot="card"]') as HTMLElement
    fireEvent.click(creativeCard)
    // Active badge should appear
    expect(screen.getByText('Active')).toBeInTheDocument()
    const balancedCard = screen.getByText('Balanced').closest('[data-slot="card"]') as HTMLElement
    fireEvent.click(balancedCard)
    // Still one Active badge (for Balanced now)
    expect(screen.getAllByText('Active')).toHaveLength(1)
  })

  it('increments topP on + button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const plusButtons = screen.getAllByText('+')
    // plusButtons[2] is the topP + button (order: temp+, maxTokens+, topP+)
    fireEvent.click(plusButtons[2])
    expect(screen.getByText('0.95')).toBeInTheDocument()
  })

  it('decrements topP on - button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const minusButtons = screen.getAllByText('-')
    fireEvent.click(minusButtons[2])
    expect(screen.getByText('0.85')).toBeInTheDocument()
  })

  it('clamps topP at 0 when decrementing past minimum', () => {
    const model = { ...mockModel, topP: 0.02 }
    render(<QuickActionsMenu model={model} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const minusButtons = screen.getAllByText('-')
    fireEvent.click(minusButtons[2])
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('clamps topP at 1 when incrementing past maximum', () => {
    const model = { ...mockModel, topP: 0.98 }
    render(<QuickActionsMenu model={model} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[2])
    expect(screen.getByText('1.00')).toBeInTheDocument()
  })

  it('clamps temperature at 2 when incrementing past maximum', () => {
    const model = { ...mockModel, temperature: 1.99 }
    render(<QuickActionsMenu model={model} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[0])
    expect(screen.getByText('2.00')).toBeInTheDocument()
  })

  it('clamps maxTokens at 4000 when incrementing past maximum', () => {
    const model = { ...mockModel, maxTokens: 3950 }
    render(<QuickActionsMenu model={model} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const plusButtons = screen.getAllByText('+')
    fireEvent.click(plusButtons[1])
    expect(screen.getByText('4000')).toBeInTheDocument()
  })

  it('decrements maxTokens on - button click', () => {
    render(<QuickActionsMenu model={mockModel} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Quick Settings'))
    const minusButtons = screen.getAllByText('-')
    fireEvent.click(minusButtons[1])
    expect(screen.getByText('1900')).toBeInTheDocument()
  })
})
