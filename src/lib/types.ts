export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: string
}

export interface Conversation {
  id: string
  title: string
  systemPrompt?: string
  model: string
  createdAt: number
  updatedAt: number
  messageCount?: number
  tags?: string[]
  temperature?: number
  maxTokens?: number
  streamingEnabled?: boolean
  contextWindow?: number
  pinned?: boolean
  archived?: boolean
}

export interface Agent {
  id: string
  name: string
  goal: string
  model: string
  tools: AgentTool[]
  createdAt: number
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused'
  schedule?: AgentSchedule
  knowledgeBaseId?: string
  maxIterations?: number
  temperature?: number
  systemPrompt?: string
  memoryEnabled?: boolean
  collaborativeMode?: boolean
  priority?: 'low' | 'normal' | 'high'
  tags?: string[]
  capabilities?: AgentCapability[]
}

export type AgentTool = 
  | 'calculator' 
  | 'datetime' 
  | 'memory' 
  | 'web_search'
  | 'code_interpreter'
  | 'file_reader'
  | 'json_parser'
  | 'api_caller'
  | 'data_analyzer'
  | 'image_generator'
  | 'sentiment_analyzer'
  | 'summarizer'
  | 'translator'
  | 'validator'

export type AgentCapability = 
  | 'reasoning'
  | 'planning'
  | 'memory'
  | 'collaboration'
  | 'self_correction'
  | 'learning'

export interface AgentRun {
  id: string
  agentId: string
  startedAt: number
  completedAt?: number
  pausedAt?: number
  resumedAt?: number
  status: 'running' | 'completed' | 'error' | 'paused' | 'cancelled'
  steps: AgentStep[]
  result?: string
  error?: string
  tokensUsed?: number
  costEstimate?: number
  iterations?: number
  memorySnapshot?: Record<string, unknown>
  feedback?: AgentFeedback
  qualityScore?: number
  improvementSuggestions?: string[]
}

export interface AgentStep {
  id: string
  type: 'planning' | 'tool_call' | 'observation' | 'decision' | 'error' | 'retry' | 'memory_update'
  content: string
  toolName?: string
  toolInput?: string
  toolOutput?: string
  timestamp: number
  duration?: number
  success?: boolean
  retryCount?: number
  confidence?: number
}

export interface AgentSchedule {
  enabled: boolean
  frequency: 'once' | 'daily' | 'weekly' | 'monthly'
  nextRun: number
  lastRun?: number
}

export interface ModelConfig {
  id: string
  name: string
  provider: 'ollama' | 'openai' | 'huggingface' | 'custom'
  endpoint?: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  contextLength?: number
  quantization?: string
  size?: number
}

export interface HuggingFaceModel {
  id: string
  name: string
  author: string
  downloads: number
  likes: number
  size: number
  quantization: string
  contextLength: number
  tags: string[]
  description?: string
  downloadUrl: string
}

export interface CustomHarness {
  id: string
  name: string
  description: string
  manifestUrl?: string
  uploadUrl?: string
  tools: string[]
  createdAt: number
  enabled: boolean
}

export interface EnsembleAgent {
  id: string
  name: string
  models: string[]
  strategy: 'consensus' | 'majority' | 'first' | 'best'
  createdAt: number
  runs: EnsembleRun[]
}

export interface EnsembleRun {
  id: string
  ensembleId: string
  prompt: string
  responses: ModelResponse[]
  finalResult: string
  timestamp: number
}

export interface ModelResponse {
  modelId: string
  response: string
  confidence?: number
  responseTime: number
}

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  documents: KnowledgeDocument[]
  createdAt: number
  updatedAt: number
}

export interface KnowledgeDocument {
  id: string
  title: string
  content: string
  chunks: string[]
  embeddings?: number[][]
  addedAt: number
}

export interface Notification {
  id: string
  type: 'agent_complete' | 'agent_error' | 'schedule_run' | 'info'
  title: string
  message: string
  timestamp: number
  read: boolean
  agentId?: string
  runId?: string
}

