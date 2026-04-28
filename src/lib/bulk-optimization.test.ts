import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BulkOptimizationManager,
  bulkOptimizationManager,
  optimizationBundleTemplates,
  optimizationPresets,
} from './bulk-optimization'
import type { ModelConfig } from './types'
import type { OptimizationInsight } from './auto-optimizer'

const model = (id: string, overrides: Partial<ModelConfig> = {}): ModelConfig => ({
  id,
  name: id.toUpperCase(),
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.9,
  frequencyPenalty: 0.1,
  presencePenalty: 0.1,
  ...overrides,
})

describe('BulkOptimizationManager.createBundle / createCustomBundle', () => {
  it('returns a bundle from the template with affectedModels populated', () => {
    const m = new BulkOptimizationManager()
    const tpl = optimizationBundleTemplates[0]
    const bundle = m.createBundle(tpl, ['m1', 'm2'])
    expect(bundle.affectedModels).toEqual(['m1', 'm2'])
    expect(bundle.id).toMatch(/^bundle-/)
    expect(bundle.createdAt).toBeGreaterThan(0)
  })

  it('createCustomBundle infers estimatedImpact from action parameters', () => {
    const m = new BulkOptimizationManager()
    const bundle = m.createCustomBundle(
      'My Bundle',
      'desc',
      [
        {
          id: 'a1',
          type: 'adjust_parameters',
          target: 'model',
          parameters: { maxTokens: 800 },
          description: 'reduce',
          reversible: true,
        },
      ],
      ['m1'],
    )
    expect(bundle.category).toBe('custom')
    expect(bundle.estimatedImpact.performance).toMatch(/Improved/)
  })
})

describe('BulkOptimizationManager.applyBundle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('applies parameter actions, reports progress, and tracks success', async () => {
    const m = new BulkOptimizationManager()
    const models = [model('m1')]
    const bundle = m.createCustomBundle(
      'b',
      'd',
      [
        {
          id: 'a1',
          type: 'adjust_parameters',
          target: 'model',
          parameters: { maxTokens: 1234 },
          description: '',
          reversible: true,
          estimatedTime: 0,
        },
      ],
      ['m1'],
    )
    const onProgress = vi.fn()
    const promise = m.applyBundle(bundle, models, onProgress)
    await vi.advanceTimersByTimeAsync(50)
    const result = await promise

    expect(result.success).toBe(true)
    expect(result.appliedActions).toEqual(['a1'])
    expect(result.failedActions).toEqual([])
    expect(models[0].maxTokens).toBe(1234)
    expect(onProgress).toHaveBeenCalled()
    expect(result.metrics?.affectedModels).toBe(1)
  })

  it('captures partial-failure details when applyAction throws', async () => {
    const m = new BulkOptimizationManager()
    // Force applyAction to throw via a private spy.
    type WithPrivate = BulkOptimizationManager & {
      applyAction: (...a: unknown[]) => Promise<void>
    }
    const spy = vi.spyOn(m as WithPrivate, 'applyAction' as keyof WithPrivate) as ReturnType<typeof vi.fn>
    spy.mockRejectedValueOnce(new Error('boom'))
    spy.mockResolvedValueOnce(undefined)

    const bundle = m.createCustomBundle(
      'b',
      'd',
      [
        { id: 'a1', type: 'adjust_parameters', target: 'model', description: '', reversible: true },
        { id: 'a2', type: 'adjust_parameters', target: 'model', description: '', reversible: true },
      ],
      ['m1'],
    )
    const promise = m.applyBundle(bundle, [model('m1')])
    await vi.advanceTimersByTimeAsync(50)
    const result = await promise

    expect(result.success).toBe(false)
    expect(result.failedActions).toHaveLength(1)
    expect(result.failedActions[0].error).toBe('boom')
    expect(result.appliedActions).toEqual(['a2'])
    spy.mockRestore()
  })
})

