import type { 
  AnalyticsEvent, 
  ModelConfig, 
  ModelParameters, 
  TaskType, 
  AutoTuneRecommendation,
  PerformanceProfile
} from './types'
import { defaultProfilesByTaskType, taskTypeReasonings } from './performance-profiles'

export interface OptimizationInsight {
  id: string
  type: 'performance' | 'quality' | 'efficiency' | 'cost'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  impact: string
  confidence: number
  affectedModels: string[]
  suggestedAction?: {
    type: 'adjust_parameters' | 'change_model' | 'add_profile' | 'reduce_usage'
    details: any
  }
  timestamp: number
}

export interface LearningMetrics {
  totalInteractions: number
  successRate: number
  avgResponseTime: number
  avgQualityScore: number
  taskTypeDistribution: Record<TaskType, number>
  modelPerformance: Record<string, {
    avgResponseTime: number
    successRate: number
    usageCount: number
    preferredTasks: TaskType[]
  }>
  parameterEffectiveness: {
    temperature: { optimal: number; confidence: number }
    topP: { optimal: number; confidence: number }
    maxTokens: { optimal: number; confidence: number }
  }
  improvementTrends: {
    responseTimeImprovement: number
    qualityImprovement: number
    efficiencyImprovement: number
  }
}

export class AutoOptimizer {
  private learningThreshold = 50
  private confidenceThreshold = 0.7
  
  async analyzeAndOptimize(
    events: AnalyticsEvent[],
    models: ModelConfig[],
    profiles: PerformanceProfile[]
  ): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = []
    
    insights.push(...this.analyzeResponseTimes(events, models))
    insights.push(...this.analyzeModelUsagePatterns(events, models))
    insights.push(...this.analyzeParameterEffectiveness(events, models))
    insights.push(...this.detectAnomalies(events))
    insights.push(...this.identifyOptimizationOpportunities(events, models, profiles))
    insights.push(...this.generateProactiveRecommendations(events, models))
    
