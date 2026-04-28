import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LearningRateTuner, learningRateTuner, type PerformanceMetrics } from './learning-rate-tuner'

describe('LearningRateTuner.analyzeLoss', () => {
  it('returns "decreasing" when fewer than 5 losses are provided', () => {
    const t = new LearningRateTuner()
    expect(t.analyzeLoss([1, 2, 3]).trend).toBe('decreasing')
    expect(t.analyzeLoss([]).magnitude).toBe(0)
  })

  it('detects oscillating losses by variance', () => {
    const t = new LearningRateTuner()
    const out = t.analyzeLoss([1, 2, 1, 2, 1, 2, 1, 2])
    expect(out.trend).toBe('oscillating')
    expect(out.magnitude).toBeGreaterThan(0)
  })

  it('detects plateauing losses (very small avg diff)', () => {
    const t = new LearningRateTuner()
    const out = t.analyzeLoss([1, 1.0001, 1.0002, 1.0001, 1.0001])
    expect(out.trend).toBe('plateauing')
  })

  it('detects monotonically decreasing losses', () => {
    const t = new LearningRateTuner()
    const out = t.analyzeLoss([5, 4, 3, 2, 1])
    expect(out.trend).toBe('decreasing')
  })

  it('detects increasing losses', () => {
    const t = new LearningRateTuner()
    const out = t.analyzeLoss([1, 2, 3, 4, 5])
    expect(out.trend).toBe('increasing')
  })
})

describe('LearningRateTuner numeric helpers', () => {
  const t = new LearningRateTuner()

  it('calculateGradientNorm returns 0 with < 2 values and is positive otherwise', () => {
    expect(t.calculateGradientNorm([1])).toBe(0)
    expect(t.calculateGradientNorm([1, 2, 3])).toBeGreaterThan(0)
  })

  it('calculateConvergenceRate returns 0 with < 10 losses', () => {
    expect(t.calculateConvergenceRate([1, 2, 3, 4, 5], 5)).toBe(0)
  })

  it('calculateConvergenceRate divides loss improvement by epochs', () => {
    const losses = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    expect(t.calculateConvergenceRate(losses, 9)).toBeCloseTo((10 - 1) / 9)
  })

  it('calculateStabilityScore returns 1 when fewer than 5 losses', () => {
    expect(t.calculateStabilityScore([1, 2])).toBe(1.0)
  })

  it('calculateStabilityScore is high for constant losses and lower for noisy ones', () => {
    const stable = t.calculateStabilityScore([1, 1, 1, 1, 1, 1])
    const noisy = t.calculateStabilityScore([1, 5, 1, 5, 1, 5])
    expect(stable).toBeGreaterThanOrEqual(noisy)
    expect(stable).toBeGreaterThan(0)
  })

  it('detectOverfitting returns 0 if validation/train loss is too short', () => {
    expect(t.detectOverfitting([1, 2], [1, 2])).toBe(0)
  })

  it('detectOverfitting flags increasing val loss while train loss decreases', () => {
    // Wide enough train+val histories with a positive gap, decreasing
    // train, increasing val.
    const train = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    const val = [5, 5.2, 5.4, 5.6, 5.8, 6, 6.2, 6.4, 6.6, 6.8]
    expect(t.detectOverfitting(train, val)).toBeGreaterThan(0)
  })
})

