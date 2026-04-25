import { useState, useEffect, useRef, lazy, Suspense, memo, useCallback, useMemo, startTransition } from 'react'
import { useKV } from '@github/spark/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { KeyboardShortcutsHelper } from '@/components/ui/keyboard-shortcuts'
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav'
import { FloatingActionButton } from '@/components/ui/floating-action-button'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator'
import { OfflineIndicator } from '@/components/notifications/OfflineIndicator'
import { OfflineQueueIndicator } from '@/components/notifications/OfflineQueueIndicator'
import { ServiceWorkerUpdate } from '@/components/notifications/ServiceWorkerUpdate'
import { InstallPrompt } from '@/components/notifications/InstallPrompt'
import { SettingsMenu } from '@/components/settings/SettingsMenu'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'
import { ConversationItem } from '@/components/chat/ConversationItem'
import { ConversationSettings } from '@/components/chat/ConversationSettings'
import { ConversationFilters, type ConversationSortOption, type ConversationFilterOption } from '@/components/chat/ConversationFilters'
import { ChatSearch } from '@/components/chat/ChatSearch'
import { ChatExportDialog } from '@/components/chat/ChatExportDialog'
import { PromptTemplates } from '@/components/chat/PromptTemplates'
import { IndexedDBStatus } from '@/components/cache/IndexedDBStatus'
import { useIsMobile } from '@/hooks/use-mobile'
import { useSwipeGesture } from '@/hooks/use-touch-gestures'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useAutoPerformanceOptimization } from '@/hooks/use-auto-performance'
import { useIndexedDBCache } from '@/hooks/use-indexeddb-cache'
import { useDebounce } from '@/lib/mobile-performance'
import { ChatCircle, Robot, Lightning, Plus, Flask, Cube, Wrench, Download, HardDrives, ChartBar, Sparkle, Cpu, Code, Gear, Users, Brain, Play, ArrowsClockwise, CurrencyDollar, MagnifyingGlass, BookBookmark, DownloadSimple, PushPin } from '@phosphor-icons/react'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ErrorFallback'
import { LazyErrorBoundary } from '@/components/LazyErrorBoundary'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emptyStateChat, emptyStateAgents, emptyStateWorkflow } from '@/assets/index'
import { analytics } from '@/lib/analytics'
import { defaultProfilesByTaskType } from '@/lib/performance-profiles'
import type { Message, Conversation, Agent, AgentRun, AgentTool, ModelConfig, FineTuningDataset, FineTuningJob, QuantizationJob, HarnessManifest, HuggingFaceModel, GGUFModel, PerformanceProfile, TaskType, ModelParameters, AppSettings, AgentFeedback, AgentLearningMetrics, LearningInsight, AgentVersion, LearningSession } from '@/lib/types'
import type { Workflow, WorkflowTemplate, CostEntry, Budget } from '@/lib/workflow-types'
import { AgentLearningEngine } from '@/lib/agent-learning'

