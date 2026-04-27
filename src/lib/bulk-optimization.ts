import type {
  ModelConfig,
  ModelParameters
} from './types'
import type { OptimizationInsight } from './auto-optimizer'

export interface OptimizationBundle {
  id: string
  name: string
  description: string
  category: 'performance' | 'quality' | 'balanced' | 'efficiency' | 'cost' | 'custom'
  actions: OptimizationAction[]
  affectedModels: string[]
  estimatedImpact: {
    performance?: string
    quality?: string
    cost?: string
    efficiency?: string
  }
  requirements?: {
    minModels?: number
    supportedProviders?: string[]
    minMemory?: number
  }
  createdAt: number
  priority: number
  icon?: string
  tags?: string[]
}

export interface OptimizationAction {
  id: string
  type: 'adjust_parameters' | 'apply_profile' | 'enable_feature' | 'disable_feature' | 'change_model' | 'clear_cache'
  target: 'model' | 'system' | 'profile' | 'agent'
  targetId?: string
  parameters?: Partial<ModelParameters>
  description: string
  reversible: boolean
  estimatedTime?: number
}

export interface BulkOptimizationResult {
  bundleId: string
  success: boolean
  appliedActions: string[]
  failedActions: { actionId: string; error: string }[]
  rollbackAvailable: boolean
  rollbackData?: Record<string, unknown>
  timestamp: number
  metrics?: {
    executionTime: number
    affectedModels: number
    parameterChanges: number
  }
}

export interface OptimizationPreset {
  id: string
  name: string
  description: string
  targetScenario: string
  bundles: string[]
  order: number
}

