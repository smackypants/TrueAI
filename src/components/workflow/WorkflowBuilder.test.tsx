import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowBuilder } from './WorkflowBuilder'
import type { Agent, Workflow } from '@/lib/types'

const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@xyflow/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  type MockNode = {
    id: string
    type?: string
    data?: { label?: string }
  }
  type MockEdge = {
    id?: string
    source?: string
    target?: string
  }

  return {
    MarkerType: { ArrowClosed: 'arrowclosed' },
    addEdge: vi.fn((edge: MockEdge, edges: MockEdge[]) => [
      ...edges,
      { ...edge, id: edge.id ?? `${edge.source}-${edge.target}` },
    ]),
    useNodesState: (initialNodes: MockNode[]) => {
      const [nodes, setNodes] = React.useState(initialNodes)
      return [nodes, setNodes, vi.fn()]
    },
    useEdgesState: (initialEdges: MockEdge[]) => {
      const [edges, setEdges] = React.useState(initialEdges)
      return [edges, setEdges, vi.fn()]
    },
    ReactFlow: ({
      nodes,
      edges,
      onNodeClick,
      children,
    }: {
      nodes: MockNode[]
      edges: MockEdge[]
      onNodeClick?: (event: React.MouseEvent, node: MockNode) => void
      children?: React.ReactNode
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'react-flow' },
        [
          React.createElement('div', { key: 'summary', 'data-testid': 'flow-summary' }, `${nodes.length} nodes, ${edges.length} connections`),
          ...nodes.map((node) =>
            React.createElement(
              'button',
              {
                key: node.id,
                type: 'button',
                onClick: (event: React.MouseEvent) => onNodeClick?.(event, node),
              },
              node.data?.label ?? node.id
            )
          ),
          children,
        ]
      ),
    Background: () => React.createElement('div', { 'data-testid': 'flow-background' }),
    Controls: () => React.createElement('div', { 'data-testid': 'flow-controls' }),
    MiniMap: ({ nodeColor }: { nodeColor: (node: MockNode) => string }) =>
      React.createElement(
        'div',
        {
          'data-testid': 'flow-minimap',
          'data-colors': ['agent', 'tool', 'decision', 'parallel', 'start', 'end', 'merge']
            .map((type) => nodeColor({ id: type, type }))
            .join('|'),
        }
      ),
    Panel: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'flow-panel' }, children),
  }
})

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'workflow-1',
    name: 'Existing Workflow',
    description: 'Existing description',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'agent-1', type: 'agent', position: { x: 100, y: 100 }, data: { label: 'Draft Reply', agentId: 'agent-1' } },
      { id: 'tool-1', type: 'tool', position: { x: 200, y: 200 }, data: { label: 'Lookup Data', toolName: 'web_search' } },
      { id: 'decision-1', type: 'decision', position: { x: 300, y: 300 }, data: { label: 'Approved?', condition: 'last.includes("ok")' } },
      { id: 'parallel-1', type: 'parallel', position: { x: 400, y: 400 }, data: { label: 'Parallel Work' } },
      { id: 'end-1', type: 'end', position: { x: 500, y: 500 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'edge-1', source: 'start-1', target: 'agent-1', label: 'next' },
      { id: 'edge-2', source: 'agent-1', target: 'tool-1' },
    ],
    variables: {},
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_100,
    ...overrides,
  }
}

const agents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Support Agent',
    goal: 'Help users',
    model: 'llama3.2',
    tools: ['web_search'],
    createdAt: 1_700_000_000_000,
    status: 'idle',
  },
]

