import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the AI-SDK module so the evaluator path is deterministic without
// hitting a real provider. The first arg returned by `generateObject`
// is the parsed schema-validated object.
const generateObjectMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/llm-runtime/ai-sdk', () => ({
  generateObject: generateObjectMock,
  getLanguageModel: vi.fn(async () => ({ modelId: 'mock', provider: 'mock' })),
}))

import {
  benchmarkTests,
  compareBenchmarkSuites,
  generateBenchmarkReport,
  runModelBenchmark,
  type BenchmarkSuite,
  type BenchmarkRun,
} from './model-benchmark'
import type { ModelConfig, ModelParameters } from './types'

const params: ModelParameters = {
  temperature: 0.7,
  maxTokens: 1500,
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.1,
}

const model: ModelConfig = {
  id: 'm1',
  name: 'Test Model',
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 1500,
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.1,
}

const run = (testId: string, qualityScore: number, responseTime = 1000): BenchmarkRun => ({
  id: `r-${testId}`,
  modelId: 'm1',
  testId,
  parameters: params,
  startTime: 1,
  endTime: 1 + responseTime,
  responseTime,
  response: 'sample response',
  tokensPerSecond: 50,
  qualityScore,
  qualityBreakdown: {
    relevance: qualityScore,
    coherence: qualityScore,
    creativity: qualityScore,
    accuracy: qualityScore,
  },
})

const suite = (
  id: string,
  runs: BenchmarkRun[],
  overrides: Partial<BenchmarkSuite> = {},
): BenchmarkSuite => ({
  id,
  modelId: 'm1',
  parameters: params,
  tests: runs,
  overallScore: runs.reduce((s, r) => s + r.qualityScore, 0) / Math.max(1, runs.length),
  averageResponseTime: runs.reduce((s, r) => s + r.responseTime, 0) / Math.max(1, runs.length),
  averageTokensPerSecond: runs.reduce((s, r) => s + r.tokensPerSecond, 0) / Math.max(1, runs.length),
  timestamp: 1700000000000,
  status: 'completed',
  ...overrides,
})

describe('benchmarkTests fixture', () => {
  it('exposes 10 task-typed prompts', () => {
    expect(benchmarkTests).toHaveLength(10)
    expect(new Set(benchmarkTests.map(t => t.id)).size).toBe(10)
  })
})

describe('compareBenchmarkSuites', () => {
  it('flags significant quality improvements as Recommended', () => {
    const baseline = suite('a', [run('t1', 50, 1000), run('t2', 50, 1000)])
    const comparison = suite('b', [run('t1', 80, 900), run('t2', 80, 900)])
    const out = compareBenchmarkSuites(baseline, comparison)
    expect(out.scoreDelta).toBeCloseTo(30)
    expect(out.recommendation).toMatch(/Recommended/)
    expect(out.betterTests).toContain('t1')
    expect(out.betterTests).toContain('t2')
  })

  it('flags significant quality regression as Not Recommended', () => {
    const baseline = suite('a', [run('t1', 80, 1000)])
    const comparison = suite('b', [run('t1', 60, 1000)])
    const out = compareBenchmarkSuites(baseline, comparison)
    expect(out.recommendation).toMatch(/Not Recommended/)
    expect(out.worseTests).toContain('t1')
  })

  it('flags large speed wins as "Consider"', () => {
    const baseline = suite('a', [run('t1', 70, 1000)])
    const comparison = suite('b', [run('t1', 71, 500)]) // ~50% faster
    const out = compareBenchmarkSuites(baseline, comparison)
    expect(out.speedDelta).toBeGreaterThan(30)
    expect(out.recommendation).toMatch(/Consider/)
  })

  it('flags significant slowdown without quality gains as "Caution"', () => {
    const baseline = suite('a', [run('t1', 70, 500)])
    const comparison = suite('b', [run('t1', 71, 1000)]) // 100% slower, +1 quality
    const out = compareBenchmarkSuites(baseline, comparison)
    expect(out.recommendation).toMatch(/Caution/)
  })

  it('returns "Neutral" when changes are small', () => {
    const baseline = suite('a', [run('t1', 70, 1000)])
    const comparison = suite('b', [run('t1', 70.5, 1010)])
    const out = compareBenchmarkSuites(baseline, comparison)
    expect(out.recommendation).toMatch(/Neutral/)
  })

  it('does not classify near-equal tests as better/worse', () => {
    const baseline = suite('a', [run('t1', 70, 1000)])
    const comparison = suite('b', [run('t1', 71, 1000)])
    const out = compareBenchmarkSuites(baseline, comparison)
    expect(out.betterTests).not.toContain('t1')
    expect(out.worseTests).not.toContain('t1')
  })
})

