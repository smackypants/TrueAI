import type { OptimizationInsight } from './auto-optimizer'
import type { ThresholdConfig } from './confidence-thresholds'
// import type { AnalyticsEvent } from './types'

export interface UserFeedback {
  id: string
  insightId: string
  actionType: OptimizationInsight['suggestedAction']['type']
  severity: OptimizationInsight['severity']
  confidence: number
  userAccepted: boolean
  wasAutomatic: boolean
  wasSuccessful?: boolean
  timestamp: number
  responseTime?: number
  satisfactionScore?: number
  modelId?: string
  parameters?: Record<string, unknown>
}

export interface LearningMetrics {
  totalFeedback: number
  acceptanceRate: number
  successRate: number
  avgConfidence: number
  bySeverity: Record<OptimizationInsight['severity'], {
    total: number
    accepted: number
    successful: number
    avgConfidence: number
  }>
  byActionType: Record<OptimizationInsight['suggestedAction']['type'], {
    total: number
    accepted: number
    successful: number
    avgConfidence: number
  }>
  thresholdAccuracy: {
    truePositives: number
    falsePositives: number
    trueNegatives: number
    falseNegatives: number
    precision: number
    recall: number
    f1Score: number
  }
}

export interface ThresholdAdjustment {
  severity: OptimizationInsight['severity']
  oldThreshold: number
  newThreshold: number
  reason: string
  confidence: number
  expectedImprovement: string
}

export interface LearningStats {
  totalAdjustments: number
  lastAdjustedAt?: number
  learningRate: number
  convergenceScore: number
  stabilityScore: number
  performanceImprovement: number
  recommendedLearningRate: number
}

export class ThresholdLearningAlgorithm {
  private feedbackHistory: UserFeedback[] = []
  private adjustmentHistory: ThresholdAdjustment[] = []
  private learningRate = 0.1
  private minLearningRate = 0.01
  private maxLearningRate = 0.3
  private adaptiveLearningEnabled = true
  private explorationRate = 0.15
  private minSamplesForLearning = 10
  private convergenceThreshold = 0.05
  private windowSize = 100

  constructor(initialLearningRate = 0.1) {
    this.learningRate = initialLearningRate
  }

  addFeedback(feedback: UserFeedback): void {
    this.feedbackHistory.push(feedback)
    
    if (this.feedbackHistory.length > 1000) {
      this.feedbackHistory = this.feedbackHistory.slice(-1000)
    }
  }

  calculateMetrics(): LearningMetrics {
    const total = this.feedbackHistory.length
    
    if (total === 0) {
      return this.getEmptyMetrics()
    }

    const accepted = this.feedbackHistory.filter(f => f.userAccepted).length
    const successful = this.feedbackHistory.filter(f => f.wasSuccessful === true).length
    const avgConfidence = this.feedbackHistory.reduce((sum, f) => sum + f.confidence, 0) / total

    const bySeverity: LearningMetrics['bySeverity'] = {
      critical: this.calculateSeverityMetrics('critical'),
      high: this.calculateSeverityMetrics('high'),
      medium: this.calculateSeverityMetrics('medium'),
      low: this.calculateSeverityMetrics('low')
    }

    const byActionType: LearningMetrics['byActionType'] = {
      adjust_parameters: this.calculateActionTypeMetrics('adjust_parameters'),
      change_model: this.calculateActionTypeMetrics('change_model'),
      add_profile: this.calculateActionTypeMetrics('add_profile'),
      reduce_usage: this.calculateActionTypeMetrics('reduce_usage')
    }

    const thresholdAccuracy = this.calculateThresholdAccuracy()

    return {
      totalFeedback: total,
      acceptanceRate: (accepted / total) * 100,
      successRate: successful > 0 ? (successful / accepted) * 100 : 0,
      avgConfidence,
      bySeverity,
      byActionType,
      thresholdAccuracy
    }
  }

  learnAndAdjustThresholds(currentConfig: ThresholdConfig): ThresholdAdjustment[] {
    const metrics = this.calculateMetrics()
    const adjustments: ThresholdAdjustment[] = []

    if (this.feedbackHistory.length < this.minSamplesForLearning) {
      return adjustments
    }

    const recentFeedback = this.getRecentFeedback(this.windowSize)
    
    Object.keys(currentConfig.thresholds).forEach(severityKey => {
      const severity = severityKey as OptimizationInsight['severity']
      const currentThreshold = currentConfig.thresholds[severity].minConfidence
      const adjustment = this.calculateThresholdAdjustment(
        severity,
        currentThreshold,
        recentFeedback,
        metrics
      )

      if (adjustment) {
        adjustments.push(adjustment)
        this.adjustmentHistory.push(adjustment)
      }
    })

    if (this.adaptiveLearningEnabled) {
      this.updateLearningRate(metrics)
    }

    return adjustments
  }

  private calculateThresholdAdjustment(
    severity: OptimizationInsight['severity'],
    currentThreshold: number,
    recentFeedback: UserFeedback[],
    metrics: LearningMetrics
  ): ThresholdAdjustment | null {
    const severityFeedback = recentFeedback.filter(f => f.severity === severity)
    
    if (severityFeedback.length < 5) {
      return null
    }

    const severityMetrics = metrics.bySeverity[severity]
    const acceptanceRate = severityMetrics.accepted / severityMetrics.total
    const successRate = severityMetrics.successful / Math.max(1, severityMetrics.accepted)

    let adjustment = 0
    let reason = ''
    let expectedImprovement = ''

    if (acceptanceRate < 0.3 && successRate < 0.5) {
      adjustment = this.learningRate * 0.15
      reason = `Low acceptance (${(acceptanceRate * 100).toFixed(0)}%) and success rate (${(successRate * 100).toFixed(0)}%) - increasing threshold to be more selective`
      expectedImprovement = 'Fewer low-quality suggestions, higher user trust'
    } else if (acceptanceRate > 0.8 && successRate > 0.85) {
      adjustment = -this.learningRate * 0.1
      reason = `High acceptance (${(acceptanceRate * 100).toFixed(0)}%) and success rate (${(successRate * 100).toFixed(0)}%) - lowering threshold to enable more optimizations`
      expectedImprovement = 'More optimization opportunities, maintained quality'
    } else if (acceptanceRate < 0.4) {
      adjustment = this.learningRate * 0.12
      reason = `Low acceptance rate (${(acceptanceRate * 100).toFixed(0)}%) - increasing threshold`
      expectedImprovement = 'Better suggestion quality'
    } else if (acceptanceRate > 0.9 && severityMetrics.avgConfidence > currentThreshold + 0.15) {
      adjustment = -this.learningRate * 0.08
      reason = `Very high acceptance (${(acceptanceRate * 100).toFixed(0)}%) with high confidence buffer - lowering threshold`
      expectedImprovement = 'More frequent optimizations'
    }

    const falsePositiveRate = this.calculateFalsePositiveRate(severity, severityFeedback)
    if (falsePositiveRate > 0.3) {
      adjustment += this.learningRate * 0.1
      reason += ` | High false positive rate (${(falsePositiveRate * 100).toFixed(0)}%)`
      expectedImprovement = 'Reduced incorrect suggestions'
    }

    const falseNegativeRate = this.calculateFalseNegativeRate(severity, severityFeedback)
    if (falseNegativeRate > 0.4 && acceptanceRate > 0.7) {
      adjustment -= this.learningRate * 0.08
      reason += ` | Missing good opportunities (${(falseNegativeRate * 100).toFixed(0)}% false negatives)`
      expectedImprovement = 'Catching more improvement opportunities'
    }

    if (Math.abs(adjustment) < 0.01) {
      return null
    }

    adjustment += (Math.random() - 0.5) * this.explorationRate * 0.05

    const newThreshold = Math.max(0.5, Math.min(0.99, currentThreshold + adjustment))
    
    if (Math.abs(newThreshold - currentThreshold) < 0.005) {
      return null
    }

    const confidence = this.calculateAdjustmentConfidence(severityFeedback.length, metrics)

    return {
      severity,
      oldThreshold: currentThreshold,
      newThreshold,
      reason,
      confidence,
      expectedImprovement
    }
  }

  private calculateSeverityMetrics(severity: OptimizationInsight['severity']) {
    const severityFeedback = this.feedbackHistory.filter(f => f.severity === severity)
    const total = severityFeedback.length
    
    if (total === 0) {
      return { total: 0, accepted: 0, successful: 0, avgConfidence: 0 }
    }

    const accepted = severityFeedback.filter(f => f.userAccepted).length
    const successful = severityFeedback.filter(f => f.wasSuccessful === true).length
    const avgConfidence = severityFeedback.reduce((sum, f) => sum + f.confidence, 0) / total

    return { total, accepted, successful, avgConfidence }
  }