describe('WorkflowBuilder', () => {
  const onSaveWorkflow = vi.fn()
  const onDeleteWorkflow = vi.fn()
  const onExecuteWorkflow = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_123_000)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  it('renders the empty workflow state and blocks saving without a name', async () => {
    const user = userEvent.setup()
    render(
      <WorkflowBuilder
        workflows={[]}
        agents={agents}
        onSaveWorkflow={onSaveWorkflow}
        onDeleteWorkflow={onDeleteWorkflow}
        onExecuteWorkflow={onExecuteWorkflow}
      />
    )

    expect(screen.getByRole('heading', { name: /visual workflow builder/i })).toBeInTheDocument()
    expect(screen.getByText('No workflows yet')).toBeInTheDocument()
    expect(screen.getByTestId('flow-summary')).toHaveTextContent('0 nodes, 0 connections')

    await user.click(screen.getByRole('button', { name: /save workflow/i }))

    expect(mockToast.error).toHaveBeenCalledWith('Workflow name is required')
    expect(onSaveWorkflow).not.toHaveBeenCalled()
  })

  it('creates a new workflow and saves the initial start/end graph', async () => {
    const user = userEvent.setup()
    render(
      <WorkflowBuilder
        workflows={[]}
        agents={agents}
        onSaveWorkflow={onSaveWorkflow}
        onDeleteWorkflow={onDeleteWorkflow}
        onExecuteWorkflow={onExecuteWorkflow}
      />
    )

    await user.click(screen.getByRole('button', { name: /new workflow/i }))
    const dialog = screen.getByRole('dialog', { name: /new workflow/i })
    await user.type(within(dialog).getByPlaceholderText('My Workflow'), 'Support Flow')
    await user.type(within(dialog).getByPlaceholderText(/describe what this workflow does/i), 'Routes support requests')
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))
    await user.click(screen.getByRole('button', { name: /save workflow/i }))

    expect(onSaveWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workflow-1700000123000',
        name: 'Support Flow',
        description: 'Routes support requests',
        nodes: [
          expect.objectContaining({ id: 'start-1', type: 'start' }),
          expect.objectContaining({ id: 'end-1', type: 'end' }),
        ],
        edges: [],
        createdAt: 1_700_000_123_000,
        updatedAt: 1_700_000_123_000,
      })
    )
    expect(mockToast.success).toHaveBeenCalledWith('Workflow saved successfully')
  })

  it('loads, executes, deletes, and saves an existing workflow', async () => {
    const user = userEvent.setup()
    render(
      <WorkflowBuilder
        workflows={[makeWorkflow()]}
        agents={agents}
        onSaveWorkflow={onSaveWorkflow}
        onDeleteWorkflow={onDeleteWorkflow}
        onExecuteWorkflow={onExecuteWorkflow}
      />
    )

    await user.click(screen.getByText('Existing Workflow'))
    expect(screen.getByTestId('flow-summary')).toHaveTextContent('6 nodes, 2 connections')

    await user.click(screen.getByRole('button', { name: /execute/i }))
    expect(onExecuteWorkflow).toHaveBeenCalledWith('workflow-1')

    await user.clear(screen.getByPlaceholderText('Workflow name'))
    await user.type(screen.getByPlaceholderText('Workflow name'), 'Updated Workflow')
    await user.click(screen.getByRole('button', { name: /save workflow/i }))
    expect(onSaveWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'workflow-1',
        name: 'Updated Workflow',
        description: 'Existing description',
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_123_000,
      })
    )

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDeleteWorkflow).toHaveBeenCalledWith('workflow-1')
    expect(screen.getByTestId('flow-summary')).toHaveTextContent('2 nodes, 0 connections')
  })

  it('adds node types from the toolbar before saving', async () => {
    const user = userEvent.setup()
    render(
      <WorkflowBuilder
        workflows={[]}
        agents={agents}
        onSaveWorkflow={onSaveWorkflow}
        onDeleteWorkflow={onDeleteWorkflow}
        onExecuteWorkflow={onExecuteWorkflow}
      />
    )

    await user.type(screen.getByPlaceholderText('Workflow name'), 'Toolbar Nodes')
    await user.click(screen.getByRole('button', { name: /^agent$/i }))
    await user.click(screen.getByRole('button', { name: /^tool$/i }))
    await user.click(screen.getByRole('button', { name: /^decision$/i }))
    await user.click(screen.getByRole('button', { name: /^parallel$/i }))
    await user.click(screen.getByRole('button', { name: /save workflow/i }))

    expect(onSaveWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Toolbar Nodes',
        nodes: expect.arrayContaining([
          expect.objectContaining({ type: 'agent', position: { x: 200, y: 200 }, data: { label: 'Agent Node' } }),
          expect.objectContaining({ type: 'tool', position: { x: 200, y: 200 }, data: { label: 'Tool Node' } }),
          expect.objectContaining({ type: 'decision', position: { x: 200, y: 200 }, data: { label: 'Decision Node' } }),
          expect.objectContaining({ type: 'parallel', position: { x: 200, y: 200 }, data: { label: 'Parallel Node' } }),
        ]),
      })
    )
  })

  it('opens node configuration for editable nodes and persists label changes', async () => {
    const user = userEvent.setup()
    render(
      <WorkflowBuilder
        workflows={[makeWorkflow()]}
        agents={agents}
        onSaveWorkflow={onSaveWorkflow}
        onDeleteWorkflow={onDeleteWorkflow}
        onExecuteWorkflow={onExecuteWorkflow}
      />
    )

    await user.click(screen.getByText('Existing Workflow'))
    await user.click(screen.getByRole('button', { name: 'Draft Reply' }))

    const dialog = screen.getByRole('dialog', { name: /configure node/i })
    const labelInput = within(dialog).getByPlaceholderText('Node label')
    await user.clear(labelInput)
    await user.type(labelInput, 'Rewrite Draft')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    await user.click(screen.getByRole('button', { name: /save workflow/i }))

    expect(onSaveWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'agent-1',
            data: expect.objectContaining({ label: 'Rewrite Draft', agentId: 'agent-1' }),
          }),
        ]),
      })
    )
  })
})
