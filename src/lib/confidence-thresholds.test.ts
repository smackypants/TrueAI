import { describe, it, expect, beforeEach } from 'vitest'
import {
  ConfidenceThresholdManager,
  DEFAULT_THRESHOLDS,
  CONSERVATIVE_THRESHOLDS,
  AGGRESSIVE_THRESHOLDS,
  BALANCED_THRESHOLDS,
} from './confidence-thresholds'
import type { OptimizationInsight } from './auto-optimizer'

function makeInsight(overrides: Partial<OptimizationInsight> = {}): OptimizationInsight {
  return {
    id: 'i-1',
    type: 'performance',
    severity: 'high',
    title: 'Slow responses',
    description: 'desc',
    recommendation: 'rec',
    impact: 'medium',
    confidence: 0.9,
    affectedModels: ['gpt-x'],
    suggestedAction: { type: 'adjust_parameters', details: { temperature: 0.5 } },
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('ConfidenceThresholdManager', () => {
  let mgr: ConfidenceThresholdManager

  beforeEach(() => {
    mgr = new ConfidenceThresholdManager(AGGRESSIVE_THRESHOLDS)
  })

  describe('config management', () => {
    it('uses DEFAULT_THRESHOLDS when no initial config is supplied', () => {
      const m = new ConfidenceThresholdManager()
      expect(m.getConfig()).toEqual(DEFAULT_THRESHOLDS)
    })

    it('returns a copy of the config (not the internal reference)', () => {
      const cfg = mgr.getConfig()
      cfg.autoImplementEnabled = !cfg.autoImplementEnabled
      expect(mgr.getConfig().autoImplementEnabled).toBe(AGGRESSIVE_THRESHOLDS.autoImplementEnabled)
    })

    it('setConfig replaces the config and resets the session counter', () => {
      // Drive the counter up first.
      mgr.recordImplementation('a', 0.9, 'high', true)
      expect(mgr.getSessionStats().autoImplemented).toBe(1)
      mgr.setConfig(BALANCED_THRESHOLDS)
      // Counter is reset, but history is preserved.
      const allowedAfter = mgr.shouldAutoImplement(makeInsight({ confidence: 0.9 }))
      expect(allowedAfter.allowed).toBe(true)
    })

    it('loadPreset switches to each named preset', () => {
      mgr.loadPreset('conservative')
      expect(mgr.getConfig()).toEqual(CONSERVATIVE_THRESHOLDS)
      mgr.loadPreset('aggressive')
      expect(mgr.getConfig()).toEqual(AGGRESSIVE_THRESHOLDS)
      mgr.loadPreset('balanced')
      expect(mgr.getConfig()).toEqual(BALANCED_THRESHOLDS)
      mgr.loadPreset('default')
      expect(mgr.getConfig()).toEqual(DEFAULT_THRESHOLDS)
    })
  })

  describe('shouldAutoImplement', () => {
    it('rejects when autoImplementEnabled is false', () => {
      mgr.setConfig({ ...AGGRESSIVE_THRESHOLDS, autoImplementEnabled: false })
      const r = mgr.shouldAutoImplement(makeInsight())
      expect(r.allowed).toBe(false)
      expect(r.reason).toMatch(/disabled/i)
    })

    it('rejects when there is no suggested action', () => {
      const r = mgr.shouldAutoImplement(makeInsight({ suggestedAction: undefined }))
      expect(r.allowed).toBe(false)
      expect(r.reason).toMatch(/no suggested action/i)
    })

    it('rejects when the action type is not in allowedActionTypes', () => {
      mgr.setConfig({ ...AGGRESSIVE_THRESHOLDS, allowedActionTypes: ['change_model'] })
      const r = mgr.shouldAutoImplement(makeInsight())
      expect(r.allowed).toBe(false)
      expect(r.reason).toMatch(/not allowed/i)
    })

    it('rejects when confidence is below the global minimum', () => {
      const r = mgr.shouldAutoImplement(makeInsight({ confidence: 0.1 }))
      expect(r.allowed).toBe(false)
      expect(r.reason).toMatch(/global minimum/i)
    })

    it('rejects when the per-severity threshold is not met', () => {
      // AGGRESSIVE high threshold = 0.65; pick a confidence above the global
      // minimum (0.6) but under the high threshold.
      const r = mgr.shouldAutoImplement(makeInsight({ severity: 'high', confidence: 0.62 }))
      expect(r.allowed).toBe(false)
      expect(r.reason).toMatch(/high threshold/i)
    })

    it('rejects when the per-session implementation cap is reached', () => {
      mgr.setConfig({ ...AGGRESSIVE_THRESHOLDS, maxAutoImplementPerSession: 1 })
      mgr.recordImplementation('a', 0.9, 'high', true)
      const r = mgr.shouldAutoImplement(makeInsight())
      expect(r.allowed).toBe(false)
      expect(r.reason).toMatch(/maximum/i)
    })

    it('allows but flags requiresConfirmation when severity requires manual approval', () => {
      // AGGRESSIVE 'low' severity requires manual approval.
      const r = mgr.shouldAutoImplement(makeInsight({ severity: 'low', confidence: 0.95 }))
      expect(r.allowed).toBe(true)
      expect(r.requiresConfirmation).toBe(true)
      expect(r.reason).toMatch(/manual approval/i)
    })

    it('allows without requiring confirmation when criteria are met and config does not require it', () => {
      const r = mgr.shouldAutoImplement(makeInsight({ severity: 'critical', confidence: 0.95 }))
      expect(r.allowed).toBe(true)
      expect(r.requiresConfirmation).toBe(false)
      expect(r.reason).toMatch(/meets all criteria/i)
    })
  })

  describe('history & stats', () => {
    it('records implementations and only counts automatic ones toward the cap', () => {
      mgr.recordImplementation('a', 0.9, 'high', true)
      mgr.recordImplementation('b', 0.85, 'medium', false)
      const stats = mgr.getSessionStats()
      expect(stats.totalImplemented).toBe(2)
      expect(stats.autoImplemented).toBe(1)
      expect(stats.manualImplemented).toBe(1)
      expect(stats.averageConfidence).toBeCloseTo((0.9 + 0.85) / 2, 5)
    })

    it('returns 0 average confidence with no history', () => {
      expect(mgr.getSessionStats().averageConfidence).toBe(0)
    })

    it('getImplementationHistory returns a copy of the history', () => {
      mgr.recordImplementation('a', 0.9, 'high', true)
      const h = mgr.getImplementationHistory()
      h.pop()
      expect(mgr.getImplementationHistory()).toHaveLength(1)
    })

    it('resetSessionCount allows further auto-implementations after the cap is reached', () => {
      mgr.setConfig({ ...AGGRESSIVE_THRESHOLDS, maxAutoImplementPerSession: 1 })
      mgr.recordImplementation('a', 0.9, 'high', true)
      expect(mgr.shouldAutoImplement(makeInsight()).allowed).toBe(false)
      mgr.resetSessionCount()
      expect(mgr.shouldAutoImplement(makeInsight()).allowed).toBe(true)
    })
  })

  describe('updateThreshold', () => {
    it('updates minConfidence and clamps it into [0, 1]', () => {
      mgr.updateThreshold('high', 1.5)
      expect(mgr.getConfig().thresholds.high.minConfidence).toBe(1)
      mgr.updateThreshold('high', -0.5)
      expect(mgr.getConfig().thresholds.high.minConfidence).toBe(0)
    })

    it('updates requiresManualApproval when supplied', () => {
      mgr.updateThreshold('critical', 0.9, true)
      expect(mgr.getConfig().thresholds.critical.requiresManualApproval).toBe(true)
    })

    it('preserves requiresManualApproval when not supplied', () => {
      const before = mgr.getConfig().thresholds.medium.requiresManualApproval
      mgr.updateThreshold('medium', 0.9)
      expect(mgr.getConfig().thresholds.medium.requiresManualApproval).toBe(before)
    })
  })

  describe('getRecommendedThresholds', () => {
    it('returns CONSERVATIVE when there are no automatic implementations', () => {
      expect(mgr.getRecommendedThresholds([])).toEqual(CONSERVATIVE_THRESHOLDS)
    })

    it('returns BALANCED when avg auto-implementation confidence is high (>0.85)', () => {
      const history = [
        { insightId: 'a', timestamp: 1, confidence: 0.95, severity: 'high', wasAutomatic: true },
        { insightId: 'b', timestamp: 2, confidence: 0.9, severity: 'high', wasAutomatic: true },
      ]
      expect(mgr.getRecommendedThresholds(history)).toEqual(BALANCED_THRESHOLDS)
    })

    it('returns DEFAULT when avg confidence is moderate (0.7-0.85]', () => {
      const history = [
        { insightId: 'a', timestamp: 1, confidence: 0.8, severity: 'high', wasAutomatic: true },
        { insightId: 'b', timestamp: 2, confidence: 0.75, severity: 'high', wasAutomatic: true },
      ]
      expect(mgr.getRecommendedThresholds(history)).toEqual(DEFAULT_THRESHOLDS)
    })

    it('returns CONSERVATIVE when avg confidence is low (<=0.7)', () => {
      const history = [
        { insightId: 'a', timestamp: 1, confidence: 0.5, severity: 'high', wasAutomatic: true },
      ]
      expect(mgr.getRecommendedThresholds(history)).toEqual(CONSERVATIVE_THRESHOLDS)
    })
  })

  describe('export / import', () => {
    it('exportConfig produces valid JSON of the current config', () => {
      mgr.setConfig(BALANCED_THRESHOLDS)
      const json = mgr.exportConfig()
      expect(JSON.parse(json)).toEqual(BALANCED_THRESHOLDS)
    })

    it('importConfig accepts a valid serialised config', () => {
      const json = JSON.stringify(CONSERVATIVE_THRESHOLDS)
      expect(mgr.importConfig(json)).toBe(true)
      expect(mgr.getConfig()).toEqual(CONSERVATIVE_THRESHOLDS)
    })

    it('importConfig rejects malformed JSON', () => {
      expect(mgr.importConfig('not-json{')).toBe(false)
    })

    it('importConfig rejects JSON missing required fields', () => {
      expect(mgr.importConfig(JSON.stringify({ autoImplementEnabled: true }))).toBe(false)
    })

    it('importConfig rejects JSON missing per-severity thresholds', () => {
      const partial = {
        autoImplementEnabled: true,
        globalMinConfidence: 0.5,
        maxAutoImplementPerSession: 5,
        thresholds: { critical: {}, high: {}, medium: {} }, // missing 'low'
      }
      expect(mgr.importConfig(JSON.stringify(partial))).toBe(false)
    })
  })
})
