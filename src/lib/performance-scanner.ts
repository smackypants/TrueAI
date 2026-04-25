import type { 
  AnalyticsEvent, 
  ModelConfig, 
  PerformanceProfile,
  ModelParameters
} from './types'
import { scanHardware, generateOptimizedSettings, type HardwareSpecs } from './hardware-scanner'
import { autoOptimizer } from './auto-optimizer'

export interface PerformanceScanResult {
  id: string
  timestamp: number
  hardwareSpecs: HardwareSpecs
  currentMetrics: PerformanceMetrics
  bottlenecks: Bottleneck[]
  optimizations: OptimizationAction[]
  estimatedImprovements: ImprovementEstimate
  autoApplyRecommended: boolean
}

export interface PerformanceMetrics {
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  successRate: number
  throughput: number
  memoryUsage: number
  modelEfficiency: Record<string, ModelEfficiencyMetrics>
  systemLoad: number
}

export interface ModelEfficiencyMetrics {
  modelId: string
  modelName: string
  avgResponseTime: number
  tokensPerSecond: number
  requestCount: number
  errorRate: number
  parameterEfficiency: number
  wastedTokens: number
  optimalMaxTokens: number
}

export interface Bottleneck {
  id: string
  type: 'model_config' | 'hardware' | 'network' | 'parameter' | 'concurrency' | 'memory'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  impact: string
  affectedModels: string[]
  detectedAt: number
}

export interface OptimizationAction {
  id: string
  type: 'adjust_parameter' | 'change_model_config' | 'reduce_load' | 'enable_caching' | 'optimize_tokens' | 'hardware_tuning'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
  targetModel?: string
  changes: Record<string, any>
  expectedGain: string
  confidence: number
  autoApplicable: boolean
}

export interface ImprovementEstimate {
  responseTimeReduction: number
  errorRateReduction: number
  throughputIncrease: number
  tokenEfficiencyGain: number
  overallScore: number
}

export class PerformanceScanner {
  private scanHistory: PerformanceScanResult[] = []
  private isScanning = false
  
