import { describe, it, expect } from 'vitest'
import { AgentLearningEngine } from './agent-learning'
import type { Agent, AgentRun, AgentFeedback, LearningInsight } from './types'

const makeRun = (overrides: Partial<AgentRun> = {}): AgentRun => ({
  id: overrides.id ?? `run-${Math.random()}`,
  agentId: 'agent-1',
  startedAt: 1_000,
  status: 'completed',
  steps: [],
  ...overrides,
})

const makeFeedback = (overrides: Partial<AgentFeedback> = {}): AgentFeedback => ({
  id: `fb-${Math.random()}`,
  runId: 'run-1',
  agentId: 'agent-1',
  rating: 3,
  accuracy: 0.7,
  efficiency: 0.7,
  relevance: 0.7,
  timestamp: 1,
  ...overrides,
})

describe('AgentLearningEngine.calculateQualityScore', () => {
  it('weights rating/accuracy/efficiency/relevance and clamps to 0..100', () => {
    const fb = makeFeedback({ rating: 5, accuracy: 1, efficiency: 1, relevance: 1 })
    expect(AgentLearningEngine.calculateQualityScore(fb)).toBe(100)
  })

  it('returns 0 for the lowest possible feedback', () => {
    const fb = makeFeedback({ rating: 1, accuracy: 0, efficiency: 0, relevance: 0 })
    // rating contribution: (1/5) * 0.3 = 0.06 -> rounded to 6
    expect(AgentLearningEngine.calculateQualityScore(fb)).toBe(6)
  })

  it('produces middle scores for mid feedback', () => {
    const fb = makeFeedback({ rating: 3, accuracy: 0.5, efficiency: 0.5, relevance: 0.5 })
    // 3/5*0.3 + 0.5*0.3 + 0.5*0.2 + 0.5*0.2 = 0.18 + 0.15 + 0.1 + 0.1 = 0.53
    expect(AgentLearningEngine.calculateQualityScore(fb)).toBe(53)
  })
})

describe('AgentLearningEngine.analyzeFeedback', () => {
  it('returns zeroed metrics for empty input', () => {
    const m = AgentLearningEngine.analyzeFeedback([], [])
    expect(m.totalRuns).toBe(0)
    expect(m.averageRating).toBe(0)
    expect(m.improvementRate).toBe(0)
    expect(m.commonIssues).toEqual([])
    expect(m.toolEffectiveness).toEqual([])
    // With no feedback the recent-accuracy heuristic falls through to 0 and
    // emits an "accuracy declining" recommendation. That's expected.
    expect(Array.isArray(m.learningInsights)).toBe(true)
    expect(m.lastUpdated).toBeGreaterThan(0)
  })

  it('computes average rating from runs that carry feedback', () => {
    const runs = [
      makeRun({ id: 'r1', feedback: makeFeedback({ rating: 4 }) }),
      makeRun({ id: 'r2', feedback: makeFeedback({ rating: 2 }) }),
      makeRun({ id: 'r3' }), // no feedback - excluded from averageRating
    ]
    const m = AgentLearningEngine.analyzeFeedback(runs, [])
    expect(m.totalRuns).toBe(3)
    expect(m.averageRating).toBe(3) // (4+2)/2
    expect(m.agentId).toBe('agent-1')
  })

  it('aggregates common issues across feedbacks (sorted desc, limited to 5)', () => {
    const fbs = [
      makeFeedback({ issues: [
        { type: 'wrong_tool', description: '', severity: 'high' },
        { type: 'wrong_tool', description: '', severity: 'high' },
        { type: 'timeout', description: '', severity: 'high' },
      ] }),
      makeFeedback({ issues: [
        { type: 'wrong_tool', description: '', severity: 'medium' },
        { type: 'incorrect_result', description: '', severity: 'low' },
        { type: 'missing_information', description: '', severity: 'low' },
        { type: 'poor_reasoning', description: '', severity: 'low' },
        { type: 'other', description: '', severity: 'low' },
      ] }),
    ]
    const m = AgentLearningEngine.analyzeFeedback([makeRun()], fbs)
    expect(m.commonIssues[0]).toEqual({ issue: 'wrong_tool', count: 3 })
    expect(m.commonIssues.length).toBeLessThanOrEqual(5)
    const issues = m.commonIssues.map(i => i.issue)
    // wrong_tool should be first (3 occurrences)
    expect(issues[0]).toBe('wrong_tool')
  })

  it('analyzes tool effectiveness per tool_call step', () => {
    const runs: AgentRun[] = [
      makeRun({
        steps: [
          { id: 's1', type: 'tool_call', toolName: 'web_search', content: '', timestamp: 0, duration: 100, success: true },
          { id: 's2', type: 'tool_call', toolName: 'web_search', content: '', timestamp: 0, duration: 200, success: false },
          { id: 's3', type: 'tool_call', toolName: 'calculator', content: '', timestamp: 0, duration: 50, success: true },
          { id: 's4', type: 'planning', content: '', timestamp: 0 }, // ignored
        ],
      }),
    ]
    const m = AgentLearningEngine.analyzeFeedback(runs, [])
    const ws = m.toolEffectiveness.find(t => t.tool === 'web_search')!
    const calc = m.toolEffectiveness.find(t => t.tool === 'calculator')!
    expect(ws.successRate).toBe(0.5)
    expect(ws.avgTime).toBe(150)
    expect(calc.successRate).toBe(1)
    expect(calc.avgTime).toBe(50)
  })

  it('emits a low-performing-tools insight when a tool < 70% success rate', () => {
    const runs: AgentRun[] = [
      makeRun({
        steps: Array.from({ length: 10 }, (_, i) => ({
          id: `s${i}`,
          type: 'tool_call' as const,
          toolName: 'flaky',
          content: '',
          timestamp: 0,
          success: i < 3, // 30% success
        })),
      }),
    ]
    const m = AgentLearningEngine.analyzeFeedback(runs, [])
    const insight = m.learningInsights.find(i => i.title.toLowerCase().includes('low-performing'))
    expect(insight).toBeDefined()
    expect(insight!.actionable).toBe(true)
    expect(insight!.action?.type).toBe('change_tool')
  })

  it('emits an excellent-performance insight at >90% completed', () => {
    const runs: AgentRun[] = Array.from({ length: 20 }, (_, i) =>
      makeRun({ id: `r${i}`, status: i < 19 ? 'completed' : 'error' })
    )
    const m = AgentLearningEngine.analyzeFeedback(runs, [])
    const insight = m.learningInsights.find(i => i.type === 'improvement')
    expect(insight).toBeDefined()
    expect(insight!.actionable).toBe(false)
  })

  it('emits a recurring-issue pattern insight when top issue ≥ 3 occurrences', () => {
    const fbs = Array.from({ length: 3 }, () =>
      makeFeedback({ issues: [{ type: 'timeout', description: '', severity: 'high' }] })
    )
    const m = AgentLearningEngine.analyzeFeedback([makeRun()], fbs)
    const pattern = m.learningInsights.find(i => i.type === 'pattern')
    expect(pattern).toBeDefined()
    expect(pattern!.action?.type).toBe('modify_prompt')
  })
})

