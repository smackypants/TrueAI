import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

// HardwareOptimizer uses useKV from @github/spark/hooks
// The global spark mock in test setup covers this

import { HardwareOptimizer } from './HardwareOptimizer'

describe('HardwareOptimizer', () => {
  it('renders heading', () => {
    render(<HardwareOptimizer />)
    expect(screen.getByText(/hardware optim/i)).toBeInTheDocument()
  })

  it('renders Scan Device button', () => {
    render(<HardwareOptimizer />)
    // The component auto-starts a scan on mount, so the button label is
    // either "Scan Device" or "Scanning..." depending on timing. Match
    // both so the test isn't flaky.
    expect(
      screen.getByRole('button', { name: /scan device|scanning/i })
    ).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    render(<HardwareOptimizer />)
    expect(document.body).toBeTruthy()
  })
})