describe('generateBenchmarkReport', () => {
  it('formats overall score, parameters, and per-test sections', () => {
    const r = run('t1', 80, 1000)
    const s = suite('s', [r])
    const report = generateBenchmarkReport(s)
    expect(report).toContain('Benchmark Report')
    expect(report).toContain('Overall Score:')
    expect(report).toContain('Temperature: 0.7')
    expect(report).toContain('t1')
  })

  it('renders 100% success when no errors are present', () => {
    const s = suite('s', [run('t1', 70, 1000), run('t2', 80, 1000)])
    const report = generateBenchmarkReport(s)
    expect(report).toContain('Success Rate:** 100%')
  })

  it('renders error lines for runs with errors', () => {
    const errored: BenchmarkRun = {
      ...run('t1', 0, 0),
      error: 'timed out',
    }
    const s = suite('s', [errored])
    const report = generateBenchmarkReport(s)
    expect(report).toContain('Error: timed out')
  })
})

describe('runModelBenchmark (AI-SDK + spark.llm mocked, no live calls)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    // spark.llm still drives `runSingleTest` (the test response itself).
    // The evaluator path is now `generateObject` from the AI SDK.
    // @ts-expect-error - spark is a test mock
    globalThis.spark.llmPrompt = (strings: TemplateStringsArray, ...vals: unknown[]) =>
      strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ''), '')
    // @ts-expect-error - spark.llm test mock
    globalThis.spark.llm = vi.fn(async () => 'A response that is exactly forty characters.')
    generateObjectMock.mockReset()
    generateObjectMock.mockResolvedValue({
      object: {
        relevance: 80,
        coherence: 75,
        creativity: 70,
        accuracy: 85,
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('runs the supplied tests, computes scores, and reports progress', async () => {
    const onProgress = vi.fn()
    const tests = benchmarkTests.slice(0, 2)
    const promise = runModelBenchmark(model, params, tests, onProgress)

    // The benchmark inserts 500 ms gaps between tests.
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise

    expect(result.tests).toHaveLength(2)
    expect(result.status).toBe('completed')
    expect(result.overallScore).toBeGreaterThan(0)
    expect(result.averageResponseTime).toBeGreaterThanOrEqual(0)
    expect(onProgress).toHaveBeenCalledWith(100, 'complete')
  })

  it('falls back to neutral scores when the evaluator schema rejects the output', async () => {
    // Simulate generateObject throwing — happens for malformed model
    // output that fails Zod validation.
    generateObjectMock.mockRejectedValue(new Error('schema validation failed'))

    const promise = runModelBenchmark(model, params, benchmarkTests.slice(0, 1))
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise
    expect(result.tests[0].qualityScore).toBe(50)
  })

  it('marks the suite as failed when the model call rejects', async () => {
    // @ts-expect-error spark mock
    globalThis.spark.llm = vi.fn(async () => {
      throw new Error('network failure')
    })
    const promise = runModelBenchmark(model, params, benchmarkTests.slice(0, 1))
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise
    expect(result.status).toBe('failed')
    expect(result.tests[0].error).toContain('network failure')
  })
})
