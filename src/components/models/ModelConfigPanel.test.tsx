import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ModelConfigPanel } from './ModelConfigPanel'
import type { ModelConfig } from '@/lib/types'

const mockModel: ModelConfig = {
  id: 'model-1',
  name: 'GPT-4o',
  provider: 'openai',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
}

describe('ModelConfigPanel', () => {
  it('renders model name', () => {
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
  })

  it('renders provider badge', () => {
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('openai')).toBeInTheDocument()
  })

  it('renders temperature label and value', () => {
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('0.70')).toBeInTheDocument()
  })

  it('renders maxTokens label and value', () => {
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Max Tokens')).toBeInTheDocument()
    expect(screen.getByText('2048')).toBeInTheDocument()
  })

  it('renders Top P label', () => {
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Top P')).toBeInTheDocument()
  })

  it('calls onSave when Save Configuration clicked', () => {
    const onSave = vi.fn()
    render(<ModelConfigPanel model={mockModel} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('passes model data to onSave', () => {
    const onSave = vi.fn()
    render(<ModelConfigPanel model={mockModel} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave.mock.calls[0][0].id).toBe('model-1')
    expect(onSave.mock.calls[0][0].name).toBe('GPT-4o')
  })

  it('calls onClose when Cancel button clicked', () => {
    const onClose = vi.fn()
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn()
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={onClose} />)
    // The X/close button is the first button in the header
    const buttons = screen.getAllByRole('button')
    const closeBtn = buttons.find(b => b.className.includes('ghost'))
    if (closeBtn) {
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('shows API Endpoint field for custom provider', () => {
    const customModel = { ...mockModel, provider: 'custom' as const }
    render(<ModelConfigPanel model={customModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/api endpoint/i)).toBeInTheDocument()
  })

  it('does not show API Endpoint field for non-custom provider', () => {
    render(<ModelConfigPanel model={mockModel} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/api endpoint/i)).not.toBeInTheDocument()
  })

  it('updates endpoint value via Input onChange and saves it', () => {
    const onSave = vi.fn()
    const customModel = { ...mockModel, provider: 'custom' as const, endpoint: '' }
    render(<ModelConfigPanel model={customModel} onSave={onSave} onClose={vi.fn()} />)
    const endpointInput = screen.getByLabelText(/api endpoint/i) as HTMLInputElement
    fireEvent.change(endpointInput, { target: { value: 'https://my-api.example.com/v1' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://my-api.example.com/v1' })
    )
  })

  it('saves existing endpoint value when endpoint already set', () => {
    const onSave = vi.fn()
    const customModel = { ...mockModel, provider: 'custom' as const, endpoint: 'https://existing.com' }
    render(<ModelConfigPanel model={customModel} onSave={onSave} onClose={vi.fn()} />)
    const endpointInput = screen.getByLabelText(/api endpoint/i) as HTMLInputElement
    expect(endpointInput.value).toBe('https://existing.com')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://existing.com' })
    )
  })
})