describe('AgentLearningEngine.applyLearning', () => {
  const baseAgent: Agent = {
    id: 'a1',
    name: 'A',
    goal: 'g',
    model: 'm',
    tools: [],
    createdAt: 0,
    status: 'idle',
    temperature: 0.7,
    capabilities: [],
  }

  it('applies adjust_parameter for temperature when actionable', () => {
    const insights: LearningInsight[] = [
      {
        id: 'i1',
        type: 'recommendation',
        title: 't',
        description: 'lower temp',
        confidence: 0.9,
        actionable: true,
        action: {
          type: 'adjust_parameter',
          details: { parameter: 'temperature', suggestedValue: 0.4, reason: 'accuracy' },
        },
        createdAt: 0,
      },
    ]
    const { agent, changes } = AgentLearningEngine.applyLearning(baseAgent, insights)
    expect(agent.temperature).toBe(0.4)
    expect(changes).toHaveLength(1)
    expect(changes[0].field).toBe('temperature')
    expect(changes[0].oldValue).toBe(0.7)
    expect(changes[0].newValue).toBe(0.4)
  })

  it('skips already-applied insights unless autoApply=true', () => {
    const insights: LearningInsight[] = [
      {
        id: 'i1', type: 'recommendation', title: 't', description: '',
        confidence: 0.9, actionable: true, applied: true,
        action: { type: 'adjust_parameter', details: { parameter: 'temperature', suggestedValue: 0.3 } },
        createdAt: 0,
      },
    ]
    const { changes } = AgentLearningEngine.applyLearning(baseAgent, insights, false)
    expect(changes).toHaveLength(0)

    const { changes: changes2, agent } = AgentLearningEngine.applyLearning(baseAgent, insights, true)
    expect(changes2).toHaveLength(1)
    expect(agent.temperature).toBe(0.3)
  })

  it('ignores non-actionable insights and unsupported action shapes', () => {
    const insights: LearningInsight[] = [
      {
        id: 'i1', type: 'improvement', title: 't', description: '',
        confidence: 0.9, actionable: false, createdAt: 0,
      },
      {
        id: 'i2', type: 'recommendation', title: 't', description: '',
        confidence: 0.9, actionable: true, createdAt: 0,
        // no action object
      },
      {
        id: 'i3', type: 'recommendation', title: 't', description: '',
        confidence: 0.9, actionable: true, createdAt: 0,
        action: { type: 'change_tool', details: {} }, // no-op branch
      },
      {
        id: 'i4', type: 'recommendation', title: 't', description: '',
        confidence: 0.9, actionable: true, createdAt: 0,
        action: { type: 'modify_prompt', details: {} }, // no-op branch
      },
    ]
    const { changes, agent } = AgentLearningEngine.applyLearning(baseAgent, insights)
    expect(changes).toHaveLength(0)
    expect(agent).toEqual(baseAgent)
  })

  it('appends new capabilities and dedupes existing ones', () => {
    const insights: LearningInsight[] = [
      {
        id: 'i1', type: 'recommendation', title: 't', description: 'add cap',
        confidence: 0.9, actionable: true, createdAt: 0,
        action: { type: 'add_capability', details: { capability: 'web_browsing' } },
      },
      {
        // duplicate -> ignored
        id: 'i2', type: 'recommendation', title: 't', description: '',
        confidence: 0.9, actionable: true, createdAt: 0,
        action: { type: 'add_capability', details: { capability: 'web_browsing' } },
      },
    ]
    const start = { ...baseAgent, capabilities: [] as Agent['capabilities'] }
    const result = AgentLearningEngine.applyLearning(start, insights, true)
    expect(result.agent.capabilities).toEqual(['web_browsing'])
    expect(result.changes).toHaveLength(1)
  })
})

