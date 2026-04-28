import type {
  AgentRun,
  AgentFeedback,
  AgentLearningMetrics,
  LearningInsight,
  AgentCapability,
  AgentVersion,
  VersionChange,
  Agent} from './types'

export class AgentLearningEngine {
  static analyzeFeedback(
    runs: AgentRun[],
    feedbacks: AgentFeedback[]
  ): AgentLearningMetrics {
    const agentId = runs[0]?.agentId || ''
    
    const totalRuns = runs.length
    const runsWithFeedback = runs.filter(r => r.feedback)
    const averageRating = runsWithFeedback.length > 0
      ? runsWithFeedback.reduce((sum, r) => sum + (r.feedback?.rating || 0), 0) / runsWithFeedback.length
      : 0

    const issuesMap = new Map<string, number>()
    feedbacks.forEach(f => {
      f.issues?.forEach(issue => {
        const key = issue.type
        issuesMap.set(key, (issuesMap.get(key) || 0) + 1)
      })
    })

    const commonIssues = Array.from(issuesMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const toolStats = this.analyzeToolEffectiveness(runs)
    
    const improvementRate = this.calculateImprovementRate(runs)
    
    const insights = this.generateInsights(runs, feedbacks, toolStats, commonIssues)

    return {
      agentId,
      totalRuns,
      averageRating,
      improvementRate,
      commonIssues,
      toolEffectiveness: toolStats,
      parameterTrends: {
        temperature: { value: 0.7, trend: 'stable' },
        maxIterations: { value: 5, trend: 'stable' }
      },
      learningInsights: insights,
      lastUpdated: Date.now()
    }
  }

  private static analyzeToolEffectiveness(runs: AgentRun[]) {
    const toolMap = new Map<string, { total: number; successful: number; totalTime: number }>()

    runs.forEach(run => {
      run.steps?.forEach(step => {
        if (step.type === 'tool_call' && step.toolName) {
          const stats = toolMap.get(step.toolName) || { total: 0, successful: 0, totalTime: 0 }
          stats.total++
          if (step.success !== false) stats.successful++
          if (step.duration) stats.totalTime += step.duration
          toolMap.set(step.toolName, stats)
        }
      })
    })

    return Array.from(toolMap.entries()).map(([tool, stats]) => ({
      tool,
      successRate: stats.total > 0 ? stats.successful / stats.total : 0,
      avgTime: stats.total > 0 ? stats.totalTime / stats.total : 0
    }))
  }

  private static calculateImprovementRate(runs: AgentRun[]): number {
    if (runs.length < 2) return 0

    const sortedRuns = [...runs].sort((a, b) => a.startedAt - b.startedAt)
    const firstHalf = sortedRuns.slice(0, Math.floor(sortedRuns.length / 2))
    const secondHalf = sortedRuns.slice(Math.floor(sortedRuns.length / 2))

    const firstAvg = firstHalf.filter(r => r.feedback).reduce((sum, r) => sum + (r.feedback?.rating || 0), 0) / Math.max(firstHalf.filter(r => r.feedback).length, 1)
    const secondAvg = secondHalf.filter(r => r.feedback).reduce((sum, r) => sum + (r.feedback?.rating || 0), 0) / Math.max(secondHalf.filter(r => r.feedback).length, 1)

    if (firstAvg === 0) return 0
    return ((secondAvg - firstAvg) / firstAvg) * 100
  }

  private static generateInsights(
    runs: AgentRun[],
    feedbacks: AgentFeedback[],
    toolStats: { tool: string; successRate: number; avgTime: number }[],
    commonIssues: { issue: string; count: number }[]
  ): LearningInsight[] {
    const insights: LearningInsight[] = []

    const lowPerformingTools = toolStats.filter(t => t.successRate < 0.7)
    if (lowPerformingTools.length > 0) {
      insights.push({
        id: `insight-${Date.now()}-1`,
        type: 'recommendation',
        title: 'Low-performing tools detected',
        description: `Tools ${lowPerformingTools.map(t => t.tool).join(', ')} have success rates below 70%. Consider alternative tools or improved error handling.`,
        confidence: 0.85,
        actionable: true,
        action: {
          type: 'change_tool',
          details: {
            tools: lowPerformingTools.map(t => t.tool)
          }
        },
        createdAt: Date.now()
      })
    }

    const recentFeedbacks = feedbacks.slice(-5)
    const recentAvgAccuracy = recentFeedbacks.reduce((sum, f) => sum + f.accuracy, 0) / Math.max(recentFeedbacks.length, 1)
    
    if (recentAvgAccuracy < 0.6) {
      insights.push({
        id: `insight-${Date.now()}-2`,
        type: 'recommendation',
        title: 'Accuracy declining in recent runs',
        description: 'Recent runs show decreased accuracy. Consider adjusting temperature or reviewing agent goal clarity.',
        confidence: 0.78,
        actionable: true,
        action: {
          type: 'adjust_parameter',
          details: {
            parameter: 'temperature',
            suggestedValue: 0.5,
            reason: 'Lower temperature may improve accuracy'
          }
        },
        createdAt: Date.now()
      })
    }

    if (commonIssues.length > 0 && commonIssues[0].count >= 3) {
      const topIssue = commonIssues[0]
      insights.push({
        id: `insight-${Date.now()}-3`,
        type: 'pattern',
        title: `Recurring issue: ${topIssue.issue}`,
        description: `This issue has occurred ${topIssue.count} times. Address the root cause to improve agent performance.`,
        confidence: 0.92,
        actionable: true,
        action: {
          type: 'modify_prompt',
          details: {
            issueType: topIssue.issue,
            occurrences: topIssue.count
          }
        },
        createdAt: Date.now()
      })
    }

    const successRate = runs.filter(r => r.status === 'completed').length / Math.max(runs.length, 1)
    if (successRate > 0.9) {
      insights.push({
        id: `insight-${Date.now()}-4`,
        type: 'improvement',
        title: 'Excellent performance',
        description: `Agent maintains a ${(successRate * 100).toFixed(1)}% success rate. Current configuration is working well.`,
        confidence: 0.95,
        actionable: false,
        createdAt: Date.now()
      })
    }

    return insights
  }

  static applyLearning(
    agent: Agent,
    insights: LearningInsight[],
    autoApply: boolean = false
  ): { agent: Agent; changes: VersionChange[] } {
    const changes: VersionChange[] = []
    const updatedAgent = { ...agent }

    insights
      .filter(i => i.actionable && (!i.applied || autoApply))
      .forEach(insight => {
        if (insight.action) {
          switch (insight.action.type) {
            case 'adjust_parameter':
              if (insight.action.details.parameter === 'temperature') {
                changes.push({
                  field: 'temperature',
                  oldValue: updatedAgent.temperature || 0.7,
                  newValue: Number(insight.action.details.suggestedValue) || 0.7,
                  reason: String(insight.action.details.reason || insight.description)
                })
                updatedAgent.temperature = Number(insight.action.details.suggestedValue) || 0.7
              }
              break

            case 'change_tool':
              break

            case 'modify_prompt':
              break

            case 'add_capability': {
              if (!updatedAgent.capabilities) {
                updatedAgent.capabilities = []
              }
              const capabilityToAdd = String(insight.action.details.capability || '')
              if (capabilityToAdd && !updatedAgent.capabilities.includes(capabilityToAdd as AgentCapability)) {
                changes.push({
                  field: 'capabilities',
                  oldValue: [...updatedAgent.capabilities],
                  newValue: [...updatedAgent.capabilities, capabilityToAdd as AgentCapability],
                  reason: insight.description
                })
                // Create a new array rather than mutating the shallow-copied
                // reference, which would also mutate the original agent object.
                updatedAgent.capabilities = [...updatedAgent.capabilities, capabilityToAdd as AgentCapability]
              }
              break
            }
          }
        }
      })

    return { agent: updatedAgent, changes }
  }

  static createVersion(
    agent: Agent,
    changes: VersionChange[],
    performanceSnapshot: {
      avgRating: number
      successRate: number
      avgExecutionTime: number
    }
  ): AgentVersion {
    return {
      id: `version-${Date.now()}`,
      agentId: agent.id,
      version: Date.now(),
      changes,
      performanceSnapshot,
      createdAt: Date.now(),
      createdBy: changes.length > 0 ? 'auto_learning' : 'user'
    }
  }

  static async generateImprovementSuggestions(
    agent: Agent,
    runs: AgentRun[],
    feedbacks: AgentFeedback[]
  ): Promise<string[]> {
    const suggestions: string[] = []

    const avgRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0

    if (avgRating < 3 && feedbacks.length >= 3) {
      suggestions.push('Consider clarifying the agent goal for better results')
      suggestions.push('Review and adjust tool selection based on task requirements')
    }

    const toolIssues = feedbacks.flatMap(f => f.issues || []).filter(i => i.type === 'wrong_tool')
    if (toolIssues.length >= 2) {
      suggestions.push('Tool selection may be suboptimal - review agent tool configuration')
    }

    const timeoutIssues = feedbacks.flatMap(f => f.issues || []).filter(i => i.type === 'timeout')
    if (timeoutIssues.length >= 2) {
      suggestions.push('Increase max iterations or optimize agent reasoning steps')
    }

    const recentRuns = runs.slice(-5)
    const recentErrors = recentRuns.filter(r => r.status === 'error').length
    if (recentErrors >= 2) {
      suggestions.push('Recent error rate is high - review agent configuration and error logs')
    }

    const avgSteps = runs.reduce((sum, r) => sum + (r.steps?.length || 0), 0) / Math.max(runs.length, 1)
    if (avgSteps > 10) {
      suggestions.push('Agent takes many steps to complete - consider simplifying the goal or adding more capable tools')
    }

    if (suggestions.length === 0 && avgRating >= 4) {
      suggestions.push('Agent is performing well - consider expanding its capabilities')
    }

    return suggestions
  }

  static calculateQualityScore(feedback: AgentFeedback): number {
    const weights = {
      rating: 0.3,
      accuracy: 0.3,
      efficiency: 0.2,
      relevance: 0.2
    }

    const normalizedRating = feedback.rating / 5
    
    const score = 
      normalizedRating * weights.rating +
      feedback.accuracy * weights.accuracy +
      feedback.efficiency * weights.efficiency +
      feedback.relevance * weights.relevance

    return Math.round(score * 100)
  }
}
