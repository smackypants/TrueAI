import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatedCard } from './AnimatedCard'

describe('AnimatedCard', () => {
  it('renders children', () => {
    render(<AnimatedCard>Hello Card</AnimatedCard>)
    expect(screen.getByText('Hello Card')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<AnimatedCard className="my-custom-class">content</AnimatedCard>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('my-custom-class')
  })

  it('always applies base styling classes', () => {
    const { container } = render(<AnimatedCard>content</AnimatedCard>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('backdrop-blur-sm')
    expect(card.className).toContain('bg-card/80')
  })

  it('applies hover shadow class when hover=true (default)', () => {
    const { container } = render(<AnimatedCard>content</AnimatedCard>)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('hover:shadow-xl')
  })

  it('does not apply hover shadow class when hover=false', () => {
    const { container } = render(<AnimatedCard hover={false}>content</AnimatedCard>)
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('hover:shadow-xl')
  })

  it('has displayName AnimatedCard', () => {
    expect(AnimatedCard.displayName).toBe('AnimatedCard')
  })

  it('forwards ref to underlying div', () => {
    let ref: HTMLDivElement | null = null
    render(
      <AnimatedCard ref={(el) => { ref = el }}>content</AnimatedCard>
    )
    expect(ref).toBeInstanceOf(HTMLElement)
  })

  it('renders multiple children', () => {
    render(
      <AnimatedCard>
        <span>Child 1</span>
        <span>Child 2</span>
      </AnimatedCard>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })
})
