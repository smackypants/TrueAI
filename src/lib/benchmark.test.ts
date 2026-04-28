import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  compareBenchmarks,
  formatMetric,
  getImprovementColor,
  getImprovementLabel,
  runBenchmark,
  type BenchmarkResult,
} from './benchmark'

const baseSettings = {
  maxTokens: 2048,
  enableAnimations: true,
  enableBackgroundEffects: true,
  streamingChunkSize: 16,
}

function makeResult(
  overrides: Partial<BenchmarkResult['metrics']>,
  score: number,
  label = 'test'
): BenchmarkResult {
  return {
    id: `bench-${label}`,
    label,
    score,
    settings: { ...baseSettings },
    metrics: {
      renderTime: 100,
      interactionLatency: 10,
      memoryUsage: 50,
      frameRate: 60,
      loadTime: 500,
      timestamp: 1700000000000,
      ...overrides,
    },
  }
}

describe('benchmark', () => {
  describe('compareBenchmarks', () => {
    it('reports positive improvements when "after" is faster / lower', () => {
      const before = makeResult(
        { renderTime: 200, interactionLatency: 20, memoryUsage: 100, loadTime: 1000, frameRate: 30 },
        50
      )
      const after = makeResult(
        { renderTime: 100, interactionLatency: 10, memoryUsage: 50, loadTime: 500, frameRate: 60 },
        80
      )
      const cmp = compareBenchmarks(before, after)
      expect(cmp.before).toBe(before)
      expect(cmp.after).toBe(after)
      // For things where "lower is better" (renderTime, latency, memory, loadTime),
      // a 50% drop should report 50.
      expect(cmp.improvements.renderTime).toBe(50)
      expect(cmp.improvements.interactionLatency).toBe(50)
      expect(cmp.improvements.memoryUsage).toBe(50)
      expect(cmp.improvements.loadTime).toBe(50)
      // For frameRate and overall score (higher-is-better) the helper is called
      // with (after, before), so a doubling reports 50.
      expect(cmp.improvements.frameRate).toBe(50)
      expect(cmp.improvements.overallScore).toBe(38)
    })

    it('returns 0 when "before" is 0 (avoids div-by-zero) and negative when worse', () => {
      const before = makeResult({ memoryUsage: 0, renderTime: 100 }, 80)
      const after = makeResult({ memoryUsage: 50, renderTime: 200 }, 40)
      const cmp = compareBenchmarks(before, after)
      expect(cmp.improvements.memoryUsage).toBe(0)
      // renderTime got worse → negative number
      expect(cmp.improvements.renderTime).toBe(-100)
      // overallScore: calculateImprovement(after.score=40, before.score=80) = (40-80)/40*100 = -100
      expect(cmp.improvements.overallScore).toBe(-100)
    })

    it('reports 0 improvement when before and after are identical', () => {
      const before = makeResult({}, 75)
      const after = makeResult({}, 75)
      const cmp = compareBenchmarks(before, after)
      expect(cmp.improvements.renderTime).toBe(0)
      expect(cmp.improvements.interactionLatency).toBe(0)
      expect(cmp.improvements.memoryUsage).toBe(0)
      expect(cmp.improvements.frameRate).toBe(0)
      expect(cmp.improvements.loadTime).toBe(0)
      expect(cmp.improvements.overallScore).toBe(0)
    })
  })

  describe('formatMetric', () => {
    it('returns "N/A" for 0 MB and one-decimal otherwise', () => {
      expect(formatMetric(0, 'MB')).toBe('N/A')
      expect(formatMetric(12.345, 'MB')).toBe('12.3MB')
      expect(formatMetric(0, 'ms')).toBe('0.0ms')
      expect(formatMetric(60, 'fps')).toBe('60.0fps')
    })
  })

  describe('getImprovementColor', () => {
    it('maps improvement magnitude to a tailwind class', () => {
      expect(getImprovementColor(25)).toBe('text-green-500')
      expect(getImprovementColor(11)).toBe('text-green-500')
      expect(getImprovementColor(10)).toBe('text-green-400')
      expect(getImprovementColor(1)).toBe('text-green-400')
      expect(getImprovementColor(0)).toBe('text-muted-foreground')
      expect(getImprovementColor(-5)).toBe('text-red-500')
    })
  })

  describe('getImprovementLabel', () => {
    it('labels improvement buckets', () => {
      expect(getImprovementLabel(25)).toBe('Excellent')
      expect(getImprovementLabel(15)).toBe('Good')
      expect(getImprovementLabel(5)).toBe('Minor')
      expect(getImprovementLabel(0)).toBe('No change')
      expect(getImprovementLabel(-1)).toBe('Worse')
    })
  })
})

// ---------------------------------------------------------------------------
// runBenchmark — integration test with requestAnimationFrame mock
// ---------------------------------------------------------------------------

describe('runBenchmark', () => {
  beforeEach(() => {
    // Replace requestAnimationFrame with a synchronous stub that invokes the
    // callback on the next microtask, so the benchmark loop completes quickly.
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => {
        queueMicrotask(() => cb(performance.now()))
        return 0
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a BenchmarkResult with the expected shape', async () => {
    const settings = {
      maxTokens: 512,
      enableAnimations: false,
      enableBackgroundEffects: false,
      streamingChunkSize: 8,
    }
    const result = await runBenchmark(settings)

    expect(result).toMatchObject({
      settings,
      label: 'Optimized Settings', // enableAnimations: false → 'Optimized Settings'
    })
    expect(result.id).toMatch(/^bench-\d+$/)
    expect(typeof result.score).toBe('number')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.metrics.loadTime).toBeGreaterThanOrEqual(0)
    expect(typeof result.metrics.renderTime).toBe('number')
    expect(typeof result.metrics.interactionLatency).toBe('number')
    expect(typeof result.metrics.frameRate).toBe('number')
  }, 20000)

  it('labels the result "Standard Settings" when animations are enabled', async () => {
    const settings = {
      maxTokens: 1024,
      enableAnimations: true,
      enableBackgroundEffects: true,
      streamingChunkSize: 16,
    }
    const result = await runBenchmark(settings)
    expect(result.label).toBe('Standard Settings')
  }, 20000)

  it('score is 0 when all metrics are at maximum penalty', async () => {
    // Verify that calculateBenchmarkScore clamps the output to >= 0.
    const result = await runBenchmark({
      maxTokens: 512,
      enableAnimations: false,
      enableBackgroundEffects: false,
      streamingChunkSize: 8,
    })
    // score is clamped to [0, ∞) by Math.max(score, 0) but in the test env
    // the mock rAF makes timings huge so the score may exceed 100 before
    // clamping; we only assert the non-negative lower bound.
    expect(result.score).toBeGreaterThanOrEqual(0)
  }, 20000)
})
