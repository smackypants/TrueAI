import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { CollaborativeAgentManager } from './CollaborativeAgentManager'
import type { Agent } from '@/lib/types'

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: `agent-${Math.random()}`,
  name: 'Test Agent',
  goal: 'Do things',
  model: 'gpt-4o',
  tools: [],
  createdAt: Date.now(),
  status: 'idle',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CollaborativeAgentManager', () => {
  it('renders heading', () => {
    render(
      <CollaborativeAgentManager
        agents={[]}
        onRunCollaboration={vi.fn()}
      />
    )
    expect(screen.getByText(/collaborative/i)).toBeInTheDocument()
  })

  it('renders agent list in dialog', () => {
    const agents = [
      makeAgent({ id: 'a1', name: 'Agent Alpha' }),
      makeAgent({ id: 'a2', name: 'Agent Beta' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    expect(screen.getByText('Agent Alpha')).toBeInTheDocument()
    expect(screen.getByText('Agent Beta')).toBeInTheDocument()
  })

  it('excludes running agents from available list in dialog', () => {
    const agents = [
      makeAgent({ id: 'a1', name: 'Idle Agent One', status: 'idle' }),
      makeAgent({ id: 'a2', name: 'Idle Agent Two', status: 'idle' }),
      makeAgent({ id: 'a3', name: 'Running Agent', status: 'running' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    expect(screen.getByText('Idle Agent One')).toBeInTheDocument()
    expect(screen.getByText('Idle Agent Two')).toBeInTheDocument()
    expect(screen.queryByText('Running Agent')).not.toBeInTheDocument()
  })

  it('disables New Collaboration button when fewer than 2 agents available', () => {
    const agents = [makeAgent({ id: 'a1', name: 'Only Agent', status: 'idle' })]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /new collaboration/i })).toBeDisabled()
  })

  it('renders the empty-state Create First Collaboration button', () => {
    render(
      <CollaborativeAgentManager
        agents={[
          makeAgent({ id: 'a1' }),
          makeAgent({ id: 'a2' }),
        ]}
        onRunCollaboration={vi.fn()}
      />
    )
    expect(screen.getByText(/no collaborations yet/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /create first collaboration/i }))
    expect(screen.getByText(/Create Collaborative Workflow/i)).toBeInTheDocument()
  })

  it('toggling an agent twice selects then deselects it (selected count text updates)', () => {
    const agents = [
      makeAgent({ id: 'a1', name: 'Alpha' }),
      makeAgent({ id: 'a2', name: 'Beta' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('0 agents selected')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Alpha'))
    expect(within(dialog).getByText('1 agent selected')).toBeInTheDocument()
    // toggle off
    fireEvent.click(within(dialog).getByText('Alpha'))
    expect(within(dialog).getByText('0 agents selected')).toBeInTheDocument()
  })

  it('shows the workflow preview banner only when 2+ agents are selected', () => {
    const agents = [
      makeAgent({ id: 'a1', name: 'Alpha' }),
      makeAgent({ id: 'a2', name: 'Beta' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByText('Workflow Preview')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByText('Alpha'))
    fireEvent.click(within(dialog).getByText('Beta'))
    expect(within(dialog).getByText('Workflow Preview')).toBeInTheDocument()
  })

  it('Start Collaboration disabled until 2 agents + non-empty objective', () => {
    const agents = [
      makeAgent({ id: 'a1', name: 'Alpha' }),
      makeAgent({ id: 'a2', name: 'Beta' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    const dialog = screen.getByRole('dialog')
    const startBtn = within(dialog).getByRole('button', { name: /start collaboration/i })
    expect(startBtn).toBeDisabled()
    fireEvent.click(within(dialog).getByText('Alpha'))
    fireEvent.click(within(dialog).getByText('Beta'))
    expect(startBtn).toBeDisabled() // no objective
    fireEvent.change(within(dialog).getByLabelText(/Collaboration Objective/i), {
      target: { value: 'Build a feature' },
    })
    expect(startBtn).not.toBeDisabled()
  })

  it('Cancel closes the dialog without invoking onRunCollaboration', () => {
    const onRun = vi.fn()
    render(
      <CollaborativeAgentManager
        agents={[makeAgent({ id: 'a1' }), makeAgent({ id: 'a2' })]}
        onRunCollaboration={onRun}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(onRun).not.toHaveBeenCalled()
  })

  it('successful collaboration: creates workflow, calls onRunCollaboration, marks completed, toasts success', async () => {
    let resolveRun!: () => void
    const onRun = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveRun = res
        }),
    )
    const agents = [
      makeAgent({ id: 'a1', name: 'Alpha' }),
      makeAgent({ id: 'a2', name: 'Beta' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={onRun}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Alpha'))
    fireEvent.click(within(dialog).getByText('Beta'))
    fireEvent.change(within(dialog).getByLabelText(/Collaboration Objective/i), {
      target: { value: 'Plan a release' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /start collaboration/i }))

    // Workflow card is rendered immediately with status 'running' and the objective
    await waitFor(() => {
      expect(screen.getByText('Collaboration 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Plan a release')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(onRun).toHaveBeenCalledWith(['a1', 'a2'], 'Plan a release')

    // Resolve the promise — workflow flips to 'completed' and toast.success fires
    await act(async () => {
      resolveRun()
    })
    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument()
    })
    expect(toast.success).toHaveBeenCalledWith('Collaboration completed successfully')
  })

  it('failed collaboration: keeps workflow as running and toasts error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRun = vi.fn().mockRejectedValue(new Error('boom'))
    const agents = [
      makeAgent({ id: 'a1', name: 'Alpha' }),
      makeAgent({ id: 'a2', name: 'Beta' }),
    ]
    render(
      <CollaborativeAgentManager
        agents={agents}
        onRunCollaboration={onRun}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Alpha'))
    fireEvent.click(within(dialog).getByText('Beta'))
    fireEvent.change(within(dialog).getByLabelText(/Collaboration Objective/i), {
      target: { value: 'Doomed task' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /start collaboration/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Collaboration failed')
    })
    expect(consoleError).toHaveBeenCalled()
    // Status stays as 'running' (no completion update on error)
    expect(screen.getByText('running')).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('falls back to "Unknown Agent" when a workflow references an agent no longer in the list', async () => {
    const onRun = vi.fn().mockResolvedValue(undefined)
    // Create a wrapper so we can mutate the agents prop after submission.
    const Wrapper = ({ agents }: { agents: Agent[] }) => (
      <CollaborativeAgentManager agents={agents} onRunCollaboration={onRun} />
    )
    const agents = [
      makeAgent({ id: 'a1', name: 'Alpha' }),
      makeAgent({ id: 'a2', name: 'Beta' }),
    ]
    const { rerender } = render(<Wrapper agents={agents} />)
    fireEvent.click(screen.getByRole('button', { name: /new collaboration/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByText('Alpha'))
    fireEvent.click(within(dialog).getByText('Beta'))
    fireEvent.change(within(dialog).getByLabelText(/Collaboration Objective/i), {
      target: { value: 'Some objective' },
    })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /start collaboration/i }))
    })
    // Now drop one agent from the list and re-render — getAgentName for 'a1' falls back.
    rerender(<Wrapper agents={[makeAgent({ id: 'a2', name: 'Beta' })]} />)
    expect(screen.getByText('Unknown Agent')).toBeInTheDocument()
  })
})