    return insights.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }
  
  private analyzeResponseTimes(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): OptimizationInsight[] {
    const insights: OptimizationInsight[] = []
    const chatEvents = events.filter(e => e.type === 'chat_message_received' && e.duration)
    
    if (chatEvents.length < 10) return insights
    
    const avgResponseTime = chatEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / chatEvents.length
    const modelResponseTimes = this.groupByModel(chatEvents)
    
    Object.entries(modelResponseTimes).forEach(([modelId, data]) => {
      const model = models.find(m => m.id === modelId)
      if (!model || data.times.length < 5) return
      
      const avgTime = data.times.reduce((sum, t) => sum + t, 0) / data.times.length
      
      if (avgTime > avgResponseTime * 1.5) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          type: 'performance',
          severity: avgTime > 10000 ? 'high' : 'medium',
          title: `Slow response times detected for ${model.name}`,
          description: `Average response time is ${(avgTime / 1000).toFixed(1)}s, which is ${((avgTime / avgResponseTime - 1) * 100).toFixed(0)}% slower than average.`,
          recommendation: 'Consider reducing maxTokens or switching to a faster model for this use case.',
          impact: `Could improve response time by up to ${((avgTime - avgResponseTime) / 1000).toFixed(1)}s per request`,
          confidence: Math.min(0.95, 0.5 + (data.times.length / 100)),
          affectedModels: [modelId],
          suggestedAction: {
            type: 'adjust_parameters',
            details: {
              modelId,
              parameter: 'maxTokens',
              currentValue: model.maxTokens,
              suggestedValue: Math.max(500, Math.floor(model.maxTokens * 0.7))
            }
          },
          timestamp: Date.now()
        })
      }
    })
    
    return insights
  }
  
  private analyzeModelUsagePatterns(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): OptimizationInsight[] {
    const insights: OptimizationInsight[] = []
    const chatEvents = events.filter(e => e.type === 'chat_message_received' && e.metadata?.model)
    
    if (chatEvents.length < this.learningThreshold) return insights
    
    const modelUsage = chatEvents.reduce((acc, e) => {
      const model = e.metadata!.model
      acc[model] = (acc[model] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const totalUsage = Object.values(modelUsage).reduce((sum, count) => sum + count, 0)
    const sortedModels = Object.entries(modelUsage).sort((a, b) => b[1] - a[1])
    
    if (sortedModels.length > 1) {
      const topModel = sortedModels[0]
      const topModelPercentage = (topModel[1] / totalUsage) * 100
      
      if (topModelPercentage > 80) {
        const model = models.find(m => m.id === topModel[0])
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          type: 'efficiency',
          severity: 'low',
          title: `${model?.name || topModel[0]} is heavily utilized`,
          description: `${topModelPercentage.toFixed(0)}% of all requests use this model. Consider diversifying model usage for different task types.`,
          recommendation: 'Use specialized models for different tasks: lighter models for simple queries, stronger models for complex reasoning.',
          impact: 'Could reduce average response time by 20-30% and improve output quality',
          confidence: 0.85,
          affectedModels: [topModel[0]],
          timestamp: Date.now()
        })
      }
    }
    
    return insights
  }
  
  private analyzeParameterEffectiveness(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): OptimizationInsight[] {
    const insights: OptimizationInsight[] = []
    const chatEvents = events.filter(e => e.type === 'chat_message_received')
    
    if (chatEvents.length < this.learningThreshold) return insights
    
    models.forEach(model => {
      const modelEvents = chatEvents.filter(e => e.metadata?.model === model.id)
      if (modelEvents.length < 10) return
      
      if (model.temperature > 0.8 && model.frequencyPenalty < 0.2) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          type: 'quality',
          severity: 'medium',
          title: `${model.name} may produce repetitive outputs`,
          description: `High temperature (${model.temperature}) with low frequency penalty (${model.frequencyPenalty}) can lead to repetitive responses.`,
          recommendation: 'Increase frequency penalty to 0.3-0.5 or reduce temperature to 0.6-0.7 for more coherent outputs.',
          impact: 'Improved output quality and reduced repetition',
          confidence: 0.82,
          affectedModels: [model.id],
          suggestedAction: {
            type: 'adjust_parameters',
            details: {
              modelId: model.id,
              parameters: {
                frequencyPenalty: 0.4,
                temperature: 0.7
              }
            }
          },
          timestamp: Date.now()
        })
      }
      
      if (model.temperature < 0.2 && model.topP > 0.95) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          type: 'efficiency',
          severity: 'low',
          title: `${model.name} has conflicting parameters`,
          description: `Very low temperature (${model.temperature}) with high topP (${model.topP}) creates conflicting sampling behavior.`,
          recommendation: 'For deterministic outputs, use temperature 0.1-0.2 with topP 0.85-0.9. For creative outputs, use temperature 0.7+ with topP 0.95+.',
          impact: 'More predictable and consistent model behavior',
          confidence: 0.88,
          affectedModels: [model.id],
          suggestedAction: {
            type: 'adjust_parameters',
            details: {
              modelId: model.id,
              parameter: 'topP',
              currentValue: model.topP,
              suggestedValue: 0.88
            }
          },
          timestamp: Date.now()
        })
      }
    })
    
    return insights
  }
  
  private detectAnomalies(events: AnalyticsEvent[]): OptimizationInsight[] {
    const insights: OptimizationInsight[] = []
    const errorEvents = events.filter(e => e.type === 'error_occurred')
    
    if (errorEvents.length === 0) return insights
    
    const errorRate = (errorEvents.length / events.length) * 100
    
    if (errorRate > 5) {
      const errorsByCategory = errorEvents.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const topErrorCategory = Object.entries(errorsByCategory)
        .sort((a, b) => b[1] - a[1])[0]
      
      insights.push({
        id: `insight-${Date.now()}-${Math.random()}`,
        type: 'quality',
        severity: errorRate > 10 ? 'critical' : 'high',
        title: `High error rate detected (${errorRate.toFixed(1)}%)`,
        description: `${errorEvents.length} errors in ${events.length} total events. Most errors in ${topErrorCategory[0]} category.`,
        recommendation: 'Review error logs, check model configurations, and ensure proper error handling is in place.',
        impact: 'Reduced errors will improve user experience and system reliability',
        confidence: 0.95,
        affectedModels: [],
        timestamp: Date.now()
      })
    }
    
    const agentFailures = events.filter(e => e.type === 'agent_run_failed')
    const agentStarts = events.filter(e => e.type === 'agent_run_started')
    
    if (agentStarts.length > 0) {
      const failureRate = (agentFailures.length / agentStarts.length) * 100
      
      if (failureRate > 20) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          type: 'performance',
          severity: failureRate > 40 ? 'critical' : 'high',
          title: `High agent failure rate (${failureRate.toFixed(0)}%)`,
          description: `${agentFailures.length} of ${agentStarts.length} agent runs failed.`,
          recommendation: 'Review agent configurations, tool selections, and goal definitions. Consider adding retry logic or adjusting complexity.',
          impact: 'Improved agent reliability and success rate',
          confidence: 0.9,
          affectedModels: [],
          timestamp: Date.now()
        })
      }
    }
    
    return insights
  }
  
  private identifyOptimizationOpportunities(
    events: AnalyticsEvent[],
    models: ModelConfig[],
    profiles: PerformanceProfile[]
  ): OptimizationInsight[] {
    const insights: OptimizationInsight[] = []
    
    const chatEvents = events.filter(e => e.type === 'chat_message_received')
    if (chatEvents.length < this.learningThreshold) return insights
    
    const avgTokenLength = chatEvents
      .filter(e => e.metadata?.responseLength)
      .reduce((sum, e) => sum + (e.metadata!.responseLength || 0), 0) / chatEvents.length
    
    if (avgTokenLength > 0) {
      models.forEach(model => {
        const modelEvents = chatEvents.filter(e => e.metadata?.model === model.id)
        if (modelEvents.length < 5) return
        
        const avgModelTokens = modelEvents
          .filter(e => e.metadata?.responseLength)
          .reduce((sum, e) => sum + (e.metadata!.responseLength || 0), 0) / modelEvents.length
        
        if (model.maxTokens > avgModelTokens * 2) {
          insights.push({
            id: `insight-${Date.now()}-${Math.random()}`,
            type: 'efficiency',
            severity: 'medium',
            title: `${model.name} maxTokens setting is oversized`,
            description: `Configured for ${model.maxTokens} tokens but averaging ${Math.round(avgModelTokens)} tokens per response.`,
            recommendation: `Reduce maxTokens to ${Math.round(avgModelTokens * 1.5)} to improve response time without impacting output.`,
            impact: `Could reduce response time by 15-25%`,
            confidence: 0.78,
            affectedModels: [model.id],
            suggestedAction: {
              type: 'adjust_parameters',
              details: {
                modelId: model.id,
                parameter: 'maxTokens',
                currentValue: model.maxTokens,
                suggestedValue: Math.round(avgModelTokens * 1.5)
              }
            },
            timestamp: Date.now()
          })
        }
      })
    }
    
    if (profiles.length === 0) {
      insights.push({
        id: `insight-${Date.now()}-${Math.random()}`,
        type: 'efficiency',
        severity: 'medium',
        title: 'No performance profiles created',
        description: 'Performance profiles allow you to optimize models for specific task types.',
        recommendation: 'Create task-specific profiles (e.g., creative writing, code generation, data analysis) for better results.',
        impact: 'Improved output quality and task-specific optimization',
        confidence: 0.85,
        affectedModels: models.map(m => m.id),
        suggestedAction: {
          type: 'add_profile',
          details: {
            suggestedTaskTypes: ['conversation', 'code_generation', 'creative_writing']
          }
        },
        timestamp: Date.now()
      })
    }
    
    return insights
  }
  
  private generateProactiveRecommendations(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): OptimizationInsight[] {
    const insights: OptimizationInsight[] = []
    
    const conversationCreated = events.filter(e => e.type === 'conversation_created')
    const messagesPerConv = events.filter(e => e.type === 'chat_message_sent').length / Math.max(1, conversationCreated.length)
    
    if (conversationCreated.length > 10 && messagesPerConv < 3) {
      insights.push({
        id: `insight-${Date.now()}-${Math.random()}`,
        type: 'quality',
        severity: 'low',
        title: 'Low engagement in conversations',
        description: `Average of ${messagesPerConv.toFixed(1)} messages per conversation. Users may not be getting satisfactory responses.`,
        recommendation: 'Consider adjusting system prompts, model parameters, or using models better suited for conversation.',
        impact: 'Improved user engagement and conversation depth',
        confidence: 0.65,
        affectedModels: [],
        timestamp: Date.now()
      })
    }
    
    const chatResponseTimes = events
      .filter(e => e.type === 'chat_message_received' && e.duration)
      .map(e => e.duration!)
    
    if (chatResponseTimes.length > 20) {
      const p95ResponseTime = this.calculatePercentile(chatResponseTimes, 95)
      
      if (p95ResponseTime > 10000) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random()}`,
          type: 'performance',
          severity: 'high',
          title: '95th percentile response time is slow',
          description: `5% of requests take longer than ${(p95ResponseTime / 1000).toFixed(1)}s to complete.`,
          recommendation: 'Optimize slowest queries by reducing maxTokens, using faster models, or implementing response streaming.',
          impact: 'Significantly improved user experience for slowest requests',
          confidence: 0.88,
          affectedModels: [],
          timestamp: Date.now()
        })
      }
    }
    
    return insights
  }
  
  generateAutoTuneRecommendations(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): AutoTuneRecommendation[] {
    const recommendations: AutoTuneRecommendation[] = []
    const learningMetrics = this.calculateLearningMetrics(events, models)
    
    if (learningMetrics.totalInteractions < this.learningThreshold) {
      return recommendations
    }
    
    const taskDistribution = learningMetrics.taskTypeDistribution
    const dominantTask = Object.entries(taskDistribution)
      .sort((a, b) => b[1] - a[1])[0]
    
    if (dominantTask && dominantTask[1] > learningMetrics.totalInteractions * 0.4) {
      const taskType = dominantTask[0] as TaskType
      
      models.forEach(model => {
        const currentParams: ModelParameters = {
          temperature: model.temperature,
          maxTokens: model.maxTokens,
          topP: model.topP,
          frequencyPenalty: model.frequencyPenalty,
          presencePenalty: model.presencePenalty
        }
        
        const recommendedParams = defaultProfilesByTaskType[taskType]
        const paramDiff = this.calculateParameterDifference(currentParams, recommendedParams)
        
        if (paramDiff > 0.2) {
          recommendations.push({
            taskType,
            currentParams,
            recommendedParams,
            reasoning: `Based on ${dominantTask[1]} ${taskType.replace('_', ' ')} interactions, these parameters are optimized for better performance. ${taskTypeReasonings[taskType]}`,
            expectedImprovements: this.calculateExpectedImprovements(currentParams, recommendedParams, taskType),
            confidence: Math.min(0.95, 0.6 + (dominantTask[1] / learningMetrics.totalInteractions))
          })
        }
      })
    }
    
    return recommendations
  }
  
  calculateLearningMetrics(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): LearningMetrics {
    const chatEvents = events.filter(e => 
      e.type === 'chat_message_sent' || e.type === 'chat_message_received'
    )
    
    const responseEvents = events.filter(e => e.type === 'chat_message_received')
    const avgResponseTime = responseEvents.length > 0
      ? responseEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / responseEvents.length
      : 0
    
    const successfulChats = responseEvents.length
    const failedChats = events.filter(e => e.type === 'error_occurred' && e.category === 'chat').length
    const successRate = (successfulChats / (successfulChats + failedChats)) * 100
    
    const taskTypeDistribution = this.inferTaskTypes(events)
    
    const modelPerformance: LearningMetrics['modelPerformance'] = {}
    models.forEach(model => {
      const modelEvents = responseEvents.filter(e => e.metadata?.model === model.id)
      if (modelEvents.length > 0) {
        modelPerformance[model.id] = {
          avgResponseTime: modelEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / modelEvents.length,
          successRate: 100,
          usageCount: modelEvents.length,
          preferredTasks: ['conversation']
        }
      }
    })
    
    return {
      totalInteractions: chatEvents.length,
      successRate,
      avgResponseTime,
      avgQualityScore: 0,
      taskTypeDistribution,
      modelPerformance,
      parameterEffectiveness: {
        temperature: { optimal: 0.7, confidence: 0.75 },
        topP: { optimal: 0.9, confidence: 0.75 },
        maxTokens: { optimal: 1500, confidence: 0.70 }
      },
      improvementTrends: {
        responseTimeImprovement: 0,
        qualityImprovement: 0,
        efficiencyImprovement: 0
      }
    }
  }
  
  private inferTaskTypes(events: AnalyticsEvent[]): Record<TaskType, number> {
    const distribution: Partial<Record<TaskType, number>> = {
      conversation: events.filter(e => e.type === 'chat_message_sent').length,
      code_generation: 0,
      creative_writing: 0,
      data_analysis: 0
    }
    
    return distribution as Record<TaskType, number>
  }
  
  private groupByModel(events: AnalyticsEvent[]): Record<string, { times: number[] }> {
    return events.reduce((acc, event) => {
      const model = event.metadata?.model || 'unknown'
      if (!acc[model]) {
        acc[model] = { times: [] }
      }
      if (event.duration) {
        acc[model].times.push(event.duration)
      }
      return acc
    }, {} as Record<string, { times: number[] }>)
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index]
  }
  
  private calculateParameterDifference(
    current: ModelParameters,
    recommended: ModelParameters
  ): number {
    const tempDiff = Math.abs(current.temperature - recommended.temperature)
    const topPDiff = Math.abs(current.topP - recommended.topP)
    const freqDiff = Math.abs(current.frequencyPenalty - recommended.frequencyPenalty)
    const presDiff = Math.abs(current.presencePenalty - recommended.presencePenalty)
    
    return (tempDiff + topPDiff + freqDiff + presDiff) / 4
  }
  
  private calculateExpectedImprovements(
    current: ModelParameters,
    recommended: ModelParameters,
    taskType: TaskType
  ): AutoTuneRecommendation['expectedImprovements'] {
    const improvements: AutoTuneRecommendation['expectedImprovements'] = {}
    
    if (Math.abs(current.temperature - recommended.temperature) > 0.2) {
      if (taskType === 'creative_writing' || taskType === 'brainstorming') {
        improvements.creativity = 'More diverse and imaginative outputs'
      } else if (taskType === 'code_generation' || taskType === 'translation') {
        improvements.consistency = 'More reliable and accurate results'
      }
    }
    
    if (current.maxTokens > recommended.maxTokens) {
      improvements.speed = `Faster responses (${((1 - recommended.maxTokens / current.maxTokens) * 100).toFixed(0)}% reduction in tokens)`
    }
    
    if (Math.abs(current.frequencyPenalty - recommended.frequencyPenalty) > 0.2) {
      improvements.quality = 'Reduced repetition and improved coherence'
    }
    
    return improvements
  }
}

export const autoOptimizer = new AutoOptimizer()