export const optimizationBundleTemplates: Omit<OptimizationBundle, 'id' | 'createdAt' | 'affectedModels'>[] = [
  {
    name: 'Speed Boost',
    description: 'Maximize response speed across all models by reducing token limits and optimizing sampling parameters',
    category: 'performance',
    priority: 1,
    icon: '⚡',
    tags: ['speed', 'performance', 'latency'],
    actions: [
      {
        id: 'reduce-max-tokens',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        },
        description: 'Reduce max tokens to 1000 for faster responses',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'optimize-sampling',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          topK: 40,
          repeatPenalty: 1.1
        },
        description: 'Optimize sampling parameters for speed',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      performance: '+40% faster response time',
      quality: 'Slightly reduced for long-form content'
    }
  },
  {
    name: 'Quality Enhancement',
    description: 'Improve output quality with optimized temperature, sampling diversity, and token limits',
    category: 'quality',
    priority: 2,
    icon: '✨',
    tags: ['quality', 'accuracy', 'precision'],
    actions: [
      {
        id: 'increase-max-tokens',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          maxTokens: 3000,
          temperature: 0.8,
          topP: 0.95
        },
        description: 'Increase max tokens for more detailed responses',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'enhance-diversity',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          frequencyPenalty: 0.3,
          presencePenalty: 0.2
        },
        description: 'Enhance response diversity and creativity',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      quality: '+30% more detailed and nuanced responses',
      performance: 'Slightly slower due to longer outputs'
    }
  },
  {
    name: 'Balanced Mode',
    description: 'Optimal balance between speed and quality for general-purpose usage',
    category: 'balanced',
    priority: 3,
    icon: '⚖️',
    tags: ['balanced', 'general', 'recommended'],
    actions: [
      {
        id: 'balanced-tokens',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          maxTokens: 2000,
          temperature: 0.7,
          topP: 0.92
        },
        description: 'Set balanced token and temperature parameters',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'balanced-penalties',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          frequencyPenalty: 0.1,
          presencePenalty: 0.1
        },
        description: 'Apply moderate penalties for balance',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      performance: 'Moderate speed',
      quality: 'Good quality for most tasks',
      efficiency: 'Optimal resource usage'
    }
  },
  {
    name: 'Creative Writing',
    description: 'Optimize for creative, diverse, and engaging content generation',
    category: 'quality',
    priority: 4,
    icon: '🎨',
    tags: ['creative', 'writing', 'storytelling'],
    actions: [
      {
        id: 'creative-temperature',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          temperature: 0.9,
          topP: 0.95,
          maxTokens: 2500
        },
        description: 'Increase temperature for creative outputs',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'creative-diversity',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          frequencyPenalty: 0.5,
          presencePenalty: 0.4
        },
        description: 'Maximize diversity and reduce repetition',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      quality: '+50% more creative and varied outputs',
      performance: 'Moderate speed impact'
    }
  },
  {
    name: 'Code Generation',
    description: 'Optimize for accurate, precise, and deterministic code generation',
    category: 'quality',
    priority: 5,
    icon: '💻',
    tags: ['code', 'programming', 'technical'],
    actions: [
      {
        id: 'code-precision',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          temperature: 0.3,
          topP: 0.85,
          maxTokens: 2000
        },
        description: 'Lower temperature for precise code generation',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'code-consistency',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          frequencyPenalty: 0.1,
          presencePenalty: 0.0
        },
        description: 'Minimal penalties for consistent code patterns',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      quality: '+40% more accurate code generation',
      performance: 'Fast due to lower temperature'
    }
  },
  {
    name: 'Efficiency Mode',
    description: 'Minimize token usage and computational costs while maintaining acceptable quality',
    category: 'efficiency',
    priority: 6,
    icon: '🔋',
    tags: ['efficiency', 'cost', 'savings'],
    actions: [
      {
        id: 'minimize-tokens',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          maxTokens: 800,
          temperature: 0.6,
          topP: 0.88
        },
        description: 'Minimize token usage for cost savings',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'efficient-sampling',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          topK: 30
        },
        description: 'Efficient sampling strategy',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      cost: '-50% token usage and costs',
      efficiency: 'Maximum resource efficiency',
      quality: 'Slightly reduced for complex tasks'
    }
  },
  {
    name: 'Task-Specific Profiles',
    description: 'Apply pre-tuned profiles for different task types across all models',
    category: 'custom',
    priority: 7,
    icon: '🎯',
    tags: ['profiles', 'tasks', 'specialized'],
    actions: [
      {
        id: 'apply-profiles',
        type: 'apply_profile',
        target: 'model',
        description: 'Apply task-optimized performance profiles',
        reversible: true,
        estimatedTime: 200
      }
    ],
    estimatedImpact: {
      quality: 'Task-specific optimization',
      performance: 'Optimized for each task type'
    }
  },
  {
    name: 'Conversation Optimizer',
    description: 'Optimize for multi-turn conversations with good context retention',
    category: 'balanced',
    priority: 8,
    icon: '💬',
    tags: ['conversation', 'chat', 'context'],
    actions: [
      {
        id: 'conversation-params',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          temperature: 0.75,
          topP: 0.92,
          maxTokens: 1500
        },
        description: 'Optimize for conversational responses',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'conversation-penalties',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          frequencyPenalty: 0.2,
          presencePenalty: 0.3
        },
        description: 'Reduce repetition in conversations',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      quality: '+35% more engaging conversations',
      performance: 'Good balance of speed and quality'
    }
  },
  {
    name: 'Analysis & Reasoning',
    description: 'Optimize for analytical tasks, data analysis, and logical reasoning',
    category: 'quality',
    priority: 9,
    icon: '🔬',
    tags: ['analysis', 'reasoning', 'logic'],
    actions: [
      {
        id: 'analysis-precision',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          temperature: 0.4,
          topP: 0.9,
          maxTokens: 2500
        },
        description: 'Low temperature for analytical precision',
        reversible: true,
        estimatedTime: 100
      },
      {
        id: 'analysis-tokens',
        type: 'adjust_parameters',
        target: 'model',
        parameters: {
          frequencyPenalty: 0.1,
          presencePenalty: 0.1
        },
        description: 'Balanced penalties for thorough analysis',
        reversible: true,
        estimatedTime: 50
      }
    ],
    estimatedImpact: {
      quality: '+45% more accurate analytical outputs',
      performance: 'Moderate speed'
    }
  },
  {
    name: 'System Cleanup',
    description: 'Clear caches, reset defaults, and optimize system performance',
    category: 'performance',
    priority: 10,
    icon: '🧹',
    tags: ['cleanup', 'maintenance', 'reset'],
    actions: [
      {
        id: 'clear-cache',
        type: 'clear_cache',
        target: 'system',
        description: 'Clear system caches and temporary data',
        reversible: false,
        estimatedTime: 500
      }
    ],
    estimatedImpact: {
      performance: '+15% faster load times',
      efficiency: 'Reclaim storage space'
    }
  }
]

