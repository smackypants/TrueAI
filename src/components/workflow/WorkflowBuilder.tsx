import { useCallback, useState, memo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  MarkerType,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Plus, 
  FloppyDisk, 
  Trash,
  Robot,
  Wrench,
  GitBranch,
  ArrowsLeftRight,
  Lightning,
  CheckCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeType, Agent } from '@/lib/types'

interface WorkflowBuilderProps {
  workflows: Workflow[]
  agents: Agent[]
  onSaveWorkflow: (workflow: Workflow) => void
  onDeleteWorkflow: (id: string) => void
  onExecuteWorkflow: (id: string) => void
}

const AgentNode = memo(({ data }: { data: { label: string; agentId?: string } }) => (
  <Card className="p-3 min-w-[180px] border-2 border-primary/50 shadow-lg">
    <div className="flex items-center gap-2 mb-2">
      <Robot weight="fill" size={18} className="text-primary" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
    {data.agentId && (
      <Badge variant="secondary" className="text-xs">
        Agent: {data.agentId}
      </Badge>
    )}
  </Card>
))

const ToolNode = memo(({ data }: { data: { label: string; toolName?: string } }) => (
  <Card className="p-3 min-w-[180px] border-2 border-accent/50 shadow-lg">
    <div className="flex items-center gap-2 mb-2">
      <Wrench weight="fill" size={18} className="text-accent" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
    {data.toolName && (
      <Badge variant="outline" className="text-xs">
        {data.toolName}
      </Badge>
    )}
  </Card>
))

const DecisionNode = memo(({ data }: { data: { label: string; condition?: string } }) => (
  <Card className="p-3 min-w-[180px] border-2 border-yellow-500/50 shadow-lg">
    <div className="flex items-center gap-2 mb-2">
      <GitBranch weight="fill" size={18} className="text-yellow-500" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
    {data.condition && (
      <div className="text-xs text-muted-foreground truncate">
        {data.condition}
      </div>
    )}
  </Card>
))

const ParallelNode = memo(({ data }: { data: { label: string } }) => (
  <Card className="p-3 min-w-[180px] border-2 border-purple-500/50 shadow-lg">
    <div className="flex items-center gap-2 mb-2">
      <ArrowsLeftRight weight="fill" size={18} className="text-purple-500" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
    <Badge variant="outline" className="text-xs">
      Parallel Execution
    </Badge>
  </Card>
))

const StartNode = memo(({ data }: { data: { label: string } }) => (
  <Card className="p-3 min-w-[120px] border-2 border-green-500/50 shadow-lg bg-green-500/10">
    <div className="flex items-center gap-2">
      <Lightning weight="fill" size={18} className="text-green-500" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
  </Card>
))

const EndNode = memo(({ data }: { data: { label: string } }) => (
  <Card className="p-3 min-w-[120px] border-2 border-red-500/50 shadow-lg bg-red-500/10">
    <div className="flex items-center gap-2">
      <CheckCircle weight="fill" size={18} className="text-red-500" />
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
  </Card>
))

AgentNode.displayName = 'AgentNode'
ToolNode.displayName = 'ToolNode'
DecisionNode.displayName = 'DecisionNode'
ParallelNode.displayName = 'ParallelNode'
StartNode.displayName = 'StartNode'
EndNode.displayName = 'EndNode'

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  decision: DecisionNode,
  parallel: ParallelNode,
  start: StartNode,
  end: EndNode,
}

