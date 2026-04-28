import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LazyErrorBoundary } from './LazyErrorBoundary'

// Component that unconditionally throws during render
function AlwaysThrows() {
  throw new Error('Test render error')
}

// Component that renders normally
function NormalChild() {
  return <div>Child rendered successfully</div>
}

describe('LazyErrorBoundary', () => {
  beforeAll(() => {
    // Suppress React error boundary console output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <LazyErrorBoundary>
        <NormalChild />
      </LazyErrorBoundary>
    )
    expect(screen.getByText('Child rendered successfully')).toBeInTheDocument()
  })

  it('shows error UI when a child throws', () => {
    render(
      <LazyErrorBoundary>
        <AlwaysThrows />
      </LazyErrorBoundary>
    )
    expect(screen.getByText('Component Failed to Load')).toBeInTheDocument()
  })

  it('shows default fallback message when no fallbackMessage is provided', () => {
    render(
      <LazyErrorBoundary>
        <AlwaysThrows />
      </LazyErrorBoundary>
    )
    expect(screen.getByText(/Unable to load this component/i)).toBeInTheDocument()
  })

  it('shows custom fallback message when provided', () => {
    render(
      <LazyErrorBoundary fallbackMessage="Something went wrong loading the panel.">
        <AlwaysThrows />
      </LazyErrorBoundary>
    )
    expect(screen.getByText('Something went wrong loading the panel.')).toBeInTheDocument()
  })

  it('shows custom component name in the heading', () => {
    render(
      <LazyErrorBoundary componentName="Analytics Panel">
        <AlwaysThrows />
      </LazyErrorBoundary>
    )
    expect(screen.getByText('Analytics Panel Failed to Load')).toBeInTheDocument()
  })

  it('shows the error message in the Technical Details section', () => {
    render(
      <LazyErrorBoundary>
        <AlwaysThrows />
      </LazyErrorBoundary>
    )
    expect(screen.getByText('Technical Details')).toBeInTheDocument()
    expect(screen.getByText(/Test render error/)).toBeInTheDocument()
  })

  it('renders a Retry button in error state', () => {
    render(
      <LazyErrorBoundary>
        <AlwaysThrows />
      </LazyErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
  })

  it('resets the error state when Retry is clicked', async () => {
    const user = userEvent.setup()

    // Use an external flag so we can switch from "always throw" to "never throw"
    // without relying on render counts (which are unreliable in React 18 concurrent mode)
    let throwEnabled = true
    function FlaggedThrow() {
      if (throwEnabled) throw new Error('Flag-controlled error')
      return <div>Recovered content</div>
    }

    render(
      <LazyErrorBoundary>
        <FlaggedThrow />
      </LazyErrorBoundary>
    )

    // Initial render: always throws → error boundary shows error UI
    expect(screen.getByText('Component Failed to Load')).toBeInTheDocument()

    // Disable throwing before clicking Retry so the recovery render succeeds
    throwEnabled = false
    await user.click(screen.getByRole('button', { name: /Retry/i }))

    // After reset + successful re-render, children should be visible
    expect(screen.getByText('Recovered content')).toBeInTheDocument()
  })

  it('does not show error UI for normal children', () => {
    render(
      <LazyErrorBoundary>
        <NormalChild />
      </LazyErrorBoundary>
    )
    expect(screen.queryByText(/Failed to Load/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument()
  })
})
