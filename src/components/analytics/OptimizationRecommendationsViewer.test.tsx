import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OptimizationRecommendationsViewer } from './OptimizationRecommendationsViewer'
import type { OptimizationInsight } from '@/lib/auto-optimizer'

// Apply All button is only rendered when there is at least one actionable
// insight (one with `suggestedAction` that isn't already applied).
const actionableInsight: OptimizationInsight = {
  id: 'insight-1',
  type: 'performance',
  severity: 'high',
  title: 'Reduce response time',
  description: 'Switch to a faster model for short prompts',
  recommendation: 'Use a smaller model',
  impact: 'Reduce latency by ~40%',
  confidence: 0.9,
  affectedModels: ['model-1'],
  suggestedAction: { type: 'change_model', details: {} },
  timestamp: Date.now(),
}

describe('OptimizationRecommendationsViewer', () => {
  it('renders heading', () => {
    render(
      <OptimizationRecommendationsViewer
        insights={[]}
        autoTuneRecommendations={[]}
        models={[]}
        appliedInsights={new Set()}
        onApplyInsight={vi.fn()}
        onApplyAutoTune={vi.fn()}
        onApplyAll={vi.fn()}
      />
    )
    expect(screen.getByText(/optimization recommendations/i)).toBeInTheDocument()
  })

  it('renders empty state when no insights', () => {
    render(
      <OptimizationRecommendationsViewer
        insights={[]}
        autoTuneRecommendations={[]}
        models={[]}
        appliedInsights={new Set()}
        onApplyInsight={vi.fn()}
        onApplyAutoTune={vi.fn()}
        onApplyAll={vi.fn()}
      />
    )
    // Empty-state copy is "No insights found" (not "No recommendations").
    expect(screen.getByText(/no insights found/i)).toBeInTheDocument()
  })

  it('shows "Apply All" button when actionable insights exist', () => {
    render(
      <OptimizationRecommendationsViewer
        insights={[actionableInsight]}
        autoTuneRecommendations={[]}
        models={[]}
        appliedInsights={new Set()}
        onApplyInsight={vi.fn()}
        onApplyAutoTune={vi.fn()}
        onApplyAll={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /apply all/i })).toBeInTheDocument()
  })

  it('calls onApplyAll when Apply All clicked', () => {
    const onApplyAll = vi.fn()
    render(
      <OptimizationRecommendationsViewer
        insights={[actionableInsight]}
        autoTuneRecommendations={[]}
        models={[]}
        appliedInsights={new Set()}
        onApplyInsight={vi.fn()}
        onApplyAutoTune={vi.fn()}
        onApplyAll={onApplyAll}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /apply all/i }))
    expect(onApplyAll).toHaveBeenCalledOnce()
  })
})
