import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LearningInsightsPanel } from './LearningInsightsPanel'
import type { Agent, AgentLearningMetrics, LearningInsight } from '@/lib/types'

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Learning Agent',
  goal: 'Improve',
  model: 'gpt-4o',
  tools: [],
  createdAt: Date.now(),
  status: 'idle',
}

const makeInsight = (overrides: Partial<LearningInsight> = {}): LearningInsight => ({
  id: 'i1',
  type: 'recommendation',
  title: 'Test Insight',
  description: 'Insight description',
  confidence: 0.85,
  actionable: true,
  applied: false,
  createdAt: Date.now(),
  ...overrides,
})

const makeMetrics = (overrides: Partial<AgentLearningMetrics> = {}): AgentLearningMetrics => ({
  agentId: 'agent-1',
  totalRuns: 10,
  averageRating: 3.5,
  improvementRate: 12.5,
  commonIssues: [],
  toolEffectiveness: [],
  parameterTrends: {
    temperature: { value: 0.7, trend: 'stable' },
    maxIterations: { value: 10, trend: 'improving' },
  },
  learningInsights: [],
  lastUpdated: Date.now(),
  ...overrides,
})

describe('LearningInsightsPanel', () => {
  it('renders "Learning Metrics" heading', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics()}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('Learning Metrics')).toBeInTheDocument()
  })

  it('shows agent name', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics()}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText(/learning agent/i)).toBeInTheDocument()
  })

  it('displays total runs count', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ totalRuns: 25 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('displays average rating', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ averageRating: 4.2 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('4.2')).toBeInTheDocument()
  })

  it('calls onTriggerLearning when "Analyze & Learn" clicked', () => {
    const onTriggerLearning = vi.fn()
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ totalRuns: 5 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={onTriggerLearning}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /analyze & learn/i }))
    expect(onTriggerLearning).toHaveBeenCalledOnce()
  })

  it('disables "Analyze & Learn" when totalRuns < 3', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ totalRuns: 2 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /analyze & learn/i })).toBeDisabled()
  })

  it('shows "Learning..." text when isLearning is true', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics()}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
        isLearning={true}
      />
    )
    expect(screen.getByText(/learning\.\.\./i)).toBeInTheDocument()
  })

  it('renders insights when provided', () => {
    const insights = [
      makeInsight({ id: 'i1', title: 'Insight Alpha' }),
      makeInsight({ id: 'i2', title: 'Insight Beta' }),
    ]
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ learningInsights: insights })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('Insight Alpha')).toBeInTheDocument()
    expect(screen.getByText('Insight Beta')).toBeInTheDocument()
  })

  it('calls onApplyInsight when Apply button clicked on an insight', () => {
    const onApplyInsight = vi.fn()
    const insights = [makeInsight({ id: 'i1', title: 'Apply me', applied: false })]
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ learningInsights: insights })}
        onApplyInsight={onApplyInsight}
        onTriggerLearning={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(onApplyInsight).toHaveBeenCalledOnce()
  })

  it('shows "Applied" label for applied insights (no Apply button)', () => {
    const insights = [makeInsight({ applied: true, actionable: true })]
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ learningInsights: insights })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument()
  })

  it('does not show Apply button for non-actionable insights', () => {
    const insights = [makeInsight({ actionable: false, applied: false })]
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ learningInsights: insights })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument()
  })

  it('renders insight types: pattern, improvement, regression, recommendation', () => {
    const insights = [
      makeInsight({ id: 'a', type: 'pattern', title: 'Pattern Insight' }),
      makeInsight({ id: 'b', type: 'improvement', title: 'Improvement Insight' }),
      makeInsight({ id: 'c', type: 'regression', title: 'Regression Insight' }),
      makeInsight({ id: 'd', type: 'recommendation', title: 'Recommendation Insight' }),
    ]
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ learningInsights: insights })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('Pattern Insight')).toBeInTheDocument()
    expect(screen.getByText('Improvement Insight')).toBeInTheDocument()
    expect(screen.getByText('Regression Insight')).toBeInTheDocument()
    expect(screen.getByText('Recommendation Insight')).toBeInTheDocument()
  })

  it('renders common issues section when issues present', () => {
    const metrics = makeMetrics({
      commonIssues: [
        { issue: 'timeout_error', count: 5 },
        { issue: 'memory_limit', count: 2 },
      ],
    })
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={metrics}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('Common Issues')).toBeInTheDocument()
    expect(screen.getByText('5 times')).toBeInTheDocument()
    expect(screen.getByText('2 times')).toBeInTheDocument()
    expect(screen.getByText('timeout error')).toBeInTheDocument()
    expect(screen.getByText('memory limit')).toBeInTheDocument()
  })

  it('hides common issues section when no issues', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ commonIssues: [] })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.queryByText('Common Issues')).not.toBeInTheDocument()
  })

  it('renders tool effectiveness section when tools present', () => {
    const metrics = makeMetrics({
      toolEffectiveness: [
        { tool: 'web_search', successRate: 0.92, useCount: 10 },
        { tool: 'code_exec', successRate: 0.75, useCount: 4 },
      ],
    })
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={metrics}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('Tool Effectiveness')).toBeInTheDocument()
    expect(screen.getByText('web search')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('code exec')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('hides tool effectiveness section when no tools', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ toolEffectiveness: [] })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.queryByText('Tool Effectiveness')).not.toBeInTheDocument()
  })

  it('shows declining trend for negative improvementRate', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ improvementRate: -10.0 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('-10.0%')).toBeInTheDocument()
  })

  it('shows stable trend for small positive improvementRate', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ improvementRate: 2.5 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('+2.5%')).toBeInTheDocument()
  })

  it('shows zero improvementRate as "0.0%"', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ improvementRate: 0 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('renders parameter trends for declining and stable directions', () => {
    const metrics = makeMetrics({
      parameterTrends: {
        temperature: { value: 0.9, trend: 'declining' },
        maxIterations: { value: 20, trend: 'stable' },
      },
    })
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={metrics}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('0.9')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('displays insight confidence percentage', () => {
    const insights = [makeInsight({ confidence: 0.72 })]
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ learningInsights: insights })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
      />
    )
    expect(screen.getByText('72% confident')).toBeInTheDocument()
  })

  it('disables Analyze & Learn when isLearning is true', () => {
    render(
      <LearningInsightsPanel
        agent={mockAgent}
        metrics={makeMetrics({ totalRuns: 10 })}
        onApplyInsight={vi.fn()}
        onTriggerLearning={vi.fn()}
        isLearning={true}
      />
    )
    const btn = screen.getByRole('button', { name: /learning\.\.\./i })
    expect(btn).toBeDisabled()
  })
})
