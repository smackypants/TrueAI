import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentQuickActions } from './AgentQuickActions'
import type { Agent } from '@/lib/types'

const baseAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  goal: 'Do something useful',
  model: 'gpt-4',
  tools: [],
  createdAt: Date.now(),
  status: 'idle',
}

const defaultProps = {
  agent: baseAgent,
  onRun: vi.fn(),
  onConfigure: vi.fn(),
  onSchedule: vi.fn(),
  onViewAnalytics: vi.fn(),
  onDelete: vi.fn(),
}

describe('AgentQuickActions', () => {
  it('renders trigger button', () => {
    render(<AgentQuickActions {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens sheet with agent name when trigger is clicked', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('shows agent goal in sheet description', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Do something useful')).toBeInTheDocument()
  })

  it('shows Run Agent action when agent is idle', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Run Agent')).toBeInTheDocument()
  })

  it('shows Pause action when agent is running', () => {
    render(<AgentQuickActions {...defaultProps} agent={{ ...baseAgent, status: 'running' }} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Pause')).toBeInTheDocument()
  })

  it('shows Configure action', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Configure')).toBeInTheDocument()
  })

  it('shows Schedule action', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Schedule')).toBeInTheDocument()
  })

  it('shows View Analytics action', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('View Analytics')).toBeInTheDocument()
  })

  it('shows Delete action', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onRun and closes sheet when Run clicked', () => {
    const onRun = vi.fn()
    render(<AgentQuickActions {...defaultProps} onRun={onRun} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Run Agent'))
    expect(onRun).toHaveBeenCalledWith('agent-1')
  })

  it('calls onConfigure and closes sheet when Configure clicked', () => {
    const onConfigure = vi.fn()
    render(<AgentQuickActions {...defaultProps} onConfigure={onConfigure} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Configure'))
    expect(onConfigure).toHaveBeenCalledWith('agent-1')
  })

  it('calls onSchedule when Schedule clicked', () => {
    const onSchedule = vi.fn()
    render(<AgentQuickActions {...defaultProps} onSchedule={onSchedule} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Schedule'))
    expect(onSchedule).toHaveBeenCalledWith('agent-1')
  })

  it('calls onViewAnalytics when View Analytics clicked', () => {
    const onViewAnalytics = vi.fn()
    render(<AgentQuickActions {...defaultProps} onViewAnalytics={onViewAnalytics} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('View Analytics'))
    expect(onViewAnalytics).toHaveBeenCalledWith('agent-1')
  })

  it('calls onDelete when Delete clicked', () => {
    const onDelete = vi.fn()
    render(<AgentQuickActions {...defaultProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('agent-1')
  })

  it('shows agent status badge', () => {
    render(<AgentQuickActions {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('shows running status badge when agent is running', () => {
    render(<AgentQuickActions {...defaultProps} agent={{ ...baseAgent, status: 'running' }} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('running')).toBeInTheDocument()
  })
})
