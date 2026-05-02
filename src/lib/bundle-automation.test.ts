import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BundleAutomationEngine, bundleAutomation, type BundleExecutionResult } from './bundle-automation'
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

describe('Pattern-detection branch coverage', () => {
  it('frequency pattern incorporates agent.createdAt timestamps', () => {
    const e = new BundleAutomationEngine()
    const ts = new Date('2024-01-01T12:00:00Z').getTime()
    // 0 messages but 6 agents — exercises ..._agents.map(a => a.createdAt).
    const agents = Array.from({ length: 6 }, (_, i) => ({
      ...agent(`a${i}`),
      createdAt: ts + i,
    }))
    const patterns = e.analyzeUsagePatterns([], agents, [], [])
    expect(patterns.find(p => p.id === 'frequency-high-usage')).toBeDefined()
  })

  it('temporal pattern at 18:00 suggests research_agent', () => {
    const e = new BundleAutomationEngine()
    const ts = new Date('2024-01-01T20:00:00Z').getTime()
    const messages = Array.from({ length: 6 }, (_, i) =>
      message(`m${i}`, 'hi', ts + i),
    )
    const patterns = e.analyzeUsagePatterns(messages, [], [], [])
    const temporal = patterns.find(p => p.patternType === 'temporal')
    expect(temporal).toBeDefined()
    expect(temporal!.suggestedHarness).toContain('research_agent')
  })

  it('temporal pattern outside 9-22 window has no suggested harness', () => {
    const e = new BundleAutomationEngine()
    // 03:00 UTC — outside both windows. Use timestamps that map to local hour 3.
    const baseTs = new Date('2024-01-01T03:00:00Z').getTime()
    // Build 5 events at the same local hour as baseTs.
    const messages = Array.from({ length: 6 }, (_, i) =>
      message(`m${i}`, 'hi', baseTs + i),
    )
    const patterns = e.analyzeUsagePatterns(messages, [], [], [])
    const temporal = patterns.find(p => p.patternType === 'temporal')
    if (temporal) {
      // Either not in 9-17 nor 18-22: empty array.
      const localHour = new Date(baseTs).getHours()
      if (!(localHour >= 9 && localHour <= 22)) {
        expect(temporal.suggestedHarness).toEqual([])
      }
    }
  })

  it('sequential pattern with web_search/memory suggests research_agent', () => {
    const e = new BundleAutomationEngine()
    const runs = [
      run('r1', 0, ['web_search', 'memory']),
      run('r2', 1, ['web_search', 'memory']),
    ]
    const patterns = e.analyzeUsagePatterns([], [], runs, [])
    const seq = patterns.find(p => p.patternType === 'sequential')
    expect(seq).toBeDefined()
    expect(seq!.suggestedHarness).toContain('research_agent')
  })

  it('sequential pattern with code_interpreter/file_reader suggests code_assistant', () => {
    const e = new BundleAutomationEngine()
    const runs = [
      run('r1', 0, ['code_interpreter', 'file_reader']),
      run('r2', 1, ['code_interpreter', 'file_reader']),
    ]
    const patterns = e.analyzeUsagePatterns([], [], runs, [])
    const seq = patterns.find(p => p.patternType === 'sequential')
    expect(seq).toBeDefined()
    expect(seq!.suggestedHarness).toContain('code_assistant')
  })

  it('sequential pattern with unknown tools yields empty suggested harness', () => {
    const e = new BundleAutomationEngine()
    const runs = [
      run('r1', 0, ['mystery_tool']),
      run('r2', 1, ['mystery_tool']),
    ]
    const patterns = e.analyzeUsagePatterns([], [], runs, [])
    const seq = patterns.find(p => p.patternType === 'sequential')
    expect(seq).toBeDefined()
    expect(seq!.suggestedHarness).toEqual([])
  })

  it('getPatterns returns the most recently analyzed patterns', () => {
    const e = new BundleAutomationEngine()
    const ts = new Date('2024-01-01T13:00:00Z').getTime()
    const messages = Array.from({ length: 6 }, (_, i) => message(`m${i}`, 'hi', ts + i))
    e.analyzeUsagePatterns(messages, [], [], [])
    expect(e.getPatterns().length).toBeGreaterThan(0)
  })
})

