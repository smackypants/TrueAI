import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Agent } from '@/lib/types'
import { Users, Plus, Play, ArrowRight, Lightning, CheckCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface CollaborativeAgentManagerProps {
  agents: Agent[]
  onRunCollaboration: (agentIds: string[], objective: string) => Promise<void>
}

interface CollaborationWorkflow {
  id: string
  name: string
  agentIds: string[]
  objective: string
  status: 'idle' | 'running' | 'completed'
  createdAt: number
}

export function CollaborativeAgentManager({ agents, onRunCollaboration }: CollaborativeAgentManagerProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [objective, setObjective] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [workflows, setWorkflows] = useState<CollaborationWorkflow[]>([])

  const availableAgents = useMemo(() => {
    return agents.filter(a => a.status !== 'running')
  }, [agents])

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const handleRunCollaboration = async () => {
    if (selectedAgents.length < 2) {
      toast.error('Select at least 2 agents for collaboration')
      return
    }

    if (!objective.trim()) {
      toast.error('Please provide an objective')
      return
    }

    const workflow: CollaborationWorkflow = {
      id: `workflow-${Date.now()}`,
      name: `Collaboration ${workflows.length + 1}`,
      agentIds: selectedAgents,
      objective,
      status: 'running',
      createdAt: Date.now()
    }

    setWorkflows(prev => [workflow, ...prev])
    setShowDialog(false)

    try {
      await onRunCollaboration(selectedAgents, objective)
      
      setWorkflows(prev => prev.map(w => 
        w.id === workflow.id ? { ...w, status: 'completed' as const } : w
      ))
      toast.success('Collaboration completed successfully')
    } catch (error) {
      toast.error('Collaboration failed')
      console.error(error)
    }

    setSelectedAgents([])
    setObjective('')
  }

  const getAgentName = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.name || 'Unknown Agent'
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <motion.div 
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <Users size={24} className="text-white" weight="fill" />
              </motion.div>
              <div>
                <CardTitle className="text-lg">Collaborative Workflows</CardTitle>
                <CardDescription>Coordinate multiple agents for complex tasks</CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} disabled={availableAgents.length < 2}>
              <Plus size={18} weight="bold" className="mr-2" />
              New Collaboration
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-12">
              <Users size={64} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
              <h3 className="text-lg font-semibold mb-2">No Collaborations Yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create multi-agent workflows to tackle complex objectives
              </p>
              <Button onClick={() => setShowDialog(true)} disabled={availableAgents.length < 2}>
                <Plus size={18} weight="bold" className="mr-2" />
                Create First Collaboration
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {workflows.map((workflow, index) => (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <Badge 
                            variant={workflow.status === 'completed' ? 'default' : 'outline'}
                            className={workflow.status === 'running' ? 'animate-pulse-glow' : ''}
                          >
                            {workflow.status === 'completed' && <CheckCircle size={14} weight="fill" className="mr-1" />}
                            {workflow.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{workflow.objective}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users size={16} />
                            <span>Participating Agents:</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {workflow.agentIds.map((agentId, idx) => (
                              <div key={agentId} className="flex items-center">
                                <Badge variant="secondary">
                                  {getAgentName(agentId)}
                                </Badge>
                                {idx < workflow.agentIds.length - 1 && (
                                  <ArrowRight size={16} className="mx-1 text-muted-foreground" />
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(workflow.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Collaborative Workflow</DialogTitle>
            <DialogDescription>
              Select agents and define an objective for them to achieve together
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Agents (minimum 2)</Label>
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {availableAgents.map(agent => (
                    <motion.div
                      key={agent.id}
                      whileHover={{ x: 2 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedAgents.includes(agent.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{agent.goal}</p>
                        </div>
                        {selectedAgents.includes(agent.id) && (
                          <CheckCircle size={20} className="text-primary" weight="fill" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="objective">Collaboration Objective</Label>
              <Textarea
                id="objective"
                placeholder="Describe what you want the agents to accomplish together..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the desired outcome and how agents should work together
              </p>
            </div>

            {selectedAgents.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-accent/10 border border-accent/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <Lightning size={20} className="text-accent mt-0.5" weight="fill" />
                  <div>
                    <p className="text-sm font-medium">Workflow Preview</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agents will work sequentially, sharing context and building on each other's results
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRunCollaboration}
              disabled={selectedAgents.length < 2 || !objective.trim()}
            >
              <Play size={18} weight="fill" className="mr-2" />
              Start Collaboration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CollaborativeAgentManager
