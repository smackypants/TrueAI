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

  it('toggles Auto-Implementation switch', () => {
    const onConfigChange = vi.fn()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={onConfigChange}
      />
    )
    fireEvent.click(screen.getByLabelText(/enable auto-implementation/i))
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ autoImplementEnabled: !DEFAULT_THRESHOLDS.autoImplementEnabled })
    )
  })

  it.each([
    ['balanced', /balanced/i],
    ['aggressive', /aggressive/i],
  ])('applies %s preset on click', (_label, matcher) => {
    const onConfigChange = vi.fn()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={onConfigChange}
      />
    )
    const text = screen.getAllByText(matcher).find(el => el.tagName === 'H4')!
    const card = text.closest('[data-slot="card"]') as HTMLElement
    fireEvent.click(card)
    expect(onConfigChange).toHaveBeenCalledOnce()
  })

  it('toggles a manual approval switch on the Advanced tab', async () => {
    const user = userEvent.setup()
    const onConfigChange = vi.fn()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={onConfigChange}
      />
    )
    await user.click(screen.getByRole('tab', { name: /advanced/i }))
    // The first switch is the global Enable Auto-Implementation toggle (in
    // the always-mounted top card). The first per-severity manual-approval
    // switch lives in the Severity-Based Thresholds card; locate by row text.
    const criticalRow = screen.getByText(/^critical$/i).closest('div.flex.items-center.justify-between') as HTMLElement
    fireEvent.click(criticalRow.querySelector('button[role="switch"]') as HTMLButtonElement)
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        thresholds: expect.objectContaining({
          critical: expect.objectContaining({
            requiresManualApproval: !DEFAULT_THRESHOLDS.thresholds.critical.requiresManualApproval,
          }),
        }),
      })
    )
  })

  it('toggles Require Confirmation and Enable Notifications switches', async () => {
    const user = userEvent.setup()
    const onConfigChange = vi.fn()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={onConfigChange}
      />
    )
    await user.click(screen.getByRole('tab', { name: /advanced/i }))
    // Locate by label text within the Global Settings card
    const reqConfirmRow = screen.getByText('Require Confirmation').closest('div.flex.items-center.justify-between') as HTMLElement
    fireEvent.click(reqConfirmRow.querySelector('button[role="switch"]') as HTMLButtonElement)
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ requireConfirmation: !DEFAULT_THRESHOLDS.requireConfirmation })
    )

    onConfigChange.mockClear()
    const notifRow = screen.getByText('Enable Notifications').closest('div.flex.items-center.justify-between') as HTMLElement
    fireEvent.click(notifRow.querySelector('button[role="switch"]') as HTMLButtonElement)
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ enableNotifications: !DEFAULT_THRESHOLDS.enableNotifications })
    )
  })

  it('toggles allowed action types (add and remove)', async () => {
    const user = userEvent.setup()
    const onConfigChange = vi.fn()
    render(
      <ConfidenceThresholdConfig
        config={DEFAULT_THRESHOLDS}
        onConfigChange={onConfigChange}
      />
    )
    await user.click(screen.getByRole('tab', { name: /advanced/i }))
    const addProfileRow = screen.getByText('Add Profile').closest('div.flex.items-center.justify-between') as HTMLElement
    const sw = addProfileRow.querySelector('button[role="switch"]') as HTMLButtonElement
    fireEvent.click(sw)
    expect(onConfigChange).toHaveBeenCalledOnce()
    const firstCall = onConfigChange.mock.calls[0][0]
    expect(firstCall.allowedActionTypes).toBeDefined()
  })

  it('exports the configuration as a JSON blob', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    try {
      render(
        <ConfidenceThresholdConfig
          config={DEFAULT_THRESHOLDS}
          onConfigChange={vi.fn()}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /export/i }))
      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(clickSpy).toHaveBeenCalledOnce()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      clickSpy.mockRestore()
    }
  })

  it('imports a configuration JSON file via the hidden input', async () => {
    const onConfigChange = vi.fn()
    // Capture the dynamically created file input
    let capturedInput: HTMLInputElement | null = null
    const realCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: unknown[]) => {
      const el = realCreate(tag as keyof HTMLElementTagNameMap, ...(rest as []))
      if (tag === 'input') {
        capturedInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el
    })

    try {
      render(
        <ConfidenceThresholdConfig
          config={DEFAULT_THRESHOLDS}
          onConfigChange={onConfigChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /import/i }))
      expect(capturedInput).not.toBeNull()
      const imported: ThresholdConfig = { ...DEFAULT_THRESHOLDS, maxAutoImplementPerSession: 7 }
      const file = new File([JSON.stringify(imported)], 'cfg.json', { type: 'application/json' })
      // Drive onchange directly with a constructed File - firing change on a
      // detached input doesn't trigger the handler.
      Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true })
      capturedInput!.onchange?.({ target: capturedInput } as unknown as Event)
      // Poll for the FileReader callback to fire onConfigChange
      await new Promise<void>((resolve) => {
        const start = Date.now()
        const tick = () => {
          if (onConfigChange.mock.calls.length > 0 || Date.now() - start > 1000) {
            resolve()
          } else setTimeout(tick, 5)
        }
        tick()
      })
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxAutoImplementPerSession: 7 })
      )
    } finally {
      createSpy.mockRestore()
    }
  })

  it('handles invalid JSON during import', async () => {
    const { toast } = await import('sonner')
    const onConfigChange = vi.fn()
    let capturedInput: HTMLInputElement | null = null
    const realCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: unknown[]) => {
      const el = realCreate(tag as keyof HTMLElementTagNameMap, ...(rest as []))
      if (tag === 'input') {
        capturedInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el
    })

    try {
      render(
        <ConfidenceThresholdConfig
          config={DEFAULT_THRESHOLDS}
          onConfigChange={onConfigChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /import/i }))
      const file = new File(['not json {{{'], 'cfg.json', { type: 'application/json' })
      Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true })
      capturedInput!.onchange?.({ target: capturedInput } as unknown as Event)
      await new Promise((r) => setTimeout(r, 50))
      expect(toast.error).toHaveBeenCalledWith('Invalid configuration file')
      expect(onConfigChange).not.toHaveBeenCalled()
    } finally {
      createSpy.mockRestore()
    }
  })
})
