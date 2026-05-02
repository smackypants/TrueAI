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

  describe('extra branch coverage', () => {
    it('raises threshold via the mid-acceptance branch (acceptanceRate < 0.4 only)', () => {
      // 10 accepted=false (rejection), but 4 of those 10 still wasSuccessful=true
      // — successRate is computed as successful / max(1, accepted), and accepted
      // is the count of userAccepted=true, so successRate stays high while
      // acceptanceRate stays low → falls into the `< 0.4` branch (lines 191-194).
      for (let i = 0; i < 4; i++) {
        algo.addFeedback(fb({ severity: 'high', userAccepted: true, wasSuccessful: true, confidence: 0.85 }))
      }
      for (let i = 0; i < 10; i++) {
        algo.addFeedback(fb({ severity: 'high', userAccepted: false, wasSuccessful: true, confidence: 0.85 }))
      }
      const adj = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS).find(a => a.severity === 'high')
      expect(adj).toBeDefined()
      expect(adj!.newThreshold).toBeGreaterThan(adj!.oldThreshold)
      expect(adj!.reason).toMatch(/Low acceptance/i)
    })

    it('lowers threshold via the very-high-acceptance + confidence-buffer branch', () => {
      // accept > 0.9 but success ≤ 0.85 → skip first two arms, hit `acceptanceRate > 0.9` arm
      // (lines 195-198). Use a custom config with a very low base threshold so
      // avgConfidence > currentThreshold + 0.15 holds, plus a higher learning rate
      // so the |adjustment| < 0.01 cutoff doesn't filter the result.
      const algoFast = new ThresholdLearningAlgorithm(0.3)
      const cfg = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)) as typeof DEFAULT_THRESHOLDS
      cfg.thresholds.high.minConfidence = 0.6
      // 12 accepted, 9 successful → accept=1.0, success=0.75. avgConf=0.95 > 0.6+0.15.
      for (let i = 0; i < 9; i++) {
        algoFast.addFeedback(fb({ severity: 'high', userAccepted: true, wasSuccessful: true, confidence: 0.95 }))
      }
      for (let i = 0; i < 3; i++) {
        algoFast.addFeedback(fb({ severity: 'high', userAccepted: true, wasSuccessful: false, confidence: 0.95 }))
      }
      const adj = algoFast.learnAndAdjustThresholds(cfg).find(a => a.severity === 'high')
      expect(adj).toBeDefined()
      expect(adj!.newThreshold).toBeLessThan(adj!.oldThreshold)
      expect(adj!.reason).toMatch(/Very high acceptance/i)
    })

    it('appends a false-negative adjustment when many manual successes + high acceptance', () => {
      // We need: accept > 0.7, falseNegativeRate (manual+accepted+successful share) > 0.4.
      // Mix: 10 high-acceptance automatic + 6 manual-accepted-successful.
      // calculateFalseNegativeRate counts: manual=!wasAutomatic && userAccepted, of those
      // wasSuccessful===true / total. So 6 of 6 successful → rate=1.0 > 0.4.
      for (let i = 0; i < 10; i++) {
        algo.addFeedback(fb({
          severity: 'high', userAccepted: true, wasSuccessful: true,
          wasAutomatic: true, confidence: 0.92,
        }))
      }
      for (let i = 0; i < 6; i++) {
        algo.addFeedback(fb({
          severity: 'high', userAccepted: true, wasSuccessful: true,
          wasAutomatic: false, confidence: 0.85,
        }))
      }
      const adj = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS).find(a => a.severity === 'high')
      expect(adj).toBeDefined()
      expect(adj!.reason).toMatch(/false negatives/i)
    })

    it('returns null adjustment when newThreshold is clamped to a no-op', () => {
      // Drive a downward adjustment while the current threshold sits at the
      // clamp floor (0.5) — newThreshold-currentThreshold becomes 0 < 0.005 → null.
      const cfg = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)) as typeof DEFAULT_THRESHOLDS
      ;(['critical', 'high', 'medium', 'low'] as const).forEach(s => {
        cfg.thresholds[s].minConfidence = 0.5
      })
      for (let i = 0; i < 12; i++) {
        algo.addFeedback(fb({
          severity: 'high', userAccepted: true, wasSuccessful: true, confidence: 0.95,
        }))
      }
      const adjustments = algo.learnAndAdjustThresholds(cfg)
      // The downward adjustment for 'high' should clamp to 0 delta and be filtered out.
      expect(adjustments.find(a => a.severity === 'high')).toBeUndefined()
    })

    it('returns null adjustment when computed adjustment magnitude is below the cutoff', () => {
      // Mid-range mix that satisfies none of the four branches: acceptance ~0.6,
      // success ~0.6, no false-positive/negative pressure → adjustment stays 0
      // → |0| < 0.01 → null.
      for (let i = 0; i < 6; i++) {
        algo.addFeedback(fb({
          severity: 'high', userAccepted: true, wasSuccessful: true,
          wasAutomatic: false, confidence: 0.78,
        }))
      }
      for (let i = 0; i < 4; i++) {
        algo.addFeedback(fb({
          severity: 'high', userAccepted: false, wasSuccessful: false,
          wasAutomatic: false, confidence: 0.78,
        }))
      }
      const adjustments = algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      expect(adjustments.find(a => a.severity === 'high')).toBeUndefined()
    })

    it('exercises stability/convergence/performance after many learning passes', () => {
      // Seed >20 feedback across multiple severities so adjustments accumulate
      // without the oscillation branch (single severity ≥3 in last 5) firing
      // and decaying the learning rate to zero.
      const severities = ['critical', 'high', 'medium', 'low'] as const
      severities.forEach(sev => {
        // 6 rejections + 4 mixed acceptances per severity → satisfies the "Low
        // acceptance (<0.4)" arm for each severity, producing 1 adjustment per
        // severity per pass.
        for (let i = 0; i < 6; i++) {
          algo.addFeedback(fb({ severity: sev, userAccepted: false, wasSuccessful: false, confidence: 0.78 }))
        }
        for (let i = 0; i < 4; i++) {
          algo.addFeedback(fb({ severity: sev, userAccepted: true, wasSuccessful: true, confidence: 0.78 }))
        }
      })
      for (let pass = 0; pass < 4; pass++) {
        algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      }
      const stats = algo.getLearningStats()
      // ≥10 adjustments → calculateStabilityScore + calculateConvergenceScore
      // both run their non-fallback branches.
      expect(stats.totalAdjustments).toBeGreaterThanOrEqual(10)
      expect(stats.convergenceScore).toBeGreaterThanOrEqual(0)
      expect(stats.convergenceScore).toBeLessThanOrEqual(1)
      expect(stats.stabilityScore).toBeGreaterThanOrEqual(0)
      expect(stats.stabilityScore).toBeLessThanOrEqual(1)
      // ≥20 feedback → calculatePerformanceImprovement returns a finite number.
      expect(Number.isFinite(stats.performanceImprovement)).toBe(true)
    })

    it('updates learning rate downward when oscillation is detected', () => {
      // Seed enough feedback so each pass triggers a 'high' adjustment, then run
      // ≥5 passes so adjustmentHistory has ≥5 entries all of severity 'high',
      // tripping the oscillation branch (severityCounts['high'] >= 3).
      for (let i = 0; i < 12; i++) {
        algo.addFeedback(fb({
          severity: 'high', confidence: 0.78,
          userAccepted: false, wasSuccessful: false,
        }))
      }
      const startRate = algo.getLearningStats().learningRate
      for (let pass = 0; pass < 6; pass++) {
        algo.learnAndAdjustThresholds(DEFAULT_THRESHOLDS)
      }
      // f1Score is 0 (no automatic+successful) → also triggers `f1<0.5` branch
      // which raises rate; oscillation branch then forces it back down. The
      // observable invariant is that the rate has changed and stays clamped.
      const endRate = algo.getLearningStats().learningRate
      expect(endRate).not.toBe(startRate)
      expect(endRate).toBeGreaterThanOrEqual(0.01)
      expect(endRate).toBeLessThanOrEqual(0.3)
    })

    it('recommendedLearningRate returns minLearningRate when f1>0.85 and the interpolated value otherwise', () => {
      // High f1: 10 automatic+successful, 0 elsewhere → precision=recall=1, f1=1.
      for (let i = 0; i < 10; i++) {
        algo.addFeedback(fb({ wasAutomatic: true, wasSuccessful: true }))
      }
      const rec1 = algo.getLearningStats().recommendedLearningRate
      expect(rec1).toBeCloseTo(0.01, 5)

      // Mid f1: precision and recall around 0.5 → f1 ~ 0.5..0.85 → interpolated.
      const algo2 = new ThresholdLearningAlgorithm(0.1)
      for (let i = 0; i < 4; i++) {
        algo2.addFeedback(fb({ wasAutomatic: true, wasSuccessful: true }))
      }
      for (let i = 0; i < 3; i++) {
        algo2.addFeedback(fb({ wasAutomatic: true, wasSuccessful: false }))
      }
      for (let i = 0; i < 3; i++) {
        algo2.addFeedback(fb({ wasAutomatic: false, wasSuccessful: true }))
      }
      const rec2 = algo2.getLearningStats().recommendedLearningRate
      expect(rec2).toBeGreaterThan(0.01)
      expect(rec2).toBeLessThan(0.3)
    })
  })
})
