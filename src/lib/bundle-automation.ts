import type { HarnessManifest, Message, Agent, AgentRun } from './types'

export interface UsagePattern {
  id: string
  patternType: 'temporal' | 'contextual' | 'sequential' | 'frequency'
  description: string
  detectedAt: number
  confidence: number
  triggers: PatternTrigger[]
  suggestedHarness: string[]
  metadata: Record<string, unknown>
}

export interface PatternTrigger {
  type: 'time_of_day' | 'keyword' | 'tool_sequence' | 'frequency_threshold' | 'context_switch'
  value: unknown
  weight: number
}

export interface AutoExecutionRule {
  id: string
  name: string
  description: string
  enabled: boolean
  pattern: UsagePattern
  harnessIds: string[]
  conditions: ExecutionCondition[]
  actions: ExecutionAction[]
  cooldown: number
  lastTriggered?: number
  executionCount: number
  successRate: number
  createdAt: number
  priority: 'low' | 'normal' | 'high' | 'critical'
}

export interface ExecutionCondition {
  type: 'time_range' | 'keyword_match' | 'tool_used' | 'agent_status' | 'message_count' | 'model_type'
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range' | 'matches'
  value: unknown
  negate?: boolean
}

export interface ExecutionAction {
  type: 'run_harness' | 'notify' | 'log' | 'store_context' | 'update_agent'
  target: string
  parameters?: Record<string, unknown>
}

export interface BundleExecutionResult {
  ruleId: string
  harnessId: string
  success: boolean
  timestamp: number
  duration: number
  output?: unknown
  error?: string
  contextCaptured: Record<string, unknown>
}

export interface AutomationMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  mostTriggeredRule: string
  mostUsedHarness: string
  patternAccuracy: number
  lastAnalyzed: number
}

