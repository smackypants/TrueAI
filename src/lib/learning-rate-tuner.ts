
export interface LearningRateMetrics {
  currentRate: number
  recommendedRate: number
  confidence: number
  trainingLoss: number[]
  validationLoss: number[]
  gradientNorm: number[]
  convergenceRate: number
  stabilityScore: number
  epochsCompleted: number
  timeElapsed: number
  successRate: number
}

export interface LearningRateAdjustment {
  oldRate: number
  newRate: number
  reason: string
  confidence: number
  expectedImprovement: string
  strategy: 'reduce' | 'increase' | 'adaptive' | 'cyclic'
  timestamp: number
}

export interface LearningRateSchedule {
  type: 'constant' | 'step_decay' | 'exponential' | 'cosine_annealing' | 'adaptive'
  initialRate: number
  minRate: number
  maxRate: number
  decayFactor?: number
  stepSize?: number
  warmupSteps?: number
  cycleLength?: number
}

export interface PerformanceMetrics {
  modelId: string
  taskType: string
  avgLoss: number
  lossVariance: number
  avgResponseTime: number
  successRate: number
  userSatisfaction: number
  convergenceSpeed: number
  stabilityIndex: number
  overfittingRisk: number
  timestamp: number
}

export class LearningRateTuner {
  private adjustmentHistory: LearningRateAdjustment[] = []
  private performanceHistory: PerformanceMetrics[] = []
  private minLearningRate = 0.00001
  private maxLearningRate = 0.1
  private adaptiveWindow = 10
  private momentumFactor = 0.9
  private warmupSteps = 100
  
  constructor() {}

  analyzeLoss(losses: number[]): { trend: 'decreasing' | 'increasing' | 'plateauing' | 'oscillating', magnitude: number } {
    if (losses.length < 5) {
      return { trend: 'decreasing', magnitude: 0 }
    }

    const recentLosses = losses.slice(-10)
    const diffs = []
    for (let i = 1; i < recentLosses.length; i++) {
      diffs.push(recentLosses[i] - recentLosses[i - 1])
    }

    const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / diffs.length

    if (variance > 0.01) {
      return { trend: 'oscillating', magnitude: Math.sqrt(variance) }
    } else if (Math.abs(avgDiff) < 0.001) {
      return { trend: 'plateauing', magnitude: Math.abs(avgDiff) }
    } else if (avgDiff < 0) {
      return { trend: 'decreasing', magnitude: Math.abs(avgDiff) }
    } else {
      return { trend: 'increasing', magnitude: avgDiff }
    }
  }

  calculateGradientNorm(losses: number[]): number {
    if (losses.length < 2) return 0

    const recentLosses = losses.slice(-5)
    const gradients = []
    for (let i = 1; i < recentLosses.length; i++) {
      gradients.push(recentLosses[i] - recentLosses[i - 1])
    }

    const sumSquares = gradients.reduce((sum, g) => sum + g * g, 0)
    return Math.sqrt(sumSquares / gradients.length)
  }

  calculateConvergenceRate(losses: number[], epochs: number): number {
    if (losses.length < 10 || epochs === 0) return 0

    const initialLoss = losses[0]
    const currentLoss = losses[losses.length - 1]
    const improvement = initialLoss - currentLoss

    return improvement / epochs
  }

  calculateStabilityScore(losses: number[]): number {
    if (losses.length < 5) return 1.0

    const recentLosses = losses.slice(-20)
    const mean = recentLosses.reduce((sum, l) => sum + l, 0) / recentLosses.length
    const variance = recentLosses.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / recentLosses.length
    const stdDev = Math.sqrt(variance)

    const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 1
    
    return Math.max(0, 1 - Math.min(1, coefficientOfVariation))
  }