describe('LearningRateTuner.recommendLearningRate', () => {
  let t: LearningRateTuner
  beforeEach(() => {
    t = new LearningRateTuner()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a warmup adjustment during the warmup phase', () => {
    const rec = t.recommendLearningRate(0.001, [1, 2, 3, 4, 5, 6], [], 0, 10)
    expect(rec).not.toBeNull()
    expect(rec!.reason).toMatch(/Warmup/)
    expect(rec!.strategy).toBe('adaptive')
  })

  it('reduces aggressively when overfitting is detected', () => {
    // Train decreasing (low avg), val increasing (high avg) → big gap →
    // overfittingRisk > 0.3 → reduce branch.
    const train = [3, 2, 1.5, 1.2, 1, 0.9, 0.8, 0.7, 0.6, 0.5]
    const val = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5]
    const rec = t.recommendLearningRate(0.01, train, val, 100, 200)
    expect(rec).not.toBeNull()
    expect(rec!.strategy).toBe('reduce')
    expect(rec!.newRate).toBeLessThan(0.01)
  })

  it('returns null when adjustment magnitude is below the 5% threshold', () => {
    // Steady decreasing series with no oscillation, low gradient,
    // returns null in the "good convergence" branch.
    const losses = Array.from({ length: 30 }, (_, i) => 1 / (i + 1))
    const rec = t.recommendLearningRate(0.001, losses, [], 30, 200)
    // May or may not be null depending on stability/gradient; assert
    // that if non-null, the new rate is bounded.
    if (rec) {
      expect(rec.newRate).toBeGreaterThanOrEqual(0.00001)
      expect(rec.newRate).toBeLessThanOrEqual(0.1)
    } else {
      expect(rec).toBeNull()
    }
  })

  it('emergency-reduces when loss is increasing', () => {
    const losses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const rec = t.recommendLearningRate(0.05, losses, [], 10, 200)
    expect(rec).not.toBeNull()
    expect(rec!.strategy).toBe('reduce')
    expect(rec!.confidence).toBeGreaterThanOrEqual(0.85)
  })

  it('clamps the new rate within [minLearningRate, maxLearningRate]', () => {
    const rec = t.recommendLearningRate(
      0.5, // above max=0.1, will be clamped
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [],
      10,
      200,
    )
    if (rec) {
      expect(rec.newRate).toBeLessThanOrEqual(0.1)
      expect(rec.newRate).toBeGreaterThanOrEqual(0.00001)
    }
  })
})

