import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Agent } from '@/lib/types'
import { Gear, Brain, Lightning, Shield } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AgentToolSelector } from './AgentToolSelector'

interface AgentConfigPanelProps {
  agent: Agent
  onSave: (updatedAgent: Agent) => void
  onClose: () => void
}

export function AgentConfigPanel({ agent, onSave, onClose }: AgentConfigPanelProps) {
  const [config, setConfig] = useState<Agent>(agent)

  const handleSave = () => {
    onSave(config)
    toast.success('Agent configuration saved')
    onClose()
  }

  const updateConfig = (updates: Partial<Agent>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <motion.div 
              className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Gear size={24} className="text-primary" weight="fill" />
            </motion.div>
            <div>
              <CardTitle className="text-lg">Configure Agent</CardTitle>
              <CardDescription>Advanced settings for {agent.name}</CardDescription>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="My Agent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-goal">Goal</Label>
              <Textarea
                id="agent-goal"
                value={config.goal}
                onChange={(e) => updateConfig({ goal: e.target.value })}
                placeholder="What should this agent accomplish?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt (Optional)</Label>
              <Textarea
                id="system-prompt"
                value={config.systemPrompt || ''}
                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                placeholder="You are a helpful assistant that..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Customize how the agent behaves and responds
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-model">Model</Label>
              <Select value={config.model} onValueChange={(v) => updateConfig({ model: v })}>
                <SelectTrigger id="agent-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={config.priority || 'normal'} 
                onValueChange={(v) => updateConfig({ priority: v as Agent['priority'] })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-6">
            <AgentToolSelector
              selectedTools={config.tools}
              onToggleTool={(tool) => {
                const newTools = config.tools.includes(tool)
                  ? config.tools.filter(t => t !== tool)
                  : [...config.tools, tool]
                updateConfig({ tools: newTools })
              }}
            />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Lightning size={24} className="text-accent" weight="fill" />
                <div>
                  <h3 className="font-semibold">Performance Settings</h3>
                  <p className="text-sm text-muted-foreground">Fine-tune execution parameters</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">{config.temperature?.toFixed(2) || '0.70'}</span>
                  </div>
                  <Slider
                    value={[config.temperature || 0.7]}
                    onValueChange={([v]) => updateConfig({ temperature: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values make output more creative, lower values more focused
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-iterations">Max Iterations</Label>
                  <Input
                    id="max-iterations"
                    type="number"
                    value={config.maxIterations || 10}
                    onChange={(e) => updateConfig({ maxIterations: parseInt(e.target.value) })}
                    min={1}
                    max={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of reasoning steps the agent can take
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Brain size={24} className="text-primary" weight="fill" />
                <div>
                  <h3 className="font-semibold">Memory & Context</h3>
                  <p className="text-sm text-muted-foreground">Control how the agent remembers information</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Memory</Label>
                    <p className="text-sm text-muted-foreground">Allow agent to remember past interactions</p>
                  </div>
                  <Switch
                    checked={config.memoryEnabled || false}
                    onCheckedChange={(v) => updateConfig({ memoryEnabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Collaborative Mode</Label>
                    <p className="text-sm text-muted-foreground">Share context with other agents</p>
                  </div>
                  <Switch
                    checked={config.collaborativeMode || false}
                    onCheckedChange={(v) => updateConfig({ collaborativeMode: v })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={24} className="text-green-500" weight="fill" />
              <div>
                <h3 className="font-semibold">Agent Capabilities</h3>
                <p className="text-sm text-muted-foreground">Enable advanced features for this agent</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              {[
                { id: 'reasoning', label: 'Advanced Reasoning', description: 'Deep analysis and logical thinking' },
                { id: 'planning', label: 'Multi-Step Planning', description: 'Break down complex tasks' },
                { id: 'memory', label: 'Long-Term Memory', description: 'Remember across sessions' },
                { id: 'collaboration', label: 'Agent Collaboration', description: 'Work with other agents' },
                { id: 'self_correction', label: 'Self-Correction', description: 'Detect and fix mistakes' },
                { id: 'learning', label: 'Continuous Learning', description: 'Improve from feedback' }
              ].map(capability => (
                <motion.div
                  key={capability.id}
                  whileHover={{ x: 2 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    config.capabilities?.includes(capability.id as any)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    const capabilities = config.capabilities || []
                    const newCapabilities = capabilities.includes(capability.id as any)
                      ? capabilities.filter(c => c !== capability.id)
                      : [...capabilities, capability.id as any]
                    updateConfig({ capabilities: newCapabilities })
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{capability.label}</p>
                      <p className="text-sm text-muted-foreground">{capability.description}</p>
                    </div>
                    <Switch
                      checked={config.capabilities?.includes(capability.id as any) || false}
                      onCheckedChange={() => {
                        const capabilities = config.capabilities || []
                        const newCapabilities = capabilities.includes(capability.id as any)
                          ? capabilities.filter(c => c !== capability.id)
                          : [...capabilities, capability.id as any]
                        updateConfig({ capabilities: newCapabilities })
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default AgentConfigPanel
