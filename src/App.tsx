import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { ChatCircle, Robot, Lightning, Plus, Flask, Cube, Wrench, Download, HardDrives } from '@phosphor-icons/react'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { AgentCard } from '@/components/agent/AgentCard'
import { AgentStepView } from '@/components/agent/AgentStepView'
import { ModelConfigPanel } from '@/components/models/ModelConfigPanel'
import { FineTuningUI } from '@/components/models/FineTuningUI'
import { QuantizationTools } from '@/components/models/QuantizationTools'
import { HarnessCreator } from '@/components/harness/HarnessCreator'
import { HuggingFaceModelBrowser } from '@/components/models/HuggingFaceModelBrowser'
import { GGUFLibrary } from '@/components/models/GGUFLibrary'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { emptyStateChat, emptyStateAgents, emptyStateWorkflow } from '@/assets'
import { analytics } from '@/lib/analytics'
import type { Message, Conversation, Agent, AgentRun, AgentTool, ModelConfig, FineTuningDataset, FineTuningJob, QuantizationJob, HarnessManifest, HuggingFaceModel, GGUFModel } from '@/lib/types'

function App() {
  const [conversations, setConversations] = useKV<Conversation[]>('conversations', [])
  const [messages, setMessages] = useKV<Message[]>('messages', [])
  const [agents, setAgents] = useKV<Agent[]>('agents', [])
  const [agentRuns, setAgentRuns] = useKV<AgentRun[]>('agent-runs', [])
  const [models, setModels] = useKV<ModelConfig[]>('models', [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', temperature: 0.7, maxTokens: 2000, topP: 1, frequencyPenalty: 0, presencePenalty: 0 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', temperature: 0.7, maxTokens: 2000, topP: 1, frequencyPenalty: 0, presencePenalty: 0 },
  ])
  
  const [fineTuningDatasets, setFineTuningDatasets] = useKV<FineTuningDataset[]>('fine-tuning-datasets', [])
  const [fineTuningJobs, setFineTuningJobs] = useKV<FineTuningJob[]>('fine-tuning-jobs', [])
  const [quantizationJobs, setQuantizationJobs] = useKV<QuantizationJob[]>('quantization-jobs', [])
  const [harnesses, setHarnesses] = useKV<HarnessManifest[]>('harnesses', [])
  const [ggufModels, setGgufModels] = useKV<GGUFModel[]>('gguf-models', [])
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeAgentRunId, setActiveAgentRunId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [newAgentDialog, setNewAgentDialog] = useState(false)
  const [newConversationDialog, setNewConversationDialog] = useState(false)
  const [editingModelId, setEditingModelId] = useState<string | null>(null)

  const [newAgentForm, setNewAgentForm] = useState({
    name: '',
    goal: '',
    model: 'gpt-4o-mini',
    tools: [] as AgentTool[]
  })

  const [newConversationForm, setNewConversationForm] = useState({
    title: '',
    systemPrompt: '',
    model: 'gpt-4o-mini'
  })

  const activeConversation = conversations?.find(c => c.id === activeConversationId)
  const conversationMessages = messages?.filter(m => m.conversationId === activeConversationId) || []
  const activeAgentRun = agentRuns?.find(r => r.id === activeAgentRunId)

  useEffect(() => {
    analytics.track('page_view', 'app', 'load', {
      metadata: { timestamp: Date.now() }
    })
  }, [])

  const createConversation = () => {
    const now = Date.now()
    const newConv: Conversation = {
      id: `conv-${now}`,
      title: newConversationForm.title || 'New Conversation',
      systemPrompt: newConversationForm.systemPrompt,
      model: newConversationForm.model,
      createdAt: now,
      updatedAt: now
    }
    
    setConversations(prev => [newConv, ...(prev || [])])
    setActiveConversationId(newConv.id)
    setNewConversationDialog(false)
    setNewConversationForm({ title: '', systemPrompt: '', model: 'gpt-4o-mini' })
    toast.success('Conversation created')
    
    analytics.track('conversation_created', 'chat', 'create_conversation', {
      label: newConv.title,
      metadata: { model: newConv.model, hasSystemPrompt: !!newConv.systemPrompt }
    })
  }

  const sendMessage = async (content: string) => {
    if (!activeConversationId) return

    const startTime = Date.now()
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      content,
      timestamp: Date.now()
    }

    setMessages(prev => [...(prev || []), userMessage])
    setIsStreaming(true)

    analytics.track('chat_message_sent', 'chat', 'send_message', {
      metadata: { conversationId: activeConversationId, messageLength: content.length }
    })

    try {
      const conversation = conversations?.find(c => c.id === activeConversationId)
      const contextMessages = conversationMessages?.map(m => ({
        role: m.role,
        content: m.content
      }))
      
      if (conversation?.systemPrompt) {
        contextMessages.unshift({ role: 'system', content: conversation.systemPrompt })
      }
      
      contextMessages.push({ role: 'user', content })

      const prompt = spark.llmPrompt`You are a helpful AI assistant. Respond to the following conversation:

${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

assistant:`

      const response = await spark.llm(prompt, conversation?.model || 'gpt-4o-mini')

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        conversationId: activeConversationId,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        model: conversation?.model
      }

      setMessages(prev => [...prev, assistantMessage])
      
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId 
          ? { ...c, updatedAt: Date.now() }
          : c
      ))

      const responseTime = Date.now() - startTime
      analytics.track('chat_message_received', 'chat', 'receive_response', {
        duration: responseTime,
        metadata: {
          model: conversation?.model,
          responseLength: response.length,
          tokenCount: Math.ceil(response.length / 4)
        }
      })
    } catch (error) {
      toast.error('Failed to get response')
      console.error(error)
      analytics.track('error_occurred', 'chat', 'send_message_failed', {
        metadata: { error: String(error), conversationId: activeConversationId }
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const createAgent = () => {
    const now = Date.now()
    const newAgent: Agent = {
      id: `agent-${now}`,
      name: newAgentForm.name || 'New Agent',
      goal: newAgentForm.goal,
      model: newAgentForm.model,
      tools: newAgentForm.tools,
      createdAt: now,
      status: 'idle'
    }

    setAgents(prev => [newAgent, ...prev])
    setNewAgentDialog(false)
    setNewAgentForm({ name: '', goal: '', model: 'gpt-4o-mini', tools: [] })
    toast.success('Agent created')
    
    analytics.track('agent_created', 'agent', 'create_agent', {
      label: newAgent.name,
      metadata: { model: newAgent.model, tools: newAgent.tools, hasGoal: !!newAgent.goal }
    })
  }

  const runAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return

    const startTime = Date.now()
    
    setAgents(prev => prev.map(a => 
      a.id === agentId ? { ...a, status: 'running' as const } : a
    ))

    const runId = `run-${Date.now()}`
    const newRun: AgentRun = {
      id: runId,
      agentId,
      startedAt: Date.now(),
      status: 'running',
      steps: []
    }

    setAgentRuns(prev => [newRun, ...prev])
    setActiveAgentRunId(runId)

    analytics.track('agent_run_started', 'agent', 'run_agent', {
      label: agent.name,
      metadata: { agentId, agentName: agent.name, toolsCount: agent.tools.length }
    })

    try {
      const steps: AgentRun['steps'] = []

      const planningPrompt = spark.llmPrompt`You are an AI agent with the following goal: "${agent.goal}"

Available tools: ${agent.tools.join(', ')}

Create a brief plan (2-3 sentences) for how you would accomplish this goal using the available tools.`

      const planResponse = await spark.llm(planningPrompt, agent.model)
      
      steps.push({
        id: `step-${Date.now()}`,
        type: 'planning',
        content: planResponse,
        timestamp: Date.now()
      })

      setAgentRuns(prev => prev.map(r => 
        r.id === runId ? { ...r, steps } : r
      ))

      await new Promise(resolve => setTimeout(resolve, 1000))

      for (const tool of agent.tools) {
        const toolPrompt = spark.llmPrompt`Based on your plan: "${planResponse}"

Use the ${tool} tool to help achieve the goal: "${agent.goal}"

Describe what input you would give to the ${tool} tool (one sentence).`

        const toolInput = await spark.llm(toolPrompt, agent.model)
        
        let toolOutput = ''
        if (tool === 'calculator') {
          toolOutput = 'Result: 42'
        } else if (tool === 'datetime') {
          toolOutput = `Current time: ${new Date().toLocaleString()}`
        } else if (tool === 'memory') {
          toolOutput = 'Memory stored successfully'
        } else if (tool === 'web_search') {
          toolOutput = 'Search completed - 5 relevant results found'
        }

        steps.push({
          id: `step-${Date.now()}`,
          type: 'tool_call',
          content: `Executing ${tool}`,
          toolName: tool,
          toolInput,
          toolOutput,
          timestamp: Date.now()
        })

        setAgentRuns(prev => prev.map(r => 
          r.id === runId ? { ...r, steps: [...steps] } : r
        ))

        await new Promise(resolve => setTimeout(resolve, 800))
      }

      const finalPrompt = spark.llmPrompt`Based on your plan and the tool results, provide a final summary (2-3 sentences) of what was accomplished for the goal: "${agent.goal}"`

      const finalResult = await spark.llm(finalPrompt, agent.model)

      steps.push({
        id: `step-${Date.now()}`,
        type: 'decision',
        content: finalResult,
        timestamp: Date.now()
      })

      setAgentRuns(prev => prev.map(r => 
        r.id === runId ? { 
          ...r, 
          steps,
          status: 'completed',
          completedAt: Date.now(),
          result: finalResult
        } : r
      ))

      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, status: 'completed' as const } : a
      ))

      toast.success('Agent completed successfully')
      
      const executionTime = Date.now() - startTime
      analytics.track('agent_run_completed', 'agent', 'complete_agent_run', {
        label: agent.name,
        duration: executionTime,
        metadata: { agentId, stepsCount: steps.length }
      })
    } catch (error) {
      setAgentRuns(prev => prev.map(r => 
        r.id === runId ? { 
          ...r, 
          status: 'error',
          completedAt: Date.now(),
          error: 'Agent execution failed'
        } : r
      ))

      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, status: 'error' as const } : a
      ))

      toast.error('Agent execution failed')
      console.error(error)
      
      const executionTime = Date.now() - startTime
      analytics.track('agent_run_failed', 'agent', 'agent_run_error', {
        label: agent.name,
        duration: executionTime,
        metadata: { agentId, error: String(error) }
      })
    }
  }

  const deleteAgent = (agentId: string) => {
    setAgents(prev => prev.filter(a => a.id !== agentId))
    setAgentRuns(prev => prev.filter(r => r.agentId !== agentId))
    toast.success('Agent deleted')
    
    analytics.track('agent_deleted', 'agent', 'delete_agent', {
      metadata: { agentId }
    })
  }

  const deleteConversation = (convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId))
    setMessages(prev => prev.filter(m => m.conversationId !== convId))
    if (activeConversationId === convId) {
      setActiveConversationId(null)
    }
    toast.success('Conversation deleted')
  }

  const toggleAgentTool = (tool: AgentTool) => {
    setNewAgentForm(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }))
  }

  const saveModelConfig = (updatedModel: ModelConfig) => {
    setModels(prev => 
      prev.map(m => m.id === updatedModel.id ? updatedModel : m)
    )
    setEditingModelId(null)
    toast.success('Model configuration saved')
  }

  const createFineTuningDataset = (dataset: FineTuningDataset) => {
    setFineTuningDatasets(prev => [dataset, ...(prev || [])])
  }

  const deleteFineTuningDataset = (id: string) => {
    setFineTuningDatasets(prev => (prev || []).filter(d => d.id !== id))
  }

  const startFineTuningJob = (job: FineTuningJob) => {
    setFineTuningJobs(prev => [job, ...(prev || [])])
    
    setTimeout(() => {
      setFineTuningJobs(prev => 
        (prev || []).map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                progress: 100, 
                status: 'completed' as const, 
                completedAt: Date.now(),
                resultModelId: `${j.modelId}-finetuned-${Date.now()}`
              } 
            : j
        )
      )
    }, 3000)
  }

  const deleteFineTuningJob = (id: string) => {
    setFineTuningJobs(prev => (prev || []).filter(j => j.id !== id))
  }

  const startQuantizationJob = (job: QuantizationJob) => {
    const model = (models || []).find(m => m.id === job.modelId)
    const originalSize = model?.size || 7000000000
    
    setQuantizationJobs(prev => [{ ...job, originalSize }, ...(prev || [])])
    
    setTimeout(() => {
      const compressionRatio = job.targetFormat.includes('Q4') ? 4 : job.targetFormat.includes('Q5') ? 3 : 2
      const quantizedSize = originalSize / compressionRatio
      
      setQuantizationJobs(prev =>
        (prev || []).map(j =>
          j.id === job.id
            ? {
                ...j,
                progress: 100,
                status: 'completed' as const,
                completedAt: Date.now(),
                quantizedSize,
                resultModelId: `${j.modelId}-${j.targetFormat.toLowerCase()}`
              }
            : j
        )
      )
    }, 2500)
  }

  const deleteQuantizationJob = (id: string) => {
    setQuantizationJobs(prev => (prev || []).filter(j => j.id !== id))
  }

  const downloadQuantizedModel = (modelId: string) => {
    toast.success(`Downloading ${modelId}`)
  }

  const handleHuggingFaceDownload = (model: HuggingFaceModel) => {
    const newModel: ModelConfig = {
      id: model.id.replace('/', '-'),
      name: model.name,
      provider: 'huggingface',
      temperature: 0.7,
      maxTokens: model.contextLength || 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      contextLength: model.contextLength,
      quantization: model.quantization,
      size: model.size * 1000000000
    }

    setModels(prev => {
      const currentModels = prev || []
      const exists = currentModels.some(m => m.id === newModel.id)
      if (exists) return currentModels
      return [...currentModels, newModel]
    })

    toast.success(`${model.name} added to your models`)
  }

  const createHarness = (harness: HarnessManifest) => {
    setHarnesses(prev => [harness, ...(prev || [])])
  }

  const deleteHarness = (id: string) => {
    setHarnesses(prev => (prev || []).filter(h => h.id !== id))
  }

  const exportHarness = (id: string) => {
    const harness = (harnesses || []).find(h => h.id === id)
    if (harness) {
      const dataStr = JSON.stringify(harness, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${harness.name}-manifest.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Harness exported')
    }
  }

  const addGGUFModel = (model: Omit<GGUFModel, 'id' | 'downloadedAt'>) => {
    const newModel: GGUFModel = {
      ...model,
      id: `gguf-${Date.now()}`,
      downloadedAt: Date.now()
    }
    setGgufModels(prev => [newModel, ...(prev || [])])
  }

  const deleteGGUFModel = (id: string) => {
    setGgufModels(prev => (prev || []).filter(m => m.id !== id))
  }

  const editingModel = models.find(m => m.id === editingModelId)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Lightning weight="fill" size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">TrueAI LocalAI</h1>
              <p className="text-sm text-muted-foreground">Enterprise AI Assistant Platform</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="chat" className="gap-2">
              <ChatCircle weight="fill" size={20} />
              Chat
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Robot weight="fill" size={20} />
              Agents
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Lightning weight="fill" size={20} />
              Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Conversations</h2>
              <Button onClick={() => setNewConversationDialog(true)}>
                <Plus weight="bold" size={20} className="mr-2" />
                New Chat
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1 p-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {conversations.length === 0 && (
                      <EmptyState
                        illustration={emptyStateChat}
                        title="No conversations yet"
                        description="Create a new chat to get started with AI assistance"
                        size="md"
                      />
                    )}
                    {conversations.map(conv => (
                      <div key={conv.id}>
                        <Button
                          variant={activeConversationId === conv.id ? 'secondary' : 'ghost'}
                          className="w-full justify-start text-left"
                          onClick={() => setActiveConversationId(conv.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{conv.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="lg:col-span-3 p-6 flex flex-col h-[600px]">
                {activeConversation ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{activeConversation.title}</h3>
                        <p className="text-sm text-muted-foreground">Model: {activeConversation.model}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConversation(activeConversation.id)}
                      >
                        Delete
                      </Button>
                    </div>
                    <Separator className="mb-4" />
                    
                    <ScrollArea className="flex-1 pr-4">
                      {conversationMessages.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">Start a conversation...</p>
                        </div>
                      )}
                      {conversationMessages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                      {isStreaming && (
                        <div className="flex gap-3 my-3">
                          <div className="h-8 w-8" />
                          <div className="text-muted-foreground">Thinking...</div>
                        </div>
                      )}
                    </ScrollArea>

                    <div className="pt-4 border-t border-border mt-4">
                      <ChatInput 
                        onSend={sendMessage} 
                        disabled={isStreaming}
                        isStreaming={isStreaming}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">Select or create a conversation</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">AI Agents</h2>
              <Button onClick={() => setNewAgentDialog(true)}>
                <Plus weight="bold" size={20} className="mr-2" />
                Create Agent
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                {agents.length === 0 && (
                  <Card className="p-12">
                    <EmptyState
                      illustration={emptyStateAgents}
                      title="No agents created yet"
                      description="Create an autonomous AI agent to automate tasks and execute multi-step workflows"
                      size="lg"
                      action={
                        <Button onClick={() => setNewAgentDialog(true)}>
                          <Plus weight="bold" size={20} className="mr-2" />
                          Create Your First Agent
                        </Button>
                      }
                    />
                  </Card>
                )}
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onRun={runAgent}
                    onDelete={deleteAgent}
                    onView={(id) => {
                      const run = agentRuns.find(r => r.agentId === id)
                      if (run) setActiveAgentRunId(run.id)
                    }}
                  />
                ))}
              </div>

              <Card className="lg:col-span-1 p-4">
                <h3 className="font-semibold mb-4">Execution History</h3>
                <ScrollArea className="h-[600px]">
                  {activeAgentRun ? (
                    <div className="space-y-2">
                      {activeAgentRun.steps.map((step, index) => (
                        <AgentStepView key={step.id} step={step} index={index} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      illustration={emptyStateWorkflow}
                      title="No execution history"
                      description="Run an agent to see detailed execution steps"
                      size="sm"
                    />
                  )}
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <Tabs defaultValue="browse" className="w-full">
              <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-6 mb-6">
                <TabsTrigger value="browse" className="gap-2">
                  <Download size={18} />
                  Browse
                </TabsTrigger>
                <TabsTrigger value="library" className="gap-2">
                  <HardDrives size={18} />
                  Library
                </TabsTrigger>
                <TabsTrigger value="config" className="gap-2">
                  <Lightning size={18} />
                  Config
                </TabsTrigger>
                <TabsTrigger value="finetuning" className="gap-2">
                  <Flask size={18} />
                  Fine-Tuning
                </TabsTrigger>
                <TabsTrigger value="quantization" className="gap-2">
                  <Cube size={18} />
                  Quantization
                </TabsTrigger>
                <TabsTrigger value="harness" className="gap-2">
                  <Wrench size={18} />
                  Harness
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browse">
                <HuggingFaceModelBrowser onDownload={handleHuggingFaceDownload} />
              </TabsContent>

              <TabsContent value="library">
                <GGUFLibrary
                  models={ggufModels || []}
                  onAddModel={addGGUFModel}
                  onDeleteModel={deleteGGUFModel}
                />
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <h2 className="text-xl font-semibold">Model Configuration</h2>
                
                {editingModel ? (
                  <ModelConfigPanel
                    model={editingModel}
                    onSave={saveModelConfig}
                    onClose={() => setEditingModelId(null)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {models.map(model => (
                      <Card key={model.id} className="p-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold">{model.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">Provider: {model.provider}</p>
                          </div>
                          <Separator />
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Temperature:</span>
                              <span className="font-mono">{model.temperature}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Max Tokens:</span>
                              <span className="font-mono">{model.maxTokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Top P:</span>
                              <span className="font-mono">{model.topP}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setEditingModelId(model.id)}
                          >
                            Configure
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="finetuning">
                <FineTuningUI
                  models={models || []}
                  datasets={fineTuningDatasets || []}
                  jobs={fineTuningJobs || []}
                  onCreateDataset={createFineTuningDataset}
                  onStartJob={startFineTuningJob}
                  onDeleteDataset={deleteFineTuningDataset}
                  onDeleteJob={deleteFineTuningJob}
                />
              </TabsContent>

              <TabsContent value="quantization">
                <QuantizationTools
                  models={models || []}
                  jobs={quantizationJobs || []}
                  onStartJob={startQuantizationJob}
                  onDeleteJob={deleteQuantizationJob}
                  onDownloadModel={downloadQuantizedModel}
                />
              </TabsContent>

              <TabsContent value="harness">
                <HarnessCreator
                  harnesses={harnesses || []}
                  onCreateHarness={createHarness}
                  onDeleteHarness={deleteHarness}
                  onExportHarness={exportHarness}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={newConversationDialog} onOpenChange={setNewConversationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Create a new conversation with a custom system prompt
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="conv-title">Title</Label>
              <Input
                id="conv-title"
                value={newConversationForm.title}
                onChange={(e) => setNewConversationForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="My Conversation"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="conv-model">Model</Label>
              <Select
                value={newConversationForm.model}
                onValueChange={(value) => setNewConversationForm(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger id="conv-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-prompt">System Prompt (optional)</Label>
              <Textarea
                id="conv-prompt"
                value={newConversationForm.systemPrompt}
                onChange={(e) => setNewConversationForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="You are a helpful assistant that..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewConversationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createConversation}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newAgentDialog} onOpenChange={setNewAgentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Agent</DialogTitle>
            <DialogDescription>
              Configure a new autonomous AI agent with tools
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={newAgentForm.name}
                onChange={(e) => setNewAgentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Data Analyst"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-goal">Goal</Label>
              <Textarea
                id="agent-goal"
                value={newAgentForm.goal}
                onChange={(e) => setNewAgentForm(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Analyze sales data and provide insights"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agent-model">Model</Label>
              <Select
                value={newAgentForm.model}
                onValueChange={(value) => setNewAgentForm(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger id="agent-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tools</Label>
              <div className="space-y-2">
                {(['calculator', 'datetime', 'memory', 'web_search'] as AgentTool[]).map(tool => (
                  <div key={tool} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tool-${tool}`}
                      checked={newAgentForm.tools.includes(tool)}
                      onCheckedChange={() => toggleAgentTool(tool)}
                    />
                    <Label htmlFor={`tool-${tool}`} className="capitalize cursor-pointer">
                      {tool.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAgentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createAgent} disabled={!newAgentForm.name || !newAgentForm.goal}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