const AgentCard = lazy(() => import('@/components/agent/AgentCard'))
const AgentStepView = lazy(() => import('@/components/agent/AgentStepView'))
const AgentTemplates = lazy(() => import('@/components/agent/AgentTemplates'))
const AgentPerformanceMonitor = lazy(() => import('@/components/agent/AgentPerformanceMonitor'))
const CollaborativeAgentManager = lazy(() => import('@/components/agent/CollaborativeAgentManager'))
const FeedbackDialog = lazy(() => import('@/components/agent/FeedbackDialog').then(m => ({ default: m.FeedbackDialog })))
const LearningInsightsPanel = lazy(() => import('@/components/agent/LearningInsightsPanel').then(m => ({ default: m.LearningInsightsPanel })))
const AgentVersionHistory = lazy(() => import('@/components/agent/AgentVersionHistory').then(m => ({ default: m.AgentVersionHistory })))
const ModelConfigPanel = lazy(() => import('@/components/models/ModelConfigPanel'))
const FineTuningUI = lazy(() => import('@/components/models/FineTuningUI'))
const QuantizationTools = lazy(() => import('@/components/models/QuantizationTools'))
const HarnessCreator = lazy(() => import('@/components/harness/HarnessCreator'))
const BundleAutomationPanel = lazy(() => import('@/components/harness/BundleAutomationPanel'))
const HuggingFaceModelBrowser = lazy(() => import('@/components/models/HuggingFaceModelBrowser'))
const GGUFLibrary = lazy(() => import('@/components/models/GGUFLibrary'))
const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard'))
const HardwareOptimizer = lazy(() => import('@/components/models/HardwareOptimizer'))
const QuickActionsMenu = lazy(() => import('@/components/models/QuickActionsMenu'))
const BenchmarkRunner = lazy(() => import('@/components/models/BenchmarkRunner'))
const LearningRateBenchmark = lazy(() => import('@/components/models/LearningRateBenchmark'))
const AppBuilder = lazy(() => import('@/components/builder/AppBuilder'))
const LocalIDE = lazy(() => import('@/components/builder/LocalIDE'))
const CacheManager = lazy(() => import('@/components/notifications/CacheManager'))
const OfflineQueuePanel = lazy(() => import('@/components/notifications/OfflineQueuePanel'))
const IndexedDBCacheManager = lazy(() => import('@/components/cache/IndexedDBCacheManager').then(m => ({ default: m.IndexedDBCacheManager })))
const WorkflowBuilder = lazy(() => import('@/components/workflow/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })))
const WorkflowTemplates = lazy(() => import('@/components/workflow/WorkflowTemplates').then(m => ({ default: m.WorkflowTemplates })))
const CostTracking = lazy(() => import('@/components/cost/CostTracking').then(m => ({ default: m.CostTracking })))

const LoadingFallback = memo(({ message = 'Loading...' }: { message?: string }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center p-8 gap-3"
  >
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full" 
    />
    <p className="text-sm text-muted-foreground">{message}</p>
  </motion.div>
))

LoadingFallback.displayName = 'LoadingFallback'

const TabContentWrapper = memo(({ 
  children, 
  isLoading = false, 
  loadingMessage 
}: { 
  children: React.ReactNode
  isLoading?: boolean
  loadingMessage?: string 
}) => {
  if (isLoading) {
    return <LoadingFallback message={loadingMessage} />
  }
  return <>{children}</>
})

TabContentWrapper.displayName = 'TabContentWrapper'

const TabErrorBoundary = ({ children, tabName }: { children: React.ReactNode; tabName: string }) => {
  const [hasError, setHasError] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)

  useEffect(() => {
    setHasError(false)
    setLastError(null)
  }, [tabName])

  const handleError = useCallback((error: Error, info: { componentStack: string }) => {
    console.error(`[TabError] ${tabName}:`, error, info)
    setErrorCount(prev => prev + 1)
    setHasError(true)
    setLastError(error)
    
    toast.error(`Error in ${tabName} tab`)
  }, [tabName])

  const handleReset = useCallback(() => {
    setHasError(false)
    setErrorCount(0)
    setLastError(null)
    toast.success(`${tabName} tab reset`)
  }, [tabName])

  if (hasError && errorCount > 2) {
    return (
      <ErrorFallback 
        componentName={tabName} 
        resetErrorBoundary={handleReset}
        error={lastError || undefined}
      />
    )
  }

  return (
    <ErrorBoundary
      FallbackComponent={(props) => <ErrorFallback {...props} componentName={tabName} />}
      onError={handleError}
      onReset={handleReset}
      resetKeys={[tabName]}
    >
      {children}
    </ErrorBoundary>
  )
}

function App() {
  const isMobile = useIsMobile()
  const performanceOptimization = useAutoPerformanceOptimization()
  const [conversations, setConversations] = useKV<Conversation[]>('conversations', [])
  const [messages, setMessages] = useKV<Message[]>('messages', [])
  const [agents, setAgents] = useKV<Agent[]>('agents', [])
  const [agentRuns, setAgentRuns] = useKV<AgentRun[]>('agent-runs', [])
  const [models, setModels] = useKV<ModelConfig[]>('models', [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', temperature: 0.7, maxTokens: 2000, topP: 1, frequencyPenalty: 0, presencePenalty: 0 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', temperature: 0.7, maxTokens: 2000, topP: 1, frequencyPenalty: 0, presencePenalty: 0 },
  ])
  
  const indexedDBCache = useIndexedDBCache({
    enableAutoSync: true,
    syncInterval: 30000,
    enableLazyLoad: true,
    maxMemoryItems: 100
  })
  
  const [fineTuningDatasets, setFineTuningDatasets] = useKV<FineTuningDataset[]>('fine-tuning-datasets', [])
  const [fineTuningJobs, setFineTuningJobs] = useKV<FineTuningJob[]>('fine-tuning-jobs', [])
  const [quantizationJobs, setQuantizationJobs] = useKV<QuantizationJob[]>('quantization-jobs', [])
  const [harnesses, setHarnesses] = useKV<HarnessManifest[]>('harnesses', [])
  const [ggufModels, setGgufModels] = useKV<GGUFModel[]>('gguf-models', [])
  const [performanceProfiles, setPerformanceProfiles] = useKV<PerformanceProfile[]>('performance-profiles', [])
  const [agentFeedbacks, setAgentFeedbacks] = useKV<AgentFeedback[]>('agent-feedbacks', [])
  const [agentLearningMetrics, setAgentLearningMetrics] = useKV<Record<string, AgentLearningMetrics>>('agent-learning-metrics', {})
  const [agentVersions, setAgentVersions] = useKV<AgentVersion[]>('agent-versions', [])
  const [learningSessions, setLearningSessions] = useKV<LearningSession[]>('learning-sessions', [])
  const [workflows, setWorkflows] = useKV<Workflow[]>('workflows', [])
  const [costEntries, setCostEntries] = useKV<CostEntry[]>('cost-entries', [])
  const [budgets, setBudgets] = useKV<Budget[]>('budgets', [])
  
  const [appSettings, setAppSettings] = useKV<AppSettings>('app-settings', {
    autoSave: true,
    confirmDelete: true,
    keyboardShortcuts: true,
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    maxHistory: 50,
    preloadModels: true,
    theme: 'dark',
    fontSize: 15,
    density: 'comfortable',
    showTimestamps: true,
    showAvatars: true,
    compactSidebar: false,
    enableAnimations: true,
    animationSpeed: 1,
    reduceMotion: false,
    streamingEnabled: true,
    codeHighlighting: true,
    markdownEnabled: true,
    defaultTemperature: 0.7,
    defaultMaxTokens: 2000,
    autoRunAgents: false,
    showAgentThinking: true,
    agentTimeout: 120000,
    useConversationContext: true,
    contextWindowSize: 20,
    notificationsEnabled: true,
    notificationSound: true,
    notifyAgentComplete: true,
    notifyModelLoaded: false,
    notifyErrors: true,
    notifyUpdates: true,
    showToast: true,
    toastSuccess: true,
    toastInfo: true,
    analyticsEnabled: true,
    crashReportsEnabled: true,
    telemetryEnabled: true,
    localStorageEnabled: true,
    encryptData: false,
    clearDataOnExit: false,
    requireAuth: false,
    autoLockEnabled: false,
    secureMode: false,
    debugMode: false,
    devTools: false,
    experimentalFeatures: false,
    apiEndpoint: 'default',
    requestTimeout: 30000,
    retryAttempts: 3,
    cacheEnabled: true,
    offlineMode: false,
  })
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeAgentRunId, setActiveAgentRunId] = useState<string | null>(null)
  const [activeLearningAgentId, setActiveLearningAgentId] = useState<string | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedRunForFeedback, setSelectedRunForFeedback] = useState<AgentRun | null>(null)
  const [isLearning, setIsLearning] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [newAgentDialog, setNewAgentDialog] = useState(false)
  const [newConversationDialog, setNewConversationDialog] = useState(false)
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [isSwipeIndicatorVisible, setIsSwipeIndicatorVisible] = useState(false)
  const [tabLoadingStates, setTabLoadingStates] = useState<Record<string, boolean>>({})
  const [isTabSwitching, setIsTabSwitching] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  const [conversationSettingsOpen, setConversationSettingsOpen] = useState(false)
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatExportOpen, setChatExportOpen] = useState(false)
  const [promptTemplatesOpen, setPromptTemplatesOpen] = useState(false)
  const [conversationSortBy, setConversationSortBy] = useState<ConversationSortOption>('recent')
  const [conversationFilterBy, setConversationFilterBy] = useState<ConversationFilterOption>('all')

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

  const activeConversation = useMemo(() => 
    conversations?.find(c => c.id === activeConversationId), 
    [conversations, activeConversationId]
  )
  
  const conversationMessages = useMemo(() => {
    if (!messages || !activeConversationId) return []
    return messages.filter(m => m.conversationId === activeConversationId)
  }, [messages, activeConversationId])
  
  const activeAgentRun = useMemo(() => 
    agentRuns?.find(r => r.id === activeAgentRunId), 
    [agentRuns, activeAgentRunId]
  )

  const tabOrder = useMemo(() => ['chat', 'agents', 'workflows', 'models', 'analytics', 'builder'], [])
  const contentRef = useRef<HTMLDivElement>(null)

  const handleTabChange = useCallback((newTab: string) => {
    if (isTabSwitching) return
    
    setIsTabSwitching(true)
    
    startTransition(() => {
      setActiveTab(newTab)
      
      setTimeout(() => {
        setIsTabSwitching(false)
      }, 150)
    })
  }, [isTabSwitching])

  const navigateToTab = useCallback((direction: 'left' | 'right') => {
    if (isTabSwitching) return
    
    const currentIndex = tabOrder.indexOf(activeTab)
    let newIndex: number
    
    if (direction === 'left') {
      newIndex = currentIndex + 1
      if (newIndex >= tabOrder.length) newIndex = 0
    } else {
      newIndex = currentIndex - 1
      if (newIndex < 0) newIndex = tabOrder.length - 1
    }
    
    handleTabChange(tabOrder[newIndex])
    if (!performanceOptimization.isLowEnd) {
      toast.success(`Switched to ${tabOrder[newIndex]}`)
    }
  }, [activeTab, tabOrder, isTabSwitching, handleTabChange, performanceOptimization.isLowEnd])

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: useCallback(() => navigateToTab('left'), [navigateToTab]),
    onSwipeRight: useCallback(() => navigateToTab('right'), [navigateToTab])
  }, 100)

  const refreshConversations = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800))
    toast.success('Conversations refreshed')
    analytics.track('conversation_created', 'chat', 'pull_to_refresh')
  }, [])

  const refreshAgents = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800))
    toast.success('Agents refreshed')
    analytics.track('agent_created', 'agent', 'pull_to_refresh')
  }, [])

  const conversationsPullToRefresh = usePullToRefresh({
    onRefresh: refreshConversations,
    threshold: 80
  })

  const agentsPullToRefresh = usePullToRefresh({
    onRefresh: refreshAgents,
    threshold: 80
  })

  useEffect(() => {
    analytics.track('page_view', 'app', 'load', {
      metadata: { timestamp: Date.now() }
    })
  }, [])

  useEffect(() => {
    if (indexedDBCache.isInitialized && conversations && conversations.length > 0) {
      conversations.forEach(conv => {
        indexedDBCache.cacheConversation(conv)
      })
    }
  }, [conversations, indexedDBCache.isInitialized])

  useEffect(() => {
    if (indexedDBCache.isInitialized && messages && messages.length > 0) {
      const debouncedSync = setTimeout(() => {
        indexedDBCache.syncToCache()
      }, 1000)
      return () => clearTimeout(debouncedSync)
    }
  }, [messages, indexedDBCache.isInitialized])

  const createConversation = useCallback(() => {
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
  }, [newConversationForm, setConversations])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversationId || !content.trim()) return

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
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      
      const currentMessages = messages?.filter(m => m.conversationId === activeConversationId) || []
      const contextMessages = currentMessages.map(m => ({
        role: m.role,
        content: m.content
      }))
      
      if (conversation.systemPrompt) {
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

      setMessages(prev => [...(prev || []), assistantMessage])
      
      setConversations(prev => (prev || []).map(c => 
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
  }, [activeConversationId, conversations, messages, setMessages, setConversations])

  const createAgent = useCallback(() => {
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

    setAgents(prev => [newAgent, ...(prev || [])])
    setNewAgentDialog(false)
    setNewAgentForm({ name: '', goal: '', model: 'gpt-4o-mini', tools: [] })
    toast.success('Agent created')
    
    analytics.track('agent_created', 'agent', 'create_agent', {
      label: newAgent.name,
      metadata: { model: newAgent.model, tools: newAgent.tools, hasGoal: !!newAgent.goal }
    })
  }, [newAgentForm, setAgents])

  const runAgent = useCallback(async (agentId: string) => {
    const agent = agents?.find(a => a.id === agentId)
    if (!agent) {
      toast.error('Agent not found')
      return
    }

    const startTime = Date.now()
    
    setAgents(prev => (prev || []).map(a => 
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

    setAgentRuns(prev => [newRun, ...(prev || [])])
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

      setAgentRuns(prev => (prev || []).map(r => 
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

        setAgentRuns(prev => (prev || []).map(r => 
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

      setAgentRuns(prev => (prev || []).map(r => 
        r.id === runId ? { 
          ...r, 
          steps,
          status: 'completed',
          completedAt: Date.now(),
          result: finalResult
        } : r
      ))

      setAgents(prev => (prev || []).map(a => 
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
      setAgentRuns(prev => (prev || []).map(r => 
        r.id === runId ? { 
          ...r, 
          status: 'error',
          completedAt: Date.now(),
          error: 'Agent execution failed'
        } : r
      ))

      setAgents(prev => (prev || []).map(a => 
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
  }, [agents, setAgents, setAgentRuns])

  const handleProvideFeedback = useCallback((agentId: string) => {
    const recentRun = agentRuns?.filter(r => r.agentId === agentId && r.status === 'completed')
      .sort((a, b) => b.startedAt - a.startedAt)[0]
    
    if (recentRun) {
      setSelectedRunForFeedback(recentRun)
      setFeedbackDialogOpen(true)
    } else {
      toast.error('No completed runs found for feedback')
    }
  }, [agentRuns])

  const submitFeedback = useCallback((feedback: Omit<AgentFeedback, 'id' | 'timestamp'>) => {
    const newFeedback: AgentFeedback = {
      ...feedback,
      id: `feedback-${Date.now()}`,
      timestamp: Date.now()
    }

    setAgentFeedbacks(prev => [newFeedback, ...(prev || [])])

    const qualityScore = AgentLearningEngine.calculateQualityScore(newFeedback)
    
    setAgentRuns(prev => (prev || []).map(r => 
      r.id === feedback.runId
        ? { ...r, feedback: newFeedback, qualityScore }
        : r
    ))

    toast.success('Feedback submitted successfully')
    analytics.track('agent_feedback_submitted', 'agent', 'submit_feedback', {
      metadata: { agentId: feedback.agentId, rating: feedback.rating, qualityScore }
    })
  }, [setAgentFeedbacks, setAgentRuns])

  const triggerLearning = useCallback(async (agentId: string) => {
    const agent = agents?.find(a => a.id === agentId)
    if (!agent) {
      toast.error('Agent not found')
      return
    }

    const agentRunsFiltered = agentRuns?.filter(r => r.agentId === agentId) || []
    const agentFeedbacksFiltered = agentFeedbacks?.filter(f => f.agentId === agentId) || []

    if (agentRunsFiltered.length < 3) {
      toast.error('Need at least 3 runs to analyze for learning')
      return
    }

    setIsLearning(true)
    setActiveLearningAgentId(agentId)

    const sessionId = `session-${Date.now()}`
    const newSession: LearningSession = {
      id: sessionId,
      agentId,
      startedAt: Date.now(),
      runsAnalyzed: 0,
      feedbackProcessed: 0,
      insightsGenerated: 0,
      changesApplied: 0,
      status: 'analyzing'
    }

    setLearningSessions(prev => [newSession, ...(prev || [])])

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const metrics = AgentLearningEngine.analyzeFeedback(agentRunsFiltered, agentFeedbacksFiltered)
      
      setAgentLearningMetrics(prev => ({
        ...prev,
        [agentId]: metrics
      }))

      setLearningSessions(prev => (prev || []).map(s =>
        s.id === sessionId
          ? {
              ...s,
              runsAnalyzed: agentRunsFiltered.length,
              feedbackProcessed: agentFeedbacksFiltered.length,
              insightsGenerated: metrics.learningInsights.length,
              status: 'completed' as const,
              endedAt: Date.now(),
              summary: `Generated ${metrics.learningInsights.length} insights from ${agentRunsFiltered.length} runs`
            }
          : s
      ))

      toast.success(`Learning complete: ${metrics.learningInsights.length} insights generated`)
      analytics.track('agent_learning_completed', 'agent', 'trigger_learning', {
        metadata: { 
          agentId, 
          runsAnalyzed: agentRunsFiltered.length,
          insightsGenerated: metrics.learningInsights.length
        }
      })
    } catch (error) {
      setLearningSessions(prev => (prev || []).map(s =>
        s.id === sessionId
          ? { ...s, status: 'failed' as const, endedAt: Date.now() }
          : s
      ))
      toast.error('Learning process failed')
      console.error(error)
    } finally {
      setIsLearning(false)
      setActiveLearningAgentId(null)
    }
  }, [agents, agentRuns, agentFeedbacks, setAgentLearningMetrics, setLearningSessions])

  const applyInsight = useCallback((agentId: string, insight: LearningInsight) => {
    const agent = agents?.find(a => a.id === agentId)
    if (!agent) return

    const metrics = agentLearningMetrics[agentId]
    if (!metrics) return

    const { agent: updatedAgent, changes } = AgentLearningEngine.applyLearning(
      agent,
      [insight],
      false
    )

    if (changes.length > 0) {
      const agentRunsFiltered = agentRuns?.filter(r => r.agentId === agentId) || []
      const completedRuns = agentRunsFiltered.filter(r => r.status === 'completed')
      const avgExecutionTime = completedRuns.reduce((sum, r) => 
        sum + (r.completedAt! - r.startedAt), 0
      ) / Math.max(completedRuns.length, 1)

      const version = AgentLearningEngine.createVersion(
        agent,
        changes,
        {
          avgRating: metrics.averageRating,
          successRate: completedRuns.length / Math.max(agentRunsFiltered.length, 1),
          avgExecutionTime
        }
      )

      setAgentVersions(prev => [version, ...(prev || [])])
      setAgents(prev => (prev || []).map(a => a.id === agentId ? updatedAgent : a))
      
      setAgentLearningMetrics(prev => ({
        ...prev,
        [agentId]: {
          ...metrics,
          learningInsights: metrics.learningInsights.map(i =>
            i.id === insight.id ? { ...i, applied: true } : i
          )
        }
      }))

      toast.success(`Applied: ${insight.title}`)
      analytics.track('learning_insight_applied', 'agent', 'apply_insight', {
        metadata: { agentId, insightId: insight.id, changesCount: changes.length }
      })
    }
  }, [agents, agentLearningMetrics, agentRuns, setAgents, setAgentVersions, setAgentLearningMetrics])

  const deleteAgent = useCallback((agentId: string) => {
    setAgents(prev => (prev || []).filter(a => a.id !== agentId))
    setAgentRuns(prev => (prev || []).filter(r => r.agentId !== agentId))
    toast.success('Agent deleted')
    
    analytics.track('agent_deleted', 'agent', 'delete_agent', {
      metadata: { agentId }
    })
  }, [setAgents, setAgentRuns])

  const deleteConversation = useCallback((convId: string) => {
    setConversations(prev => (prev || []).filter(c => c.id !== convId))
    setMessages(prev => (prev || []).filter(m => m.conversationId !== convId))
    if (activeConversationId === convId) {
      setActiveConversationId(null)
    }
    indexedDBCache.deleteConversationFromCache(convId)
    toast.success('Conversation deleted')
  }, [activeConversationId, setConversations, setMessages, indexedDBCache])

  const updateConversation = useCallback((convId: string, updates: Partial<Conversation>) => {
    setConversations(prev => (prev || []).map(c =>
      c.id === convId ? { ...c, ...updates, updatedAt: Date.now() } : c
    ))
    toast.success('Conversation updated')
  }, [setConversations])

  const pinConversation = useCallback((convId: string) => {
    setConversations(prev => (prev || []).map(c =>
      c.id === convId ? { ...c, pinned: !c.pinned } : c
    ))
  }, [setConversations])

  const archiveConversation = useCallback((convId: string) => {
    setConversations(prev => (prev || []).map(c =>
      c.id === convId ? { ...c, archived: !c.archived } : c
    ))
    toast.success('Conversation archived')
  }, [setConversations])

  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => (prev || []).map(m =>
      m.id === messageId ? { ...m, content: newContent } : m
    ))
    toast.success('Message edited')
  }, [setMessages])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => (prev || []).filter(m => m.id !== messageId))
    toast.success('Message deleted')
  }, [setMessages])

  const regenerateMessage = useCallback(async (messageId: string) => {
    const message = messages?.find(m => m.id === messageId)
    if (!message || message.role !== 'assistant' || !activeConversationId) return

    const messageIndex = messages?.findIndex(m => m.id === messageId)
    if (messageIndex === undefined || messageIndex < 1) return

    const previousMessage = messages[messageIndex - 1]
    if (!previousMessage || previousMessage.role !== 'user') return

    setMessages(prev => (prev || []).filter(m => m.id !== messageId))
    await sendMessage(previousMessage.content)
  }, [messages, activeConversationId, setMessages])

  const exportMessage = useCallback((message: Message) => {
    const content = `${message.role.toUpperCase()} (${new Date(message.timestamp).toLocaleString()}):\n\n${message.content}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `message-${message.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleSelectMessage = useCallback((conversationId: string, messageId: string) => {
    setActiveConversationId(conversationId)
    setActiveTab('chat')
  }, [])

  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations || []

    switch (conversationFilterBy) {
      case 'pinned':
        filtered = filtered.filter(c => c.pinned && !c.archived)
        break
      case 'archived':
        filtered = filtered.filter(c => c.archived)
        break
      case 'today':
        const today = new Date().setHours(0, 0, 0, 0)
        filtered = filtered.filter(c => c.updatedAt >= today && !c.archived)
        break
      case 'week':
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        filtered = filtered.filter(c => c.updatedAt >= weekAgo && !c.archived)
        break
      case 'month':
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        filtered = filtered.filter(c => c.updatedAt >= monthAgo && !c.archived)
        break
      default:
        filtered = filtered.filter(c => !c.archived)
    }

    switch (conversationSortBy) {
      case 'oldest':
        return [...filtered].sort((a, b) => a.updatedAt - b.updatedAt)
      case 'alphabetical':
        return [...filtered].sort((a, b) => a.title.localeCompare(b.title))
      case 'messages':
        return [...filtered].sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
      default:
        return [...filtered].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return b.updatedAt - a.updatedAt
        })
    }
  }, [conversations, conversationSortBy, conversationFilterBy])

  const toggleAgentTool = useCallback((tool: AgentTool) => {
    setNewAgentForm(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }))
  }, [])

  const saveModelConfig = useCallback((updatedModel: ModelConfig) => {
    setModels(prev => 
      (prev || []).map(m => m.id === updatedModel.id ? updatedModel : m)
    )
    setEditingModelId(null)
    toast.success('Model configuration saved')
  }, [setModels])

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

  const createPerformanceProfile = (profile: Omit<PerformanceProfile, 'id' | 'createdAt'>) => {
    const newProfile: PerformanceProfile = {
      ...profile,
      id: `profile-${Date.now()}`,
      createdAt: Date.now()
    }
    setPerformanceProfiles(prev => [newProfile, ...(prev || [])])
    toast.success('Performance profile created')
  }

  const applyPerformanceProfile = (profile: PerformanceProfile) => {
    if (editingModelId) {
      const model = models?.find(m => m.id === editingModelId)
      if (model) {
        saveModelConfig({
          ...model,
          ...profile.parameters
        })
        
        setPerformanceProfiles(prev => 
          (prev || []).map(p => 
            p.id === profile.id 
              ? { ...p, usageCount: p.usageCount + 1, lastUsed: Date.now() }
              : p
          )
        )
        
        toast.success(`Applied ${profile.name} to ${model.name}`)
      }
    }
  }

  const deletePerformanceProfile = (id: string) => {
    setPerformanceProfiles(prev => (prev || []).filter(p => p.id !== id))
    toast.success('Profile deleted')
  }

  const autoTuneModel = (taskType: TaskType) => {
    if (editingModelId) {
      const model = models?.find(m => m.id === editingModelId)
      if (model) {
        const optimalParams = defaultProfilesByTaskType[taskType]
        
        saveModelConfig({
          ...model,
          ...optimalParams
        })
        
        toast.success(`Auto-tuned for ${taskType.replace('_', ' ')}`)
      }
    }
  }

  const getAnimationProps = useCallback((baseProps: any) => {
    if (performanceOptimization.shouldReduceMotion || performanceOptimization.isLowEnd) {
      return {
        initial: false,
        animate: false,
        exit: false,
        transition: { duration: 0 }
      }
    }
    return baseProps
  }, [performanceOptimization.shouldReduceMotion, performanceOptimization.isLowEnd])

  const saveWorkflow = useCallback((workflow: Workflow) => {
    setWorkflows(prev => {
      const existing = (prev || []).find(w => w.id === workflow.id)
      if (existing) {
        return (prev || []).map(w => w.id === workflow.id ? workflow : w)
      }
      return [workflow, ...(prev || [])]
    })
    analytics.track('workflow_saved', 'workflow', 'save_workflow', {
      label: workflow.name,
      metadata: { nodes: workflow.nodes.length, edges: workflow.edges.length }
    })
  }, [setWorkflows])

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows(prev => (prev || []).filter(w => w.id !== id))
    toast.success('Workflow deleted')
    analytics.track('workflow_deleted', 'workflow', 'delete_workflow')
  }, [setWorkflows])

  const executeWorkflow = useCallback(async (id: string) => {
    const workflow = workflows?.find(w => w.id === id)
    if (!workflow) {
      toast.error('Workflow not found')
      return
    }

    toast.info(`Executing workflow: ${workflow.name}`)
    analytics.track('workflow_executed', 'workflow', 'execute_workflow', {
      label: workflow.name,
      metadata: { workflowId: id }
    })
  }, [workflows])

  const useWorkflowTemplate = useCallback((template: WorkflowTemplate) => {
    const newWorkflow: Workflow = {
      ...template.workflow,
      id: `workflow-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setWorkflows(prev => [newWorkflow, ...(prev || [])])
    toast.success(`Template "${template.name}" added as workflow`)
    analytics.track('template_used', 'workflow', 'use_template', {
      label: template.name
    })
  }, [setWorkflows])

  const trackCost = useCallback((tokensIn: number, tokensOut: number, model: string, resource: 'conversation' | 'agent' | 'workflow', resourceId: string, resourceName: string) => {
    const MODEL_COSTS: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-4o-mini': { input: 0.0015 / 1000, output: 0.006 / 1000 },
      'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
    }

    const costs = MODEL_COSTS[model] || MODEL_COSTS['gpt-4o-mini']
    const cost = (tokensIn * costs.input) + (tokensOut * costs.output)

    const entry: CostEntry = {
      id: `cost-${Date.now()}`,
      timestamp: Date.now(),
      model,
      tokensIn,
      tokensOut,
      cost,
      resource,
      resourceId,
      resourceName
    }

    setCostEntries(prev => [entry, ...(prev || [])])

    setBudgets(prev => (prev || []).map(budget => {
      if (budget.enabled) {
        const newSpent = budget.spent + cost
        if (newSpent >= budget.amount * (budget.alertThreshold / 100) && budget.spent < budget.amount * (budget.alertThreshold / 100)) {
          toast.warning(`Budget "${budget.name}" is ${budget.alertThreshold}% spent!`)
        }
        return { ...budget, spent: newSpent }
      }
      return budget
    }))
  }, [setCostEntries, setBudgets])

  const createBudget = useCallback((budgetData: Omit<Budget, 'id' | 'createdAt' | 'spent'>) => {
    const budget: Budget = {
      ...budgetData,
      id: `budget-${Date.now()}`,
      createdAt: Date.now(),
      spent: 0
    }
    setBudgets(prev => [budget, ...(prev || [])])
    toast.success('Budget created')
    analytics.track('budget_created', 'cost', 'create_budget', {
      label: budget.name
    })
  }, [setBudgets])

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => (prev || []).filter(b => b.id !== id))
    toast.success('Budget deleted')
  }, [setBudgets])

  const editingModel = models?.find(m => m.id === editingModelId)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        />
        
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="border-b border-border/50 bg-card/95 backdrop-blur-xl sticky top-0 z-50 safe-top shadow-lg shadow-primary/5"
        >
          <div className="container mx-auto px-4 sm:px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between gap-2">
              <motion.div 
                className="flex items-center gap-2.5 sm:gap-3 min-w-0"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <motion.div 
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center relative overflow-hidden shrink-0 shadow-lg shadow-primary/30"
                  whileHover={{ scale: 1.08, rotate: 5 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Lightning weight="fill" size={isMobile ? 22 : 24} className="text-white relative z-10" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-accent via-accent to-primary"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-white"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 0.2 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    TrueAI LocalAI
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">Enterprise AI Assistant Platform</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-1 sm:gap-2 shrink-0"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <IndexedDBStatus />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 sm:h-10 sm:w-10 relative group"
                        onClick={() => setSettingsOpen(true)}
                      >
                        <Gear size={isMobile ? 20 : 22} className="text-muted-foreground group-hover:text-foreground transition-colors relative z-10" />
                        <motion.div
                          className="absolute inset-0 rounded-lg bg-accent/10"
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 relative group">
                        <Sparkle size={isMobile ? 20 : 22} className="text-accent relative z-10" />
                        <motion.div
                          className="absolute inset-0 rounded-lg bg-accent/10"
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>What's new</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </div>
          </div>
        </motion.header>

      <main 
        className="container mx-auto px-4 sm:px-4 md:px-6 py-4 sm:py-4 md:py-6 pb-24 lg:pb-6"
        ref={contentRef}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <TabsList className="hidden lg:grid w-full max-w-4xl mx-auto grid-cols-6 mb-6 bg-card/50 backdrop-blur-sm border border-border/50 p-1.5 shadow-lg shadow-primary/5">
              <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:shadow-md transition-all duration-200">
                <ChatCircle weight="fill" size={20} />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:shadow-md transition-all duration-200">
                <Robot weight="fill" size={20} />
                <span className="hidden sm:inline">Agents</span>
              </TabsTrigger>
              <TabsTrigger value="workflows" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:shadow-md transition-all duration-200">
                <ArrowsClockwise weight="fill" size={20} />
                <span className="hidden sm:inline">Workflows</span>
              </TabsTrigger>
              <TabsTrigger value="models" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:shadow-md transition-all duration-200">
                <Lightning weight="fill" size={20} />
                <span className="hidden sm:inline">Models</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:shadow-md transition-all duration-200">
                <ChartBar weight="fill" size={20} />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="builder" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:shadow-md transition-all duration-200">
                <Cube weight="fill" size={20} />
                <span className="hidden sm:inline">Builder</span>
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="chat" className="space-y-4">
            <TabErrorBoundary tabName="Chat">
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex justify-between items-center gap-2"
            >
              <h2 className="text-lg sm:text-xl font-semibold truncate">Conversations</h2>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setChatSearchOpen(true)}
                    >
                      <MagnifyingGlass size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Search</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setPromptTemplatesOpen(true)}
                    >
                      <BookBookmark size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Templates</p>
                  </TooltipContent>
                </Tooltip>

                <ConversationFilters
                  sortBy={conversationSortBy}
                  filterBy={conversationFilterBy}
                  onSortChange={setConversationSortBy}
                  onFilterChange={setConversationFilterBy}
                />

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={() => setNewConversationDialog(true)} size="sm" className="lg:hidden shrink-0 h-10 px-3 shadow-md hover:shadow-lg transition-shadow">
                    <Plus weight="bold" size={20} />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => setNewConversationDialog(true)} className="hidden lg:flex shadow-md hover:shadow-lg transition-shadow">
                    <Plus weight="bold" size={20} className="mr-2" />
                    New Chat
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="lg:col-span-1"
              >
                <Card className="p-4 relative overflow-hidden backdrop-blur-sm bg-card/80 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <PullToRefreshIndicator 
                    isRefreshing={conversationsPullToRefresh.isRefreshing}
                    pullDistance={conversationsPullToRefresh.pullDistance}
                    progress={conversationsPullToRefresh.progress}
                    className="absolute top-0 left-0 right-0 z-10"
                  />
                  <ScrollArea 
                    className="h-[calc(100vh-320px)] sm:h-[600px]"
                    {...conversationsPullToRefresh.handlers}
                  >
                    <AnimatePresence mode="popLayout">
                      <div className="space-y-2">
                        {(!filteredAndSortedConversations || filteredAndSortedConversations.length === 0) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <EmptyState
                              illustration={emptyStateChat}
                              title="No conversations yet"
                              description="Create a new chat to get started with AI assistance"
                              size="md"
                            />
                          </motion.div>
                        )}
                        {filteredAndSortedConversations?.map((conv, index) => (
                          <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isActive={activeConversationId === conv.id}
                            onClick={() => setActiveConversationId(conv.id)}
                            index={index}
                            onPin={pinConversation}
                            onArchive={archiveConversation}
                            onDelete={deleteConversation}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  </ScrollArea>
                </Card>
              </motion.div>

              <Card className="lg:col-span-3 p-4 sm:p-6 flex flex-col h-[calc(100vh-320px)] sm:h-[600px]">
                {activeConversation ? (
                  <>
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold truncate">{activeConversation.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">Model: {activeConversation.model}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setConversationSettingsOpen(true)}
                            >
                              <Gear size={18} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Settings</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setChatExportOpen(true)}
                            >
                              <DownloadSimple size={18} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Export</p>
                          </TooltipContent>
                        </Tooltip>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-9 px-3 active:scale-95 transition-transform hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => deleteConversation(activeConversation.id)}
                        >
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    
                    <ScrollArea className="flex-1 pr-3 sm:pr-4">
                      {conversationMessages.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground text-sm sm:text-base">Start a conversation...</p>
                        </div>
                      )}
                      {conversationMessages.map(msg => (
                        <MessageBubble 
                          key={msg.id} 
                          message={msg}
                          onEdit={editMessage}
                          onDelete={deleteMessage}
                          onRegenerate={regenerateMessage}
                          onExport={exportMessage}
                        />
                      ))}
                      {isStreaming && (
                        <div className="flex gap-3 my-3">
                          <div className="h-8 w-8" />
                          <div className="text-muted-foreground text-sm sm:text-base">Thinking...</div>
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
                  <div className="flex-1 flex items-center justify-center p-4">
                    <p className="text-muted-foreground text-sm sm:text-base text-center">Select or create a conversation</p>
                  </div>
                )}
              </Card>
            </div>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="agents" className="space-y-3 sm:space-y-4">
            <TabErrorBoundary tabName="Agents">
            <Tabs defaultValue="agents-list" className="w-full">
              <div className="flex items-center justify-between gap-2 mb-4">
                <TabsList>
                  <TabsTrigger value="agents-list" className="gap-2">
                    <Robot size={18} weight="fill" />
                    My Agents
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="gap-2">
                    <Flask size={18} weight="fill" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="learning" className="gap-2">
                    <Brain size={18} weight="fill" />
                    Learning
                  </TabsTrigger>
                  <TabsTrigger value="collaborative" className="gap-2">
                    <Users size={18} weight="fill" />
                    <span className="hidden sm:inline">Collaborative</span>
                    <span className="sm:hidden">Collab</span>
                  </TabsTrigger>
                </TabsList>
                <Button onClick={() => setNewAgentDialog(true)} size="sm" className="lg:hidden shrink-0">
                  <Plus weight="bold" size={20} />
                </Button>
                <Button onClick={() => setNewAgentDialog(true)} className="hidden lg:flex">
                  <Plus weight="bold" size={20} className="mr-2" />
                  Create Agent
                </Button>
              </div>

              <TabsContent value="agents-list">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                    {(!agents || agents.length === 0) && (
                      <Card className="p-6 sm:p-12">
                        <EmptyState
                          illustration={emptyStateAgents}
                          title="No agents created yet"
                          description="Create an autonomous AI agent to automate tasks and execute multi-step workflows"
                          size="lg"
                          action={
                            <Button onClick={() => setNewAgentDialog(true)} className="w-full sm:w-auto">
                              <Plus weight="bold" size={20} className="mr-2" />
                              <span className="hidden sm:inline">Create Your First Agent</span>
                              <span className="sm:hidden">Create Agent</span>
                            </Button>
                          }
                        />
                      </Card>
                    )}
                    {agents?.map(agent => {
                      const hasRecentRun = agentRuns?.some(r => 
                        r.agentId === agent.id && 
                        r.status === 'completed' &&
                        !r.feedback
                      )
                      return (
                        <LazyErrorBoundary key={agent.id} componentName="Agent Card">
                          <AgentCard
                            agent={agent}
                            onRun={runAgent}
                            onDelete={deleteAgent}
                            onView={(id) => {
                              const run = agentRuns?.find(r => r.agentId === id)
                              if (run) setActiveAgentRunId(run.id)
                            }}
                            onFeedback={handleProvideFeedback}
                            hasRecentRun={hasRecentRun}
                          />
                        </LazyErrorBoundary>
                      )
                    })}
                  </div>

                  <div className="lg:col-span-1 space-y-3 sm:space-y-4">
                    <Card className="p-3 sm:p-4">
                      <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Execution History</h3>
                      <ScrollArea className="h-[250px] sm:h-[300px]">
                        {activeAgentRun ? (
                          <div className="space-y-2">
                            {activeAgentRun.steps?.map((step, index) => (
                              <LazyErrorBoundary key={step.id} componentName="Agent Step">
                                <AgentStepView step={step} index={index} />
                              </LazyErrorBoundary>
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

                    {agents && agents.length > 0 && (
                      <LazyErrorBoundary componentName="Agent Performance Monitor">
                        <AgentPerformanceMonitor 
                          agent={agents[0]} 
                          runs={agentRuns || []} 
                        />
                      </LazyErrorBoundary>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="templates">
                <LazyErrorBoundary componentName="Agent Templates">
                  <AgentTemplates 
                    onSelectTemplate={(template) => {
                      setNewAgentForm({
                        name: template.name,
                        goal: template.goal,
                        model: 'gpt-4o-mini',
                        tools: template.tools
                      })
                      setNewAgentDialog(true)
                    }}
                  />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="learning">
                {agents && agents.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">Agent Learning & Improvement</h3>
                        <p className="text-sm text-muted-foreground">Track performance, analyze feedback, and continuously improve agents</p>
                      </div>
                      <Select
                        value={activeLearningAgentId || agents[0].id}
                        onValueChange={setActiveLearningAgentId}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(() => {
                        const selectedAgentId = activeLearningAgentId || agents[0].id
                        const selectedAgent = agents.find(a => a.id === selectedAgentId)
                        const metrics = agentLearningMetrics[selectedAgentId]
                        const versions = agentVersions.filter(v => v.agentId === selectedAgentId)

                        return (
                          <>
                            <div className="space-y-4">
                              {selectedAgent && metrics ? (
                                <LazyErrorBoundary componentName="Learning Insights">
                                  <LearningInsightsPanel
                                    agent={selectedAgent}
                                    metrics={metrics}
                                    onApplyInsight={(insight) => applyInsight(selectedAgentId, insight)}
                                    onTriggerLearning={() => triggerLearning(selectedAgentId)}
                                    isLearning={isLearning && activeLearningAgentId === selectedAgentId}
                                  />
                                </LazyErrorBoundary>
                              ) : (
                                <Card className="p-12 text-center">
                                  <Brain size={48} className="mx-auto text-muted-foreground mb-4" />
                                  <h4 className="text-lg font-semibold mb-2">No Learning Data Yet</h4>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Run the agent at least 3 times and provide feedback to enable learning
                                  </p>
                                  {selectedAgent && (
                                    <Button onClick={() => runAgent(selectedAgentId)} className="gap-2">
                                      <Play weight="fill" size={18} />
                                      Run Agent
                                    </Button>
                                  )}
                                </Card>
                              )}
                            </div>

                            <div className="space-y-4">
                              <LazyErrorBoundary componentName="Version History">
                                <AgentVersionHistory
                                  versions={versions}
                                  onRestore={(version) => {
                                    if (selectedAgent) {
                                      setAgents(prev => (prev || []).map(a =>
                                        a.id === selectedAgentId
                                          ? { ...a, ...version.changes.reduce((acc, change) => ({ ...acc, [change.field]: change.newValue }), {}) }
                                          : a
                                      ))
                                      toast.success(`Restored to version ${version.version}`)
                                    }
                                  }}
                                />
                              </LazyErrorBoundary>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <Robot size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No Agents to Learn</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create an agent first to start tracking learning and improvements
                    </p>
                    <Button onClick={() => setNewAgentDialog(true)} className="gap-2">
                      <Plus weight="bold" size={18} />
                      Create Agent
                    </Button>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="collaborative">
                <LazyErrorBoundary componentName="Collaborative Agent Manager">
                  <CollaborativeAgentManager 
                    agents={agents || []}
                    onRunCollaboration={async (agentIds, objective) => {
                      for (const agentId of agentIds) {
                        await runAgent(agentId)
                        await new Promise(resolve => setTimeout(resolve, 1000))
                      }
                    }}
                  />
                </LazyErrorBoundary>
              </TabsContent>
            </Tabs>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="models" className="space-y-3 sm:space-y-4">
            <TabErrorBoundary tabName="Models">
            <Tabs defaultValue="optimize" className="w-full">
              <ScrollArea className="w-full pb-2">
                <TabsList className="inline-flex w-full sm:w-auto min-w-full sm:min-w-0 justify-start sm:justify-center mb-4 sm:mb-6 h-auto p-1">
                  <TabsTrigger value="optimize" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <Cpu size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Optimize</span>
                    <span className="sm:hidden">Opt</span>
                  </TabsTrigger>
                  <TabsTrigger value="browse" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Browse</span>
                    <span className="sm:hidden">Browse</span>
                  </TabsTrigger>
                  <TabsTrigger value="library" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <HardDrives size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Library</span>
                    <span className="sm:hidden">Library</span>
                  </TabsTrigger>
                  <TabsTrigger value="config" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <Lightning size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Config</span>
                    <span className="sm:hidden">Config</span>
                  </TabsTrigger>
                  <TabsTrigger value="finetuning" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <Flask size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Fine-Tune</span>
                    <span className="sm:hidden">Tune</span>
                  </TabsTrigger>
                  <TabsTrigger value="quantization" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <Cube size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Quant</span>
                    <span className="sm:hidden">Quant</span>
                  </TabsTrigger>
                  <TabsTrigger value="harness" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <Wrench size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Harness</span>
                    <span className="sm:hidden">Tools</span>
                  </TabsTrigger>
                  <TabsTrigger value="benchmark" className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm px-2 sm:px-4 py-2">
                    <ChartBar size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden sm:inline">Benchmark</span>
                    <span className="sm:hidden">Bench</span>
                  </TabsTrigger>
                </TabsList>
              </ScrollArea>

              <TabsContent value="optimize">
                <LazyErrorBoundary componentName="Hardware Optimizer">
                  <HardwareOptimizer 
                    onSettingsApplied={(settings) => {
                      toast.success(`Optimization applied: ${settings.tier.toUpperCase()} tier`)
                    }}
                  />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="browse">
                <LazyErrorBoundary componentName="Model Browser">
                  <HuggingFaceModelBrowser onDownload={handleHuggingFaceDownload} />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="library">
                <LazyErrorBoundary componentName="GGUF Library">
                  <GGUFLibrary
                    models={ggufModels || []}
                    onAddModel={addGGUFModel}
                    onDeleteModel={deleteGGUFModel}
                  />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="config" className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold">Model Configuration</h2>
                  <div className="flex items-center gap-2">
                    {!editingModel && isMobile && models && models.length > 0 && (
                      <Suspense fallback={null}>
                        <QuickActionsMenu
                          model={models[0]}
                          onUpdate={(updatedModel) => {
                            setModels(prev => 
                              (prev || []).map(m => m.id === updatedModel.id ? updatedModel : m)
                            )
                          }}
                        />
                      </Suspense>
                    )}
                    {editingModel && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingModelId(null)} className="h-8 sm:h-9">
                        Back
                      </Button>
                    )}
                  </div>
                </div>
                
                {editingModel ? (
                  <LazyErrorBoundary componentName="Model Configuration">
                    <ModelConfigPanel
                      model={editingModel}
                      onSave={saveModelConfig}
                      onClose={() => setEditingModelId(null)}
                    />
                  </LazyErrorBoundary>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {models?.map(model => (
                      <Card key={model.id} className="p-4 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold truncate">{model.name}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground capitalize mt-1">Provider: {model.provider}</p>
                          </div>
                          <Separator />
                          <div className="space-y-1 text-xs sm:text-sm">
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
                          <div className="flex gap-2">
                            {isMobile && (
                              <LazyErrorBoundary componentName="Quick Actions">
                                <QuickActionsMenu
                                  model={model}
                                  onUpdate={(updatedModel) => {
                                    setModels(prev => 
                                      (prev || []).map(m => m.id === updatedModel.id ? updatedModel : m)
                                    )
                                  }}
                                />
                              </LazyErrorBoundary>
                            )}
                            <Button
                              variant="outline"
                              className={`${isMobile ? 'flex-1' : 'w-full'} h-9 text-sm`}
                              onClick={() => setEditingModelId(model.id)}
                            >
                              {isMobile ? 'Advanced' : 'Configure'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="finetuning">
                <LazyErrorBoundary componentName="Fine-Tuning UI">
                  <FineTuningUI
                    models={models || []}
                    datasets={fineTuningDatasets || []}
                    jobs={fineTuningJobs || []}
                    onCreateDataset={createFineTuningDataset}
                    onStartJob={startFineTuningJob}
                    onDeleteDataset={deleteFineTuningDataset}
                    onDeleteJob={deleteFineTuningJob}
                  />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="quantization">
                <LazyErrorBoundary componentName="Quantization Tools">
                  <QuantizationTools
                    models={models || []}
                    jobs={quantizationJobs || []}
                    onStartJob={startQuantizationJob}
                    onDeleteJob={deleteQuantizationJob}
                    onDownloadModel={downloadQuantizedModel}
                  />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="harness">
                <Tabs defaultValue="creator" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="creator" className="gap-2">
                      <Wrench weight="fill" size={18} />
                      Harness Creator
                    </TabsTrigger>
                    <TabsTrigger value="automation" className="gap-2">
                      <Lightning weight="fill" size={18} />
                      Bundle Automation
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="creator">
                    <LazyErrorBoundary componentName="Harness Creator">
                      <HarnessCreator
                        harnesses={harnesses || []}
                        onCreateHarness={createHarness}
                        onDeleteHarness={deleteHarness}
                        onExportHarness={exportHarness}
                      />
                    </LazyErrorBoundary>
                  </TabsContent>

                  <TabsContent value="automation">
                    <LazyErrorBoundary componentName="Bundle Automation">
                      <BundleAutomationPanel
                        messages={messages || []}
                        agents={agents || []}
                        agentRuns={agentRuns || []}
                        harnesses={harnesses || []}
                      />
                    </LazyErrorBoundary>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="benchmark">
                <Tabs defaultValue="standard" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="standard" className="gap-2">
                      <ChartBar weight="fill" size={18} />
                      Standard Benchmark
                    </TabsTrigger>
                    <TabsTrigger value="learning-rate" className="gap-2">
                      <Lightning weight="fill" size={18} />
                      Learning Rate Tuning
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="standard">
                    <LazyErrorBoundary componentName="Benchmark Runner">
                      <BenchmarkRunner 
                        models={models || []}
                      />
                    </LazyErrorBoundary>
                  </TabsContent>

                  <TabsContent value="learning-rate">
                    <LazyErrorBoundary componentName="Learning Rate Benchmark">
                      <LearningRateBenchmark
                        models={models || []}
                        onModelUpdate={(updatedModel) => {
                          setModels(prev => 
                            (prev || []).map(m => m.id === updatedModel.id ? updatedModel : m)
                          )
                        }}
                      />
                    </LazyErrorBoundary>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="analytics">
            <TabErrorBoundary tabName="Analytics">
            <div className="space-y-6">
              <LazyErrorBoundary componentName="Analytics Dashboard">
                <AnalyticsDashboard 
                  models={models || []}
                  profiles={performanceProfiles || []}
                  onApplyOptimization={(insight) => {
                    if (insight.suggestedAction?.type === 'adjust_parameters' && insight.suggestedAction.details.modelId) {
                      const model = models?.find(m => m.id === insight.suggestedAction!.details.modelId)
                      if (model) {
                        const updatedModel = {
                          ...model,
                          ...insight.suggestedAction.details.parameters
                        }
                        setModels(prev => (prev || []).map(m => m.id === model.id ? updatedModel : m))
                        toast.success('Optimization applied successfully')
                        analytics.track('optimization_applied', 'analytics', 'apply_insight', {
                          metadata: { insightId: insight.id, insightType: insight.type }
                        })
                      }
                    } else if (insight.suggestedAction?.type === 'add_profile') {
                      toast.info('Navigate to Performance Profiles to create task-specific profiles')
                    }
                  }}
                  onApplyAutoTune={(recommendation, modelId) => {
                    const model = models?.find(m => m.id === modelId)
                    if (model) {
                      const updatedModel = {
                        ...model,
                        ...recommendation.recommendedParams
                      }
                      setModels(prev => (prev || []).map(m => m.id === modelId ? updatedModel : m))
                      toast.success(`Model auto-tuned for ${recommendation.taskType.replace('_', ' ')}`)
                      analytics.track('auto_tune_applied', 'analytics', 'apply_auto_tune', {
                        metadata: { 
                          modelId, 
                          taskType: recommendation.taskType,
                          confidence: recommendation.confidence
                        }
                      })
                    }
                  }}
                  onCreateProfile={(taskType) => {
                    toast.info('Navigate to Models > Config to create performance profiles')
                    handleTabChange('models')
                  }}
                />
              </LazyErrorBoundary>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LazyErrorBoundary componentName="IndexedDB Cache Manager">
                  <IndexedDBCacheManager />
                </LazyErrorBoundary>

                <LazyErrorBoundary componentName="Offline Queue">
                  <OfflineQueuePanel />
                </LazyErrorBoundary>
                
                <LazyErrorBoundary componentName="Cache Manager">
                  <CacheManager />
                </LazyErrorBoundary>
              </div>
            </div>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4">
            <TabErrorBoundary tabName="Workflows">
            <Tabs defaultValue="builder" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="builder" className="gap-2">
                  <ArrowsClockwise weight="fill" size={18} />
                  Builder
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-2">
                  <Flask weight="fill" size={18} />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="cost" className="gap-2">
                  <CurrencyDollar weight="fill" size={18} />
                  Cost Tracking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="builder">
                <LazyErrorBoundary componentName="Workflow Builder">
                  <WorkflowBuilder
                    workflows={workflows || []}
                    agents={agents || []}
                    onSaveWorkflow={saveWorkflow}
                    onDeleteWorkflow={deleteWorkflow}
                    onExecuteWorkflow={executeWorkflow}
                  />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="templates">
                <LazyErrorBoundary componentName="Workflow Templates">
                  <WorkflowTemplates onUseTemplate={useWorkflowTemplate} />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="cost">
                <LazyErrorBoundary componentName="Cost Tracking">
                  <CostTracking
                    costEntries={costEntries || []}
                    budgets={budgets || []}
                    onCreateBudget={createBudget}
                    onDeleteBudget={deleteBudget}
                  />
                </LazyErrorBoundary>
              </TabsContent>
            </Tabs>
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="builder">
            <TabErrorBoundary tabName="Builder">
            <Tabs defaultValue="ai-builder" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="ai-builder" className="gap-2">
                  <Sparkle weight="fill" size={18} />
                  AI Builder
                </TabsTrigger>
                <TabsTrigger value="local-ide" className="gap-2">
                  <Code weight="fill" size={18} />
                  Local IDE
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai-builder">
                <LazyErrorBoundary componentName="AI Builder">
                  <AppBuilder models={models || []} />
                </LazyErrorBoundary>
              </TabsContent>

              <TabsContent value="local-ide">
                <LazyErrorBoundary componentName="Local IDE">
                  <LocalIDE />
                </LazyErrorBoundary>
              </TabsContent>
            </Tabs>
            </TabErrorBoundary>
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
                  {models?.map(model => (
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
                  {models?.map(model => (
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
      
      {selectedRunForFeedback && (
        <LazyErrorBoundary componentName="Feedback Dialog">
          <FeedbackDialog
            open={feedbackDialogOpen}
            onOpenChange={setFeedbackDialogOpen}
            agentRun={selectedRunForFeedback}
            onSubmit={(feedback) => {
              submitFeedback(feedback)
              setFeedbackDialogOpen(false)
              setSelectedRunForFeedback(null)
            }}
          />
        </LazyErrorBoundary>
      )}

      {activeConversation && (
        <>
          <ConversationSettings
            conversation={activeConversation}
            models={models || []}
            onUpdate={(updates) => updateConversation(activeConversation.id, updates)}
            open={conversationSettingsOpen}
            onOpenChange={setConversationSettingsOpen}
          />

          <ChatExportDialog
            open={chatExportOpen}
            onOpenChange={setChatExportOpen}
            conversation={activeConversation}
            messages={conversationMessages}
          />
        </>
      )}

      <ChatSearch
        open={chatSearchOpen}
        onOpenChange={setChatSearchOpen}
        conversations={conversations || []}
        messages={messages || []}
        onSelectMessage={handleSelectMessage}
      />

      <PromptTemplates
        open={promptTemplatesOpen}
        onOpenChange={setPromptTemplatesOpen}
        onSelectTemplate={(template) => {
          if (activeConversationId) {
            sendMessage(template.content)
          } else {
            toast.info('Please select or create a conversation first')
          }
        }}
      />
      
      <KeyboardShortcutsHelper />
      
      {isMobile && (
        <>
          <MobileBottomNav
            items={[
              {
                id: 'chat',
                label: 'Chat',
                icon: <ChatCircle weight="fill" size={24} />,
                active: activeTab === 'chat',
                onClick: () => handleTabChange('chat')
              },
              {
                id: 'agents',
                label: 'Agents',
                icon: <Robot weight="fill" size={24} />,
                active: activeTab === 'agents',
                onClick: () => handleTabChange('agents')
              },
              {
                id: 'models',
                label: 'Models',
                icon: <Lightning weight="fill" size={24} />,
                active: activeTab === 'models',
                onClick: () => handleTabChange('models')
              },
              {
                id: 'builder',
                label: 'Builder',
                icon: <Cube weight="fill" size={24} />,
                active: activeTab === 'builder',
                onClick: () => handleTabChange('builder')
              },
              {
                id: 'analytics',
                label: 'Analytics',
                icon: <ChartBar weight="fill" size={24} />,
                active: activeTab === 'analytics',
                onClick: () => handleTabChange('analytics')
              }
            ]}
          />
          
          {activeTab === 'chat' && (
            <FloatingActionButton
              onClick={() => setNewConversationDialog(true)}
              icon={<Plus weight="bold" size={28} />}
            />
          )}
          
          {activeTab === 'agents' && (
            <FloatingActionButton
              onClick={() => setNewAgentDialog(true)}
              icon={<Plus weight="bold" size={28} />}
            />
          )}
        </>
      )}
      
      <OfflineIndicator />
      <ServiceWorkerUpdate />
      <InstallPrompt />
      
      {performanceOptimization.isOptimized && appSettings?.debugMode && (
        <PerformanceMonitor />
      )}
      
      <SettingsMenu
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={appSettings || {
          autoSave: true,
          confirmDelete: true,
          keyboardShortcuts: true,
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          maxHistory: 50,
          preloadModels: true,
          theme: 'dark',
          fontSize: 15,
          density: 'comfortable',
          showTimestamps: true,
          showAvatars: true,
          compactSidebar: false,
          enableAnimations: true,
          animationSpeed: 1,
          reduceMotion: false,
          streamingEnabled: true,
          codeHighlighting: true,
          markdownEnabled: true,
          defaultTemperature: 0.7,
          defaultMaxTokens: 2000,
          autoRunAgents: false,
          showAgentThinking: true,
          agentTimeout: 120000,
          useConversationContext: true,
          contextWindowSize: 20,
          notificationsEnabled: true,
          notificationSound: true,
          notifyAgentComplete: true,
          notifyModelLoaded: false,
          notifyErrors: true,
          notifyUpdates: true,
          showToast: true,
          toastSuccess: true,
          toastInfo: true,
          analyticsEnabled: true,
          crashReportsEnabled: true,
          telemetryEnabled: true,
          localStorageEnabled: true,
          encryptData: false,
          clearDataOnExit: false,
          requireAuth: false,
          autoLockEnabled: false,
          secureMode: false,
          debugMode: false,
          devTools: false,
          experimentalFeatures: false,
          apiEndpoint: 'default',
          requestTimeout: 30000,
          retryAttempts: 3,
          cacheEnabled: true,
          offlineMode: false,
        }}
        onSettingsChange={setAppSettings}
      />
    </div>
    </TooltipProvider>
  )
}

export default App
