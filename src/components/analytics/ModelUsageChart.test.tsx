import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelUsageChart } from './ModelUsageChart'

describe('ModelUsageChart', () => {
  it('shows empty state when no data', () => {
    render(<ModelUsageChart data={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders model names', () => {
    render(<ModelUsageChart data={[{ model: 'gpt-4', count: 10 }, { model: 'llama', count: 5 }]} />)
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
    expect(screen.getByText('llama')).toBeInTheDocument()
  })

  it('renders counts', () => {
    render(<ModelUsageChart data={[{ model: 'gpt-4', count: 42 }]} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders tooltip titles', () => {
    const { container } = render(<ModelUsageChart data={[{ model: 'gpt-4', count: 10 }]} />)
    expect(container.querySelector('title')?.textContent).toContain('gpt-4')
  })

  it('renders an SVG chart for non-empty data', () => {
    const { container } = render(<ModelUsageChart data={[{ model: 'gpt-4', count: 5 }]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
