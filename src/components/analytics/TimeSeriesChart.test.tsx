import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeSeriesChart } from './TimeSeriesChart'

describe('TimeSeriesChart', () => {
  it('shows empty state when no data', () => {
    render(<TimeSeriesChart data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders SVG for non-empty data', () => {
    const { container } = render(<TimeSeriesChart data={[{ date: '2024-01-01', count: 5 }]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders circles for each data point', () => {
    const { container } = render(<TimeSeriesChart data={[
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 }
    ]} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(2)
  })

  it('renders tooltip with date and count', () => {
    const { container } = render(<TimeSeriesChart data={[{ date: '2024-01-01', count: 7 }]} />)
    expect(container.querySelector('title')?.textContent).toContain('7 events')
  })

  it('shows up to 7 date labels', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ date: `2024-01-0${i + 1}`, count: i }))
    const { container } = render(<TimeSeriesChart data={data} />)
    const labels = container.querySelectorAll('.text-center.min-w-\\[40px\\]')
    expect(labels.length).toBeLessThanOrEqual(7)
  })
})
