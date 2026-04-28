import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mock hardware-scanner so performance-scanner tests don't depend on the
 * real HardwareSpecs structure. spark.kv is already stubbed in
 * src/test/setup.ts (set/get are vi.fn()).
 */
vi.mock('./hardware-scanner', () => ({
  scanHardware: vi.fn(async () => ({
    hardwareConcurrency: 4,
    maxTouchPoints: 0,
    platform: 'Linux',
    userAgent: 'jsdom',
    screen: { width: 1280, height: 720, pixelRatio: 1, colorDepth: 24 },
    performanceScore: 200,
    tier: 'medium' as const,
    connection: { effectiveType: '4g', downlink: 10, rtt: 100, saveData: false },
    battery: { level: 0.5, charging: true },
  })),
}))

import { PerformanceScanner, performanceScanner } from './performance-scanner'
import { scanHardware } from './hardware-scanner'
import type { AnalyticsEvent, ModelConfig } from './types'

const evt = (overrides: Partial<AnalyticsEvent>): AnalyticsEvent => ({
  id: `e-${Math.random()}`,
  type: 'chat_message_sent',
  timestamp: 1700000000000,
  sessionId: 's',
  category: 'chat',
  action: 'a',
  ...overrides,
})

const model: ModelConfig = {
  id: 'm1',
  name: 'M1',
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.1,
}

describe('PerformanceScanner.performComprehensiveScan', () => {
  beforeEach(() => {
    // Reset spark.kv mock state.
    // @ts-expect-error - spark mock
    globalThis.spark.kv.set.mockClear?.()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('produces a structured scan result and persists scan history to spark.kv', async () => {
    const scanner = new PerformanceScanner()
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 5; i++) {
      events.push(
        evt({
          type: 'chat_message_received',
          duration: 1500,
          metadata: { model: 'm1', responseLength: 200 },
        }),
      )
    }
    const result = await scanner.performComprehensiveScan(events, [model], [])
    expect(result.id).toMatch(/^scan-/)
    expect(result.hardwareSpecs.tier).toBe('medium')
    expect(result.currentMetrics.avgResponseTime).toBe(1500)
    expect(result.currentMetrics.successRate).toBe(100)
    expect(Array.isArray(result.optimizations)).toBe(true)
    // @ts-expect-error spark mock
    expect(globalThis.spark.kv.set).toHaveBeenCalledWith(
      'performance-scan-history',
      expect.any(Array),
    )
  })

  it('returns zero metrics when no chat events are present', async () => {
    const scanner = new PerformanceScanner()
    const result = await scanner.performComprehensiveScan([], [], [])
    expect(result.currentMetrics.avgResponseTime).toBe(0)
    expect(result.currentMetrics.successRate).toBe(100)
  })

  it('rejects when a scan is already in progress', async () => {
    const scanner = new PerformanceScanner()
    // Cause the first scan to hang so isScanning stays true.
    let resolveFn: (() => void) | null = null
    ;(scanHardware as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise(res => {
        resolveFn = () => res(undefined as unknown as ReturnType<typeof scanHardware>)
      }),
    )
    const first = scanner.performComprehensiveScan([], [], [])
    await expect(scanner.performComprehensiveScan([], [], [])).rejects.toThrow('already in progress')
    resolveFn?.()
    // The first scan rejects because scanHardware resolved with `undefined`,
    // so swallow the error here.
    await first.catch(() => {})
  })

  it('flags critical bottlenecks for very high p99 response time', async () => {
    const scanner = new PerformanceScanner()
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 50; i++) {
      events.push(
        evt({
          type: 'chat_message_received',
          duration: 20_000,
          metadata: { model: 'm1', responseLength: 200 },
        }),
      )
    }
    const result = await scanner.performComprehensiveScan(events, [model], [])
    const types = result.bottlenecks.map(b => b.severity)
    expect(types).toContain('critical')
  })

  it('flags wasted-tokens bottleneck when avg responseLength « maxTokens', async () => {
    const scanner = new PerformanceScanner()
    const events: AnalyticsEvent[] = []
    for (let i = 0; i < 10; i++) {
      events.push(
        evt({
          type: 'chat_message_received',
          duration: 1000,
          metadata: { model: 'm1', responseLength: 50 },
        }),
      )
    }
    const result = await scanner.performComprehensiveScan(events, [model], [])
    expect(result.currentMetrics.modelEfficiency.m1.wastedTokens).toBeGreaterThan(0)
    expect(result.bottlenecks.find(b => b.type === 'parameter')).toBeDefined()
  })
})

describe('PerformanceScanner.applyOptimizations', () => {
  it('reduces maxTokens by the configured percentage', async () => {
    const scanner = new PerformanceScanner()
    const out = await scanner.applyOptimizations(
      [
        {
          id: 'o1',
          type: 'change_model_config',
          priority: 'high',
          description: '',
          changes: { reduceMaxTokensByPercent: 50, lowerTemperatureForSpeed: true },
          expectedGain: '',
          confidence: 0.9,
          autoApplicable: true,
        },
      ],
      [model],
    )
    expect(out.applied).toBe(1)
    expect(out.updated[0].maxTokens).toBe(2000)
    expect(out.updated[0].temperature).toBeCloseTo(0.56)
  })

  it('applies optimize_tokens to the targeted model only', async () => {
    const scanner = new PerformanceScanner()
    const m2: ModelConfig = { ...model, id: 'm2' }
    const out = await scanner.applyOptimizations(
      [
        {
          id: 'o1',
          type: 'optimize_tokens',
          priority: 'medium',
          description: '',
          targetModel: 'm1',
          changes: { maxTokens: 1500 },
          expectedGain: '',
          confidence: 0.9,
          autoApplicable: true,
        },
      ],
      [model, m2],
    )
    expect(out.updated.find(m => m.id === 'm1')!.maxTokens).toBe(1500)
    expect(out.updated.find(m => m.id === 'm2')!.maxTokens).toBe(4000)
  })

  it('skips optimizations marked autoApplicable=false', async () => {
    const scanner = new PerformanceScanner()
    const out = await scanner.applyOptimizations(
      [
        {
          id: 'o1',
          type: 'enable_caching',
          priority: 'low',
          description: '',
          changes: {},
          expectedGain: '',
          confidence: 0.7,
          autoApplicable: false,
        },
      ],
      [model],
    )
    expect(out.applied).toBe(0)
  })
})

describe('PerformanceScanner history', () => {
  it('exposes a singleton and getScanHistory clones the internal array', () => {
    expect(performanceScanner).toBeInstanceOf(PerformanceScanner)
    const scanner = new PerformanceScanner()
    const initial = scanner.getScanHistory()
    expect(Array.isArray(initial)).toBe(true)
    initial.push({ id: 'fake' } as never)
    expect(scanner.getScanHistory()).toHaveLength(0)
  })

  it('loadScanHistory pulls from spark.kv.get', async () => {
    // @ts-expect-error spark mock
    globalThis.spark.kv.get.mockResolvedValueOnce([{ id: 'scan-1' }])
    const scanner = new PerformanceScanner()
    await scanner.loadScanHistory()
    expect(scanner.getScanHistory()).toEqual([{ id: 'scan-1' }])
  })
})
