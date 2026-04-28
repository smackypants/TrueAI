import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryBreakdown } from './CategoryBreakdown'

describe('CategoryBreakdown', () => {
  it('shows "No data available" when data is empty', () => {
    render(<CategoryBreakdown data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders category names', () => {
    const data = [
      { type: 'chat_message', count: 50 },
      { type: 'agent_run', count: 30 },
    ]
    render(<CategoryBreakdown data={data} />)
    expect(screen.getByText('chat_message')).toBeInTheDocument()
    expect(screen.getByText('agent_run')).toBeInTheDocument()
  })

  it('renders count values', () => {
    const data = [{ type: 'chat_message', count: 50 }]
    render(<CategoryBreakdown data={data} />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('renders percentage for each item', () => {
    const data = [
      { type: 'A', count: 75 },
      { type: 'B', count: 25 },
    ]
    render(<CategoryBreakdown data={data} />)
    expect(screen.getByText('(75.0%)')).toBeInTheDocument()
    expect(screen.getByText('(25.0%)')).toBeInTheDocument()
  })

  it('renders at most 5 items when more are provided', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      type: `Type ${i + 1}`,
      count: 10,
    }))
    render(<CategoryBreakdown data={data} />)
    expect(screen.getByText('Type 1')).toBeInTheDocument()
    expect(screen.getByText('Type 5')).toBeInTheDocument()
    expect(screen.queryByText('Type 6')).not.toBeInTheDocument()
    expect(screen.queryByText('Type 7')).not.toBeInTheDocument()
    expect(screen.queryByText('Type 8')).not.toBeInTheDocument()
  })

  it('renders a single item at 100%', () => {
    const data = [{ type: 'only-item', count: 100 }]
    render(<CategoryBreakdown data={data} />)
    expect(screen.getByText('only-item')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('(100.0%)')).toBeInTheDocument()
  })

  it('renders progress bars for each item', () => {
    const data = [
      { type: 'A', count: 60 },
      { type: 'B', count: 40 },
    ]
    const { container } = render(<CategoryBreakdown data={data} />)
    // Each item has a progress bar container with bg-muted and rounded-full
    const progressContainers = container.querySelectorAll('.bg-muted.rounded-full')
    expect(progressContainers.length).toBe(2)
  })

  it('sets inner bar width proportional to percentage', () => {
    const data = [
      { type: 'A', count: 60 },
      { type: 'B', count: 40 },
    ]
    const { container } = render(<CategoryBreakdown data={data} />)
    const innerBars = container.querySelectorAll('.bg-muted.rounded-full > div') as NodeListOf<HTMLElement>
    // A: 60/100=60%, B: 40/100=40%
    expect(innerBars[0].style.width).toBe('60%')
    expect(innerBars[1].style.width).toBe('40%')
  })

  it('renders colored dots for each category', () => {
    const data = [
      { type: 'Cat1', count: 10 },
      { type: 'Cat2', count: 5 },
    ]
    const { container } = render(<CategoryBreakdown data={data} />)
    const colorDots = container.querySelectorAll('.w-3.h-3.rounded-full')
    expect(colorDots.length).toBe(2)
  })
})
