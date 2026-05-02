import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

// Stub Radix Select pointer-capture/scrollIntoView for jsdom
beforeEach(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
    })
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      value: vi.fn(),
      configurable: true,
    })
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      value: vi.fn(),
      configurable: true,
    })
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      configurable: true,
    })
  }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { AgentConfigPanel } from './AgentConfigPanel'
import type { Agent } from '@/lib/types'
import { toast } from 'sonner'

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  goal: 'Do something useful',
  model: 'gpt-4o',
  tools: ['calculator'],
  createdAt: Date.now(),
  status: 'idle',
  maxIterations: 10,
  temperature: 0.7,
  systemPrompt: '',
  priority: 'normal',
}

describe('AgentConfigPanel', () => {
  it('renders "Configure Agent" title', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Configure Agent')).toBeInTheDocument()
  })

  it('renders description with agent name', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/advanced settings for test agent/i)).toBeInTheDocument()
  })

  it('shows the General tab by default', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Test Agent')).toBeInTheDocument()
  })

  it('shows all four tab labels', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /tools/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /advanced/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /capabilities/i })).toBeInTheDocument()
  })

  it('renders agent name in input field', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Test Agent')).toBeInTheDocument()
  })

  it('renders agent goal in textarea', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Do something useful')).toBeInTheDocument()
  })

  it('updates name when input changes', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByDisplayValue('Test Agent')
    fireEvent.change(input, { target: { value: 'New Name' } })
    expect(screen.getByDisplayValue('New Name')).toBeInTheDocument()
  })

  it('calls onSave and onClose when Save button clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={onClose} />)
    const saveButtons = screen.getAllByRole('button').filter(b =>
      /save/i.test(b.textContent || '')
    )
    fireEvent.click(saveButtons[0])
    expect(onSave).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows success toast after save', () => {
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={vi.fn()} />)
    const saveButtons = screen.getAllByRole('button').filter(b =>
      /save/i.test(b.textContent || '')
    )
    fireEvent.click(saveButtons[0])
    expect(toast.success).toHaveBeenCalledWith('Agent configuration saved')
  })

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('passes updated name in onSave argument', () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    const input = screen.getByDisplayValue('Test Agent')
    fireEvent.change(input, { target: { value: 'Updated Agent' } })
    const saveButtons = screen.getAllByRole('button').filter(b =>
      /save/i.test(b.textContent || '')
    )
    fireEvent.click(saveButtons[0])
    expect(onSave.mock.calls[0][0].name).toBe('Updated Agent')
  })

  it('updates goal text when textarea changes', () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    const goal = screen.getByDisplayValue('Do something useful')
    fireEvent.change(goal, { target: { value: 'Updated goal' } })
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].goal).toBe('Updated goal')
  })

  it('updates systemPrompt when textarea changes', () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    const prompt = screen.getByLabelText(/system prompt/i)
    fireEvent.change(prompt, { target: { value: 'You are great' } })
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].systemPrompt).toBe('You are great')
  })

  it('Cancel button calls onClose without saving', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Advanced tab: shows temperature value and updates maxIterations input', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /advanced/i }))
    expect(screen.getByText('0.70')).toBeInTheDocument()

    const iters = screen.getByLabelText(/max iterations/i) as HTMLInputElement
    fireEvent.change(iters, { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].maxIterations).toBe(25)
  })

  it('Advanced tab: toggling Enable Memory updates memoryEnabled', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /advanced/i }))
    const memCard = screen.getByText('Enable Memory').closest('div.flex.items-center.justify-between') as HTMLElement
    fireEvent.click(memCard.querySelector('button[role="switch"]') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].memoryEnabled).toBe(true)
  })

  it('Advanced tab: toggling Collaborative Mode updates collaborativeMode', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /advanced/i }))
    const collabCard = screen.getByText('Collaborative Mode').closest('div.flex.items-center.justify-between') as HTMLElement
    fireEvent.click(collabCard.querySelector('button[role="switch"]') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].collaborativeMode).toBe(true)
  })

  it('Advanced tab: defaults temperature to 0.70 when undefined', async () => {
    const agentNoTemp = { ...mockAgent, temperature: undefined } as Agent
    render(<AgentConfigPanel agent={agentNoTemp} onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /advanced/i }))
    expect(screen.getByText('0.70')).toBeInTheDocument()
  })

  it('Advanced tab: defaults maxIterations to 10 when undefined', async () => {
    const agentNoIters = { ...mockAgent, maxIterations: undefined } as Agent
    render(<AgentConfigPanel agent={agentNoIters} onSave={vi.fn()} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /advanced/i }))
    const iters = screen.getByLabelText(/max iterations/i) as HTMLInputElement
    expect(iters.value).toBe('10')
  })

  it('Capabilities tab: clicking a capability card adds it to capabilities', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /capabilities/i }))
    fireEvent.click(screen.getByText('Advanced Reasoning'))
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].capabilities).toContain('reasoning')
  })

  it('Capabilities tab: clicking an enabled capability removes it', async () => {
    const agentWithCap = { ...mockAgent, capabilities: ['planning'] } as Agent
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={agentWithCap} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /capabilities/i }))
    fireEvent.click(screen.getByText('Multi-Step Planning'))
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].capabilities).not.toContain('planning')
  })

  it('Capabilities tab: switch toggle adds capability without clicking the card', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /capabilities/i }))
    // Capability Switches have no accessible name; locate via the card containing the label
    const card = screen.getByText('Long-Term Memory').closest('div.p-4') as HTMLElement
    const memSwitch = card.querySelector('button[role="switch"]') as HTMLButtonElement
    fireEvent.click(memSwitch)
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].capabilities).toContain('memory')
  })

  it('Capabilities tab: switch toggle removes existing capability', async () => {
    const agentWithCap = { ...mockAgent, capabilities: ['learning'] } as Agent
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={agentWithCap} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /capabilities/i }))
    const card = screen.getByText('Continuous Learning').closest('div.p-4') as HTMLElement
    const learnSwitch = card.querySelector('button[role="switch"]') as HTMLButtonElement
    fireEvent.click(learnSwitch)
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].capabilities).not.toContain('learning')
  })

  it('Tools tab: toggling a tool adds it to tools', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /tools/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    const target = checkboxes.find(c => c.getAttribute('aria-checked') === 'false')
    expect(target).toBeDefined()
    fireEvent.click(target!)
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].tools.length).toBeGreaterThan(1)
  })

  it('Tools tab: toggling an already-selected tool removes it', async () => {
    const onSave = vi.fn()
    render(<AgentConfigPanel agent={mockAgent} onSave={onSave} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('tab', { name: /tools/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    const checked = checkboxes.find(c => c.getAttribute('aria-checked') === 'true')
    expect(checked).toBeDefined()
    fireEvent.click(checked!)
    fireEvent.click(screen.getByRole('button', { name: /^save configuration$/i }))
    expect(onSave.mock.calls[0][0].tools).not.toContain('calculator')
  })

  it('defaults priority to "normal" when agent.priority is undefined', () => {
    const agentNoPriority = { ...mockAgent, priority: undefined } as Agent
    render(<AgentConfigPanel agent={agentNoPriority} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/normal/i)).toBeInTheDocument()
  })
})