export interface ConversationAnalytics {
  totalMessages: number
  totalConversations: number
  averageResponseTime: number
  mostUsedModel: string
  messagesByDay: { date: string; count: number }[]
  topTopics: { topic: string; count: number }[]
}

export interface ModelBenchmark {
  modelId: string
  avgResponseTime: number
  avgTokensPerSecond: number
  successRate: number
  totalRuns: number
  lastRun: number
}

export interface ChatSettings {
  activeModel: string
  ollamaUrl: string
  streamingEnabled: boolean
  showTimestamps: boolean
  voiceEnabled: boolean
  notificationsEnabled: boolean
}

export interface FineTuningDataset {
  id: string
  name: string
  description: string
  format: 'jsonl' | 'csv' | 'parquet'
  samples: FineTuningSample[]
  createdAt: number
  size: number
}

export interface FineTuningSample {
  id: string
  prompt: string
  completion: string
  metadata?: Record<string, unknown>
}

export interface FineTuningJob {
  id: string
  modelId: string
  datasetId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  epochs: number
  learningRate: number
  batchSize: number
  startedAt?: number
  completedAt?: number
  resultModelId?: string
  error?: string
  metrics?: FineTuningMetrics
}

export interface FineTuningMetrics {
  loss: number[]
  accuracy: number[]
  epoch: number
  step: number
}

export interface QuantizationJob {
  id: string
  modelId: string
  targetFormat: 'Q4_0' | 'Q4_1' | 'Q5_0' | 'Q5_1' | 'Q8_0' | 'F16' | 'F32'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startedAt?: number
  completedAt?: number
  originalSize?: number
  quantizedSize?: number
  resultModelId?: string
  error?: string
}

export interface HarnessManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  tools: HarnessTool[]
  dependencies?: string[]
  repository?: string
  license?: string
}

export interface HarnessTool {
  name: string
  description: string
  parameters: HarnessParameter[]
  returns: string
}

export interface HarnessParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required: boolean
  default?: unknown
}

export interface GGUFModel {
  id: string
  name: string
  filename: string
  path: string
  size: number
  quantization: string
  architecture?: string
  contextLength?: number
  parameterCount?: number
  downloadedAt: number
  lastUsed?: number
  metadata: GGUFMetadata
}

export interface GGUFMetadata {
  format: 'GGUF'
  version?: string
  alignment?: number
  tensorCount?: number
  kvCount?: number
  fileType?: string
  vocabularySize?: number
  embeddingLength?: number
  layerCount?: number
  headCount?: number
  headCountKV?: number
  ropeFrequencyBase?: number
  ropeScalingType?: string
  maxSequenceLength?: number
  modelAuthor?: string
  modelUrl?: string
  modelLicense?: string
  tags?: string[]
}

export type WorkflowNodeType = 'agent' | 'tool' | 'decision' | 'loop' | 'parallel' | 'merge' | 'start' | 'end' | 'trigger' | 'action'

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  status?: 'draft' | 'active' | 'archived'
  category?: string
  tags?: string[]
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: {
    label: string
    config?: Record<string, unknown>
    agentId?: string
    toolName?: string
    condition?: string
    iterations?: number
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
  animated?: boolean
  style?: Record<string, unknown>
  condition?: string
}

export interface AnalyticsEvent {
  id: string
  type: AnalyticsEventType
  timestamp: number
  userId?: string
  sessionId: string
  category: string
  action: string
  label?: string
  value?: number
  metadata?: Record<string, unknown>
  duration?: number
}

