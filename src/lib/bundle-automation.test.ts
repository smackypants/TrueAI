import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BundleAutomationEngine, bundleAutomation } from './bundle-automation'
import type { Message, Agent, AgentRun, HarnessManifest } from './types'

const message = (id: string, content: string, ts: number): Message => ({
  id,
  conversationId: 'c1',
  role: 'user',
  content,
  timestamp: ts,
})

const agent = (id: string, status: Agent['status'] = 'idle'): Agent => ({
  id,
  name: id,
  goal: '',
  model: 'm1',
  tools: [],
  createdAt: 0,
  status,
})

const run = (id: string, startedAt: number, toolNames: string[] = []): AgentRun => ({
  id,
  agentId: 'a1',
  startedAt,
  status: 'completed',
  steps: toolNames.map((t, i) => ({
    id: `s${i}`,
    type: 'tool_call',
    content: '',
    toolName: t,
    timestamp: 0,
  })),
})

const harness = (id: string, name: string): HarnessManifest => ({
  id,
  name,
  version: '1',
  description: '',
  author: '',
  tools: [],
})

describe('BundleAutomationEngine.analyzeUsagePatterns', () => {
  it('detects temporal patterns when one hour has 5+ events', () => {
    const e = new BundleAutomationEngine()
    // 13:00 hour, 5 messages.
    const ts = new Date('2024-01-01T13:00:00Z').getTime()
    const messages = [1, 2, 3, 4, 5, 6].map(i => message(`m${i}`, 'hello', ts + i * 1000))
    const patterns = e.analyzeUsagePatterns(messages, [], [], [])
    const temporal = patterns.find(p => p.patternType === 'temporal')
    expect(temporal).toBeDefined()
    expect(temporal!.confidence).toBeGreaterThan(0)
  })

  it('detects contextual patterns from keyword clusters', () => {
    const e = new BundleAutomationEngine()
    const messages = [
      message('1', 'fix the syntax error and refactor the function', 0),
      message('2', 'I need to debug this code please', 1),
      message('3', 'how do I implement this function in code', 2),
    ]
    const patterns = e.analyzeUsagePatterns(messages, [], [], [])
    const contextual = patterns.find(p => p.patternType === 'contextual')
    expect(contextual).toBeDefined()
    expect(contextual!.suggestedHarness.length).toBeGreaterThan(0)
  })

  it('detects sequential tool patterns when a sequence repeats', () => {
    const e = new BundleAutomationEngine()
    const runs = [
      run('r1', 0, ['calculator', 'data_analyzer']),
      run('r2', 1, ['calculator', 'data_analyzer']),
    ]
    const patterns = e.analyzeUsagePatterns([], [], runs, [])
    const seq = patterns.find(p => p.patternType === 'sequential')
    expect(seq).toBeDefined()
    expect(seq!.suggestedHarness).toContain('data_analyst')
  })

  it('detects high-frequency users via avgDailyActivity >= 5', () => {
    const e = new BundleAutomationEngine()
    const ts = new Date('2024-01-01T12:00:00Z').getTime()
    const messages = Array.from({ length: 6 }, (_, i) => message(`m${i}`, 'hi', ts + i))
    const patterns = e.analyzeUsagePatterns(messages, [], [], [])
    expect(patterns.find(p => p.id === 'frequency-high-usage')).toBeDefined()
  })
})

describe('BundleAutomationEngine.createRuleFromPattern', () => {
  it('builds conditions and actions from a temporal pattern', () => {
    const e = new BundleAutomationEngine()
    const pattern = {
      id: 'temporal-13',
      patternType: 'temporal' as const,
      description: 'High activity at 13:00',
      detectedAt: 0,
      confidence: 0.8,
      triggers: [{ type: 'time_of_day' as const, value: 13, weight: 1 }],
      suggestedHarness: ['code_assistant'],
      metadata: {},
    }
    const harnesses = [harness('h1', 'code_assistant')]
    const rule = e.createRuleFromPattern(pattern, harnesses, { autoEnable: true, priority: 'high' })
    expect(rule.enabled).toBe(true)
    expect(rule.priority).toBe('high')
    expect(rule.harnessIds).toContain('h1')
    expect(rule.conditions[0].type).toBe('time_range')
    expect(rule.actions.find(a => a.type === 'run_harness')).toBeDefined()
    expect(rule.actions.find(a => a.type === 'log')).toBeDefined()
  })
})

