import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentCard } from './AgentCard'
import type { Agent } from '@/lib/types'

const baseAgent: Agent = {
  id: 'agent-1',
  name: 'My Agent',
  goal: 'Accomplish tasks',
  model: 'gpt-4',
  tools: ['web_search', 'code_execution'],
  createdAt: Date.now(),
  status: 'idle',
}

function renderCard(props: Partial<Parameters<typeof AgentCard>[0]> = {}) {
  const defaults = {
    agent: baseAgent,
    onRun: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
    ...props,
  }
  return render(<AgentCard {...defaults} />)
}

describe('AgentCard', () => {
  it('renders agent name', () => {
    renderCard()
    expect(screen.getByText('My Agent')).toBeInTheDocument()
  })

  it('renders agent goal', () => {
    renderCard()
    expect(screen.getByText('Accomplish tasks')).toBeInTheDocument()
  })

  it('renders agent status badge', () => {
    renderCard()
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('idle status shows idle', () => {
    renderCard({ agent: { ...baseAgent, status: 'idle' } })
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('running status shows running', () => {
    renderCard({ agent: { ...baseAgent, status: 'running' } })
    expect(screen.getByText('running')).toBeInTheDocument()
  })

  it('completed status shows completed', () => {
    renderCard({ agent: { ...baseAgent, status: 'completed' } })
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('error status shows error', () => {
    renderCard({ agent: { ...baseAgent, status: 'error' } })
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('tools rendered as badges', () => {
    renderCard()
    expect(screen.getByText('web search')).toBeInTheDocument()
    expect(screen.getByText('code execution')).toBeInTheDocument()
  })

  it('no tools shows No tools configured', () => {
    renderCard({ agent: { ...baseAgent, tools: [] } })
    expect(screen.getByText('No tools configured')).toBeInTheDocument()
  })

  it('run button is disabled when status=running', () => {
    renderCard({ agent: { ...baseAgent, status: 'running' } })
    const runBtn = screen.getByRole('button', { name: /running\.\.\./i })
    expect(runBtn).toBeDisabled()
  })

  it('run button is not disabled when idle', () => {
    renderCard()
    const runBtn = screen.getByRole('button', { name: /^run$/i })
    expect(runBtn).not.toBeDisabled()
  })

  it('calls onRun when run clicked', async () => {
    const onRun = vi.fn()
    renderCard({ onRun })
    const runBtn = screen.getByRole('button', { name: /^run$/i })
    await userEvent.click(runBtn)
    expect(onRun).toHaveBeenCalledWith(baseAgent.id)
  })

  it('calls onView when card clicked', async () => {
    const onView = vi.fn()
    renderCard({ onView })
    const title = screen.getByText('My Agent')
    await userEvent.click(title)
    expect(onView).toHaveBeenCalledWith(baseAgent.id)
  })

  it('delete button triggers delete dialog', async () => {
    const { container } = renderCard()
    const deleteBtn = container.querySelector('button[class*="text-destructive"]') as HTMLButtonElement
    await userEvent.click(deleteBtn)
    expect(screen.getByText('Delete Agent?')).toBeInTheDocument()
  })

  it('confirming delete calls onDelete', async () => {
    const onDelete = vi.fn()
    const { container } = renderCard({ onDelete })
    const deleteBtn = container.querySelector('button[class*="text-destructive"]') as HTMLButtonElement
    await userEvent.click(deleteBtn)
    const confirmBtn = screen.getByRole('button', { name: /^delete$/i })
    await userEvent.click(confirmBtn)
    expect(onDelete).toHaveBeenCalledWith(baseAgent.id)
  })

  it('canceling delete does NOT call onDelete', async () => {
    const onDelete = vi.fn()
    const { container } = renderCard({ onDelete })
    const deleteBtn = container.querySelector('button[class*="text-destructive"]') as HTMLButtonElement
    await userEvent.click(deleteBtn)
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelBtn)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('feedback button only shows when hasRecentRun=true and status=completed', () => {
    const onFeedback = vi.fn()
    const { container } = renderCard({
      agent: { ...baseAgent, status: 'completed' },
      onFeedback,
      hasRecentRun: true,
    })
    const feedbackBtn = container.querySelector('button[class*="border-accent"]')
    expect(feedbackBtn).toBeInTheDocument()
  })

  it('feedback button not shown when hasRecentRun=false', () => {
    const onFeedback = vi.fn()
    const { container } = renderCard({
      agent: { ...baseAgent, status: 'completed' },
      onFeedback,
      hasRecentRun: false,
    })
    const feedbackBtn = container.querySelector('button[class*="border-accent"]')
    expect(feedbackBtn).not.toBeInTheDocument()
  })
})
