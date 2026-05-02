import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
          const { children, ...rest } = props
          const {
            initial: _i, animate: _a, exit: _e, transition: _t,
            whileHover: _w, whileTap: _wt, layout: _l, layoutId: _li,
            ...domProps
          } = rest as Record<string, unknown>
          void _i; void _a; void _e; void _t; void _w; void _wt; void _l; void _li
          return <div {...(domProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
        },
      },
    ),
  }
})

import { OptimizationRecommendationsViewer } from './OptimizationRecommendationsViewer'
import type { OptimizationInsight } from '@/lib/auto-optimizer'
import type { AutoTuneRecommendation, ModelConfig, ModelParameters } from '@/lib/types'

beforeEach(() => {
  // Radix popper / scroll polyfills for jsdom
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  }
})

const baseInsight = (over: Partial<OptimizationInsight> = {}): OptimizationInsight => ({
  id: 'insight-1',
  type: 'performance',
  severity: 'high',
  title: 'Reduce response time',
  description: 'Switch to a faster model for short prompts',
  recommendation: 'Use a smaller model',
  impact: 'Reduce latency by ~40%',
  confidence: 0.9,
  affectedModels: ['model-1'],
  suggestedAction: { type: 'change_model', details: { newModel: 'fast' } },
  timestamp: 1700000000000,
  ...over,
})

const mkParams = (over: Partial<ModelParameters> = {}): ModelParameters => ({
  temperature: 0.7,
  maxTokens: 1024,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
  ...over,
})

const mkAutoTune = (over: Partial<AutoTuneRecommendation> = {}): AutoTuneRecommendation => ({
  taskType: 'code_generation',
  currentParams: mkParams(),
  recommendedParams: mkParams({ temperature: 0.3, maxTokens: 2048, topP: 0.8 }),
  reasoning: 'Lower temperature improves code accuracy',
  expectedImprovements: { quality: '+15%', speed: '+10%' },
  confidence: 0.88,
  ...over,
})

const mkModel = (id = 'm1', name = 'Model One'): ModelConfig =>
  ({ id, name } as unknown as ModelConfig)

const renderViewer = (props: Partial<React.ComponentProps<typeof OptimizationRecommendationsViewer>> = {}) =>
  render(
    <OptimizationRecommendationsViewer
      insights={[]}
      autoTuneRecommendations={[]}
      models={[]}
      appliedInsights={new Set()}
      onApplyInsight={vi.fn()}
      onApplyAutoTune={vi.fn()}
      onApplyAll={vi.fn()}
      {...props}
    />,
  )