  async performComprehensiveScan(
    events: AnalyticsEvent[],
    models: ModelConfig[],
    profiles: PerformanceProfile[]
  ): Promise<PerformanceScanResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress')
    }
    
    this.isScanning = true
    
    try {
      const hardwareSpecs = await scanHardware()
      const currentMetrics = this.calculateCurrentMetrics(events, models)
      const bottlenecks = this.identifyBottlenecks(currentMetrics, hardwareSpecs, models)
      const optimizations = this.generateOptimizations(bottlenecks, currentMetrics, models, hardwareSpecs)
      const estimatedImprovements = this.estimateImprovements(optimizations, currentMetrics)
      
      const result: PerformanceScanResult = {
        id: `scan-${Date.now()}`,
        timestamp: Date.now(),
        hardwareSpecs,
        currentMetrics,
        bottlenecks,
        optimizations: optimizations.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }),
        estimatedImprovements,
        autoApplyRecommended: true
      }
      
      this.scanHistory.push(result)
      if (this.scanHistory.length > 20) {
        this.scanHistory = this.scanHistory.slice(-20)
      }
      
      await spark.kv.set('performance-scan-history', this.scanHistory)
      
      return result
    } finally {
      this.isScanning = false
    }
  }
  
  private calculateCurrentMetrics(
    events: AnalyticsEvent[],
    models: ModelConfig[]
  ): PerformanceMetrics {
    const chatEvents = events.filter(e => e.type === 'chat_message_received' && e.duration)
    
    if (chatEvents.length === 0) {
      return {
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        successRate: 100,
        throughput: 0,
        memoryUsage: 0,
        modelEfficiency: {},
        systemLoad: 0
      }
    }
    
    const responseTimes = chatEvents.map(e => e.duration!).sort((a, b) => a - b)
    const avgResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    const p50ResponseTime = this.percentile(responseTimes, 50)
    const p95ResponseTime = this.percentile(responseTimes, 95)
    const p99ResponseTime = this.percentile(responseTimes, 99)
    
    const errorEvents = events.filter(e => e.type === 'error_occurred')
    const errorRate = (errorEvents.length / events.length) * 100
    const successRate = 100 - errorRate
    
    const timeSpan = events.length > 0 
      ? (events[0].timestamp - events[events.length - 1].timestamp) / 1000 
      : 1
    const throughput = chatEvents.length / Math.max(timeSpan, 1)
    
    const modelEfficiency: Record<string, ModelEfficiencyMetrics> = {}
    
    models.forEach(model => {
      const modelEvents = chatEvents.filter(e => e.metadata?.model === model.id)
      if (modelEvents.length === 0) return
      
      const modelResponseTimes = modelEvents.map(e => e.duration!)
      const avgModelResponseTime = modelResponseTimes.reduce((sum, t) => sum + t, 0) / modelResponseTimes.length
      
      const totalTokens = modelEvents.reduce((sum, e) => sum + (e.metadata?.responseLength || 0), 0)
      const avgTokens = totalTokens / modelEvents.length
      const tokensPerSecond = totalTokens / (modelResponseTimes.reduce((sum, t) => sum + t, 0) / 1000)
      
      const modelErrors = errorEvents.filter(e => e.metadata?.model === model.id)
      const modelErrorRate = (modelErrors.length / modelEvents.length) * 100
      
      const wastedTokens = Math.max(0, model.maxTokens - avgTokens)
      const optimalMaxTokens = Math.ceil(avgTokens * 1.3)
      
      const paramEfficiency = this.calculateParameterEfficiency(model, avgTokens, avgModelResponseTime)
      
      modelEfficiency[model.id] = {
        modelId: model.id,
        modelName: model.name,
        avgResponseTime: avgModelResponseTime,
        tokensPerSecond,
        requestCount: modelEvents.length,
        errorRate: modelErrorRate,
        parameterEfficiency: paramEfficiency,
        wastedTokens,
        optimalMaxTokens
      }
    })
    
    const memoryUsage = (navigator as any).deviceMemory 
      ? ((navigator as any).deviceMemory / 16) * 100 
      : 50
    
    const systemLoad = Math.min(100, (avgResponseTime / 5000) * 100)
    
    return {
      avgResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      successRate,
      throughput,
      memoryUsage,
      modelEfficiency,
      systemLoad
    }
  }
  
  private identifyBottlenecks(
    metrics: PerformanceMetrics,
    hardware: HardwareSpecs,
    models: ModelConfig[]
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []
    
    if (metrics.p95ResponseTime > 8000) {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-1`,
        type: 'model_config',
        severity: metrics.p95ResponseTime > 15000 ? 'critical' : 'high',
        description: `95th percentile response time is ${(metrics.p95ResponseTime / 1000).toFixed(1)}s`,
        impact: `Users experience slow responses. This affects ${Math.round((metrics.p95ResponseTime - 3000) / 1000)}s of unnecessary waiting time.`,
        affectedModels: Object.keys(metrics.modelEfficiency),
        detectedAt: Date.now()
      })
    }
    
    if (metrics.p99ResponseTime > 15000) {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-2`,
        type: 'model_config',
        severity: 'critical',
        description: `99th percentile response time is extremely slow at ${(metrics.p99ResponseTime / 1000).toFixed(1)}s`,
        impact: 'Worst-case scenarios create poor user experience. Critical optimization needed.',
        affectedModels: Object.keys(metrics.modelEfficiency),
        detectedAt: Date.now()
      })
    }
    
    Object.entries(metrics.modelEfficiency).forEach(([modelId, efficiency]) => {
      if (efficiency.wastedTokens > 1000) {
        bottlenecks.push({
          id: `bottleneck-${Date.now()}-tokens-${modelId}`,
          type: 'parameter',
          severity: efficiency.wastedTokens > 2000 ? 'high' : 'medium',
          description: `${efficiency.modelName} is configured for ${models.find(m => m.id === modelId)?.maxTokens} tokens but only uses ${Math.round(models.find(m => m.id === modelId)!.maxTokens - efficiency.wastedTokens)} on average`,
          impact: `Wasting ${efficiency.wastedTokens} tokens per request, causing ${Math.round((efficiency.wastedTokens / 1000) * 2)}s unnecessary latency`,
          affectedModels: [modelId],
          detectedAt: Date.now()
        })
      }
      
      if (efficiency.parameterEfficiency < 60) {
        bottlenecks.push({
          id: `bottleneck-${Date.now()}-params-${modelId}`,
          type: 'parameter',
          severity: efficiency.parameterEfficiency < 40 ? 'high' : 'medium',
          description: `${efficiency.modelName} has suboptimal parameters (${efficiency.parameterEfficiency.toFixed(0)}% efficiency)`,
          impact: 'Current parameters are not well-tuned for typical workload patterns',
          affectedModels: [modelId],
          detectedAt: Date.now()
        })
      }
      
      if (efficiency.tokensPerSecond < 10) {
        bottlenecks.push({
          id: `bottleneck-${Date.now()}-throughput-${modelId}`,
          type: 'model_config',
          severity: 'high',
          description: `${efficiency.modelName} has low throughput (${efficiency.tokensPerSecond.toFixed(1)} tokens/s)`,
          impact: 'Slow token generation significantly impacts response time',
          affectedModels: [modelId],
          detectedAt: Date.now()
        })
      }
    })
    
    if (hardware.tier === 'low' && metrics.avgResponseTime > 5000) {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-hardware`,
        type: 'hardware',
        severity: 'high',
        description: 'Low-tier hardware combined with resource-intensive model settings',
        impact: 'Hardware limitations are causing significant performance degradation',
        affectedModels: models.map(m => m.id),
        detectedAt: Date.now()
      })
    }
    
    if (hardware.connection?.effectiveType === '2g' || hardware.connection?.effectiveType === 'slow-2g') {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-network`,
        type: 'network',
        severity: 'critical',
        description: 'Very slow network connection detected',
        impact: 'Network latency is causing major delays in API requests',
        affectedModels: [],
        detectedAt: Date.now()
      })
    }
    
    if (hardware.connection && hardware.connection.rtt > 200) {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-latency`,
        type: 'network',
        severity: hardware.connection.rtt > 500 ? 'high' : 'medium',
        description: `High network latency (${hardware.connection.rtt}ms)`,
        impact: 'Network round-trip time adds significant overhead to each request',
        affectedModels: [],
        detectedAt: Date.now()
      })
    }
    
    if (metrics.errorRate > 5) {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-errors`,
        type: 'model_config',
        severity: metrics.errorRate > 10 ? 'critical' : 'high',
        description: `High error rate (${metrics.errorRate.toFixed(1)}%)`,
        impact: 'Errors cause retries and wasted time, significantly impacting performance',
        affectedModels: models.map(m => m.id),
        detectedAt: Date.now()
      })
    }
    
    if (hardware.battery && hardware.battery.level < 0.15 && !hardware.battery.charging) {
      bottlenecks.push({
        id: `bottleneck-${Date.now()}-battery`,
        type: 'hardware',
        severity: 'medium',
        description: 'Low battery may cause CPU throttling',
        impact: 'Device may reduce performance to conserve battery',
        affectedModels: [],
        detectedAt: Date.now()
      })
    }
    
    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }
  
  private generateOptimizations(
    bottlenecks: Bottleneck[],
    metrics: PerformanceMetrics,
    models: ModelConfig[],
    hardware: HardwareSpecs
  ): OptimizationAction[] {
    const optimizations: OptimizationAction[] = []
    
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.type === 'parameter' && bottleneck.affectedModels.length > 0) {
        const modelId = bottleneck.affectedModels[0]
        const model = models.find(m => m.id === modelId)
        const efficiency = metrics.modelEfficiency[modelId]
        
        if (model && efficiency && efficiency.wastedTokens > 500) {
          optimizations.push({
            id: `opt-${Date.now()}-tokens-${modelId}`,
            type: 'optimize_tokens',
            priority: efficiency.wastedTokens > 2000 ? 'high' : 'medium',
            description: `Reduce maxTokens for ${model.name} from ${model.maxTokens} to ${efficiency.optimalMaxTokens}`,
            targetModel: modelId,
            changes: {
              maxTokens: efficiency.optimalMaxTokens
            },
            expectedGain: `${Math.round((efficiency.wastedTokens / model.maxTokens) * 100)}% faster responses`,
            confidence: 0.9,
            autoApplicable: true
          })
        }
        
        if (model && efficiency && efficiency.parameterEfficiency < 70) {
          const improvedParams = this.suggestBetterParameters(model, metrics)
          optimizations.push({
            id: `opt-${Date.now()}-params-${modelId}`,
            type: 'adjust_parameter',
            priority: 'medium',
            description: `Optimize parameters for ${model.name} based on usage patterns`,
            targetModel: modelId,
            changes: improvedParams,
            expectedGain: 'Improved output quality and response consistency',
            confidence: 0.85,
            autoApplicable: true
          })
        }
      }
      
      if (bottleneck.type === 'model_config' && bottleneck.severity === 'critical') {
        optimizations.push({
          id: `opt-${Date.now()}-aggressive`,
          type: 'change_model_config',
          priority: 'critical',
          description: 'Apply aggressive performance optimizations across all models',
          changes: {
            reduceMaxTokensByPercent: 30,
            lowerTemperatureForSpeed: true,
            enableStreamingOptimization: true
          },
          expectedGain: '30-50% improvement in response times',
          confidence: 0.95,
          autoApplicable: true
        })
      }
      
      if (bottleneck.type === 'hardware' && hardware.tier === 'low') {
        optimizations.push({
          id: `opt-${Date.now()}-hardware-adapt`,
          type: 'hardware_tuning',
          priority: 'high',
          description: 'Enable low-power mode and reduce resource usage',
          changes: {
            maxTokens: 1000,
            disableAnimations: true,
            reduceHistorySize: true,
            limitConcurrentRequests: 1
          },
          expectedGain: '40-60% faster on low-end hardware',
          confidence: 0.9,
          autoApplicable: true
        })
      }
      
      if (bottleneck.type === 'network') {
        optimizations.push({
          id: `opt-${Date.now()}-network`,
          type: 'reduce_load',
          priority: bottleneck.severity === 'critical' ? 'critical' : 'high',
          description: 'Optimize for slow network conditions',
          changes: {
            reducePayloadSize: true,
            maxTokens: 800,
            enableCompression: true,
            increaseTimeout: true
          },
          expectedGain: '25-40% reduction in data transfer time',
          confidence: 0.88,
          autoApplicable: true
        })
      }
    })
    
    if (metrics.p95ResponseTime > 5000 && optimizations.length === 0) {
      optimizations.push({
        id: `opt-${Date.now()}-general`,
        type: 'adjust_parameter',
        priority: 'medium',
        description: 'Apply general performance improvements',
        changes: {
          optimizeAllModels: true,
          targetResponseTime: 3000
        },
        expectedGain: '20-30% improvement in average response time',
        confidence: 0.75,
        autoApplicable: true
      })
    }
    
    const cacheableModels = models.filter(m => {
      const efficiency = metrics.modelEfficiency[m.id]
      return efficiency && efficiency.requestCount > 20
    })
    
    if (cacheableModels.length > 0 && metrics.throughput > 0.5) {
      optimizations.push({
        id: `opt-${Date.now()}-cache`,
        type: 'enable_caching',
        priority: 'low',
        description: 'Enable response caching for frequently used models',
        changes: {
          enableCache: true,
          cacheSize: 50,
          models: cacheableModels.map(m => m.id)
        },
        expectedGain: '10-20% faster for repeated queries',
        confidence: 0.7,
        autoApplicable: false
      })
    }
    
    return optimizations
  }
  
  private estimateImprovements(
    optimizations: OptimizationAction[],
    currentMetrics: PerformanceMetrics
  ): ImprovementEstimate {
    let responseTimeReduction = 0
    let errorRateReduction = 0
    let throughputIncrease = 0
    let tokenEfficiencyGain = 0
    
    optimizations.forEach(opt => {
      switch (opt.type) {
        case 'optimize_tokens':
          if (opt.changes.maxTokens && opt.targetModel) {
            const efficiency = currentMetrics.modelEfficiency[opt.targetModel]
            if (efficiency) {
              const reduction = (efficiency.wastedTokens / (opt.changes.maxTokens + efficiency.wastedTokens)) * 100
              responseTimeReduction += reduction * 0.8
              tokenEfficiencyGain += reduction
              throughputIncrease += reduction * 0.5
            }
          }
          break
          
        case 'adjust_parameter':
          responseTimeReduction += 15 * opt.confidence
          tokenEfficiencyGain += 10 * opt.confidence
          break
          
        case 'change_model_config':
          responseTimeReduction += 35 * opt.confidence
          throughputIncrease += 25 * opt.confidence
          break
          
        case 'hardware_tuning':
          responseTimeReduction += 45 * opt.confidence
          break
          
        case 'reduce_load':
          responseTimeReduction += 30 * opt.confidence
          errorRateReduction += 20 * opt.confidence
          break
          
        case 'enable_caching':
          responseTimeReduction += 12 * opt.confidence
          throughputIncrease += 15 * opt.confidence
          break
      }
    })
    
    responseTimeReduction = Math.min(75, responseTimeReduction)
    errorRateReduction = Math.min(80, errorRateReduction)
    throughputIncrease = Math.min(100, throughputIncrease)
    tokenEfficiencyGain = Math.min(90, tokenEfficiencyGain)
    
    const overallScore = (
      responseTimeReduction * 0.4 +
      errorRateReduction * 0.2 +
      throughputIncrease * 0.2 +
      tokenEfficiencyGain * 0.2
    )
    
    return {
      responseTimeReduction: Math.round(responseTimeReduction),
      errorRateReduction: Math.round(errorRateReduction),
      throughputIncrease: Math.round(throughputIncrease),
      tokenEfficiencyGain: Math.round(tokenEfficiencyGain),
      overallScore: Math.round(overallScore)
    }
  }
  
  async applyOptimizations(
    optimizations: OptimizationAction[],
    models: ModelConfig[]
  ): Promise<{ updated: ModelConfig[]; applied: number }> {
    const updatedModels: ModelConfig[] = [...models]
    let appliedCount = 0
    
    for (const opt of optimizations.filter(o => o.autoApplicable)) {
      if (opt.targetModel) {
        const modelIndex = updatedModels.findIndex(m => m.id === opt.targetModel)
        if (modelIndex >= 0) {
          updatedModels[modelIndex] = {
            ...updatedModels[modelIndex],
            ...opt.changes
          }
          appliedCount++
        }
      } else if (opt.type === 'change_model_config') {
        updatedModels.forEach((model, index) => {
          if (opt.changes.reduceMaxTokensByPercent) {
            const reduction = opt.changes.reduceMaxTokensByPercent / 100
            updatedModels[index] = {
              ...model,
              maxTokens: Math.round(model.maxTokens * (1 - reduction))
            }
          }
          if (opt.changes.lowerTemperatureForSpeed) {
            updatedModels[index] = {
              ...updatedModels[index],
              temperature: Math.max(0.1, updatedModels[index].temperature * 0.8)
            }
          }
        })
        appliedCount++
      } else if (opt.type === 'hardware_tuning') {
        updatedModels.forEach((model, index) => {
          updatedModels[index] = {
            ...model,
            maxTokens: Math.min(model.maxTokens, opt.changes.maxTokens || 1000)
          }
        })
        appliedCount++
      } else if (opt.type === 'reduce_load' && opt.changes.maxTokens) {
        updatedModels.forEach((model, index) => {
          updatedModels[index] = {
            ...model,
            maxTokens: Math.min(model.maxTokens, opt.changes.maxTokens)
          }
        })
        appliedCount++
      }
    }
    
    return { updated: updatedModels, applied: appliedCount }
  }
  
  getScanHistory(): PerformanceScanResult[] {
    return [...this.scanHistory]
  }
  
  async loadScanHistory(): Promise<void> {
    const history = await spark.kv.get<PerformanceScanResult[]>('performance-scan-history')
    if (history) {
      this.scanHistory = history
    }
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
  
  private calculateParameterEfficiency(
    model: ModelConfig,
    avgTokens: number,
    avgResponseTime: number
  ): number {
    let score = 100
    
    const tokenUtilization = avgTokens / model.maxTokens
    if (tokenUtilization < 0.5) {
      score -= (0.5 - tokenUtilization) * 60
    }
    
    if (model.temperature > 0.9 && model.frequencyPenalty < 0.2) {
      score -= 15
    }
    
    if (model.temperature < 0.2 && model.topP > 0.95) {
      score -= 10
    }
    
    if (avgResponseTime > 8000) {
      score -= 20
    }
    
    return Math.max(0, Math.min(100, score))
  }
  
  private suggestBetterParameters(
    model: ModelConfig,
    metrics: PerformanceMetrics
  ): Partial<ModelParameters> {
    const suggestions: Partial<ModelParameters> = {}
    const efficiency = metrics.modelEfficiency[model.id]
    
    if (efficiency && efficiency.parameterEfficiency < 70) {
      if (model.temperature > 0.8 && model.frequencyPenalty < 0.3) {
        suggestions.frequencyPenalty = 0.4
      }
      
      if (model.temperature < 0.3 && model.topP > 0.95) {
        suggestions.topP = 0.88
      }
      
      if (efficiency.avgResponseTime > 8000) {
        suggestions.temperature = Math.max(0.1, model.temperature * 0.9)
      }
    }
    
    return suggestions
  }
}

export const performanceScanner = new PerformanceScanner()
