import type { OptimizationInsight } from './auto-optimizer'

export interface ConfidenceThreshold {
  severity: 'critical' | 'high' | 'medium' | 'low'
  minConfidence: number
  requiresManualApproval: boolean
  description: string
}

export interface ThresholdConfig {
  autoImplementEnabled: boolean
  thresholds: Record<OptimizationInsight['severity'], ConfidenceThreshold>
  globalMinConfidence: number
  maxAutoImplementPerSession: number
  requireConfirmation: boolean
  enableNotifications: boolean
  allowedActionTypes: OptimizationInsight['suggestedAction']['type'][]
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  autoImplementEnabled: false,
  thresholds: {
    critical: {
      severity: 'critical',
      minConfidence: 0.85,
      requiresManualApproval: false,
      description: 'Auto-apply critical issues with 85%+ confidence'
    },
    high: {
      severity: 'high',
      minConfidence: 0.75,
      requiresManualApproval: false,
      description: 'Auto-apply high priority issues with 75%+ confidence'
    },
    medium: {
      severity: 'medium',
      minConfidence: 0.80,
      requiresManualApproval: true,
      description: 'Require approval for medium priority issues'
    },
    low: {
      severity: 'low',
      minConfidence: 0.90,
      requiresManualApproval: true,
      description: 'Require approval for low priority issues'
    }
  },
  globalMinConfidence: 0.70,
  maxAutoImplementPerSession: 5,
  requireConfirmation: true,
  enableNotifications: true,
  allowedActionTypes: ['adjust_parameters', 'change_model', 'add_profile', 'reduce_usage']
}

export const CONSERVATIVE_THRESHOLDS: ThresholdConfig = {
  autoImplementEnabled: false,
  thresholds: {
    critical: {
      severity: 'critical',
      minConfidence: 0.95,
      requiresManualApproval: false,
      description: 'Only auto-apply critical issues with 95%+ confidence'
    },
    high: {
      severity: 'high',
      minConfidence: 0.90,
      requiresManualApproval: true,
      description: 'Require approval for high priority issues'
    },
    medium: {
      severity: 'medium',
      minConfidence: 0.95,
      requiresManualApproval: true,
      description: 'Require approval for medium priority issues'
    },
    low: {
      severity: 'low',
      minConfidence: 1.0,
      requiresManualApproval: true,
      description: 'Never auto-apply low priority issues'
    }
  },
  globalMinConfidence: 0.85,
  maxAutoImplementPerSession: 2,
  requireConfirmation: true,
  enableNotifications: true,
  allowedActionTypes: ['adjust_parameters']
}

export const AGGRESSIVE_THRESHOLDS: ThresholdConfig = {
  autoImplementEnabled: true,
  thresholds: {
    critical: {
      severity: 'critical',
      minConfidence: 0.70,
      requiresManualApproval: false,
      description: 'Auto-apply critical issues with 70%+ confidence'
    },
    high: {
      severity: 'high',
      minConfidence: 0.65,
      requiresManualApproval: false,
      description: 'Auto-apply high priority issues with 65%+ confidence'
    },
    medium: {
      severity: 'medium',
      minConfidence: 0.70,
      requiresManualApproval: false,
      description: 'Auto-apply medium priority issues with 70%+ confidence'
    },
    low: {
      severity: 'low',
      minConfidence: 0.80,
      requiresManualApproval: true,
      description: 'Require approval for low priority issues'
    }
  },
  globalMinConfidence: 0.60,
  maxAutoImplementPerSession: 10,
  requireConfirmation: false,
  enableNotifications: true,
  allowedActionTypes: ['adjust_parameters', 'change_model', 'add_profile', 'reduce_usage']
}

export const BALANCED_THRESHOLDS: ThresholdConfig = {
  autoImplementEnabled: true,
  thresholds: {
    critical: {
      severity: 'critical',
      minConfidence: 0.80,
      requiresManualApproval: false,
      description: 'Auto-apply critical issues with 80%+ confidence'
    },
    high: {
      severity: 'high',
      minConfidence: 0.75,
      requiresManualApproval: false,
      description: 'Auto-apply high priority issues with 75%+ confidence'
    },
    medium: {
      severity: 'medium',
      minConfidence: 0.80,
      requiresManualApproval: true,
      description: 'Require approval for medium priority issues'
    },
    low: {
      severity: 'low',
      minConfidence: 0.85,
      requiresManualApproval: true,
      description: 'Require approval for low priority issues'
    }
  },
  globalMinConfidence: 0.70,
  maxAutoImplementPerSession: 5,
  requireConfirmation: false,
  enableNotifications: true,
  allowedActionTypes: ['adjust_parameters', 'change_model', 'add_profile']
}

export class ConfidenceThresholdManager {
  private config: ThresholdConfig
  private sessionImplementCount = 0
  private implementationHistory: Array<{
    insightId: string
    timestamp: number
    confidence: number
    severity: string
    wasAutomatic: boolean
  }> = []

  constructor(initialConfig: ThresholdConfig = DEFAULT_THRESHOLDS) {
    this.config = initialConfig
  }

  setConfig(config: ThresholdConfig): void {
    this.config = config
    this.sessionImplementCount = 0
  }

  getConfig(): ThresholdConfig {
    return { ...this.config }
  }