export type AnalyticsEventType =
  | 'chat_message_sent'
  | 'chat_message_received'
  | 'conversation_created'
  | 'conversation_deleted'
  | 'agent_created'
  | 'agent_run_started'
  | 'agent_run_completed'
  | 'agent_run_failed'
  | 'agent_deleted'
  | 'agent_feedback_submitted'
  | 'agent_learning_completed'
  | 'learning_insight_applied'
  | 'model_configured'
  | 'model_downloaded'
  | 'model_deleted'
  | 'harness_created'
  | 'harness_deleted'
  | 'harness_exported'
  | 'dataset_created'
  | 'dataset_deleted'
  | 'finetuning_started'
  | 'finetuning_completed'
  | 'quantization_started'
  | 'quantization_completed'
  | 'gguf_model_added'
  | 'gguf_model_deleted'
  | 'tool_used'
  | 'error_occurred'
  | 'page_view'
  | 'feature_used'
  | 'optimization_applied'
  | 'auto_tune_applied'
  | 'workflow_saved'
  | 'workflow_deleted'
  | 'workflow_executed'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'template_used'
  | 'budget_created'
  | 'app_project_created'
  | 'app_code_generated'
  | 'app_build_started'
  | 'app_build_completed'
  | 'app_test_started'
  | 'app_test_completed'
  | 'app_project_deleted'
  | 'app_project_downloaded'
  | 'app_project_edited'
  | 'app_code_edited'
  | 'app_refinement_started'
  | 'app_project_duplicated'
  | 'template_preview_opened'
  | 'ide_project_created'
  | 'ide_file_created'
  | 'ide_file_deleted'
  | 'ide_project_deleted'
  | 'ide_file_saved'
  | 'ide_project_run'
  | 'ide_project_downloaded'
  | 'ide_theme_changed'
  | 'ide_auto_save_toggled'
  | 'automation_analysis_started'
  | 'automation_analysis_completed'
  | 'automation_rule_created'
  | 'automation_rule_toggled'
  | 'automation_rule_deleted'
  | 'automation_rules_exported'
  | 'automation_rules_imported'
  | 'learning_rate_schedule_generated'
  | 'learning_rate_experiment_completed'
  | 'learning_rate_applied'
  | 'page_viewed'
  | 'button_clicked'

export interface AnalyticsSession {
  id: string
  startedAt: number
  endedAt?: number
  duration?: number
  eventCount: number
  userId?: string
  userAgent?: string
  platform?: string
}

export interface AnalyticsMetrics {
  totalEvents: number
  totalSessions: number
  averageSessionDuration: number
  activeUsers: number
  eventsByType: { type: string; count: number }[]
  eventsByDay: { date: string; count: number }[]
  topActions: { action: string; count: number }[]
  errorRate: number
  chatMetrics: {
    totalMessages: number
    totalConversations: number
    averageMessagesPerConversation: number
    averageResponseTime: number
    mostUsedModels: { model: string; count: number }[]
  }
  agentMetrics: {
    totalAgents: number
    totalRuns: number
    successRate: number
    averageExecutionTime: number
    mostUsedTools: { tool: string; count: number }[]
  }
  modelMetrics: {
    totalModels: number
    totalDownloads: number
    mostPopularModels: { model: string; downloads: number }[]
    storageUsed: number
  }
}

export interface AnalyticsFilter {
  startDate?: number
  endDate?: number
  eventTypes?: AnalyticsEventType[]
  userId?: string
  category?: string
}

export type TaskType = 
  | 'creative_writing'
  | 'code_generation'
  | 'data_analysis'
  | 'conversation'
  | 'summarization'
  | 'translation'
  | 'question_answering'
  | 'reasoning'
  | 'instruction_following'
  | 'brainstorming'

export interface PerformanceProfile {
  id: string
  name: string
  taskType: TaskType
  description: string
  parameters: ModelParameters
  reasoning: string
  createdAt: number
  lastUsed?: number
  usageCount: number
  avgQualityScore?: number
  benchmarkResults?: ProfileBenchmark[]
}

export interface ModelParameters {
  temperature: number
  maxTokens: number
  topP: number
  topK?: number
  frequencyPenalty: number
  presencePenalty: number
  repeatPenalty?: number
  minP?: number
  typicalP?: number
  seed?: number
  stopSequences?: string[]
}

export interface ProfileBenchmark {
  id: string
  timestamp: number
  taskType: TaskType
  promptLength: number
  responseLength: number
  responseTime: number
  tokensPerSecond: number
  qualityScore?: number
  parameters: ModelParameters
  modelId: string
}

export interface AutoTuneRecommendation {
  taskType: TaskType
  currentParams: ModelParameters
  recommendedParams: ModelParameters
  reasoning: string
  expectedImprovements: {
    quality?: string
    speed?: string
    creativity?: string
    consistency?: string
  }
  confidence: number
}

