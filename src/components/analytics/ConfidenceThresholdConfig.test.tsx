import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { ConfidenceThresholdConfig } from './ConfidenceThresholdConfig'
import type { ThresholdConfig } from '@/lib/confidence-thresholds'
import { DEFAULT_THRESHOLDS } from '@/lib/confidence-thresholds'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Radix Tabs trigger uses pointer-capture APIs not implemented in jsdom.
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
  Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture')
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

describe('ConfidenceThresholdConfig', () => {
  it('renders heading', () => {
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={vi.fn()}
      />
    )
    // "Confidence Thresholds" appears as both an <h3> and inside the
    // export-config payload — query the heading role to disambiguate.
    expect(
      screen.getByRole('heading', { name: /confidence thresholds/i })
    ).toBeInTheDocument()
  })

  it('renders preset buttons', () => {
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={vi.fn()}
      />
    )
    expect(screen.getByText('Conservative')).toBeInTheDocument()
    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getByText('Aggressive')).toBeInTheDocument()
  })

  it('calls onConfigChange when Conservative preset clicked', () => {
    const onConfigChange = vi.fn()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={onConfigChange}
      />
    )
    // Preset is a clickable Card (not a <button>); click the parent card
    // so the onClick handler on the Card receives the event.
    const conservativeText = screen.getByText('Conservative')
    const card = conservativeText.closest('[data-slot="card"]') as HTMLElement | null
    expect(card).not.toBeNull()
    fireEvent.click(card!)
    expect(onConfigChange).toHaveBeenCalledOnce()
  })

  it('renders severity threshold labels in the Advanced tab', async () => {
    const user = userEvent.setup()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={vi.fn()}
      />
    )
    // Radix TabsContent only mounts the active panel, so we need to switch
    // to the Advanced tab first. Use userEvent so Radix sees the full
    // pointerdown/up sequence (fireEvent.click alone doesn't trigger the
    // switch in jsdom).
    await user.click(screen.getByRole('tab', { name: /advanced/i }))
    expect(screen.getAllByText(/critical/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/high/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/medium/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/low/i).length).toBeGreaterThan(0)
  })

  it('renders session stats when provided', () => {
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={vi.fn()}
        sessionStats={{
          totalImplemented: 10,
          autoImplemented: 5,
          manualImplemented: 5,
          averageConfidence: 0.82,
        }}
      />
    )
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows Auto-Implement toggle', () => {
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={vi.fn()}
      />
    )
    // Multiple matches (label + body copy). Use the explicit Switch label.
    expect(
      screen.getByLabelText(/enable auto-implementation/i)
    ).toBeInTheDocument()
  })
})
