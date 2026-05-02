import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { HarnessUploadUI } from './HarnessUploadUI'
import type { CustomHarness } from '@/lib/types'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const makeHarness = (overrides: Partial<CustomHarness> = {}): CustomHarness => ({
  id: 'h1',
  name: 'Test Harness',
  description: 'A test harness',
  tools: [],
  createdAt: Date.now(),
  enabled: true,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HarnessUploadUI', () => {
  it('renders heading', () => {
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('Custom Harnesses')).toBeInTheDocument()
  })

  it('shows empty state when no harnesses', () => {
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('No custom harnesses installed')).toBeInTheDocument()
  })

  it('renders harness name when harnesses provided', () => {
    render(
      <HarnessUploadUI
        harnesses={[makeHarness({ name: 'My Harness' })]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('My Harness')).toBeInTheDocument()
  })

  it('renders harness description, enabled badge, tools, and source URL', () => {
    render(
      <HarnessUploadUI
        harnesses={[
          makeHarness({
            description: 'Does cool things',
            tools: ['file_reader', 'web_scraper'],
            uploadUrl: 'https://example.com/h.zip',
          }),
        ]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('Does cool things')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('file_reader')).toBeInTheDocument()
    expect(screen.getByText('web_scraper')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/h.zip')).toBeInTheDocument()
  })

  it('falls back to manifestUrl when uploadUrl is missing', () => {
    render(
      <HarnessUploadUI
        harnesses={[makeHarness({ uploadUrl: undefined, manifestUrl: 'https://m.example/m.json' })]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('https://m.example/m.json')).toBeInTheDocument()
  })

  it('omits Enabled badge and shows Enable button when harness is disabled', () => {
    render(
      <HarnessUploadUI
        harnesses={[makeHarness({ enabled: false })]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument()
  })

  it('toggle button calls onToggle with the harness id', () => {
    const onToggle = vi.fn()
    render(
      <HarnessUploadUI
        harnesses={[makeHarness({ id: 'h-toggle', enabled: true })]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    expect(onToggle).toHaveBeenCalledWith('h-toggle')
  })

  it('remove button calls onRemove with the harness id', () => {
    const onRemove = vi.fn()
    const { container } = render(
      <HarnessUploadUI
        harnesses={[makeHarness({ id: 'h-rm' })]}
        onAdd={vi.fn()}
        onRemove={onRemove}
        onToggle={vi.fn()}
      />
    )
    // The remove button is icon-only (Trash); it's the ghost-variant button.
    const buttons = container.querySelectorAll('button')
    const removeBtn = Array.from(buttons).find((b) =>
      b.querySelector('svg') && b.textContent?.trim() === '',
    )
    expect(removeBtn).toBeTruthy()
    fireEvent.click(removeBtn!)
    expect(onRemove).toHaveBeenCalledWith('h-rm')
  })

  it('opens the Add Harness dialog and switches to manifest mode', () => {
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Add Harness/ }))
    expect(screen.getByText('Upload a custom harness via URL or manifest file')).toBeInTheDocument()
    // Default = url mode → uploadUrl input visible
    expect(screen.getByLabelText('Upload URL')).toBeInTheDocument()
    expect(screen.queryByLabelText('Manifest URL')).not.toBeInTheDocument()
    // Switch to manifest mode
    fireEvent.click(screen.getByRole('button', { name: /Manifest URL/ }))
    expect(screen.getByLabelText('Manifest URL')).toBeInTheDocument()
    expect(screen.queryByLabelText('Upload URL')).not.toBeInTheDocument()
    // Switch back to URL mode
    fireEvent.click(screen.getByRole('button', { name: /Direct URL/ }))
    expect(screen.getByLabelText('Upload URL')).toBeInTheDocument()
  })

  it('Cancel closes the dialog without calling onAdd', () => {
    const onAdd = vi.fn()
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Add Harness/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('Add Harness submit button is disabled while name is empty', () => {
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^Add Harness$/ }))
    const submitBtn = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Add Harness',
    })
    expect(submitBtn).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Harness Name'), { target: { value: 'X' } })
    expect(submitBtn).not.toBeDisabled()
    fireEvent.change(screen.getByLabelText('Harness Name'), { target: { value: '' } })
    expect(submitBtn).toBeDisabled()
  })

  it('handleSubmit (URL mode) constructs harness, calls onAdd, resets, and toasts success', () => {
    const onAdd = vi.fn()
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^Add Harness$/ }))
    fireEvent.change(screen.getByLabelText('Harness Name'), { target: { value: 'My H' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'desc' } })
    fireEvent.change(screen.getByLabelText('Upload URL'), {
      target: { value: 'https://x.example/h.zip' },
    })
    fireEvent.change(screen.getByLabelText('Tools (comma-separated)'), {
      target: { value: 'a, b ,, c' },
    })
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add Harness' }),
    )
    expect(onAdd).toHaveBeenCalledTimes(1)
    const arg = onAdd.mock.calls[0][0] as CustomHarness
    expect(arg.name).toBe('My H')
    expect(arg.description).toBe('desc')
    expect(arg.uploadUrl).toBe('https://x.example/h.zip')
    expect(arg.manifestUrl).toBeUndefined()
    expect(arg.tools).toEqual(['a', 'b', 'c']) // empty entries filtered
    expect(arg.enabled).toBe(true)
    expect(arg.id).toMatch(/^harness-\d+$/)
    expect(toast.success).toHaveBeenCalledWith('Custom harness added')
  })

  it('handleSubmit (manifest mode) populates manifestUrl, not uploadUrl', () => {
    const onAdd = vi.fn()
    render(
      <HarnessUploadUI
        harnesses={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /^Add Harness$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Manifest URL/ }))
    fireEvent.change(screen.getByLabelText('Harness Name'), { target: { value: 'M' } })
    fireEvent.change(screen.getByLabelText('Manifest URL'), {
      target: { value: 'https://m.example/m.json' },
    })
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add Harness' }),
    )
    expect(onAdd).toHaveBeenCalledTimes(1)
    const arg = onAdd.mock.calls[0][0] as CustomHarness
    expect(arg.manifestUrl).toBe('https://m.example/m.json')
    expect(arg.uploadUrl).toBeUndefined()
    expect(arg.tools).toEqual([])
  })
})
