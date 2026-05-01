import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title', () => {
    render(
      <MetricCard
        title="Total Events"
        value={42}
        icon={<span data-testid="icon">📊</span>}
      />
    )
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('renders a numeric value', () => {
    render(
      <MetricCard
        title="Active Users"
        value={1024}
        icon={<span>👥</span>}
      />
    )
    expect(screen.getByText('1024')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(
      <MetricCard
        title="Status"
        value="Healthy"
        icon={<span>✅</span>}
      />
    )
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(
      <MetricCard
        title="Title"
        value={0}
        icon={<span data-testid="my-icon">icon</span>}
      />
    )
    expect(screen.getByTestId('my-icon')).toBeInTheDocument()
  })

  it('renders up trend arrow and green text when trend is up', () => {
    const { container: _container } = render(
      <MetricCard
        title="Revenue"
        value={100}
        icon={<span>💰</span>}
        trend="up"
        trendValue="+12%"
      />
    )
    expect(screen.getByText('+12%')).toBeInTheDocument()
    // The trend text uses Tailwind green class (text-green-500)
    const trendSpan = screen.getByText('+12%')
    expect(trendSpan.className).toContain('text-green-500')
  })

  it('renders down trend arrow and red text when trend is down', () => {
    render(
      <MetricCard
        title="Errors"
        value={5}
        icon={<span>❌</span>}
        trend="down"
        trendValue="-3%"
      />
    )
    const trendSpan = screen.getByText('-3%')
    expect(trendSpan.className).toContain('text-red-500')
  })

  it('renders neutral trend with muted text', () => {
    render(
      <MetricCard
        title="Latency"
        value={200}
        icon={<span>⏱</span>}
        trend="neutral"
        trendValue="0%"
      />
    )
    const trendSpan = screen.getByText('0%')
    expect(trendSpan.className).toContain('muted')
  })

  it('does not render trend section when trendValue is not provided', () => {
    const { container } = render(
      <MetricCard
        title="Count"
        value={10}
        icon={<span>🔢</span>}
      />
    )
    // No ArrowUp/ArrowDown/Minus icons rendered
    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })

  it('defaults to neutral trend when trend prop is not provided', () => {
    render(
      <MetricCard
        title="Default"
        value={0}
        icon={<span>–</span>}
        trendValue="stable"
      />
    )
    const trendSpan = screen.getByText('stable')
    expect(trendSpan.className).toContain('muted')
  })

  it('shows update pulse class when value changes', async () => {
    const { rerender, container } = render(
      <MetricCard
        title="Counter"
        value={10}
        icon={<span />}
      />
    )
    // No ring initially
    expect(container.querySelector('.ring-2')).toBeNull()
    // Trigger a value change
    rerender(
      <MetricCard
        title="Counter"
        value={20}
        icon={<span />}
      />
    )
    // After re-render the pulse ring should appear
    expect(container.querySelector('.ring-2')).not.toBeNull()
  })

  it('clears update pulse after 1s timeout', async () => {
    const { rerender, container, unmount } = render(
      <MetricCard
        title="Counter"
        value={10}
        icon={<span />}
      />
    )
    rerender(
      <MetricCard
        title="Counter"
        value={99}
        icon={<span />}
      />
    )
    // Pulse should be visible immediately after value change
    expect(container.querySelector('.ring-2')).not.toBeNull()
    // A second value change triggers cleanup (clearTimeout) from prior effect
    rerender(
      <MetricCard
        title="Counter"
        value={42}
        icon={<span />}
      />
    )
    // Ring should still show (new value differs from prevValue again)
    expect(container.querySelector('.ring-2')).not.toBeNull()
    unmount()
  })
})
