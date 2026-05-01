import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BenchmarkComparison } from './BenchmarkComparison'
import type { BenchmarkComparison as BenchmarkComparisonType } from '@/lib/benchmark'

const mockMetrics = {
  renderTime: 50,
  interactionLatency: 20,
  memoryUsage: 100,
  frameRate: 60,
  loadTime: 800,
  timestamp: Date.now(),
}

const makeResult = (label: string, score: number) => ({
  id: label,
  label,
  metrics: mockMetrics,
  settings: {
    maxTokens: 2048,
    enableAnimations: true,
    enableBackgroundEffects: false,
    streamingChunkSize: 10,
  },
  score,
})

const mockComparison: BenchmarkComparisonType = {
  before: makeResult('Baseline', 70),
  after: makeResult('Optimized', 85),
  improvements: {
    renderTime: 20,
    interactionLatency: 10,
    memoryUsage: -5,
    frameRate: 5,
    loadTime: 15,
    overallScore: 21.4,
  },
}

describe('BenchmarkComparison', () => {
  it('renders "Performance Comparison" heading', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
  })

  it('renders before and after labels', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText('Baseline')).toBeInTheDocument()
    expect(screen.getByText('Optimized')).toBeInTheDocument()
  })

  it('renders before score', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText('70')).toBeInTheDocument()
  })

  it('renders after score', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('renders improvement percentages', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    // +21.4% overall improvement should appear somewhere - may be in multiple elements
    const matches = screen.getAllByText(/21\.4/)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('shows "Excellent optimization" insight when overallScore > 20', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText(/excellent optimization/i)).toBeInTheDocument()
  })

  it('shows render time insight when renderTime > 10', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText(/render time improved/i)).toBeInTheDocument()
  })

  it('shows memory usage insight when memoryUsage improvement > 10', () => {
    const comparison: BenchmarkComparisonType = {
      ...mockComparison,
      improvements: {
        ...mockComparison.improvements,
        memoryUsage: 15,
      },
    }
    render(<BenchmarkComparison comparison={comparison} />)
    expect(screen.getByText(/memory footprint reduced/i)).toBeInTheDocument()
  })

  it('shows frame rate insight when frameRate > 5', () => {
    const comparison: BenchmarkComparisonType = {
      ...mockComparison,
      improvements: {
        ...mockComparison.improvements,
        frameRate: 10,
      },
    }
    render(<BenchmarkComparison comparison={comparison} />)
    expect(screen.getByText(/frame rate increased/i)).toBeInTheDocument()
  })

  it('shows "no significant improvement" when overallScore <= 0', () => {
    const comparison: BenchmarkComparisonType = {
      ...mockComparison,
      improvements: {
        ...mockComparison.improvements,
        overallScore: 0,
        renderTime: 0,
        frameRate: 0,
        memoryUsage: 0,
      },
    }
    render(<BenchmarkComparison comparison={comparison} />)
    expect(screen.getByText(/no significant improvement/i)).toBeInTheDocument()
  })

  it('uses destructive badge variant when overallScore is negative', () => {
    const comparison: BenchmarkComparisonType = {
      ...mockComparison,
      improvements: { ...mockComparison.improvements, overallScore: -5 },
    }
    render(<BenchmarkComparison comparison={comparison} />)
    // badge should contain "-5%" (no + prefix) — multiple badges may show -5%
    const matches = screen.getAllByText('-5%')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders "Performance Insights" section heading', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText('Performance Insights')).toBeInTheDocument()
  })

  it('renders metric cards: Render Time, Interaction Latency, Frame Rate, Memory Usage, Load Time', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    expect(screen.getByText('Render Time')).toBeInTheDocument()
    expect(screen.getByText('Interaction Latency')).toBeInTheDocument()
    expect(screen.getByText('Frame Rate')).toBeInTheDocument()
    expect(screen.getByText('Memory Usage')).toBeInTheDocument()
    expect(screen.getByText('Load Time')).toBeInTheDocument()
  })

  it('shows "N/A" and "Memory API not available" when memoryUsage values are 0', () => {
    const comparison: BenchmarkComparisonType = {
      before: makeResult('Baseline', 70),
      after: makeResult('Optimized', 85),
      improvements: { ...mockComparison.improvements },
    }
    comparison.before.metrics = { ...comparison.before.metrics, memoryUsage: 0 }
    comparison.after.metrics = { ...comparison.after.metrics, memoryUsage: 0 }
    render(<BenchmarkComparison comparison={comparison} />)
    const nas = screen.getAllByText('N/A')
    expect(nas.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Memory API not available')).toBeInTheDocument()
  })

  it('applies green text color for high score (>=80)', () => {
    const comparison: BenchmarkComparisonType = {
      ...mockComparison,
      after: makeResult('Optimized', 90),
    }
    const { container } = render(<BenchmarkComparison comparison={comparison} />)
    // Score 90 should get text-green-500 class
    const scoreEl = container.querySelector('.text-green-500')
    expect(scoreEl).toBeTruthy()
  })

  it('applies red text for very low score (<40)', () => {
    const comparison: BenchmarkComparisonType = {
      ...mockComparison,
      before: makeResult('Baseline', 20),
    }
    const { container } = render(<BenchmarkComparison comparison={comparison} />)
    const redEl = container.querySelector('.text-red-500')
    expect(redEl).toBeTruthy()
  })

  it('renders Before / After labels inside metric cards', () => {
    render(<BenchmarkComparison comparison={mockComparison} />)
    const befores = screen.getAllByText('Before')
    const afters = screen.getAllByText('After')
    expect(befores.length).toBeGreaterThanOrEqual(5)
    expect(afters.length).toBeGreaterThanOrEqual(5)
  })
})