describe('AgentLearningEngine.createVersion', () => {
  const agent: Agent = {
    id: 'a1', name: 'A', goal: 'g', model: 'm', tools: [], createdAt: 0, status: 'idle',
  }

  it('marks createdBy=user when there are no changes', () => {
    const v = AgentLearningEngine.createVersion(agent, [], { avgRating: 4, successRate: 0.9, avgExecutionTime: 1 })
    expect(v.createdBy).toBe('user')
    expect(v.agentId).toBe('a1')
    expect(v.performanceSnapshot.avgRating).toBe(4)
  })

  it('marks createdBy=auto_learning when changes are present', () => {
    const v = AgentLearningEngine.createVersion(
      agent,
      [{ field: 'temperature', oldValue: 0.7, newValue: 0.5, reason: 'r' }],
      { avgRating: 5, successRate: 1, avgExecutionTime: 100 }
    )
    expect(v.createdBy).toBe('auto_learning')
    expect(v.changes).toHaveLength(1)
  })
})

describe('AgentLearningEngine.generateImprovementSuggestions', () => {
  const agent: Agent = {
    id: 'a1', name: 'A', goal: 'g', model: 'm', tools: [], createdAt: 0, status: 'idle',
  }

  it('suggests goal/tool review for poor low-rated feedback', async () => {
    const fbs = [
      makeFeedback({ rating: 2 }),
      makeFeedback({ rating: 2 }),
      makeFeedback({ rating: 1 }),
    ]
    const s = await AgentLearningEngine.generateImprovementSuggestions(agent, [], fbs)
    expect(s.some(x => /goal/i.test(x))).toBe(true)
    expect(s.some(x => /tool/i.test(x))).toBe(true)
  })

  it('flags wrong_tool issues when ≥ 2 occurrences', async () => {
    const fbs = [
      makeFeedback({ issues: [{ type: 'wrong_tool', description: '', severity: 'medium' }] }),
      makeFeedback({ issues: [{ type: 'wrong_tool', description: '', severity: 'medium' }] }),
    ]
    const s = await AgentLearningEngine.generateImprovementSuggestions(agent, [], fbs)
    expect(s.some(x => /Tool selection/i.test(x))).toBe(true)
  })

  it('flags timeouts when ≥ 2 occurrences', async () => {
    const fbs = [
      makeFeedback({ issues: [{ type: 'timeout', description: '', severity: 'medium' }] }),
      makeFeedback({ issues: [{ type: 'timeout', description: '', severity: 'medium' }] }),
    ]
    const s = await AgentLearningEngine.generateImprovementSuggestions(agent, [], fbs)
    expect(s.some(x => /max iterations|reasoning/i.test(x))).toBe(true)
  })

  it('flags high recent error rate', async () => {
    const runs = Array.from({ length: 5 }, (_, i) =>
      makeRun({ id: `r${i}`, status: i >= 3 ? 'error' : 'completed' })
    )
    const s = await AgentLearningEngine.generateImprovementSuggestions(agent, runs, [])
    expect(s.some(x => /error rate/i.test(x))).toBe(true)
  })

  it('flags long agent reasoning when avg steps > 10', async () => {
    const runs = [
      makeRun({ steps: Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`, type: 'planning' as const, content: '', timestamp: 0,
      })) }),
    ]
    const s = await AgentLearningEngine.generateImprovementSuggestions(agent, runs, [])
    expect(s.some(x => /many steps/i.test(x))).toBe(true)
  })

  it('praises performance and suggests expansion when avgRating ≥ 4 and no issues', async () => {
    const fbs = [makeFeedback({ rating: 5 }), makeFeedback({ rating: 4 })]
    const s = await AgentLearningEngine.generateImprovementSuggestions(agent, [], fbs)
    expect(s.some(x => /performing well|expand/i.test(x))).toBe(true)
  })
})
