import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateOptimizedSettings,
  formatHardwareInfo,
  scanHardware,
  type HardwareSpecs,
} from './hardware-scanner'

const baseSpecs = (overrides: Partial<HardwareSpecs> = {}): HardwareSpecs => ({
  hardwareConcurrency: 8,
  maxTouchPoints: 0,
  platform: 'Linux x86_64',
  userAgent: 'jsdom',
  screen: { width: 1920, height: 1080, pixelRatio: 2, colorDepth: 24 },
  performanceScore: 300,
  tier: 'high',
  ...overrides,
})

describe('generateOptimizedSettings', () => {
  it('produces ultra-tier settings', () => {
    const s = generateOptimizedSettings(baseSpecs({ tier: 'ultra', performanceScore: 400 }))
    expect(s.tier).toBe('ultra')
    expect(s.maxTokens).toBe(4000)
    expect(s.enableAnimations).toBe(true)
    expect(s.enableBackgroundEffects).toBe(true)
    expect(s.maxConcurrentAgents).toBeGreaterThanOrEqual(5)
    expect(s.recommendations.length).toBeGreaterThan(0)
  })

  it('produces high-tier settings', () => {
    const s = generateOptimizedSettings(baseSpecs({ tier: 'high' }))
    expect(s.tier).toBe('high')
    expect(s.maxTokens).toBe(3000)
    expect(s.imageQuality).toBe('high')
  })

  it('produces medium-tier settings (background effects off)', () => {
    const s = generateOptimizedSettings(baseSpecs({ tier: 'medium', performanceScore: 200 }))
    expect(s.tier).toBe('medium')
    expect(s.enableBackgroundEffects).toBe(false)
    expect(s.imageQuality).toBe('medium')
  })

  it('produces low-tier settings (animations and effects off)', () => {
    const s = generateOptimizedSettings(baseSpecs({ tier: 'low', performanceScore: 80 }))
    expect(s.tier).toBe('low')
    expect(s.enableAnimations).toBe(false)
    expect(s.enableBackgroundEffects).toBe(false)
    expect(s.imageQuality).toBe('low')
    expect(s.maxConcurrentAgents).toBe(1)
  })

  it('reduces tokens and disables effects on low battery (not charging)', () => {
    const s = generateOptimizedSettings(baseSpecs({
      tier: 'high',
      battery: { level: 0.1, charging: false },
    }))
    expect(s.maxTokens).toBeLessThan(3000)
    expect(s.enableAnimations).toBe(false)
    expect(s.enableBackgroundEffects).toBe(false)
    expect(s.recommendations.some(r => /battery/i.test(r))).toBe(true)
  })

  it('does not penalize when device is charging even at low level', () => {
    const s = generateOptimizedSettings(baseSpecs({
      tier: 'high',
      battery: { level: 0.05, charging: true },
    }))
    expect(s.maxTokens).toBe(3000)
    expect(s.recommendations.some(r => /battery/i.test(r))).toBe(false)
  })

  it('honors data saver flag', () => {
    const s = generateOptimizedSettings(baseSpecs({
      tier: 'high',
      connection: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: true },
    }))
    expect(s.imageQuality).toBe('low')
    expect(s.maxTokens).toBeLessThan(3000)
    expect(s.recommendations.some(r => /Data saver/i.test(r))).toBe(true)
  })

  it('reduces payload on slow 2g connections', () => {
    const high = generateOptimizedSettings(baseSpecs({ tier: 'high' }))
    const slow = generateOptimizedSettings(baseSpecs({
      tier: 'high',
      connection: { effectiveType: '2g', downlink: 0.1, rtt: 1000, saveData: false },
    }))
    expect(slow.maxTokens).toBeLessThan(high.maxTokens)
    expect(slow.streamingChunkSize).toBeLessThan(high.streamingChunkSize)
    expect(slow.recommendations.some(r => /Slow connection/i.test(r))).toBe(true)
  })

  it('shrinks cache when device memory is below 4 GB', () => {
    const high = generateOptimizedSettings(baseSpecs({ tier: 'high' }))
    const low = generateOptimizedSettings(baseSpecs({ tier: 'high', deviceMemory: 2 }))
    expect(low.cacheSize).toBeLessThan(high.cacheSize)
    expect(low.conversationHistoryLimit).toBeLessThan(high.conversationHistoryLimit)
    expect(low.recommendations.some(r => /memory/i.test(r))).toBe(true)
  })
})

describe('formatHardwareInfo', () => {
  it('renders core sections from a minimal spec', () => {
    const info = formatHardwareInfo(baseSpecs())
    expect(info).toContain('**Device Tier**: HIGH')
    expect(info).toContain('Performance Score')
    expect(info).toContain('**Processor**')
    expect(info).toContain('Cores: 8')
    expect(info).toContain('**Display**')
    expect(info).toContain('1920x1080')
    expect(info).toContain('**Platform**: Linux x86_64')
  })

  it('includes optional GPU/battery/network sections when present', () => {
    const info = formatHardwareInfo(baseSpecs({
      deviceMemory: 8,
      gpu: { vendor: 'NVIDIA', renderer: 'GeForce RTX' },
      battery: { level: 0.5, charging: true },
      connection: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: true },
    }))
    expect(info).toContain('Memory: 8 GB')
    expect(info).toContain('**Graphics**')
    expect(info).toContain('NVIDIA')
    expect(info).toContain('GeForce RTX')
    expect(info).toContain('**Battery**')
    expect(info).toContain('Level: 50%')
    expect(info).toContain('Charging')
    expect(info).toContain('**Network**')
    expect(info).toContain('Type: 4G')
    expect(info).toContain('Data Saver: Enabled')
  })
})

describe('scanHardware', () => {
  let originalDescriptors: Record<string, PropertyDescriptor | undefined> = {}

  beforeEach(() => {
    originalDescriptors = {
      hardwareConcurrency: Object.getOwnPropertyDescriptor(navigator, 'hardwareConcurrency'),
      maxTouchPoints: Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints'),
      platform: Object.getOwnPropertyDescriptor(navigator, 'platform'),
    }
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4, configurable: true })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    Object.defineProperty(navigator, 'platform', { value: 'TestPlatform', configurable: true })
    // Force createElement('canvas').getContext to return null so the WebGL
    // probe gracefully fails and `gpu` stays undefined.
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { getContext: () => null } as unknown as HTMLCanvasElement
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    for (const [k, d] of Object.entries(originalDescriptors)) {
      if (d) Object.defineProperty(navigator, k, d)
    }
  })

  it('returns a HardwareSpecs with a tier and a bounded performance score', async () => {
    const specs = await scanHardware()
    expect(['low', 'medium', 'high', 'ultra']).toContain(specs.tier)
    expect(specs.performanceScore).toBeGreaterThanOrEqual(0)
    expect(specs.performanceScore).toBeLessThanOrEqual(500)
    expect(specs.hardwareConcurrency).toBe(4)
    expect(specs.platform).toBe('TestPlatform')
    expect(specs.screen.width).toBeGreaterThanOrEqual(0)
    expect(specs.screen.height).toBeGreaterThanOrEqual(0)
  })
})