describe('BulkOptimizationManager.rollbackBundle', () => {
  it('restores the previous parameter values', async () => {
    vi.useFakeTimers()
    const m = new BulkOptimizationManager()
    const models = [model('m1', { maxTokens: 4000 })]
    const bundle = m.createCustomBundle(
      'b',
      'd',
      [
        {
          id: 'a1',
          type: 'adjust_parameters',
          target: 'model',
          parameters: { maxTokens: 1234 },
          description: '',
          reversible: true,
          estimatedTime: 0,
        },
      ],
      ['m1'],
    )
    const promise = m.applyBundle(bundle, models)
    await vi.advanceTimersByTimeAsync(50)
    await promise
    expect(models[0].maxTokens).toBe(1234)

    expect(m.canRollback(bundle.id)).toBe(true)
    const ok = await m.rollbackBundle(bundle.id, models)
    expect(ok).toBe(true)
    expect(models[0].maxTokens).toBe(4000)
    expect(m.canRollback(bundle.id)).toBe(false)
    vi.useRealTimers()
  })

  it('throws when no rollback data is available', async () => {
    const m = new BulkOptimizationManager()
    await expect(m.rollbackBundle('missing', [])).rejects.toThrow(/No rollback data/)
  })
})

describe('BulkOptimizationManager presets and history', () => {
  it('getAvailableBundles returns one bundle per template', () => {
    const m = new BulkOptimizationManager()
    const bundles = m.getAvailableBundles([model('m1')])
    expect(bundles.length).toBe(optimizationBundleTemplates.length)
  })

  it('getPresetBundles resolves preset.bundles to template bundles', () => {
    const m = new BulkOptimizationManager()
    const preset = optimizationPresets[0]
    const bundles = m.getPresetBundles(preset.id, [model('m1')])
    expect(bundles.length).toBeGreaterThan(0)
    bundles.forEach(b => expect(b.affectedModels).toEqual(['m1']))
  })

  it('getPresetBundles returns [] for unknown preset id', () => {
    const m = new BulkOptimizationManager()
    expect(m.getPresetBundles('does-not-exist', [model('m1')])).toEqual([])
  })

  it('getBundleHistory returns most-recent first', async () => {
    vi.useFakeTimers()
    const m = new BulkOptimizationManager()
    const models = [model('m1')]

    const tpl = optimizationBundleTemplates[0]
    const bundleA = m.createBundle(tpl, ['m1'])
    const bundleB = m.createBundle(tpl, ['m1'])
    // Apply both with no estimatedTime delays.
    const noDelayActions = bundleA.actions.map(a => ({ ...a, estimatedTime: 0 }))
    bundleA.actions = noDelayActions
    bundleB.actions = bundleB.actions.map(a => ({ ...a, estimatedTime: 0 }))

    const p1 = m.applyBundle(bundleA, models)
    await vi.advanceTimersByTimeAsync(10)
    await p1
    const p2 = m.applyBundle(bundleB, models)
    await vi.advanceTimersByTimeAsync(10)
    await p2

    const history = m.getBundleHistory()
    expect(history).toHaveLength(2)
    expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp)
    vi.useRealTimers()
  })
})

describe('BulkOptimizationManager.generateInsightBasedBundles', () => {
  it('builds a "Performance Fixes" bundle from performance insights', () => {
    const m = new BulkOptimizationManager()
    const insights: OptimizationInsight[] = [
      {
        id: 'i1',
        type: 'performance',
        severity: 'high',
        title: 'Slow',
        description: '',
        recommendation: 'reduce maxTokens',
        impact: '',
        confidence: 0.8,
        affectedModels: ['m1'],
        suggestedAction: { type: 'adjust_parameters', details: { parameters: { maxTokens: 1000 } } },
        timestamp: 1,
      },
    ]
    const bundles = m.generateInsightBasedBundles(insights, [model('m1')])
    expect(bundles).toHaveLength(1)
    expect(bundles[0].name).toBe('Performance Fixes')
    expect(bundles[0].actions).toHaveLength(1)
    expect(bundles[0].actions[0].parameters?.maxTokens).toBe(1000)
  })

  it('returns no bundles when there are no performance insights', () => {
    const m = new BulkOptimizationManager()
    expect(m.generateInsightBasedBundles([], [model('m1')])).toEqual([])
  })
})

describe('Bulk-optimization module exports', () => {
  it('exports a singleton manager', () => {
    expect(bulkOptimizationManager).toBeInstanceOf(BulkOptimizationManager)
  })

  it('templates and presets are non-empty', () => {
    expect(optimizationBundleTemplates.length).toBeGreaterThan(0)
    expect(optimizationPresets.length).toBeGreaterThan(0)
  })
})