  detectOverfitting(trainLoss: number[], valLoss: number[]): number {
    if (trainLoss.length < 5 || valLoss.length < 5) return 0

    const recentTrain = trainLoss.slice(-10)
    const recentVal = valLoss.slice(-10)

    const avgTrain = recentTrain.reduce((sum, l) => sum + l, 0) / recentTrain.length
    const avgVal = recentVal.reduce((sum, l) => sum + l, 0) / recentVal.length

    const gap = avgVal - avgTrain
    const trainTrend = recentTrain[recentTrain.length - 1] - recentTrain[0]
    const valTrend = recentVal[recentVal.length - 1] - recentVal[0]

    if (gap > 0.1 && trainTrend < 0 && valTrend > 0) {
      return Math.min(1, gap / avgTrain)
    }

    return 0
  }

  recommendLearningRate(
    currentRate: number,
    trainingLoss: number[],
    validationLoss: number[] = [],
    epochs: number = 0,
    step: number = 0
  ): LearningRateAdjustment | null {
    const lossTrend = this.analyzeLoss(trainingLoss)
    const gradientNorm = this.calculateGradientNorm(trainingLoss)
    const convergenceRate = this.calculateConvergenceRate(trainingLoss, epochs)
    const stabilityScore = this.calculateStabilityScore(trainingLoss)
    const overfittingRisk = validationLoss.length > 0 
      ? this.detectOverfitting(trainingLoss, validationLoss) 
      : 0

    let adjustment = 0
    let reason = ''
    let strategy: LearningRateAdjustment['strategy'] = 'adaptive'
    let expectedImprovement = ''
    let confidence = 0.7

    if (step < this.warmupSteps) {
      const warmupProgress = step / this.warmupSteps
      const targetRate = currentRate
      const warmupRate = targetRate * warmupProgress
      
      if (Math.abs(warmupRate - currentRate) > 0.0001) {
        return {
          oldRate: currentRate,
          newRate: warmupRate,
          reason: `Warmup phase: ${step}/${this.warmupSteps} steps`,
          confidence: 0.95,
          expectedImprovement: 'Stable training initialization',
          strategy: 'adaptive',
          timestamp: Date.now()
        }
      }
    }

    if (overfittingRisk > 0.3) {
      adjustment = -currentRate * 0.5
      reason = `Overfitting detected (${(overfittingRisk * 100).toFixed(0)}% risk) - reducing learning rate significantly`
      expectedImprovement = 'Better generalization, reduced overfitting'
      strategy = 'reduce'
      confidence = 0.85
    } else if (lossTrend.trend === 'oscillating') {
      adjustment = -currentRate * 0.3
      reason = `Loss oscillating (variance: ${lossTrend.magnitude.toFixed(4)}) - reducing to stabilize`
      expectedImprovement = 'More stable convergence'
      strategy = 'reduce'
      confidence = 0.8
    } else if (lossTrend.trend === 'increasing') {
      adjustment = -currentRate * 0.5
      reason = `Loss increasing (${lossTrend.magnitude.toFixed(4)}) - emergency reduction`
      expectedImprovement = 'Prevent divergence'
      strategy = 'reduce'
      confidence = 0.9
    } else if (lossTrend.trend === 'plateauing' && stabilityScore > 0.8) {
      if (currentRate < this.maxLearningRate * 0.5) {
        adjustment = currentRate * 0.2
        reason = `Loss plateaued (${lossTrend.magnitude.toFixed(4)}) with high stability - trying higher rate`
        expectedImprovement = 'Escape local minimum'
        strategy = 'increase'
        confidence = 0.65
      } else {
        adjustment = -currentRate * 0.2
        reason = `Loss plateaued at high learning rate - fine-tuning with reduction`
        expectedImprovement = 'Converge to better local minimum'
        strategy = 'reduce'
        confidence = 0.7
      }
    } else if (lossTrend.trend === 'decreasing' && convergenceRate > 0.01) {
      if (stabilityScore > 0.7 && gradientNorm < 0.1 && currentRate < this.maxLearningRate * 0.8) {
        adjustment = currentRate * 0.15
        reason = `Good convergence with stability - slight increase for faster training`
        expectedImprovement = 'Faster convergence'
        strategy = 'increase'
        confidence = 0.75
      } else if (gradientNorm > 1.0) {
        adjustment = -currentRate * 0.2
        reason = `Large gradients detected (${gradientNorm.toFixed(4)}) - reducing for stability`
        expectedImprovement = 'More stable updates'
        strategy = 'reduce'
        confidence = 0.8
      } else {
        return null
      }
    } else if (stabilityScore < 0.5) {
      adjustment = -currentRate * 0.25
      reason = `Low stability score (${stabilityScore.toFixed(2)}) - reducing learning rate`
      expectedImprovement = 'Improved training stability'
      strategy = 'reduce'
      confidence = 0.85
    }

    if (Math.abs(adjustment) < currentRate * 0.05) {
      return null
    }

    const newRate = Math.max(
      this.minLearningRate,
      Math.min(this.maxLearningRate, currentRate + adjustment)
    )

    if (Math.abs(newRate - currentRate) < 0.00001) {
      return null
    }

    const adjustmentObj: LearningRateAdjustment = {
      oldRate: currentRate,
      newRate,
      reason,
      confidence,
      expectedImprovement,
      strategy,
      timestamp: Date.now()
    }

    this.adjustmentHistory.push(adjustmentObj)
    if (this.adjustmentHistory.length > 100) {
      this.adjustmentHistory = this.adjustmentHistory.slice(-100)
    }

    return adjustmentObj
  }