export const optimizationPresets: OptimizationPreset[] = [
  {
    id: 'preset-getting-started',
    name: 'Getting Started',
    description: 'Recommended settings for new users',
    targetScenario: 'First-time setup',
    bundles: ['balanced-mode', 'conversation-optimizer'],
    order: 1
  },
  {
    id: 'preset-power-user',
    name: 'Power User',
    description: 'Optimized for advanced users with diverse workloads',
    targetScenario: 'Mixed usage patterns',
    bundles: ['task-specific-profiles', 'quality-enhancement'],
    order: 2
  },
  {
    id: 'preset-developer',
    name: 'Developer',
    description: 'Optimized for code generation and technical work',
    targetScenario: 'Software development',
    bundles: ['code-generation', 'analysis-reasoning'],
    order: 3
  },
  {
    id: 'preset-content-creator',
    name: 'Content Creator',
    description: 'Optimized for creative writing and content generation',
    targetScenario: 'Content creation',
    bundles: ['creative-writing', 'quality-enhancement'],
    order: 4
  },
  {
    id: 'preset-budget-conscious',
    name: 'Budget Conscious',
    description: 'Minimize costs while maintaining quality',
    targetScenario: 'Cost optimization',
    bundles: ['efficiency-mode', 'speed-boost'],
    order: 5
  },
  {
    id: 'preset-performance',
    name: 'Maximum Performance',
    description: 'Prioritize speed above all else',
    targetScenario: 'High-throughput applications',
    bundles: ['speed-boost', 'system-cleanup'],
    order: 6
  }
]

export class BulkOptimizationManager {
  private appliedBundles: Map<string, BulkOptimizationResult> = new Map()
  private rollbackStates: Map<string, Record<string, unknown>> = new Map()

  createBundle(
    template: typeof optimizationBundleTemplates[0],
    affectedModels: string[]
  ): OptimizationBundle {
    return {
      ...template,
      id: `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      affectedModels
    }
  }

  createCustomBundle(
    name: string,
    description: string,
    actions: OptimizationAction[],
    affectedModels: string[],
    category: OptimizationBundle['category'] = 'custom'
  ): OptimizationBundle {
    return {
      id: `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      actions,
      affectedModels,
      estimatedImpact: this.calculateEstimatedImpact(actions),
      createdAt: Date.now(),
      priority: 99,
      tags: ['custom']
    }
  }

