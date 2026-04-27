export type WorkflowNodeType = 'agent' | 'tool' | 'decision' | 'loop' | 'parallel' | 'merge' | 'start' | 'end'

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
  condition?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  variables: Record<string, unknown>
  createdAt: number
  updatedAt: number
  category?: string
  tags?: string[]
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  startedAt: number
  completedAt?: number
  status: 'running' | 'completed' | 'error' | 'cancelled'
  currentNodeId?: string
  results: Record<string, unknown>
  error?: string
}

export interface CustomTool {
  id: string
  name: string
  description: string
  parameters: ToolParameter[]
  returnType: string
  code: string
  runtime: 'javascript' | 'api'
  category: string
  version: string
  author?: string
  createdAt: number
  updatedAt: number
  endpoint?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required: boolean
  default?: unknown
}

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  documents: KBDocument[]
  chunkSize: number
  overlap: number
  createdAt: number
  updatedAt: number
  embeddingModel?: string
  totalChunks: number
}

export interface KBDocument {
  id: string
  name: string
  type: 'pdf' | 'txt' | 'md' | 'docx' | 'html'
  content: string
  chunks: DocumentChunk[]
  uploadedAt: number
  size: number
}

export interface DocumentChunk {
  id: string
  content: string
  embedding?: number[]
  metadata: {
    documentId: string
    documentName: string
    chunkIndex: number
    startChar: number
    endChar: number
  }
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'data_processing' | 'content_creation' | 'research' | 'development' | 'communication' | 'business'
  workflow: Workflow
  parameters: TemplateParameter[]
  tags: string[]
  rating: number
  downloads: number
  author: string
  thumbnail?: string
  featured?: boolean
}

export interface TemplateParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  description: string
  required: boolean
  default?: unknown
  options?: string[]
}

export interface CostEntry {
  id: string
  timestamp: number
  model: string
  tokensIn: number
  tokensOut: number
  cost: number
  resource: 'conversation' | 'agent' | 'workflow'
  resourceId: string
  resourceName: string
}

export interface CostSummary {
  totalCost: number
  totalTokens: number
  byModel: Record<string, { cost: number; tokens: number; calls: number }>
  byResource: Record<string, { cost: number; tokens: number }>
  trend: { date: string; cost: number }[]
}

export interface Budget {
  id: string
  name: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly'
  spent: number
  alertThreshold: number
  enabled: boolean
  createdAt: number
}

export interface MarketplaceItem {
  id: string
  type: 'agent' | 'workflow' | 'tool'
  name: string
  description: string
  author: string
  authorAvatar?: string
  rating: number
  downloads: number
  category: string
  tags: string[]
  thumbnail?: string
  data: unknown
  version: string
  publishedAt: number
  updatedAt: number
  featured?: boolean
}

export interface APIEndpoint {
  id: string
  name: string
  description: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  authType: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth'
  authConfig: Record<string, unknown>
  headers: Record<string, string>
  queryParams?: Record<string, string>
  bodyTemplate?: string
  responseMapping?: Record<string, string>
  rateLimit?: { requests: number; period: number }
  timeout: number
  retries: number
  createdAt: number
}