describe('OptimizationRecommendationsViewer', () => {
  it('renders heading and empty state with zero-insights copy', () => {
    renderViewer()
    expect(screen.getByText(/AI Optimization Recommendations/i)).toBeInTheDocument()
    expect(screen.getByText(/No insights found/i)).toBeInTheDocument()
    expect(screen.getByText(/Use the app to generate data/i)).toBeInTheDocument()
  })

  it('renders summary counts: critical, high, applied, total', () => {
    const insights = [
      baseInsight({ id: 'a', severity: 'critical' }),
      baseInsight({ id: 'b', severity: 'critical' }),
      baseInsight({ id: 'c', severity: 'high' }),
      baseInsight({ id: 'd', severity: 'medium' }),
      baseInsight({ id: 'e', severity: 'low' }),
    ]
    renderViewer({ insights, appliedInsights: new Set(['c']) })
    // Locate summary cards via their label <p> elements (text-xs muted)
    const labelToCount = (label: string) => {
      const labelEl = screen
        .getAllByText(label)
        .find((el) => el.tagName === 'P' && el.className.includes('text-xs'))!
      return labelEl.parentElement!.querySelector('p.text-2xl')!.textContent
    }
    expect(labelToCount('Critical')).toBe('2')
    expect(labelToCount('High Priority')).toBe('0') // the only high is unapplied → 1; recompute
    // Above: highCount counts unapplied highs. Insight 'c' is high AND applied. So 0. ✓
    expect(labelToCount('Applied')).toBe('1')
    expect(labelToCount('Total Insights')).toBe('5')
  })

  it('shows Apply All button only when actionable insights exist; calls onApplyAll', () => {
    const onApplyAll = vi.fn()
    const { rerender } = renderViewer({
      insights: [baseInsight({ suggestedAction: undefined })],
      onApplyAll,
    })
    expect(screen.queryByRole('button', { name: /Apply All/i })).toBeNull()
    rerender(
      <OptimizationRecommendationsViewer
        insights={[baseInsight()]}
        autoTuneRecommendations={[]}
        models={[]}
        appliedInsights={new Set()}
        onApplyInsight={vi.fn()}
        onApplyAutoTune={vi.fn()}
        onApplyAll={onApplyAll}
      />,
    )
    const applyAll = screen.getByRole('button', { name: /Apply All/i })
    expect(applyAll).toBeInTheDocument()
    fireEvent.click(applyAll)
    expect(onApplyAll).toHaveBeenCalledOnce()
  })

  it('Apply All is disabled while isAnalyzing', () => {
    renderViewer({ insights: [baseInsight()], isAnalyzing: true })
    expect(screen.getByRole('button', { name: /Apply All/i })).toBeDisabled()
  })

  it('list view: clicking Apply on an unapplied insight calls onApplyInsight; applied insights show "Applied" badge instead', () => {
    const onApplyInsight = vi.fn()
    const insights = [
      baseInsight({ id: 'a', title: 'Insight A' }),
      baseInsight({ id: 'b', title: 'Insight B' }),
    ]
    renderViewer({ insights, appliedInsights: new Set(['b']), onApplyInsight })
    // Insight A has Apply button; click it
    const cardA = screen.getByText('Insight A').closest('.flex.items-start')!.parentElement!
    fireEvent.click(within(cardA).getByRole('button', { name: /^Apply$/ }))
    expect(onApplyInsight).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
    // Insight B should not have Apply button
    const cardB = screen.getByText('Insight B').closest('.flex.items-start')!.parentElement!
    expect(within(cardB).queryByRole('button', { name: /^Apply$/ })).toBeNull()
    expect(within(cardB).getByText(/Applied/i)).toBeInTheDocument()
  })

  it('severity filter narrows to a single severity; type filter narrows to a single type', async () => {
    const user = userEvent.setup()
    const insights = [
      baseInsight({ id: 'a', title: 'Crit Item', severity: 'critical', type: 'performance' }),
      baseInsight({ id: 'b', title: 'Med Item', severity: 'medium', type: 'quality' }),
      baseInsight({ id: 'c', title: 'Low Item', severity: 'low', type: 'efficiency' }),
    ]
    renderViewer({ insights })
    expect(screen.getByText('Crit Item')).toBeInTheDocument()
    expect(screen.getByText('Med Item')).toBeInTheDocument()

    // Helper: find the clickable filter badge (span.cursor-pointer) by its label
    const filterBadge = (label: string | RegExp) =>
      screen
        .getAllByText(label)
        .find((el) => el.tagName === 'SPAN' && el.className.includes('cursor-pointer'))!

    await user.click(filterBadge('Critical'))
    expect(screen.getByText('Crit Item')).toBeInTheDocument()
    expect(screen.queryByText('Med Item')).toBeNull()

    // Reset severity, then filter by type=quality
    await user.click(filterBadge('All'))
    await user.click(filterBadge(/^Quality$/))
    expect(screen.getByText('Med Item')).toBeInTheDocument()
    expect(screen.queryByText('Crit Item')).toBeNull()
  })

  it('Pending and Applied toggles filter accordingly and are mutually exclusive', () => {
    const insights = [
      baseInsight({ id: 'a', title: 'Pending Item' }),
      baseInsight({ id: 'b', title: 'Applied Item' }),
    ]
    renderViewer({ insights, appliedInsights: new Set(['b']) })
    fireEvent.click(screen.getByRole('button', { name: /Pending/i }))
    expect(screen.getByText('Pending Item')).toBeInTheDocument()
    expect(screen.queryByText('Applied Item')).toBeNull()
    // Click the "Applied" toggle button (filter button, not the summary card)
    const appliedBtn = screen
      .getAllByText('Applied')
      .map((el) => el.closest('button'))
      .find((b): b is HTMLButtonElement => !!b && b.className.includes('h-8'))!
    fireEvent.click(appliedBtn)
    expect(screen.getByText('Applied Item')).toBeInTheDocument()
    expect(screen.queryByText('Pending Item')).toBeNull()
  })

  it('shows "Try adjusting your filters" when filters hide all insights', () => {
    renderViewer({
      insights: [baseInsight({ severity: 'low' })],
    })
    const criticalFilter = screen
      .getAllByText('Critical')
      .find((el) => el.tagName === 'SPAN' && el.className.includes('cursor-pointer'))!
    fireEvent.click(criticalFilter)
    expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument()
  })

  it('Detailed view: selecting an insight renders DetailedInsightView and Apply applies it', async () => {
    const user = userEvent.setup()
    const onApplyInsight = vi.fn()
    const insights = [
      baseInsight({ id: 'a', title: 'Detail Title', recommendation: 'Detail rec', impact: 'Detail impact' }),
    ]
    renderViewer({ insights, onApplyInsight })
    await user.click(screen.getByRole('tab', { name: /Detailed View/i }))
    expect(screen.getByText(/Select an insight to view details/i)).toBeInTheDocument()
    // Click the insight row in the left panel
    await user.click(screen.getByRole('button', { name: /Detail Title/i }))
    expect(screen.getByText(/Detail rec/)).toBeInTheDocument()
    expect(screen.getByText(/Detail impact/)).toBeInTheDocument()
    // Strongly recommended (confidence 0.9 ≥ 0.9)
    expect(screen.getByText(/strongly recommended/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Apply This Optimization/i }))
    expect(onApplyInsight).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('Detailed view renders varied confidence labels and hides Apply when already applied', async () => {
    const user = userEvent.setup()
    renderViewer({
      insights: [baseInsight({ id: 'a', confidence: 0.5, suggestedAction: undefined })],
      appliedInsights: new Set(['a']),
    })
    await user.click(screen.getByRole('tab', { name: /Detailed View/i }))
    await user.click(screen.getByRole('button', { name: /Reduce response time/i }))
    expect(screen.getByText(/Low confidence - review before applying/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Apply This Optimization/i })).toBeNull()
  })

  it('renders Auto-Tune Recommendations section with parameter changes and triggers onApplyAutoTune', () => {
    const onApplyAutoTune = vi.fn()
    const rec = mkAutoTune()
    renderViewer({
      insights: [baseInsight()],
      autoTuneRecommendations: [rec],
      models: [mkModel('m1', 'Model One')],
      onApplyAutoTune,
    })
    expect(screen.getByText(/Auto-Tune Recommendations/i)).toBeInTheDocument()
    expect(screen.getByText(/Lower temperature improves code accuracy/i)).toBeInTheDocument()
    // Parameter changes (only those that differ): Temperature, Max Tokens, Top P
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('Max Tokens')).toBeInTheDocument()
    expect(screen.getByText('Top P')).toBeInTheDocument()
    // Expected improvements list
    expect(screen.getByText(/quality:/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Apply Auto-Tune/i }))
    expect(onApplyAutoTune).toHaveBeenCalledWith(rec, 'm1')
  })
})
