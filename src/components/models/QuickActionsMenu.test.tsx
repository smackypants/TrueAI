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
})