  async applyBundle(
    bundle: OptimizationBundle,
    models: ModelConfig[],
    onProgress?: (progress: number, action: OptimizationAction) => void
  ): Promise<BulkOptimizationResult> {
    const startTime = Date.now()
    const appliedActions: string[] = []
    const failedActions: { actionId: string; error: string }[] = []

    const rollbackData = this.captureCurrentState(models, bundle.affectedModels)
    this.rollbackStates.set(bundle.id, rollbackData)

    for (let i = 0; i < bundle.actions.length; i++) {
      const action = bundle.actions[i]
      
      if (onProgress) {
        onProgress((i / bundle.actions.length) * 100, action)
      }

      try {
        await this.applyAction(action, models, bundle.affectedModels)
        appliedActions.push(action.id)
      } catch (error) {
        failedActions.push({
          actionId: action.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      if (action.estimatedTime) {
        await new Promise(resolve => setTimeout(resolve, action.estimatedTime))
      }
    }

    const result: BulkOptimizationResult = {
      bundleId: bundle.id,
      success: failedActions.length === 0,
      appliedActions,
      failedActions,
      rollbackAvailable: true,
      rollbackData,
      timestamp: Date.now(),
      metrics: {
        executionTime: Date.now() - startTime,
        affectedModels: bundle.affectedModels.length,
        parameterChanges: appliedActions.length
      }
    }

    this.appliedBundles.set(bundle.id, result)
    return result
  }

  async rollbackBundle(bundleId: string, models: ModelConfig[]): Promise<boolean> {
    const rollbackData = this.rollbackStates.get(bundleId)
    if (!rollbackData) {
      throw new Error('No rollback data available for this bundle')
    }

    try {
      Object.entries(rollbackData).forEach(([modelId, params]) => {
        const model = models.find(m => m.id === modelId)
        if (model) {
          Object.assign(model, params)
        }
      })

      this.rollbackStates.delete(bundleId)
      this.appliedBundles.delete(bundleId)
      return true
    } catch (error) {
      console.error('Rollback failed:', error)
      return false
    }
  }

  private captureCurrentState(models: ModelConfig[], affectedModelIds: string[]): Record<string, unknown> {
    const state: Record<string, unknown> = {}

    affectedModelIds.forEach(modelId => {
      const model = models.find(m => m.id === modelId)
      if (model) {
        state[modelId] = {
          temperature: model.temperature,
          maxTokens: model.maxTokens,
          topP: model.topP,
          frequencyPenalty: model.frequencyPenalty,
          presencePenalty: model.presencePenalty
        }
      }
    })

    return state
  }

  private async applyAction(
    action: OptimizationAction,
    models: ModelConfig[],
    affectedModelIds: string[]
  ): Promise<void> {
    if (action.type === 'adjust_parameters' && action.parameters) {
      affectedModelIds.forEach(modelId => {
        const model = models.find(m => m.id === modelId)
        if (model && action.parameters) {
          Object.assign(model, action.parameters)
        }
      })
    }
  }

  private calculateEstimatedImpact(actions: OptimizationAction[]): OptimizationBundle['estimatedImpact'] {
    return {
      performance: actions.some(a => a.parameters?.maxTokens && a.parameters.maxTokens < 1500)
        ? 'Improved response times'
        : 'Moderate impact',
      quality: actions.some(a => a.parameters?.temperature && a.parameters.temperature > 0.8)
        ? 'Enhanced creativity'
        : 'Maintained quality'
    }
  }

  getBundleHistory(): BulkOptimizationResult[] {
    return Array.from(this.appliedBundles.values())
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  canRollback(bundleId: string): boolean {
    return this.rollbackStates.has(bundleId)
  }

  getAvailableBundles(models: ModelConfig[]): OptimizationBundle[] {
    return optimizationBundleTemplates.map(template =>
      this.createBundle(template, models.map(m => m.id))
    )
  }

  getPresetBundles(presetId: string, models: ModelConfig[]): OptimizationBundle[] {
    const preset = optimizationPresets.find(p => p.id === presetId)
    if (!preset) return []

    const availableBundles = this.getAvailableBundles(models)
    return preset.bundles
      .map(bundleName => 
        availableBundles.find(b => 
          b.name.toLowerCase().replace(/\s+/g, '-') === bundleName
        )
      )
      .filter((b): b is OptimizationBundle => b !== undefined)
  }

  generateInsightBasedBundles(
    insights: OptimizationInsight[],
    _models: ModelConfig[]
  ): OptimizationBundle[] {
    const bundles: OptimizationBundle[] = []

    const performanceInsights = insights.filter(i => i.type === 'performance')
    if (performanceInsights.length > 0) {
      const actions: OptimizationAction[] = performanceInsights.map(insight => {
        const params = insight.suggestedAction?.details?.parameters
        return {
          id: `action-${insight.id}`,
          type: 'adjust_parameters' as const,
          target: 'model' as const,
          targetId: insight.affectedModels[0],
          parameters: typeof params === 'object' && params !== null ? params as Partial<ModelParameters> : undefined,
          description: insight.recommendation,
          reversible: true,
          estimatedTime: 100
        }
      })

      bundles.push(this.createCustomBundle(
        'Performance Fixes',
        'Address all detected performance issues',
        actions,
        performanceInsights.flatMap(i => i.affectedModels),
        'performance'
      ))
    }

    return bundles
  }
}

export const bulkOptimizationManager = new BulkOptimizationManager()
