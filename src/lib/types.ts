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
}

export interface Agent {
  id: string
  name: string
  goal: string
  model: string
  tools: AgentTool[]
  createdAt: number
  status: 'idle' | 'running' | 'completed' | 'error'
  schedule?: AgentSchedule
}

export type AgentTool = 'calculator' | 'datetime' | 'memory' | 'web_search'

export interface AgentRun {
  id: string
  agentId: string
  startedAt: number
  completedAt?: number
  status: 'running' | 'completed' | 'error'
  steps: AgentStep[]
  result?: string
  error?: string
}

export interface AgentStep {
  id: string
  type: 'planning' | 'tool_call' | 'observation' | 'decision'
  content: string
  toolName?: string
  toolInput?: string
  toolOutput?: string
  timestamp: number
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
  metadata?: Record<string, any>
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
  default?: any
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
  metadata?: Record<string, any>
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