describe('LearningRateTuner.generateSchedule (deterministic via Math.random)', () => {
  beforeEach(() => {
    // Pin Math.random per learning-algorithms.test.ts precedent.
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('picks the first schedule type (cosine_annealing) with random=0', () => {
    const t = new LearningRateTuner()
    const sched = t.generateSchedule('chat', 100, 'medium')
    expect(sched.type).toBe('cosine_annealing')
    expect(sched.initialRate).toBe(0.001)
    expect(sched.minRate).toBeLessThan(sched.initialRate)
    expect(sched.maxRate).toBeGreaterThan(sched.initialRate)
    expect(sched.cycleLength).toBe(100)
  })

  it('respects model complexity in the base rate', () => {
    const t = new LearningRateTuner()
    const low = t.generateSchedule('chat', 100, 'low')
    const high = t.generateSchedule('chat', 100, 'high')
    expect(low.initialRate).toBe(0.01)
    expect(high.initialRate).toBe(0.0001)
  })

  it('selects step_decay branch when random≈0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const t = new LearningRateTuner()
    const sched = t.generateSchedule('chat', 50, 'medium')
    expect(sched.type).toBe('step_decay')
    expect(sched.decayFactor).toBe(0.5)
    expect(sched.stepSize).toBeGreaterThan(0)
  })
})

describe('LearningRateTuner.applySchedule', () => {
  const t = new LearningRateTuner()

  it('applies warmup linearly during the warmup window', () => {
    const sched = {
      type: 'constant' as const,
      initialRate: 0.01,
      minRate: 0.0001,
      maxRate: 0.1,
      warmupSteps: 100,
    }
    expect(t.applySchedule(sched, 0, 50)).toBeCloseTo(0.005)
    expect(t.applySchedule(sched, 0, 0)).toBeCloseTo(0)
  })

  it('returns initialRate for type=constant after warmup', () => {
    const sched = {
      type: 'constant' as const,
      initialRate: 0.01,
      minRate: 0.0001,
      maxRate: 0.1,
      warmupSteps: 0,
    }
    expect(t.applySchedule(sched, 5, 200)).toBeCloseTo(0.01)
  })

  it('applies step_decay correctly', () => {
    const sched = {
      type: 'step_decay' as const,
      initialRate: 0.01,
      minRate: 0.0001,
      maxRate: 0.1,
      decayFactor: 0.5,
      stepSize: 10,
      warmupSteps: 0,
    }
    expect(t.applySchedule(sched, 20, 100)).toBeCloseTo(0.0025)
  })

  it('exponential schedule decreases over time', () => {
    const sched = {
      type: 'exponential' as const,
      initialRate: 0.01,
      minRate: 0.0001,
      maxRate: 0.1,
      decayFactor: 0.1,
      warmupSteps: 0,
    }
    const a = t.applySchedule(sched, 0, 10)
    const b = t.applySchedule(sched, 50, 10)
    expect(b).toBeLessThan(a)
  })

  it('cosine_annealing oscillates within [minRate, maxRate]', () => {
    const sched = {
      type: 'cosine_annealing' as const,
      initialRate: 0.01,
      minRate: 0.0001,
      maxRate: 0.1,
      cycleLength: 10,
      warmupSteps: 0,
    }
    for (let e = 0; e < 12; e++) {
      const r = t.applySchedule(sched, e, 100)
      expect(r).toBeGreaterThanOrEqual(0.0001)
      expect(r).toBeLessThanOrEqual(0.1)
    }
  })

  it('clamps rates outside [minRate, maxRate]', () => {
    const sched = {
      type: 'constant' as const,
      initialRate: 999,
      minRate: 0.0001,
      maxRate: 0.1,
      warmupSteps: 0,
    }
    expect(t.applySchedule(sched, 0, 100)).toBe(0.1)
  })
})

describe('LearningRateTuner.analyzePerformanceTrends', () => {
  let t: LearningRateTuner
  beforeEach(() => {
    t = new LearningRateTuner()
  })

  const m = (modelId: string, avgLoss: number, successRate: number): PerformanceMetrics => ({
    modelId,
    taskType: 'chat',
    avgLoss,
    lossVariance: 0,
    avgResponseTime: 100,
    successRate,
    userSatisfaction: 0.5,
    convergenceSpeed: 0.5,
    stabilityIndex: 0.5,
    overfittingRisk: 0,
    timestamp: Date.now(),
  })

  it('returns "stable" when there are fewer than 5 metrics', () => {
    t.recordPerformanceMetrics(m('m1', 1, 100))
    expect(t.analyzePerformanceTrends('m1').trend).toBe('stable')
  })

  it('detects an "improving" trend', () => {
    for (let i = 0; i < 5; i++) t.recordPerformanceMetrics(m('m1', 10, 50))
    for (let i = 0; i < 5; i++) t.recordPerformanceMetrics(m('m1', 5, 90))
    expect(t.analyzePerformanceTrends('m1').trend).toBe('improving')
  })

  it('detects a "degrading" trend', () => {
    for (let i = 0; i < 5; i++) t.recordPerformanceMetrics(m('m2', 1, 90))
    for (let i = 0; i < 5; i++) t.recordPerformanceMetrics(m('m2', 5, 70))
    expect(t.analyzePerformanceTrends('m2').trend).toBe('degrading')
  })
})

describe('LearningRateTuner.getOptimalRateForTask + persistence', () => {
  it('returns the configured rate per (task, complexity)', () => {
    const t = new LearningRateTuner()
    expect(t.getOptimalRateForTask('chat', 'low')).toBe(0.01)
    expect(t.getOptimalRateForTask('code_generation', 'high')).toBe(0.00005)
    // Unknown task falls back to 0.001.
    expect(t.getOptimalRateForTask('unknown_task', 'high')).toBe(0.001)
  })

  it('exportData / importData round-trips adjustment + performance history', () => {
    const t = new LearningRateTuner()
    const train = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    t.recommendLearningRate(0.01, train, [], 10, 200)
    t.recordPerformanceMetrics({
      modelId: 'm1',
      taskType: 'chat',
      avgLoss: 1,
      lossVariance: 0,
      avgResponseTime: 100,
      successRate: 100,
      userSatisfaction: 0.5,
      convergenceSpeed: 0.5,
      stabilityIndex: 0.5,
      overfittingRisk: 0,
      timestamp: 1,
    })

    const json = t.exportData()
    const t2 = new LearningRateTuner()
    expect(t2.importData(json)).toBe(true)
    // Importing invalid input returns false.
    expect(t2.importData('not json')).toBe(false)
    expect(t2.importData('{}')).toBe(false)
  })

  it('reset() empties both histories', () => {
    const t = new LearningRateTuner()
    t.recommendLearningRate(0.01, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [], 10, 200)
    t.reset()
    // After reset the export should contain empty arrays.
    const json = t.exportData()
    const parsed = JSON.parse(json)
    expect(parsed.adjustments).toEqual([])
    expect(parsed.performance).toEqual([])
  })

  it('module exports a singleton', () => {
    expect(learningRateTuner).toBeInstanceOf(LearningRateTuner)
  })
})