  private calculateActionTypeMetrics(actionType: OptimizationInsight['suggestedAction']['type']) {
    const actionFeedback = this.feedbackHistory.filter(f => f.actionType === actionType)
    const total = actionFeedback.length
    
    if (total === 0) {
      return { total: 0, accepted: 0, successful: 0, avgConfidence: 0 }
    }

    const accepted = actionFeedback.filter(f => f.userAccepted).length
    const successful = actionFeedback.filter(f => f.wasSuccessful === true).length
    const avgConfidence = actionFeedback.reduce((sum, f) => sum + f.confidence, 0) / total

    return { total, accepted, successful, avgConfidence }
  }

  private calculateThresholdAccuracy(): LearningMetrics['thresholdAccuracy'] {
    let truePositives = 0
    let falsePositives = 0
    let trueNegatives = 0
    let falseNegatives = 0

    this.feedbackHistory.forEach(feedback => {
      const wasAutomatic = feedback.wasAutomatic
      const wasSuccessful = feedback.wasSuccessful === true

      if (wasAutomatic && wasSuccessful) {
        truePositives++
      } else if (wasAutomatic && !wasSuccessful) {
        falsePositives++
      } else if (!wasAutomatic && wasSuccessful) {
        falseNegatives++
      } else if (!wasAutomatic && !wasSuccessful) {
        trueNegatives++
      }
    })

    const precision = truePositives / Math.max(1, truePositives + falsePositives)
    const recall = truePositives / Math.max(1, truePositives + falseNegatives)
    const f1Score = 2 * (precision * recall) / Math.max(0.01, precision + recall)

    return {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      precision,
      recall,
      f1Score
    }
  }

  private calculateFalsePositiveRate(
    severity: OptimizationInsight['severity'],
    feedback: UserFeedback[]
  ): number {
    const automatic = feedback.filter(f => f.wasAutomatic)
    if (automatic.length === 0) return 0

    const unsuccessful = automatic.filter(f => f.wasSuccessful === false).length
    return unsuccessful / automatic.length
  }

  private calculateFalseNegativeRate(
    severity: OptimizationInsight['severity'],
    feedback: UserFeedback[]
  ): number {
    const manual = feedback.filter(f => !f.wasAutomatic && f.userAccepted)
    if (manual.length === 0) return 0

    const successful = manual.filter(f => f.wasSuccessful === true).length
    return successful / manual.length
  }

  private calculateAdjustmentConfidence(sampleSize: number, metrics: LearningMetrics): number {
    const baseConfidence = Math.min(0.95, 0.5 + (sampleSize / 100))
    
    const accuracyBonus = metrics.thresholdAccuracy.f1Score * 0.2
    
    const stabilityPenalty = this.calculateStabilityPenalty()
    
    return Math.max(0.3, Math.min(0.95, baseConfidence + accuracyBonus - stabilityPenalty))
  }

  private calculateStabilityPenalty(): number {
    if (this.adjustmentHistory.length < 2) return 0

    const recentAdjustments = this.adjustmentHistory.slice(-10)
    const adjustmentMagnitudes = recentAdjustments.map(a => 
      Math.abs(a.newThreshold - a.oldThreshold)
    )

    const avgMagnitude = adjustmentMagnitudes.reduce((sum, m) => sum + m, 0) / adjustmentMagnitudes.length
    
    return Math.min(0.3, avgMagnitude * 2)
  }