export class BundleAutomationEngine {
  private patterns: UsagePattern[] = []
  private rules: AutoExecutionRule[] = []
  private executionHistory: BundleExecutionResult[] = []
  private metrics: AutomationMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageDuration: 0,
    mostTriggeredRule: '',
    mostUsedHarness: '',
    patternAccuracy: 0,
    lastAnalyzed: 0
  }

  analyzeUsagePatterns(
    messages: Message[],
    agents: Agent[],
    agentRuns: AgentRun[],
    _harnesses: HarnessManifest[]
  ): UsagePattern[] {
    const newPatterns: UsagePattern[] = []

    newPatterns.push(...this.detectTemporalPatterns(messages, agentRuns))
    newPatterns.push(...this.detectContextualPatterns(messages, agents))
    newPatterns.push(...this.detectSequentialPatterns(agentRuns))
    newPatterns.push(...this.detectFrequencyPatterns(messages, agents))

    this.patterns = newPatterns
    this.metrics.lastAnalyzed = Date.now()
    
    return newPatterns
  }

  private detectTemporalPatterns(messages: Message[], agentRuns: AgentRun[]): UsagePattern[] {
    const patterns: UsagePattern[] = []
    const hourlyActivity: Record<number, number> = {}

    messages.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours()
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1
    })

    agentRuns.forEach(run => {
      const hour = new Date(run.startedAt).getHours()
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 2
    })

    Object.entries(hourlyActivity).forEach(([hour, count]) => {
      if (count >= 5) {
        patterns.push({
          id: `temporal-${hour}`,
          patternType: 'temporal',
          description: `High activity detected at ${hour}:00`,
          detectedAt: Date.now(),
          confidence: Math.min(count / 20, 0.95),
          triggers: [{
            type: 'time_of_day',
            value: parseInt(hour),
            weight: 1.0
          }],
          suggestedHarness: this.suggestHarnessForTimeOfDay(parseInt(hour)),
          metadata: { hour: parseInt(hour), activityCount: count }
        })
      }
    })

    return patterns
  }

  private detectContextualPatterns(messages: Message[], _agents: Agent[]): UsagePattern[] {
    const patterns: UsagePattern[] = []
    const keywordClusters: Record<string, string[]> = {
      'code_assistant': ['code', 'function', 'debug', 'error', 'syntax', 'implement', 'refactor'],
      'research_agent': ['research', 'find', 'search', 'information', 'study', 'analyze', 'investigate'],
      'data_analyst': ['data', 'chart', 'graph', 'statistics', 'analyze', 'calculate', 'metrics']
    }

    Object.entries(keywordClusters).forEach(([harnessType, keywords]) => {
      let matchCount = 0
      let totalWords = 0

      messages.forEach(msg => {
        const words = msg.content.toLowerCase().split(/\s+/)
        totalWords += words.length
        keywords.forEach(keyword => {
          if (msg.content.toLowerCase().includes(keyword)) {
            matchCount++
          }
        })
      })

      if (matchCount >= 3) {
        const confidence = Math.min((matchCount / Math.max(totalWords / 100, 1)) * 0.5, 0.9)
        patterns.push({
          id: `contextual-${harnessType}`,
          patternType: 'contextual',
          description: `User frequently discusses ${harnessType.replace('_', ' ')} topics`,
          detectedAt: Date.now(),
          confidence,
          triggers: keywords.map(kw => ({
            type: 'keyword' as const,
            value: kw,
            weight: 0.8
          })),
          suggestedHarness: [harnessType],
          metadata: { matchCount, keywords, totalWords }
        })
      }
    })

    return patterns
  }

  private detectSequentialPatterns(agentRuns: AgentRun[]): UsagePattern[] {
    const patterns: UsagePattern[] = []
    const toolSequences: Map<string, number> = new Map()

    agentRuns.forEach(run => {
      const toolsUsed = run.steps
        .filter(step => step.type === 'tool_call' && step.toolName)
        .map(step => step.toolName!)
        .join('->')

      if (toolsUsed) {
        toolSequences.set(toolsUsed, (toolSequences.get(toolsUsed) || 0) + 1)
      }
    })

    toolSequences.forEach((count, sequence) => {
      if (count >= 2) {
        patterns.push({
          id: `sequential-${sequence.replace(/->| /g, '-')}`,
          patternType: 'sequential',
          description: `Common tool sequence: ${sequence}`,
          detectedAt: Date.now(),
          confidence: Math.min(count / 5, 0.85),
          triggers: [{
            type: 'tool_sequence',
            value: sequence.split('->'),
            weight: 0.9
          }],
          suggestedHarness: this.suggestHarnessForToolSequence(sequence),
          metadata: { sequence, occurrences: count }
        })
      }
    })

    return patterns
  }

  private detectFrequencyPatterns(messages: Message[], _agents: Agent[]): UsagePattern[] {
    const patterns: UsagePattern[] = []
    const dailyActivity: Record<string, number> = {}

    const allTimestamps = [
      ...messages.map(m => m.timestamp),
      ...agents.map(a => a.createdAt)
    ]

    allTimestamps.forEach(ts => {
      const date = new Date(ts).toDateString()
      dailyActivity[date] = (dailyActivity[date] || 0) + 1
    })

    const avgDailyActivity = Object.values(dailyActivity).reduce((sum, val) => sum + val, 0) / 
                            Math.max(Object.keys(dailyActivity).length, 1)

    if (avgDailyActivity >= 5) {
      patterns.push({
        id: 'frequency-high-usage',
        patternType: 'frequency',
        description: `High frequency user (${avgDailyActivity.toFixed(1)} actions/day)`,
        detectedAt: Date.now(),
        confidence: Math.min(avgDailyActivity / 20, 0.95),
        triggers: [{
          type: 'frequency_threshold',
          value: avgDailyActivity,
          weight: 1.0
        }],
        suggestedHarness: ['code_assistant', 'research_agent', 'data_analyst'],
        metadata: { avgDailyActivity, activeDays: Object.keys(dailyActivity).length }
      })
    }

    return patterns
  }

  private suggestHarnessForTimeOfDay(hour: number): string[] {
    if (hour >= 9 && hour <= 17) {
      return ['code_assistant', 'data_analyst']
    } else if (hour >= 18 && hour <= 22) {
      return ['research_agent']
    }
    return []
  }

  private suggestHarnessForToolSequence(sequence: string): string[] {
    if (sequence.includes('calculator') || sequence.includes('data_analyzer')) {
      return ['data_analyst']
    }
    if (sequence.includes('web_search') || sequence.includes('memory')) {
      return ['research_agent']
    }
    if (sequence.includes('code_interpreter') || sequence.includes('file_reader')) {
      return ['code_assistant']
    }
    return []
  }

  createRuleFromPattern(
    pattern: UsagePattern,
    harnesses: HarnessManifest[],
    options: {
      autoEnable?: boolean
      priority?: AutoExecutionRule['priority']
      cooldown?: number
    } = {}
  ): AutoExecutionRule {
    const relevantHarnesses = harnesses
      .filter(h => pattern.suggestedHarness.includes(h.name) || pattern.suggestedHarness.includes(h.id))
      .map(h => h.id)

    const conditions: ExecutionCondition[] = []
    const actions: ExecutionAction[] = []

    pattern.triggers.forEach(trigger => {
      switch (trigger.type) {
        case 'time_of_day':
          conditions.push({
            type: 'time_range',
            operator: 'in_range',
            value: [trigger.value, trigger.value + 1]
          })
          break
        case 'keyword':
          conditions.push({
            type: 'keyword_match',
            operator: 'contains',
            value: trigger.value
          })
          break
        case 'tool_sequence':
          conditions.push({
            type: 'tool_used',
            operator: 'equals',
            value: trigger.value
          })
          break
        case 'frequency_threshold':
          conditions.push({
            type: 'message_count',
            operator: 'greater_than',
            value: trigger.value
          })
          break
      }
    })

    relevantHarnesses.forEach(harnessId => {
      actions.push({
        type: 'run_harness',
        target: harnessId,
        parameters: { autoExecuted: true, patternId: pattern.id }
      })
      actions.push({
        type: 'log',
        target: 'automation-log',
        parameters: { message: `Auto-executed ${harnessId} based on pattern ${pattern.id}` }
      })
    })

    return {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Auto: ${pattern.description}`,
      description: `Automatically created from ${pattern.patternType} pattern`,
      enabled: options.autoEnable ?? pattern.confidence > 0.7,
      pattern,
      harnessIds: relevantHarnesses,
      conditions,
      actions,
      cooldown: options.cooldown ?? 3600000,
      executionCount: 0,
      successRate: 1.0,
      createdAt: Date.now(),
      priority: options.priority ?? (pattern.confidence > 0.8 ? 'high' : 'normal')
    }
  }

  evaluateRules(
    context: {
      currentTime: number
      recentMessages: Message[]
      activeAgents: Agent[]
      recentRuns: AgentRun[]
    }
  ): AutoExecutionRule[] {
    const triggeredRules: AutoExecutionRule[] = []

    this.rules.forEach(rule => {
      if (!rule.enabled) return

      if (rule.lastTriggered && (context.currentTime - rule.lastTriggered) < rule.cooldown) {
        return
      }

      const allConditionsMet = rule.conditions.every(condition => 
        this.evaluateCondition(condition, context)
      )

      if (allConditionsMet) {
        triggeredRules.push(rule)
      }
    })

    return triggeredRules.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private evaluateCondition(
    condition: ExecutionCondition,
    context: {
      currentTime: number
      recentMessages: Message[]
      activeAgents: Agent[]
      recentRuns: AgentRun[]
    }
  ): boolean {
    let result = false

    switch (condition.type) {
      case 'time_range': {
        const currentHour = new Date(context.currentTime).getHours()
        if (condition.operator === 'in_range' && Array.isArray(condition.value)) {
          result = currentHour >= condition.value[0] && currentHour < condition.value[1]
        }
        break
      }

      case 'keyword_match': {
        const recentContent = context.recentMessages.map(m => m.content.toLowerCase()).join(' ')
        if (condition.operator === 'contains') {
          result = recentContent.includes(String(condition.value).toLowerCase())
        }
        break
      }

      case 'tool_used': {
        const toolsUsed = context.recentRuns.flatMap(run =>
          run.steps.filter(s => s.toolName).map(s => s.toolName)
        )
        if (condition.operator === 'equals') {
          result = toolsUsed.some(tool => tool === condition.value)
        }
        break
      }

      case 'message_count': {
        const msgCount = context.recentMessages.length
        if (condition.operator === 'greater_than') {
          result = msgCount > condition.value
        } else if (condition.operator === 'less_than') {
          result = msgCount < condition.value
        }
        break
      }

      case 'agent_status': {
        const hasStatus = context.activeAgents.some(agent => agent.status === condition.value)
        result = condition.operator === 'equals' ? hasStatus : !hasStatus
        break
      }

      case 'model_type': {
        const usedModels = context.recentMessages.map(m => m.model).filter(Boolean)
        if (condition.operator === 'contains') {
          result = usedModels.some(model => model?.includes(String(condition.value)))
        }
        break
      }
    }

    return condition.negate ? !result : result
  }

  async executeRule(
    rule: AutoExecutionRule,
    context: Record<string, unknown>
  ): Promise<BundleExecutionResult[]> {
    const results: BundleExecutionResult[] = []
    const startTime = Date.now()

    rule.lastTriggered = startTime
    rule.executionCount++

    for (const action of rule.actions) {
      if (action.type === 'run_harness') {
        const result = await this.executeHarness(action.target, {
          ...context,
          ...action.parameters
        })
        
        results.push({
          ruleId: rule.id,
          harnessId: action.target,
          success: result.success,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          output: result.output,
          error: result.error,
          contextCaptured: context
        })

        this.executionHistory.push(results[results.length - 1])
        
        if (result.success) {
          this.metrics.successfulExecutions++
        } else {
          this.metrics.failedExecutions++
        }
      }
    }

    this.metrics.totalExecutions += results.length
    this.updateRuleSuccessRate(rule)

    return results
  }

  private async executeHarness(
    harnessId: string,
    context: Record<string, unknown>
  ): Promise<{ success: boolean; output?: unknown; error?: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return {
        success: true,
        output: {
          harnessId,
          executedAt: Date.now(),
          context: Object.keys(context)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: String(error)
      }
    }
  }

  private updateRuleSuccessRate(rule: AutoExecutionRule): void {
    const ruleExecutions = this.executionHistory.filter(e => e.ruleId === rule.id)
    if (ruleExecutions.length === 0) return

    const successCount = ruleExecutions.filter(e => e.success).length
    rule.successRate = successCount / ruleExecutions.length
  }

  addRule(rule: AutoExecutionRule): void {
    this.rules.push(rule)
  }

  updateRule(ruleId: string, updates: Partial<AutoExecutionRule>): void {
    const index = this.rules.findIndex(r => r.id === ruleId)
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates }
    }
  }

  deleteRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId)
  }

  getRules(): AutoExecutionRule[] {
    return this.rules
  }

  getPatterns(): UsagePattern[] {
    return this.patterns
  }

  getMetrics(): AutomationMetrics {
    const ruleCounts = new Map<string, number>()
    const harnessCounts = new Map<string, number>()

    this.executionHistory.forEach(exec => {
      ruleCounts.set(exec.ruleId, (ruleCounts.get(exec.ruleId) || 0) + 1)
      harnessCounts.set(exec.harnessId, (harnessCounts.get(exec.harnessId) || 0) + 1)
    })

    const sortedRules = Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1])
    const sortedHarnesses = Array.from(harnessCounts.entries()).sort((a, b) => b[1] - a[1])

    const totalDuration = this.executionHistory.reduce((sum, e) => sum + e.duration, 0)
    
    return {
      ...this.metrics,
      mostTriggeredRule: sortedRules[0]?.[0] || 'none',
      mostUsedHarness: sortedHarnesses[0]?.[0] || 'none',
      averageDuration: this.executionHistory.length > 0 
        ? totalDuration / this.executionHistory.length 
        : 0,
      patternAccuracy: this.metrics.totalExecutions > 0
        ? this.metrics.successfulExecutions / this.metrics.totalExecutions
        : 1.0
    }
  }

  getExecutionHistory(limit = 50): BundleExecutionResult[] {
    return this.executionHistory.slice(-limit)
  }

  clearHistory(): void {
    this.executionHistory = []
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      mostTriggeredRule: '',
      mostUsedHarness: '',
      patternAccuracy: 0,
      lastAnalyzed: Date.now()
    }
  }

  exportRules(): string {
    return JSON.stringify(this.rules, null, 2)
  }

  importRules(rulesJson: string): void {
    try {
      const rules = JSON.parse(rulesJson)
      if (Array.isArray(rules)) {
        this.rules = rules
      }
    } catch (error) {
      console.error('Failed to import rules:', error)
    }
  }
}

export const bundleAutomation = new BundleAutomationEngine()
