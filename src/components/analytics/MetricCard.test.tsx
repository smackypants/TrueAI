import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {

  it('renders the title', () => {
    render(<MetricCard title="Total Events" value={42} icon={<span>icon</span>} />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('renders a numeric value', () => {
    render(<MetricCard title="Count" value={99} icon={<span>icon</span>} />)
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(<MetricCard title="Status" value="Active" icon={<span>icon</span>} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(
      <MetricCard title="Test" value={1} icon={<span data-testid="metric-icon">★</span>} />
    )
    expect(screen.getByTestId('metric-icon')).toBeInTheDocument()
  })

  it('does not render trend section when trendValue is not provided', () => {
    const { container } = render(
      <MetricCard title="Test" value={1} icon={<span>icon</span>} />
    )
    expect(container.querySelector('.text-green-500')).not.toBeInTheDocument()
    expect(container.querySelector('.text-red-500')).not.toBeInTheDocument()
  })

  it('renders up trend with green styling and trendValue', () => {
    const { container } = render(
      <MetricCard title="Test" value={1} icon={<span>icon</span>} trend="up" trendValue="+10%" />
    )
    expect(screen.getByText('+10%')).toBeInTheDocument()
    expect(container.querySelector('.text-green-500')).toBeInTheDocument()
  })

  it('renders down trend with red styling and trendValue', () => {
    const { container } = render(
      <MetricCard title="Test" value={1} icon={<span>icon</span>} trend="down" trendValue="-5%" />
    )
    expect(screen.getByText('-5%')).toBeInTheDocument()
    expect(container.querySelector('.text-red-500')).toBeInTheDocument()
  })

  it('renders neutral trend with muted styling and trendValue', () => {
    render(
      <MetricCard title="Test" value={1} icon={<span>icon</span>} trend="neutral" trendValue="0%" />
    )
    const trendSpan = screen.getByText('0%')
    expect(trendSpan.className).toContain('text-muted-foreground')
  })

  it('defaults to neutral trend when trend prop is omitted', () => {
    render(
      <MetricCard title="Test" value={1} icon={<span>icon</span>} trendValue="5%" />
    )
    // Default trend is 'neutral' → trendValue renders with muted styling
    const trendSpan = screen.getByText('5%')
    expect(trendSpan.className).toContain('text-muted-foreground')
  })

  it('adds pulse ring class when value changes', () => {
    const { container, rerender } = render(
      <MetricCard title="Test" value={10} icon={<span>icon</span>} />
    )
    // No pulse on initial render
    const card = container.querySelector('.ring-2')
    expect(card).not.toBeInTheDocument()

    // Update value to trigger pulse
    rerender(<MetricCard title="Test" value={20} icon={<span>icon</span>} />)
    expect(container.querySelector('.ring-2')).toBeInTheDocument()
  })

  it('accepts isUpdating prop without errors (backwards compat)', () => {
    // isUpdating is kept for backwards compatibility but intentionally unused
    expect(() => {
      render(<MetricCard title="Test" value={1} icon={<span>icon</span>} isUpdating={true} />)
    }).not.toThrow()
  })

  it('renders numeric value of zero', () => {
    render(<MetricCard title="Total" value={0} icon={<span>icon</span>} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('does not trigger pulse when value stays the same', () => {
    const { container, rerender } = render(
      <MetricCard title="Test" value={10} icon={<span>icon</span>} />
    )
    rerender(<MetricCard title="Test" value={10} icon={<span>icon</span>} />)
    expect(container.querySelector('.ring-2')).not.toBeInTheDocument()
  })
})