export function WorkflowBuilder({
  workflows,
  agents,
  onSaveWorkflow,
  onDeleteWorkflow,
  onExecuteWorkflow,
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [newWorkflowDialog, setNewWorkflowDialog] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [nodeConfigDialog, setNodeConfigDialog] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node` },
    }
    setNodes((nds) => [...nds, newNode])
  }

  const saveWorkflow = () => {
    if (!workflowName.trim()) {
      toast.error('Workflow name is required')
      return
    }

    const workflow: Workflow = {
      id: selectedWorkflow?.id || `workflow-${Date.now()}`,
      name: workflowName,
      description: workflowDescription,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type as WorkflowNodeType,
        position: node.position,
        data: node.data as {
          label: string
          config?: Record<string, unknown>
          agentId?: string
          toolName?: string
          condition?: string
          iterations?: number
        },
      })) as WorkflowNode[],
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label as string | undefined,
      })) as WorkflowEdge[],
      variables: {},
      createdAt: selectedWorkflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    onSaveWorkflow(workflow)
    toast.success('Workflow saved successfully')
  }

  const loadWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setWorkflowName(workflow.name)
    setWorkflowDescription(workflow.description || '')

    const loadedNodes: Node[] = workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }))

    const loadedEdges: Edge[] = workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }))

    setNodes(loadedNodes)
    setEdges(loadedEdges)
  }

  const newWorkflow = () => {
    setSelectedWorkflow(null)
    setWorkflowName('')
    setWorkflowDescription('')
    setNodes([
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 400 },
        data: { label: 'End' },
      },
    ])
    setEdges([])
    setNewWorkflowDialog(false)
  }

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type !== 'start' && node.type !== 'end') {
      setSelectedNode(node)
      setNodeConfigDialog(true)
    }
  }, [])

  const updateNodeConfig = (config: Record<string, unknown> | undefined) => {
    if (!selectedNode) return

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, ...config } }
          : node
      )
    )
    setNodeConfigDialog(false)
    setSelectedNode(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Visual Workflow Builder</h2>
          <p className="text-sm text-muted-foreground">
            Create complex agent workflows with drag-and-drop
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewWorkflowDialog(true)} variant="outline" size="sm">
            <Plus weight="bold" size={18} className="mr-2" />
            New Workflow
          </Button>
          {selectedWorkflow && (
            <Button onClick={() => onExecuteWorkflow(selectedWorkflow.id)} size="sm">
              <Play weight="fill" size={18} className="mr-2" />
              Execute
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 p-4">
          <h3 className="font-semibold mb-4">Workflows</h3>
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <motion.div
                  key={workflow.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedWorkflow?.id === workflow.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent/5'
                    }`}
                    onClick={() => loadWorkflow(workflow)}
                  >
                    <div className="font-medium text-sm">{workflow.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {workflow.nodes.length} nodes
                    </div>
                  </Card>
                </motion.div>
              ))}
              {workflows.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No workflows yet
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3">Add Nodes</h3>
            <Button
              onClick={() => addNode('agent')}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Robot weight="fill" size={16} className="mr-2" />
              Agent
            </Button>
            <Button
              onClick={() => addNode('tool')}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Wrench weight="fill" size={16} className="mr-2" />
              Tool
            </Button>
            <Button
              onClick={() => addNode('decision')}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <GitBranch weight="fill" size={16} className="mr-2" />
              Decision
            </Button>
            <Button
              onClick={() => addNode('parallel')}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <ArrowsLeftRight weight="fill" size={16} className="mr-2" />
              Parallel
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Input
              placeholder="Workflow name"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
            <Button onClick={saveWorkflow} className="w-full" size="sm">
              <FloppyDisk weight="fill" size={16} className="mr-2" />
              Save Workflow
            </Button>
            {selectedWorkflow && (
              <Button
                onClick={() => {
                  onDeleteWorkflow(selectedWorkflow.id)
                  setSelectedWorkflow(null)
                  newWorkflow()
                }}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                <Trash weight="fill" size={16} className="mr-2" />
                Delete
              </Button>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3 p-0 overflow-hidden">
          <div style={{ height: 'calc(100vh - 250px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
            >
              <Background />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  if (node.type === 'agent') return 'oklch(0.45 0.15 260)'
                  if (node.type === 'tool') return 'oklch(0.75 0.14 200)'
                  if (node.type === 'decision') return '#eab308'
                  if (node.type === 'parallel') return '#a855f7'
                  if (node.type === 'start') return '#22c55e'
                  if (node.type === 'end') return '#ef4444'
                  return '#64748b'
                }}
              />
              <Panel position="top-right" className="bg-card p-2 rounded-lg border shadow-lg">
                <div className="text-xs text-muted-foreground">
                  {nodes.length} nodes, {edges.length} connections
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </Card>
      </div>

      <Dialog open={newWorkflowDialog} onOpenChange={setNewWorkflowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
            <DialogDescription>
              Create a new visual workflow with agents and tools
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="My Workflow"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Describe what this workflow does"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewWorkflowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={newWorkflow}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nodeConfigDialog} onOpenChange={setNodeConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Node</DialogTitle>
            <DialogDescription>
              Set up the node configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="Node label"
                defaultValue={selectedNode?.data.label as string}
                onChange={(e) => {
                  if (selectedNode) {
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value },
                    })
                  }
                }}
              />
            </div>

            {selectedNode?.type === 'agent' && (
              <div className="space-y-2">
                <Label>Agent</Label>
                <Select
                  value={selectedNode.data.agentId as string}
                  onValueChange={(value) => {
                    if (selectedNode) {
                      setSelectedNode({
                        ...selectedNode,
                        data: { ...selectedNode.data, agentId: value },
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedNode?.type === 'tool' && (
              <div className="space-y-2">
                <Label>Tool</Label>
                <Select
                  value={selectedNode.data.toolName as string}
                  onValueChange={(value) => {
                    if (selectedNode) {
                      setSelectedNode({
                        ...selectedNode,
                        data: { ...selectedNode.data, toolName: value },
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calculator">Calculator</SelectItem>
                    <SelectItem value="datetime">DateTime</SelectItem>
                    <SelectItem value="memory">Memory</SelectItem>
                    <SelectItem value="web_search">Web Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedNode?.type === 'decision' && (
              <div className="space-y-2">
                <Label>Condition</Label>
                <Input
                  placeholder="e.g., result > 100"
                  defaultValue={selectedNode.data.condition as string}
                  onChange={(e) => {
                    if (selectedNode) {
                      setSelectedNode({
                        ...selectedNode,
                        data: { ...selectedNode.data, condition: e.target.value },
                      })
                    }
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateNodeConfig(selectedNode?.data)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WorkflowBuilder