describe('BundleAutomationEngine.evaluateRules + executeRule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T13:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns rules whose conditions all match', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r1',
      name: 'r1',
      description: '',
      enabled: true,
      pattern: {
        id: 'p1',
        patternType: 'temporal',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: ['h1'],
      conditions: [{ type: 'time_range', operator: 'in_range', value: [13, 14] }],
      actions: [{ type: 'run_harness', target: 'h1' }],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: Date.now(),
      recentMessages: [],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(1)
    expect(triggered[0].id).toBe('r1')
  })

  it('skips disabled rules and respects the cooldown window', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-disabled',
      name: '',
      description: '',
      enabled: false,
      pattern: {
        id: '',
        patternType: 'temporal',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    e.addRule({
      id: 'r-cooldown',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'temporal',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [],
      actions: [],
      cooldown: 60_000,
      lastTriggered: Date.now() - 1_000,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    expect(
      e.evaluateRules({
        currentTime: Date.now(),
        recentMessages: [],
        activeAgents: [],
        recentRuns: [],
      }),
    ).toEqual([])
  })

  it('executeRule runs harness actions and updates metrics', async () => {
    const e = new BundleAutomationEngine()
    const rule = {
      id: 'r1',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'temporal' as const,
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: ['h1'],
      conditions: [],
      actions: [
        { type: 'run_harness' as const, target: 'h1' },
        { type: 'log' as const, target: 'log' }, // ignored by executor
      ],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal' as const,
    }

    const promise = e.executeRule(rule, { meta: 'value' })
    // executeHarness sleeps 500 ms.
    await vi.advanceTimersByTimeAsync(600)
    const results = await promise

    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(true)
    expect(rule.executionCount).toBe(1)
    expect(e.getMetrics().successfulExecutions).toBe(1)
    expect(e.getMetrics().mostUsedHarness).toBe('h1')
  })
})

describe('Condition evaluation branches', () => {
  it('keyword_match operator returns true when content contains the keyword', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-kw',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'contextual',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'keyword_match', operator: 'contains', value: 'debug' }],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [message('1', 'please DEBUG this', 0)],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(1)
  })

  it('agent_status equals matches active agents', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-agent',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'contextual',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'agent_status', operator: 'equals', value: 'running' }],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [],
      activeAgents: [agent('a1', 'running')],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(1)
  })

  it('message_count greater_than evaluates correctly', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-cnt',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'frequency',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'message_count', operator: 'greater_than', value: 2 }],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [message('1', '', 0), message('2', '', 0), message('3', '', 0)],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(1)
  })
})

describe('Rule management + import/export', () => {
  it('addRule / updateRule / deleteRule mutate the rules list', () => {
    const e = new BundleAutomationEngine()
    const baseRule = {
      id: 'r1',
      name: 'a',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'temporal' as const,
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal' as const,
    }
    e.addRule(baseRule)
    e.updateRule('r1', { name: 'renamed' })
    expect(e.getRules()[0].name).toBe('renamed')
    e.deleteRule('r1')
    expect(e.getRules()).toHaveLength(0)
  })

  it('exportRules / importRules round-trip the rule list', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r1',
      name: 'x',
      description: '',
      enabled: true,
      pattern: {
        id: '',
        patternType: 'temporal',
        description: '',
        detectedAt: 0,
        confidence: 1,
        triggers: [],
        suggestedHarness: [],
        metadata: {},
      },
      harnessIds: [],
      conditions: [],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const json = e.exportRules()
    const e2 = new BundleAutomationEngine()
    e2.importRules(json)
    expect(e2.getRules()).toHaveLength(1)
    // Invalid input is silently ignored.
    e2.importRules('not json')
    expect(e2.getRules()).toHaveLength(1)
    errSpy.mockRestore()
  })

  it('clearHistory resets metrics', () => {
    const e = new BundleAutomationEngine()
    e.clearHistory()
    expect(e.getExecutionHistory()).toEqual([])
    expect(e.getMetrics().totalExecutions).toBe(0)
  })

  it('exports a singleton', () => {
    expect(bundleAutomation).toBeInstanceOf(BundleAutomationEngine)
  })
})
