import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BenchmarkRunner } from './BenchmarkRunner'

vi.mock('@/lib/model-benchmark', async () => {
  const actual = await vi.importActual<typeof import('@/lib/model-benchmark')>('@/lib/model-benchmark')
  return {
    ...actual,
    runModelBenchmark: vi.fn(() => Promise.resolve({
      id: 'suite-1', modelId: 'm1', parameters: {}, tests: [],
      overallScore: 80, averageResponseTime: 100, averageTokensPerSecond: 50,
      timestamp: Date.now(), status: 'completed'
    }))
  }
})

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const mockModel = {
  id: 'm1', name: 'Test Model', provider: 'ollama' as const,
  temperature: 0.7, maxTokens: 2000, topP: 0.9,
  frequencyPenalty: 0, presencePenalty: 0
}

describe('BenchmarkRunner', () => {
  it('renders without crashing', () => {
    render(<BenchmarkRunner models={[mockModel]} />)
    expect(screen.getByText(/run benchmark/i)).toBeInTheDocument()
  })

  it('shows model name in selector', () => {
    render(<BenchmarkRunner models={[mockModel]} />)
    expect(screen.getByText('Test Model')).toBeInTheDocument()
  })

  it('renders benchmark test checkboxes', () => {
    const { container } = render(<BenchmarkRunner models={[mockModel]} />)
    const checkboxes = container.querySelectorAll('[role="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('renders with empty models array', () => {
    render(<BenchmarkRunner models={[]} />)
    expect(screen.getByText(/run benchmark/i)).toBeInTheDocument()
  })

  it('calls onBenchmarkComplete prop if provided', () => {
    const cb = vi.fn()
    render(<BenchmarkRunner models={[mockModel]} onBenchmarkComplete={cb} />)
    expect(cb).not.toHaveBeenCalled()
  })
})