  loadPreset(preset: 'default' | 'conservative' | 'aggressive' | 'balanced'): void {
    switch (preset) {
      case 'conservative':
        this.setConfig(CONSERVATIVE_THRESHOLDS)
        break
      case 'aggressive':
        this.setConfig(AGGRESSIVE_THRESHOLDS)
        break
      case 'balanced':
        this.setConfig(BALANCED_THRESHOLDS)
        break
      default:
        this.setConfig(DEFAULT_THRESHOLDS)
    }
  }

  shouldAutoImplement(insight: OptimizationInsight): {
    allowed: boolean
    reason: string
    requiresConfirmation: boolean
  } {
    if (!this.config.autoImplementEnabled) {
      return {
        allowed: false,
        reason: 'Auto-implementation is disabled',
        requiresConfirmation: false
      }
    }

    if (!insight.suggestedAction) {
      return {
        allowed: false,
        reason: 'No suggested action available',
        requiresConfirmation: false
      }
    }

    if (!this.config.allowedActionTypes.includes(insight.suggestedAction.type)) {
      return {
        allowed: false,
        reason: `Action type '${insight.suggestedAction.type}' is not allowed`,
        requiresConfirmation: false
      }
    }

    if (insight.confidence < this.config.globalMinConfidence) {
      return {
        allowed: false,
        reason: `Confidence ${(insight.confidence * 100).toFixed(0)}% is below global minimum ${(this.config.globalMinConfidence * 100).toFixed(0)}%`,
        requiresConfirmation: false
      }
    }

    if (this.sessionImplementCount >= this.config.maxAutoImplementPerSession) {
      return {
        allowed: false,
        reason: `Maximum ${this.config.maxAutoImplementPerSession} auto-implementations reached for this session`,
        requiresConfirmation: false
      }
    }

    const threshold = this.config.thresholds[insight.severity]
    
    if (insight.confidence < threshold.minConfidence) {
      return {
        allowed: false,
        reason: `Confidence ${(insight.confidence * 100).toFixed(0)}% is below ${insight.severity} threshold ${(threshold.minConfidence * 100).toFixed(0)}%`,
        requiresConfirmation: false
      }
    }

    if (threshold.requiresManualApproval) {
      return {
        allowed: true,
        reason: 'Manual approval required',
        requiresConfirmation: true
      }
    }

    return {
      allowed: true,
      reason: 'Meets all criteria for auto-implementation',
      requiresConfirmation: this.config.requireConfirmation
    }
  }

  recordImplementation(
    insightId: string,
    confidence: number,
    severity: string,
    wasAutomatic: boolean
  ): void {
    this.implementationHistory.push({
      insightId,
      timestamp: Date.now(),
      confidence,
      severity,
      wasAutomatic
    })

    if (wasAutomatic) {
      this.sessionImplementCount++
    }
  }

  resetSessionCount(): void {
    this.sessionImplementCount = 0
  }

  getImplementationHistory(): typeof this.implementationHistory {
    return [...this.implementationHistory]
  }

  getSessionStats(): {
    totalImplemented: number
    autoImplemented: number
    manualImplemented: number
    averageConfidence: number
  } {
    const total = this.implementationHistory.length
    const auto = this.implementationHistory.filter(h => h.wasAutomatic).length
    const manual = total - auto
    const avgConfidence = total > 0
      ? this.implementationHistory.reduce((sum, h) => sum + h.confidence, 0) / total
      : 0

    return {
      totalImplemented: total,
      autoImplemented: auto,
      manualImplemented: manual,
      averageConfidence: avgConfidence
    }
  }

  updateThreshold(
    severity: OptimizationInsight['severity'],
    minConfidence: number,
    requiresManualApproval?: boolean
  ): void {
    this.config.thresholds[severity] = {
      ...this.config.thresholds[severity],
      minConfidence: Math.max(0, Math.min(1, minConfidence)),
      ...(requiresManualApproval !== undefined && { requiresManualApproval })
    }
  }

  getRecommendedThresholds(history: typeof this.implementationHistory): ThresholdConfig {
    const autoImplemented = history.filter(h => h.wasAutomatic)
    
    if (autoImplemented.length === 0) {
      return CONSERVATIVE_THRESHOLDS
    }

    const avgConfidence = autoImplemented.reduce((sum, h) => sum + h.confidence, 0) / autoImplemented.length
    const hasHighConfidence = avgConfidence > 0.85
    const hasModerateConfidence = avgConfidence > 0.70

    if (hasHighConfidence) {
      return BALANCED_THRESHOLDS
    } else if (hasModerateConfidence) {
      return DEFAULT_THRESHOLDS
    } else {
      return CONSERVATIVE_THRESHOLDS
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2)
  }

  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as ThresholdConfig
      
      if (!this.validateConfig(config)) {
        return false
      }

      this.setConfig(config)
      return true
    } catch {
      return false
    }
  }

  private validateConfig(config: any): config is ThresholdConfig {
    return (
      typeof config === 'object' &&
      typeof config.autoImplementEnabled === 'boolean' &&
      typeof config.globalMinConfidence === 'number' &&
      typeof config.maxAutoImplementPerSession === 'number' &&
      config.thresholds &&
      typeof config.thresholds.critical === 'object' &&
      typeof config.thresholds.high === 'object' &&
      typeof config.thresholds.medium === 'object' &&
      typeof config.thresholds.low === 'object'
    )
  }
}

export const thresholdManager = new ConfidenceThresholdManager(DEFAULT_THRESHOLDS)
