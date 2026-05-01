import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import userEvent from '@testing-library/user-event'

vi.mock('@/assets', () => ({
  emptyStateModels: 'mock-models-svg',
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { GGUFLibrary } from './GGUFLibrary'
import type { GGUFModel } from '@/lib/types'

// Radix Select pointer-capture stubs
beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {}
  }
})

const makeModel = (overrides: Partial<GGUFModel> = {}): GGUFModel => ({
  id: 'm1',
  name: 'Llama-3-8B',
  filename: 'llama-3-8b.gguf',
  path: '/models/llama-3-8b.gguf',
  size: 4 * 1024 * 1024 * 1024,
  quantization: 'Q4_K_M',
  architecture: 'llama',
  contextLength: 4096,
  downloadedAt: Date.now(),
  metadata: { format: 'GGUF' },
  ...overrides,
})

describe('GGUFLibrary', () => {
  it('renders empty state when no models', () => {
    render(
      <GGUFLibrary
        models={[]}
        onAddModel={vi.fn()}
        onDeleteModel={vi.fn()}
      />
    )
    expect(screen.getByText('No Models Found')).toBeInTheDocument()
  })

  it('renders model name when models provided', () => {
    const models = [makeModel({ name: 'Llama-3-8B' })]
    render(
      <GGUFLibrary
        models={models}
        onAddModel={vi.fn()}
        onDeleteModel={vi.fn()}
      />
    )
    expect(screen.getByText('Llama-3-8B')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(
      <GGUFLibrary
        models={[makeModel()]}
        onAddModel={vi.fn()}
        onDeleteModel={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters models by search query', () => {
    const models = [
      makeModel({ id: 'm1', name: 'Llama-3-8B' }),
      makeModel({ id: 'm2', name: 'Mistral-7B' }),
    ]
    render(
      <GGUFLibrary
        models={models}
        onAddModel={vi.fn()}
        onDeleteModel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'xyznonexistent' },
    })
    // With a non-matching query, no models should be found
    expect(screen.getByText('No Models Found')).toBeInTheDocument()
  })

  it('shows Add Model button', () => {
    render(
      <GGUFLibrary
        models={[]}
        onAddModel={vi.fn()}
        onDeleteModel={vi.fn()}
      />
    )
    expect(screen.getAllByRole('button', { name: /add model/i }).length).toBeGreaterThan(0)
  })

  it('renders quantization badge', () => {
    const models = [makeModel({ quantization: 'Q4_K_M' })]
    render(
      <GGUFLibrary
        models={models}
        onAddModel={vi.fn()}
        onDeleteModel={vi.fn()}
      />
    )
    expect(screen.getByText('Q4_K_M')).toBeInTheDocument()
  })

  it('clicking model card shows Model Details panel', async () => {
    const user = userEvent.setup()
    const models = [makeModel()]
    render(<GGUFLibrary models={models} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    await user.click(screen.getByText('Llama-3-8B'))
    expect(screen.getByText('Model Details')).toBeInTheDocument()
  })

  it('model details shows filename', async () => {
    const user = userEvent.setup()
    const models = [makeModel({ filename: 'llama-3-8b.gguf' })]
    render(<GGUFLibrary models={models} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    await user.click(screen.getByText('Llama-3-8B'))
    // filename appears in details panel as mono text
    expect(screen.getAllByText('llama-3-8b.gguf').length).toBeGreaterThan(0)
  })

  it('model details shows context length', async () => {
    const user = userEvent.setup()
    const models = [makeModel({ contextLength: 4096 })]
    render(<GGUFLibrary models={models} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    await user.click(screen.getByText('Llama-3-8B'))
    expect(screen.getByText('4,096 tokens')).toBeInTheDocument()
  })

  it('clicking delete calls onDeleteModel', async () => {
    const user = userEvent.setup()
    const onDeleteModel = vi.fn()
    const models = [makeModel()]
    render(<GGUFLibrary models={models} onAddModel={vi.fn()} onDeleteModel={onDeleteModel} />)
    await user.click(screen.getByText('Llama-3-8B'))
    // Delete button (trash icon) appears in details panel
    const deleteBtn = screen.getByRole('button', { name: '' }) // ghost icon button
    // Find the delete button in the panel by looking for svg trash icon
    const trashButtons = document.querySelectorAll('[data-slot="card"] button')
    // Click the first button in the details panel (delete button)
    const panel = screen.getByText('Model Details').closest('[data-slot="card"]') as HTMLElement
    const deleteButton = panel.querySelector('button') as HTMLElement
    fireEvent.click(deleteButton)
    expect(onDeleteModel).toHaveBeenCalledWith('m1')
  })

  it('opening Add Model dialog shows form', async () => {
    const user = userEvent.setup()
    render(<GGUFLibrary models={[]} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    const addButtons = screen.getAllByRole('button', { name: /add model/i })
    await user.click(addButtons[0])
    expect(screen.getByText('Add GGUF Model')).toBeInTheDocument()
    expect(screen.getByLabelText(/model name/i)).toBeInTheDocument()
  })

  it('filling form and submitting calls onAddModel', async () => {
    const user = userEvent.setup()
    const onAddModel = vi.fn()
    render(<GGUFLibrary models={[]} onAddModel={onAddModel} onDeleteModel={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: /add model/i })[0])

    await user.type(screen.getByLabelText(/model name/i), 'My New Model')
    await user.type(screen.getByLabelText(/filename/i), 'my-model.gguf')
    await user.type(screen.getByLabelText(/size \(gb\)/i), '4')

    // Submit by clicking "Add Model" in dialog footer
    const dialogFooterBtn = screen.getAllByRole('button', { name: /add model/i })
    // Last button in the footer submits
    await user.click(dialogFooterBtn[dialogFooterBtn.length - 1])

    expect(onAddModel).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My New Model', filename: 'my-model.gguf' })
    )
  })

  it('shows "No Model Selected" when no card is clicked', () => {
    render(<GGUFLibrary models={[makeModel()]} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    expect(screen.getByText('No Model Selected')).toBeInTheDocument()
  })

  it('filters by quantization in search', () => {
    const models = [
      makeModel({ id: 'm1', name: 'Llama', quantization: 'Q4_K_M' }),
      makeModel({ id: 'm2', name: 'Mistral', quantization: 'Q8_0' }),
    ]
    render(<GGUFLibrary models={models} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Q8_0' } })
    expect(screen.queryByText('Llama')).not.toBeInTheDocument()
    expect(screen.getByText('Mistral')).toBeInTheDocument()
  })

  it('Add Model dialog can be cancelled', async () => {
    const user = userEvent.setup()
    render(<GGUFLibrary models={[]} onAddModel={vi.fn()} onDeleteModel={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: /add model/i })[0])
    expect(screen.getByText('Add GGUF Model')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText('Add GGUF Model')).not.toBeInTheDocument()
  })
})
