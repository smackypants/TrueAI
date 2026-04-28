import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopItemsList } from './TopItemsList'

describe('TopItemsList', () => {
  it('shows "No data available" when items is empty', () => {
    render(<TopItemsList items={[]} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders item labels', () => {
    const items = [
      { label: 'Llama 3', value: 150 },
      { label: 'Mistral 7B', value: 80 },
    ]
    render(<TopItemsList items={items} />)
    expect(screen.getByText('Llama 3')).toBeInTheDocument()
    expect(screen.getByText('Mistral 7B')).toBeInTheDocument()
  })

  it('renders item values as badges', () => {
    const items = [{ label: 'ModelA', value: 42 }]
    render(<TopItemsList items={items} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders progress bars for each item', () => {
    const items = [
      { label: 'A', value: 100 },
      { label: 'B', value: 50 },
    ]
    const { container } = render(<TopItemsList items={items} />)
    const progressBars = container.querySelectorAll('.bg-primary.rounded-full') as NodeListOf<HTMLElement>
    expect(progressBars.length).toBe(2)
  })

  it('sets max item bar to 100% width', () => {
    const items = [
      { label: 'Max', value: 100 },
      { label: 'Half', value: 50 },
    ]
    const { container } = render(<TopItemsList items={items} />)
    const bars = container.querySelectorAll('.bg-primary.rounded-full') as NodeListOf<HTMLElement>
    expect(bars[0].style.width).toBe('100%')
    expect(bars[1].style.width).toBe('50%')
  })

  it('renders a separator between items but not after the last', () => {
    const items = [
      { label: 'A', value: 10 },
      { label: 'B', value: 5 },
      { label: 'C', value: 3 },
    ]
    const { container } = render(<TopItemsList items={items} />)
    // Radix Separator with decorative=true renders with data-slot="separator-root"
    const separators = container.querySelectorAll('[data-slot="separator-root"]')
    // n items → n-1 separators
    expect(separators.length).toBe(2)
  })

  it('renders a single item correctly', () => {
    const items = [{ label: 'Only', value: 7 }]
    const { container } = render(<TopItemsList items={items} />)
    expect(screen.getByText('Only')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    // No separators for a single item
    expect(container.querySelectorAll('[data-slot="separator-root"]').length).toBe(0)
  })

  it('handles items with value of 0 without division errors', () => {
    const items = [
      { label: 'Has Value', value: 10 },
      { label: 'Zero', value: 0 },
    ]
    const { container } = render(<TopItemsList items={items} />)
    expect(screen.getByText('Has Value')).toBeInTheDocument()
    expect(screen.getByText('Zero')).toBeInTheDocument()
    const bars = container.querySelectorAll('.bg-primary.rounded-full') as NodeListOf<HTMLElement>
    expect(bars[0].style.width).toBe('100%')
    expect(bars[1].style.width).toBe('0%')
  })

  it('falls back to maxValue of 1 when all items have value 0', () => {
    const items = [{ label: 'Zero', value: 0 }]
    const { container } = render(<TopItemsList items={items} />)
    // maxValue = Math.max(0, 1) = 1, so percentage = 0/1*100 = 0%
    const bar = container.querySelector('.bg-primary.rounded-full') as HTMLElement
    expect(bar.style.width).toBe('0%')
  })
})