  generateSchedule(
    taskType: string,
    estimatedEpochs: number,
    modelComplexity: 'low' | 'medium' | 'high'
  ): LearningRateSchedule {
    const baseRates = {
      low: 0.01,
      medium: 0.001,
      high: 0.0001
    }

    const initialRate = baseRates[modelComplexity]

    const scheduleTypes: LearningRateSchedule['type'][] = [
      'cosine_annealing',
      'step_decay',
      'adaptive'
    ]

    const selectedType = scheduleTypes[Math.floor(Math.random() * scheduleTypes.length)]

    const schedule: LearningRateSchedule = {
      type: selectedType,
      initialRate,
      minRate: initialRate * 0.01,
      maxRate: initialRate * 10,
      warmupSteps: Math.min(100, Math.floor(estimatedEpochs * 0.1))
    }

    if (selectedType === 'step_decay') {
      schedule.decayFactor = 0.5
      schedule.stepSize = Math.max(10, Math.floor(estimatedEpochs / 5))
    } else if (selectedType === 'cosine_annealing') {
      schedule.cycleLength = estimatedEpochs
    }

    return schedule
  }

  applySchedule(
    schedule: LearningRateSchedule,
    currentEpoch: number,
    currentStep: number
  ): number {
    let rate = schedule.initialRate

    if (currentStep < (schedule.warmupSteps || 0)) {
      const warmupProgress = currentStep / (schedule.warmupSteps || 1)
      return schedule.initialRate * warmupProgress
    }

    switch (schedule.type) {
      case 'constant':
        rate = schedule.initialRate
        break

      case 'step_decay':
        if (schedule.stepSize && schedule.decayFactor) {
          const decaySteps = Math.floor(currentEpoch / schedule.stepSize)
          rate = schedule.initialRate * Math.pow(schedule.decayFactor, decaySteps)
        }
        break

      case 'exponential':
        if (schedule.decayFactor) {
          rate = schedule.initialRate * Math.exp(-schedule.decayFactor * currentEpoch)
        }
        break

      case 'cosine_annealing':
        if (schedule.cycleLength) {
          const progress = currentEpoch % schedule.cycleLength
          const cosineValue = Math.cos((Math.PI * progress) / schedule.cycleLength)
          rate = schedule.minRate + (schedule.maxRate - schedule.minRate) * (1 + cosineValue) / 2
        }
        break

      case 'adaptive':
        rate = schedule.initialRate
        break
    }

    return Math.max(schedule.minRate, Math.min(schedule.maxRate, rate))
  }

  recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics)
    
    if (this.performanceHistory.length > 500) {
      this.performanceHistory = this.performanceHistory.slice(-500)
    }
  }

  analyzePerformanceTrends(modelId: string): {
    trend: 'improving' | 'degrading' | 'stable'
    confidence: number
    recommendation: string
  } {
    const modelMetrics = this.performanceHistory
      .filter(m => m.modelId === modelId)
      .slice(-20)

    if (modelMetrics.length < 5) {
      return {
        trend: 'stable',
        confidence: 0.5,
        recommendation: 'Insufficient data for trend analysis'
      }
    }

    const firstHalf = modelMetrics.slice(0, Math.floor(modelMetrics.length / 2))
    const secondHalf = modelMetrics.slice(Math.floor(modelMetrics.length / 2))

    const avgFirstLoss = firstHalf.reduce((sum, m) => sum + m.avgLoss, 0) / firstHalf.length
    const avgSecondLoss = secondHalf.reduce((sum, m) => sum + m.avgLoss, 0) / secondHalf.length

    const avgFirstSuccess = firstHalf.reduce((sum, m) => sum + m.successRate, 0) / firstHalf.length
    const avgSecondSuccess = secondHalf.reduce((sum, m) => sum + m.successRate, 0) / secondHalf.length

    const lossImprovement = (avgFirstLoss - avgSecondLoss) / avgFirstLoss
    const successImprovement = (avgSecondSuccess - avgFirstSuccess) / avgFirstSuccess

    let trend: 'improving' | 'degrading' | 'stable' = 'stable'
    let recommendation = ''
    let confidence = 0.7

    if (lossImprovement > 0.1 && successImprovement > 0.05) {
      trend = 'improving'
      recommendation = 'Model is improving. Consider maintaining current learning rate or slight increase.'
      confidence = 0.85
    } else if (lossImprovement < -0.05 || successImprovement < -0.05) {
      trend = 'degrading'
      recommendation = 'Model performance degrading. Reduce learning rate immediately.'
      confidence = 0.9
    } else {
      trend = 'stable'
      recommendation = 'Model performance stable. Fine-tune learning rate for optimization.'
      confidence = 0.75
    }

    return { trend, confidence, recommendation }
  }

  getOptimalRateForTask(taskType: string, modelComplexity: 'low' | 'medium' | 'high'): number {
    const taskRates: Record<string, Record<string, number>> = {
      'chat': { low: 0.01, medium: 0.001, high: 0.0001 },
      'code_generation': { low: 0.005, medium: 0.0005, high: 0.00005 },
      'summarization': { low: 0.01, medium: 0.001, high: 0.0001 },
      'classification': { low: 0.01, medium: 0.003, high: 0.0003 },
      'question_answering': { low: 0.01, medium: 0.002, high: 0.0002 },
      'creative_writing': { low: 0.01, medium: 0.002, high: 0.0002 },
      'agent_planning': { low: 0.008, medium: 0.0008, high: 0.00008 }
    }

    return taskRates[taskType]?.[modelComplexity] || 0.001
  }

  getLearningRateMetrics(
    currentRate: number,
    trainingLoss: number[],
    validationLoss: number[],
    epochs: number,
    timeElapsed: number,
    successRate: number
  ): LearningRateMetrics {
    const gradientNorm = trainingLoss.map(l => this.calculateGradientNorm([l]))
    const convergenceRate = this.calculateConvergenceRate(trainingLoss, epochs)
    const stabilityScore = this.calculateStabilityScore(trainingLoss)

    const recommendation = this.recommendLearningRate(
      currentRate,
      trainingLoss,
      validationLoss,
      epochs
    )

    return {
      currentRate,
      recommendedRate: recommendation?.newRate || currentRate,
      confidence: recommendation?.confidence || 0.5,
      trainingLoss,
      validationLoss,
      gradientNorm,
      convergenceRate,
      stabilityScore,
      epochsCompleted: epochs,
      timeElapsed,
      successRate
    }
  }

  exportData(): string {
    return JSON.stringify({
      adjustments: this.adjustmentHistory,
      performance: this.performanceHistory,
      timestamp: Date.now()
    }, null, 2)
  }

  importData(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      if (parsed.adjustments && parsed.performance) {
        this.adjustmentHistory = parsed.adjustments
        this.performanceHistory = parsed.performance
        return true
      }
      return false
    } catch {
      return false
    }
  }

  reset(): void {
    this.adjustmentHistory = []
    this.performanceHistory = []
  }
}

export const learningRateTuner = new LearningRateTuner()