export interface TaskTypeMetrics {
  taskType: TaskType
  totalExecutions: number
  avgResponseTime: number
  avgQualityScore: number
  avgTokensPerSecond: number
  mostUsedProfile?: string
  successRate: number
}

export interface AgentFeedback {
  id: string
  runId: string
  agentId: string
  rating: 1 | 2 | 3 | 4 | 5
  accuracy: number
  efficiency: number
  relevance: number
  comment?: string
  issues?: FeedbackIssue[]
  timestamp: number
  userId?: string
}

export interface FeedbackIssue {
  type: 'incorrect_result' | 'missing_information' | 'wrong_tool' | 'poor_reasoning' | 'timeout' | 'other'
  description: string
  severity: 'low' | 'medium' | 'high'
  step?: string
}

export interface AgentLearningMetrics {
  agentId: string
  totalRuns: number
  averageRating: number
  improvementRate: number
  commonIssues: { issue: string; count: number }[]
  toolEffectiveness: { tool: string; successRate: number; avgTime: number }[]
  parameterTrends: {
    temperature: { value: number; trend: 'improving' | 'stable' | 'declining' }
    maxIterations: { value: number; trend: 'improving' | 'stable' | 'declining' }
  }
  learningInsights: LearningInsight[]
  lastUpdated: number
}

export interface LearningInsight {
  id: string
  type: 'pattern' | 'improvement' | 'regression' | 'recommendation'
  title: string
  description: string
  confidence: number
  actionable: boolean
  action?: {
    type: 'adjust_parameter' | 'change_tool' | 'modify_prompt' | 'add_capability'
    details: Record<string, unknown>
  }
  createdAt: number
  applied?: boolean
}

export interface AgentVersion {
  id: string
  agentId: string
  version: number
  changes: VersionChange[]
  performanceSnapshot: {
    avgRating: number
    successRate: number
    avgExecutionTime: number
  }
  createdAt: number
  createdBy: 'user' | 'auto_learning'
}

export interface VersionChange {
  field: string
  oldValue: unknown
  newValue: unknown
  reason: string
}

export interface LearningSession {
  id: string
  agentId: string
  startedAt: number
  endedAt?: number
  runsAnalyzed: number
  feedbackProcessed: number
  insightsGenerated: number
  changesApplied: number
  status: 'analyzing' | 'generating_insights' | 'applying_changes' | 'completed' | 'failed'
  summary?: string
}

export interface AppSettings {
  autoSave: boolean
  confirmDelete: boolean
  keyboardShortcuts: boolean
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh'
  timezone: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'relative'
  maxHistory: number
  preloadModels: boolean
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  density: 'compact' | 'comfortable' | 'spacious'
  showTimestamps: boolean
  showAvatars: boolean
  compactSidebar: boolean
  enableAnimations: boolean
  animationSpeed: number
  reduceMotion: boolean
  streamingEnabled: boolean
  codeHighlighting: boolean
  markdownEnabled: boolean
  defaultTemperature: number
  defaultMaxTokens: number
  autoRunAgents: boolean
  showAgentThinking: boolean
  agentTimeout: number
  useConversationContext: boolean
  contextWindowSize: number
  notificationsEnabled: boolean
  notificationSound: boolean
  notifyAgentComplete: boolean
  notifyModelLoaded: boolean
  notifyErrors: boolean
  notifyUpdates: boolean
  showToast: boolean
  toastSuccess: boolean
  toastInfo: boolean
  analyticsEnabled: boolean
  crashReportsEnabled: boolean
  telemetryEnabled: boolean
  localStorageEnabled: boolean
  encryptData: boolean
  clearDataOnExit: boolean
  requireAuth: boolean
  autoLockEnabled: boolean
  secureMode: boolean
  debugMode: boolean
  devTools: boolean
  experimentalFeatures: boolean
  apiEndpoint: string
  requestTimeout: number
  retryAttempts: number
  cacheEnabled: boolean
  offlineMode: boolean
}