describe('createRuleFromPattern trigger-type branches', () => {
  const baseHarness = harness('h1', 'code_assistant')

  it('creates a keyword_match condition from a keyword trigger', () => {
    const e = new BundleAutomationEngine()
    const rule = e.createRuleFromPattern(
      {
        id: 'p',
        patternType: 'contextual',
        description: 'd',
        detectedAt: 0,
        confidence: 0.5,
        triggers: [{ type: 'keyword', value: 'debug', weight: 1 }],
        suggestedHarness: ['code_assistant'],
        metadata: {},
      },
      [baseHarness],
    )
    expect(rule.conditions[0]).toMatchObject({
      type: 'keyword_match',
      operator: 'contains',
      value: 'debug',
    })
    // confidence 0.5 -> not enabled (autoEnable defaults to confidence > 0.7)
    expect(rule.enabled).toBe(false)
    // confidence <= 0.8 -> normal priority
    expect(rule.priority).toBe('normal')
  })

  it('creates a tool_used condition from a tool_sequence trigger', () => {
    const e = new BundleAutomationEngine()
    const rule = e.createRuleFromPattern(
      {
        id: 'p',
        patternType: 'sequential',
        description: 'd',
        detectedAt: 0,
        confidence: 0.9,
        triggers: [{ type: 'tool_sequence', value: ['calculator'], weight: 1 }],
        suggestedHarness: ['data_analyst'],
        metadata: {},
      },
      [harness('h2', 'data_analyst')],
    )
    expect(rule.conditions[0]).toMatchObject({
      type: 'tool_used',
      operator: 'equals',
    })
    // confidence 0.9 -> high priority by default
    expect(rule.priority).toBe('high')
    expect(rule.enabled).toBe(true)
  })

  it('creates a message_count condition from a frequency_threshold trigger', () => {
    const e = new BundleAutomationEngine()
    const rule = e.createRuleFromPattern(
      {
        id: 'p',
        patternType: 'frequency',
        description: 'd',
        detectedAt: 0,
        confidence: 0.8,
        triggers: [{ type: 'frequency_threshold', value: 7, weight: 1 }],
        suggestedHarness: ['code_assistant'],
        metadata: {},
      },
      [baseHarness],
      { cooldown: 1000 },
    )
    expect(rule.conditions[0]).toMatchObject({
      type: 'message_count',
      operator: 'greater_than',
      value: 7,
    })
    expect(rule.cooldown).toBe(1000)
  })
})

describe('evaluateRules sorting and remaining condition types', () => {
  it('sorts triggered rules by priority (critical > high > normal > low)', () => {
    const e = new BundleAutomationEngine()
    const mkRule = (id: string, priority: 'critical' | 'high' | 'normal' | 'low') => ({
      id,
      name: id,
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
      priority,
    })
    e.addRule(mkRule('r-low', 'low'))
    e.addRule(mkRule('r-crit', 'critical'))
    e.addRule(mkRule('r-norm', 'normal'))
    e.addRule(mkRule('r-high', 'high'))
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered.map(r => r.id)).toEqual(['r-crit', 'r-high', 'r-norm', 'r-low'])
  })

  it('tool_used equals condition matches when a recent run used the tool', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-tool',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '', patternType: 'sequential', description: '', detectedAt: 0,
        confidence: 1, triggers: [], suggestedHarness: [], metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'tool_used', operator: 'equals', value: 'calculator' }],
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
      activeAgents: [],
      recentRuns: [run('r1', 0, ['calculator'])],
    })
    expect(triggered).toHaveLength(1)
  })

  it('message_count less_than evaluates correctly', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-cnt-lt',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '', patternType: 'frequency', description: '', detectedAt: 0,
        confidence: 1, triggers: [], suggestedHarness: [], metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'message_count', operator: 'less_than', value: 5 }],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [message('1', '', 0)],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(1)
  })

  it('model_type contains operator matches recent message models', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-model',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '', patternType: 'contextual', description: '', detectedAt: 0,
        confidence: 1, triggers: [], suggestedHarness: [], metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'model_type', operator: 'contains', value: 'gpt-4' }],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [{ ...message('1', '', 0), model: 'gpt-4o' }],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(1)
  })

  it('honors the negate flag on a matched condition', () => {
    const e = new BundleAutomationEngine()
    e.addRule({
      id: 'r-neg',
      name: '',
      description: '',
      enabled: true,
      pattern: {
        id: '', patternType: 'frequency', description: '', detectedAt: 0,
        confidence: 1, triggers: [], suggestedHarness: [], metadata: {},
      },
      harnessIds: [],
      conditions: [{ type: 'message_count', operator: 'greater_than', value: 0, negate: true }],
      actions: [],
      cooldown: 0,
      executionCount: 0,
      successRate: 1,
      createdAt: 0,
      priority: 'normal',
    })
    const triggered = e.evaluateRules({
      currentTime: 0,
      recentMessages: [message('1', '', 0)],
      activeAgents: [],
      recentRuns: [],
    })
    expect(triggered).toHaveLength(0)
  })

  it('getMetrics sort comparator fires with multiple distinct rule/harness history entries', () => {
    const e = new BundleAutomationEngine()
    // Inject two distinct execution-history entries so the sort comparators
    // on ruleCounts / harnessCounts execute.
    type WithHistory = { executionHistory: BundleExecutionResult[] }
    ;(e as unknown as WithHistory).executionHistory = [
      {
        ruleId: 'r-a', harnessId: 'h-a', success: true,
        timestamp: 0, duration: 10, contextCaptured: {},
      },
      {
        ruleId: 'r-a', harnessId: 'h-a', success: true,
        timestamp: 1, duration: 20, contextCaptured: {},
      },
      {
        ruleId: 'r-b', harnessId: 'h-b', success: true,
        timestamp: 2, duration: 30, contextCaptured: {},
      },
    ]
    const m = e.getMetrics()
    expect(m.mostTriggeredRule).toBe('r-a')
    expect(m.mostUsedHarness).toBe('h-a')
    expect(m.averageDuration).toBe(20)
  })
})
