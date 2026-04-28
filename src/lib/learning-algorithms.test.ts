import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ThresholdLearningAlgorithm, type UserFeedback } from './learning-algorithms'
import { DEFAULT_THRESHOLDS } from './confidence-thresholds'

const fb = (overrides: Partial<UserFeedback> = {}): UserFeedback => ({
  id: `fb-${Math.random()}`,
  insightId: 'i1',
  actionType: 'adjust_parameters',
  severity: 'high',
  confidence: 0.8,
  userAccepted: true,
  wasAutomatic: true,
  wasSuccessful: true,
  timestamp: Date.now(),
  ...overrides,
})

describe('ThresholdLearningAlgorithm', () => {
  let algo: ThresholdLearningAlgorithm

  beforeEach(() => {
    algo = new ThresholdLearningAlgorithm(0.1)
    // Pin Math.random so exploration noise in adjustments is deterministic.
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('calculateMetrics', () => {
    it('returns empty metrics shape when no feedback recorded', () => {
      const m = algo.calculateMetrics()
      expect(m.totalFeedback).toBe(0)
      expect(m.acceptanceRate).toBe(0)
      expect(m.successRate).toBe(0)
      expect(m.avgConfidence).toBe(0)
      expect(m.bySeverity.critical.total).toBe(0)
      expect(m.byActionType.change_model.total).toBe(0)
      expect(m.thresholdAccuracy.precision).toBe(0)
    })

    it('aggregates acceptance/success/avg confidence and per-severity breakdown', () => {
      algo.addFeedback(fb({ severity: 'high', confidence: 0.9, userAccepted: true, wasSuccessful: true }))
      algo.addFeedback(fb({ severity: 'high', confidence: 0.8, userAccepted: true, wasSuccessful: false }))
      algo.addFeedback(fb({ severity: 'low', confidence: 0.6, userAccepted: false, wasSuccessful: false }))
      const m = algo.calculateMetrics()
      expect(m.totalFeedback).toBe(3)
      expect(m.acceptanceRate).toBeCloseTo((2 / 3) * 100, 5)
      // successful (1) / accepted (2) * 100 = 50
      expect(m.successRate).toBe(50)
      expect(m.avgConfidence).toBeCloseTo((0.9 + 0.8 + 0.6) / 3, 5)
      expect(m.bySeverity.high.total).toBe(2)
      expect(m.bySeverity.high.accepted).toBe(2)
      expect(m.bySeverity.high.successful).toBe(1)
      expect(m.bySeverity.low.total).toBe(1)
    })

    it('computes precision/recall/f1 from automatic vs successful feedback', () => {
      // 2 TP, 1 FP, 1 FN, 1 TN
      algo.addFeedback(fb({ wasAutomatic: true, wasSuccessful: true }))
      algo.addFeedback(fb({ wasAutomatic: true, wasSuccessful: true }))
      algo.addFeedback(fb({ wasAutomatic: true, wasSuccessful: false }))
      algo.addFeedback(fb({ wasAutomatic: false, wasSuccessful: true }))
      algo.addFeedback(fb({ wasAutomatic: false, wasSuccessful: false }))
      const acc = algo.calculateMetrics().thresholdAccuracy
      expect(acc.truePositives).toBe(2)
      expect(acc.falsePositives).toBe(1)
      expect(acc.falseNegatives).toBe(1)
      expect(acc.trueNegatives).toBe(1)
      expect(acc.precision).toBeCloseTo(2 / 3, 5)
      expect(acc.recall).toBeCloseTo(2 / 3, 5)
      expect(acc.f1Score).toBeCloseTo(2 / 3, 5)
    })
  })

  describe('learnAndAdjustThresholds', () => {
    it('returns no adjustments below the minimum sample threshold', () => {
      for (let i = 0; i < 5; i++) algo.addFeedback(fb())
      const adj = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      expect(adj).toEqual([])
    })

    it('raises threshold when acceptance and success rates are very low', () => {
      // 12 highs, mostly rejected and unsuccessful → expect upward adjustment
      for (let i = 0; i < 12; i++) {
        algo.addFeedback(fb({
          severity: 'high',
          confidence: 0.78,
          userAccepted: false,
          wasSuccessful: false,
        }))
      }
      const adjustments = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      const high = adjustments.find(a => a.severity === 'high')
      expect(high).toBeDefined()
      expect(high!.newThreshold).toBeGreaterThan(high!.oldThreshold)
      expect(high!.confidence).toBeGreaterThan(0)
      expect(high!.reason).toMatch(/threshold/i)
    })

    it('lowers threshold when acceptance and success rates are very high', () => {
      for (let i = 0; i < 12; i++) {
        algo.addFeedback(fb({
          severity: 'high',
          confidence: 0.95,
          userAccepted: true,
          wasSuccessful: true,
        }))
      }
      const adjustments = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      const high = adjustments.find(a => a.severity === 'high')
      expect(high).toBeDefined()
      expect(high!.newThreshold).toBeLessThan(high!.oldThreshold)
    })

    it('keeps thresholds in [0.5, 0.99]', () => {
      // Force big upward push by using extreme negative signal
      for (let i = 0; i < 50; i++) {
        algo.addFeedback(fb({
          severity: 'high',
          confidence: 0.5,
          userAccepted: false,
          wasSuccessful: false,
          wasAutomatic: true,
        }))
      }
      const adjustments = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      adjustments.forEach(a => {
        expect(a.newThreshold).toBeGreaterThanOrEqual(0.5)
        expect(a.newThreshold).toBeLessThanOrEqual(0.99)
      })
    })
  })

  describe('getOptimalThresholds', () => {
    it('returns the original config unchanged when there is insufficient data', () => {
      const out = algo.getOptimalThresholds(DEFAULT_THRESHOLDS)
      expect(out.thresholds.high.minConfidence).toBe(DEFAULT_THRESHOLDS.thresholds.high.minConfidence)
    })

    it('applies adjustments returned by learnAndAdjustThresholds', () => {
      // Use a deep clone so we can compare against the pre-call value.
      const config = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)) as typeof DEFAULT_THRESHOLDS
      const original = config.thresholds.high.minConfidence
      for (let i = 0; i < 12; i++) {
        algo.addFeedback(fb({
          severity: 'high', confidence: 0.78, userAccepted: false, wasSuccessful: false,
        }))
      }
      const out = algo.getOptimalThresholds(config)
      expect(out.thresholds.high.minConfidence).not.toBe(original)
    })
  })

  describe('export/import/reset', () => {
    it('round-trips feedback history through JSON', () => {
      algo.addFeedback(fb({ id: 'one' }))
      algo.addFeedback(fb({ id: 'two' }))
      const json = algo.exportFeedbackHistory()
      const fresh = new ThresholdLearningAlgorithm(0.2)
      const ok = fresh.importFeedbackHistory(json)
      expect(ok).toBe(true)
      expect(fresh.calculateMetrics().totalFeedback).toBe(2)
    })

    it('importFeedbackHistory rejects malformed input', () => {
      expect(algo.importFeedbackHistory('not json')).toBe(false)
      expect(algo.importFeedbackHistory(JSON.stringify({}))).toBe(false)
      expect(algo.importFeedbackHistory(JSON.stringify({ feedback: 'oops' }))).toBe(false)
    })

    it('reset clears feedback and adjustment history', () => {
      algo.addFeedback(fb())
      algo.reset()
      expect(algo.calculateMetrics().totalFeedback).toBe(0)
      expect(algo.getLearningStats().totalAdjustments).toBe(0)
    })

    it('caps in-memory feedback history at 1000 entries', () => {
      for (let i = 0; i < 1100; i++) algo.addFeedback(fb({ id: `f${i}` }))
      expect(algo.calculateMetrics().totalFeedback).toBe(1000)
    })
  })

  describe('getLearningStats', () => {
    it('returns sane defaults with no history', () => {
      const s = algo.getLearningStats()
      expect(s.totalAdjustments).toBe(0)
      expect(s.learningRate).toBeGreaterThan(0)
      expect(s.convergenceScore).toBe(0)
      // stabilityScore default before 10 adjustments
      expect(s.stabilityScore).toBe(0.5)
      expect(s.recommendedLearningRate).toBeGreaterThan(0)
    })

    it('records adjustments after learning runs', () => {
      for (let i = 0; i < 12; i++) {
        algo.addFeedback(fb({ severity: 'high', confidence: 0.78, userAccepted: false, wasSuccessful: false }))
      }
      algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      expect(algo.getLearningStats().totalAdjustments).toBeGreaterThan(0)
    })
  })
})