  private updateLearningRate(metrics: LearningMetrics): void {
    const f1Score = metrics.thresholdAccuracy.f1Score
    
    if (f1Score > 0.8) {
      this.learningRate = Math.max(
        this.minLearningRate,
        this.learningRate * 0.9
      )
    } else if (f1Score < 0.5) {
      this.learningRate = Math.min(
        this.maxLearningRate,
        this.learningRate * 1.2
      )
    }

    const recentAdjustments = this.adjustmentHistory.slice(-5)
    if (recentAdjustments.length >= 5) {
      const severityCounts = recentAdjustments.reduce((acc, adj) => {
        acc[adj.severity] = (acc[adj.severity] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const isOscillating = Object.values(severityCounts).some(count => count >= 3)
      if (isOscillating) {
        this.learningRate = Math.max(
          this.minLearningRate,
          this.learningRate * 0.7
        )
      }
    }
  }

  private getRecentFeedback(count: number): UserFeedback[] {
    return this.feedbackHistory.slice(-count)
  }

  getOptimalThresholds(currentConfig: ThresholdConfig): ThresholdConfig {
    const adjustments = this.learnAndAdjustThresholds(currentConfig)
    
    const optimizedConfig = { ...currentConfig }
    
    adjustments.forEach(adjustment => {
      optimizedConfig.thresholds[adjustment.severity] = {
        ...optimizedConfig.thresholds[adjustment.severity],
        minConfidence: adjustment.newThreshold
      }
    })

    return optimizedConfig
  }

  getLearningStats(): LearningStats {
    const metrics = this.calculateMetrics()
    
    const convergenceScore = this.calculateConvergenceScore()
    const stabilityScore = this.calculateStabilityScore()
    const performanceImprovement = this.calculatePerformanceImprovement()
    
    return {
      totalAdjustments: this.adjustmentHistory.length,
      lastAdjustedAt: this.adjustmentHistory.length > 0 
        ? this.adjustmentHistory[this.adjustmentHistory.length - 1].confidence 
        : undefined,
      learningRate: this.learningRate,
      convergenceScore,
      stabilityScore,
      performanceImprovement,
      recommendedLearningRate: this.calculateRecommendedLearningRate(metrics)
    }
  }

  private calculateConvergenceScore(): number {
    if (this.adjustmentHistory.length < 5) return 0

    const recentAdjustments = this.adjustmentHistory.slice(-10)
    const avgAdjustmentMagnitude = recentAdjustments.reduce(
      (sum, adj) => sum + Math.abs(adj.newThreshold - adj.oldThreshold),
      0
    ) / recentAdjustments.length

    return Math.max(0, 1 - (avgAdjustmentMagnitude / this.convergenceThreshold))
  }

  private calculateStabilityScore(): number {
    if (this.adjustmentHistory.length < 10) return 0.5

    const recentAdjustments = this.adjustmentHistory.slice(-20)
    const directions = recentAdjustments.map(adj => 
      adj.newThreshold > adj.oldThreshold ? 1 : -1
    )

    let oscillations = 0
    for (let i = 1; i < directions.length; i++) {
      if (directions[i] !== directions[i - 1]) {
        oscillations++
      }
    }

    return Math.max(0, 1 - (oscillations / directions.length))
  }

  private calculatePerformanceImprovement(): number {
    if (this.feedbackHistory.length < 20) return 0

    const firstHalf = this.feedbackHistory.slice(0, Math.floor(this.feedbackHistory.length / 2))
    const secondHalf = this.feedbackHistory.slice(Math.floor(this.feedbackHistory.length / 2))

    const firstHalfSuccess = firstHalf.filter(f => f.wasSuccessful === true).length / firstHalf.length
    const secondHalfSuccess = secondHalf.filter(f => f.wasSuccessful === true).length / secondHalf.length

    return ((secondHalfSuccess - firstHalfSuccess) / Math.max(0.01, firstHalfSuccess)) * 100
  }

  private calculateRecommendedLearningRate(metrics: LearningMetrics): number {
    const f1Score = metrics.thresholdAccuracy.f1Score
    
    if (f1Score > 0.85) {
      return this.minLearningRate
    } else if (f1Score < 0.5) {
      return this.maxLearningRate
    } else {
      return this.minLearningRate + (this.maxLearningRate - this.minLearningRate) * (1 - f1Score)
    }
  }

  private getEmptyMetrics(): LearningMetrics {
    return {
      totalFeedback: 0,
      acceptanceRate: 0,
      successRate: 0,
      avgConfidence: 0,
      bySeverity: {
        critical: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 },
        high: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 },
        medium: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 },
        low: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 }
      },
      byActionType: {
        adjust_parameters: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 },
        change_model: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 },
        add_profile: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 },
        reduce_usage: { total: 0, accepted: 0, successful: 0, avgConfidence: 0 }
      },
      thresholdAccuracy: {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0
      }
    }
  }

  exportFeedbackHistory(): string {
    return JSON.stringify({
      feedback: this.feedbackHistory,
      adjustments: this.adjustmentHistory,
      learningRate: this.learningRate
    }, null, 2)
  }

  importFeedbackHistory(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      if (parsed.feedback && Array.isArray(parsed.feedback)) {
        this.feedbackHistory = parsed.feedback
        this.adjustmentHistory = parsed.adjustments || []
        this.learningRate = parsed.learningRate || this.learningRate
        return true
      }
      return false
    } catch {
      return false
    }
  }

  reset(): void {
    this.feedbackHistory = []
    this.adjustmentHistory = []
    this.learningRate = 0.1
  }
}

export const learningAlgorithm = new ThresholdLearningAlgorithm()
