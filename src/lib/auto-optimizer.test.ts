import { describe, it, expect } from 'vitest'
import { AutoOptimizer, autoOptimizer } from './auto-optimizer'
import type { AnalyticsEvent, ModelConfig, PerformanceProfile } from './types'

const evt = (overrides: Partial<AnalyticsEvent>): AnalyticsEvent => ({
  id: `e-${Math.random()}`,
  type: 'chat_message_sent',
  timestamp: 1700000000000,
  sessionId: 's',
  category: 'chat',
  action: 'a',
  ...overrides,
})

const baseModel: ModelConfig = {
  id: 'm1',
  name: 'M1',
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.1,
}

describe('AutoOptimizer.analyzeAndOptimize', () => {
  const opt = new AutoOptimizer()

  it('sorts insights by severity (critical → low)', async () => {
    // 100 chat events with 12 errors → critical "high error rate" branch.
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 100; i++) {
      events.push(evt({ type: 'chat_message_received', duration: 2000, metadata: { model: 'm1' } }))
    }
    for (let i = 0; i < 12; i++) {
      events.push(evt({ type: 'error_occurred', category: 'chat' }))
    }
    const insights = await opt.analyzeAndOptimize(events, [baseModel], [])
    expect(insights.length).toBeGreaterThan(0)
    const order = ['critical', 'high', 'medium', 'low']
    const seen = insights.map(i => order.indexOf(i.severity))
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1])
    }
  })

  it('flags slow response times for one model relative to the global average', async () => {
    const events: AnalyticsEvent[] = []
    // Fast model events.
    for (let i = 0; i < 10; i++) {
      events.push(evt({ type: 'chat_message_received', duration: 500, metadata: { model: 'fast' } }))
    }
    // Slow model events (>= 5 to enter the per-model branch, > 1.5x avg).
    for (let i = 0; i < 5; i++) {
      events.push(evt({ type: 'chat_message_received', duration: 12_000, metadata: { model: 'slow' } }))
    }
    const slow: ModelConfig = { ...baseModel, id: 'slow', name: 'Slow' }
    const fast: ModelConfig = { ...baseModel, id: 'fast', name: 'Fast' }
    const insights = await opt.analyzeAndOptimize(events, [slow, fast], [])
    const slowInsight = insights.find(i => i.title.includes('Slow'))
    expect(slowInsight).toBeDefined()
    expect(slowInsight!.affectedModels).toContain('slow')
  })

  it('adds an empty-profiles insight when no profiles exist with enough activity', async () => {
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 60; i++) {
      events.push(
        evt({
          type: 'chat_message_received',
          duration: 1000,
          metadata: { model: 'm1', responseLength: 100 },
        }),
      )
    }
    const insights = await opt.analyzeAndOptimize(events, [baseModel], [])
    expect(insights.find(i => i.title.includes('No performance profiles'))).toBeDefined()
  })

  it('returns no insights for response-time analysis with < 10 chat events', async () => {
    const events = [evt({ type: 'chat_message_received', duration: 1000, metadata: { model: 'm1' } })]
    const insights = await opt.analyzeAndOptimize(events, [baseModel], [])
    // Only the "no profiles" check is gated below threshold; with 1 event
    // none of the analyzers fire.
    expect(insights).toEqual([])
  })
})

describe('AutoOptimizer.calculateLearningMetrics', () => {
  const opt = new AutoOptimizer()

  it('counts interactions and tracks per-model performance', () => {
    const events: AnalyticsEvent[] = [
      evt({ type: 'chat_message_sent' }),
      evt({ type: 'chat_message_sent' }),
      evt({ type: 'chat_message_received', duration: 1000, metadata: { model: 'm1' } }),
      evt({ type: 'chat_message_received', duration: 2000, metadata: { model: 'm1' } }),
    ]
    const metrics = opt.calculateLearningMetrics(events, [baseModel])
    expect(metrics.totalInteractions).toBe(4)
    expect(metrics.avgResponseTime).toBe(1500)
    expect(metrics.modelPerformance.m1.usageCount).toBe(2)
    expect(metrics.modelPerformance.m1.avgResponseTime).toBe(1500)
  })

  it('computes a 100% success rate when no errors are present', () => {
    const events: AnalyticsEvent[] = [
      evt({ type: 'chat_message_received', duration: 1000, metadata: { model: 'm1' } }),
    ]
    const metrics = opt.calculateLearningMetrics(events, [baseModel])
    expect(metrics.successRate).toBe(100)
  })
})

describe('AutoOptimizer.generateAutoTuneRecommendations', () => {
  const opt = new AutoOptimizer()

  it('returns no recommendations below the learning threshold', () => {
    const events: AnalyticsEvent[] = [evt({ type: 'chat_message_sent' })]
    const recs = opt.generateAutoTuneRecommendations(events, [baseModel])
    expect(recs).toEqual([])
  })

  it('produces a recommendation when params diverge from defaults', () => {
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 60; i++) {
      events.push(evt({ type: 'chat_message_sent' }))
    }
    // Set drastically different parameters (high temp + low topP) so the
    // diff > 0.2 threshold trips.
    const skew: ModelConfig = {
      ...baseModel,
      temperature: 1.5,
      topP: 0.1,
      frequencyPenalty: 1.5,
      presencePenalty: 1.5,
    }
    const recs = opt.generateAutoTuneRecommendations(events, [skew])
    expect(recs.length).toBeGreaterThan(0)
    expect(recs[0].taskType).toBe('conversation')
    expect(recs[0].confidence).toBeGreaterThan(0.5)
  })
})

describe('Auto-optimizer extras', () => {
  it('exports a singleton', () => {
    expect(autoOptimizer).toBeInstanceOf(AutoOptimizer)
  })

  it('handles empty event arrays without throwing', async () => {
    const opt = new AutoOptimizer()
    const profiles: PerformanceProfile[] = []
    await expect(opt.analyzeAndOptimize([], [], profiles)).resolves.toEqual([])
  })

  it('detects oversized maxTokens (efficiency insight)', async () => {
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 60; i++) {
      events.push(
        evt({
          type: 'chat_message_received',
          duration: 1000,
          metadata: { model: 'm1', responseLength: 50 },
        }),
      )
    }
    const opt = new AutoOptimizer()
    const insights = await opt.analyzeAndOptimize(events, [baseModel], [])
    expect(insights.find(i => i.title.includes('oversized'))).toBeDefined()
  })

  it('flags repetitive-output risk for high temperature + low frequency penalty', async () => {
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 60; i++) {
      events.push(
        evt({
          type: 'chat_message_received',
          duration: 1000,
          metadata: { model: 'm1' },
        }),
      )
    }
    const skew: ModelConfig = { ...baseModel, temperature: 1.0, frequencyPenalty: 0.0 }
    const opt = new AutoOptimizer()
    const insights = await opt.analyzeAndOptimize(events, [skew], [])
    expect(insights.find(i => i.title.includes('repetitive'))).toBeDefined()
  })
})
