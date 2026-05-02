import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}))

import { MobileAgentListItem, MobileAgentList } from './MobileAgentList'
import type { Agent } from '@/lib/types'

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'My Test Agent',
  goal: 'Do things',
  model: 'gpt-4o',
  tools: ['calculator'],
  createdAt: Date.now(),
  status: 'idle',
}

describe('MobileAgentListItem', () => {
  it('renders agent name', () => {
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('My Test Agent')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('calls onView when card is clicked', () => {
    const onView = vi.fn()
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={onView}
        onView={onView}
        onViewAnalytics={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('My Test Agent'))
    expect(onView).toHaveBeenCalled()
  })

  it('renders run button', () => {
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
  })

  it('calls onRun with agent id when Run button clicked', () => {
    const onRun = vi.fn()
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={onRun}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /run/i }))
    expect(onRun).toHaveBeenCalledWith('agent-1')
  })

  it('renders running status with pulse animation class', () => {
    const runningAgent = { ...mockAgent, status: 'running' as const }
    render(
      <MobileAgentListItem
        agent={runningAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('running')).toBeInTheDocument()
  })

  it('shows "completed" status badge with correct text', () => {
    const completedAgent = { ...mockAgent, status: 'completed' as const }
    render(
      <MobileAgentListItem
        agent={completedAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('shows "error" status badge', () => {
    const errorAgent = { ...mockAgent, status: 'error' as const }
    render(
      <MobileAgentListItem
        agent={errorAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('disables Run button when agent is running', () => {
    const runningAgent = { ...mockAgent, status: 'running' as const }
    render(
      <MobileAgentListItem
        agent={runningAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled()
  })

  it('calls onViewAnalytics with agent id when analytics button clicked', () => {
    const onViewAnalytics = vi.fn()
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={onViewAnalytics}
      />
    )
    // Analytics button is the third icon-only button
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])
    expect(onViewAnalytics).toHaveBeenCalledWith('agent-1')
  })

  it('calls onView via the eye-icon button', () => {
    const onView = vi.fn()
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={vi.fn()}
        onView={onView}
        onViewAnalytics={vi.fn()}
      />
    )
    // View button is the second icon-only button (after Run)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    expect(onView).toHaveBeenCalledWith('agent-1')
  })

  it('shows first 3 tool badges', () => {
    const agent = { ...mockAgent, tools: ['tool_a', 'tool_b', 'tool_c', 'tool_d'] }
    render(
      <MobileAgentListItem
        agent={agent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('tool a')).toBeInTheDocument()
    expect(screen.getByText('tool b')).toBeInTheDocument()
    expect(screen.getByText('tool c')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('renders agent goal text', () => {
    render(
      <MobileAgentListItem
        agent={mockAgent}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('Do things')).toBeInTheDocument()
  })
})

describe('MobileAgentList', () => {
  it('renders all provided agents', () => {
    const agents: Agent[] = [
      { ...mockAgent, id: 'a1', name: 'Agent Alpha' },
      { ...mockAgent, id: 'a2', name: 'Agent Beta' },
    ]
    render(
      <MobileAgentList
        agents={agents}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(screen.getByText('Agent Alpha')).toBeInTheDocument()
    expect(screen.getByText('Agent Beta')).toBeInTheDocument()
  })

  it('renders empty list when no agents provided', () => {
    const { container } = render(
      <MobileAgentList
        agents={[]}
        onRun={vi.fn()}
        onView={vi.fn()}
        onViewAnalytics={vi.fn()}
      />
    )
    expect(container.querySelector('.space-y-3')?.children).toHaveLength(0)
  })
})
