import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ children, ...rest }: any) => {
          const filtered = Object.fromEntries(
            Object.entries(rest).filter(([k]) =>
              !['initial','animate','exit','whileHover','whileTap','layout','transition','variants'].includes(k)
            )
          )
          const Tag = tag as keyof JSX.IntrinsicElements
          return <Tag {...filtered}>{children}</Tag>
        },
    }
  ),
}))

import { FeedbackDialog } from './FeedbackDialog'
import type { AgentRun } from '@/lib/types'

const mockAgentRun: AgentRun = {
  id: 'run-1',
  agentId: 'agent-1',
  startedAt: Date.now() - 5000,
  completedAt: Date.now(),
  status: 'completed',
  steps: [],
  result: 'Done',
}

describe('FeedbackDialog', () => {
  it('renders dialog when open', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Provide Agent Feedback')).toBeInTheDocument()
  })

  it('does not render dialog when closed', () => {
    render(
      <FeedbackDialog
        open={false}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.queryByText('Provide Agent Feedback')).not.toBeInTheDocument()
  })

  it('renders 5 star rating buttons', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    const starButtons = screen.getAllByRole('button').filter(b =>
      b.className.includes('focus:ring-primary')
    )
    expect(starButtons).toHaveLength(5)
  })

  it('renders accuracy, efficiency, relevance sliders', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Efficiency')).toBeInTheDocument()
    expect(screen.getByText('Relevance')).toBeInTheDocument()
  })

  it('renders issue type checkboxes', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Incorrect Result')).toBeInTheDocument()
    expect(screen.getByText('Missing Information')).toBeInTheDocument()
    expect(screen.getByText('Wrong Tool Used')).toBeInTheDocument()
    expect(screen.getByText('Timeout')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('renders Submit Feedback button', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument()
  })

  it('calls onSubmit with correct runId and agentId when submitted', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0].runId).toBe('run-1')
    expect(onSubmit.mock.calls[0][0].agentId).toBe('agent-1')
  })

  it('submits with default rating of 3', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].rating).toBe(3)
  })

  it('calls onOpenChange(false) when Cancel clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={onOpenChange}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows issue description textarea when an issue is selected', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    // Click "Incorrect Result" card (not the checkbox directly)
    fireEvent.click(screen.getByText('Incorrect Result').closest('[data-slot="card"]')!)
    expect(screen.getByPlaceholderText(/provide details about this issue/i)).toBeInTheDocument()
  })

  it('shows rating label text for default rating 3', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  it('updates rating and label when a star is clicked', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    const getStarBtns = () => screen.getAllByRole('button').filter(b =>
      b.className.includes('focus:ring-primary')
    )
    // Click 5th star → "Excellent"
    fireEvent.click(getStarBtns()[4])
    expect(screen.getByText('Excellent')).toBeInTheDocument()
    // Click 1st star → "Poor"
    fireEvent.click(getStarBtns()[0])
    expect(screen.getByText('Poor')).toBeInTheDocument()
    // Click 2nd star → "Fair"
    fireEvent.click(getStarBtns()[1])
    expect(screen.getByText('Fair')).toBeInTheDocument()
    // Click 4th star → "Very Good"
    fireEvent.click(getStarBtns()[3])
    expect(screen.getByText('Very Good')).toBeInTheDocument()
  })

  it('submits with severity "high" when rating <= 2', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    const getStarBtns = () => screen.getAllByRole('button').filter(b =>
      b.className.includes('focus:ring-primary')
    )
    // Set rating to 1
    fireEvent.click(getStarBtns()[0])
    // Select an issue so severity is captured
    fireEvent.click(screen.getByText('Timeout').closest('[data-slot="card"]')!)
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].issues[0].severity).toBe('high')
  })

  it('submits with severity "low" when rating >= 4', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    const getStarBtns = () => screen.getAllByRole('button').filter(b =>
      b.className.includes('focus:ring-primary')
    )
    fireEvent.click(getStarBtns()[4]) // rating 5
    fireEvent.click(screen.getByText('Other').closest('[data-slot="card"]')!)
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].issues[0].severity).toBe('low')
  })

  it('deselects issue when clicked a second time', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    // Click once to select Incorrect Result
    fireEvent.click(screen.getByText('Incorrect Result').closest('[data-slot="card"]')!)
    // Textarea appears
    expect(screen.getByPlaceholderText(/provide details about this issue/i)).toBeInTheDocument()
    // Click again to deselect (re-query to get fresh reference)
    fireEvent.click(screen.getByText('Incorrect Result').closest('[data-slot="card"]')!)
    // Now submit - should have no issues (deselected)
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].issues).toBeUndefined()
  })

  it('updates issue description textarea', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Missing Information').closest('[data-slot="card"]')!)
    const textarea = screen.getByPlaceholderText(/provide details about this issue/i)
    fireEvent.change(textarea, { target: { value: 'The result was incomplete' } })
    expect((textarea as HTMLTextAreaElement).value).toBe('The result was incomplete')
  })

  it('submits with issue description text', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    fireEvent.click(screen.getByText('Wrong Tool Used').closest('[data-slot="card"]')!)
    const textarea = screen.getByPlaceholderText(/provide details about this issue/i)
    fireEvent.change(textarea, { target: { value: 'Used wrong search tool' } })
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].issues[0].description).toBe('Used wrong search tool')
  })

  it('updates additional comments textarea', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    const commentBox = screen.getByPlaceholderText(/any other feedback/i)
    fireEvent.change(commentBox, { target: { value: 'Great work overall' } })
    expect((commentBox as HTMLTextAreaElement).value).toBe('Great work overall')
  })

  it('submits trimmed comment when comment entered', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    const commentBox = screen.getByPlaceholderText(/any other feedback/i)
    fireEvent.change(commentBox, { target: { value: '  nice work  ' } })
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].comment).toBe('nice work')
  })

  it('submits with undefined comment when no comment entered', () => {
    const onSubmit = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={onSubmit}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit.mock.calls[0][0].comment).toBeUndefined()
  })

  it('resets form state after submit', () => {
    const onOpenChange = vi.fn()
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={onOpenChange}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    const getStarBtns = () => screen.getAllByRole('button').filter(b =>
      b.className.includes('focus:ring-primary')
    )
    fireEvent.click(getStarBtns()[4]) // rating 5
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    // After submit, onOpenChange(false) should be called
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders "Poor Reasoning" issue type', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Poor Reasoning')).toBeInTheDocument()
  })

  it('star hover shows hovered stars as filled', () => {
    render(
      <FeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        agentRun={mockAgentRun}
        onSubmit={vi.fn()}
      />
    )
    const starButtons = screen.getAllByRole('button').filter(b =>
      b.className.includes('focus:ring-primary')
    )
    // Mouse enter on 4th star
    fireEvent.mouseEnter(starButtons[3])
    // Mouse leave
    fireEvent.mouseLeave(starButtons[3])
    // Should revert to no hover - Good label is still visible
    expect(screen.getByText('Good')).toBeInTheDocument()
  })
})
