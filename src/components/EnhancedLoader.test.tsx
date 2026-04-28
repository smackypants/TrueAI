import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnhancedLoader } from './EnhancedLoader'

describe('EnhancedLoader', () => {
  it('renders without crashing', () => {
    const { container } = render(<EnhancedLoader />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows message when provided', () => {
    render(<EnhancedLoader message="Loading data..." />)
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('does not show message element when message is not provided', () => {
    render(<EnhancedLoader />)
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })

  it('renders 3 bouncing dot elements', () => {
    const { container } = render(<EnhancedLoader />)
    // The dots are siblings under a flex div; they each have class bg-accent rounded-full
    const dots = container.querySelectorAll('.bg-accent.rounded-full')
    expect(dots.length).toBe(3)
  })

  it('applies sm size classes when size="sm"', () => {
    const { container } = render(<EnhancedLoader size="sm" />)
    // The spinner div should have the sm size class
    const spinner = container.querySelector('.h-6.w-6')
    expect(spinner).toBeInTheDocument()
  })

  it('applies md size classes when size="md" (default)', () => {
    const { container } = render(<EnhancedLoader />)
    const spinner = container.querySelector('.h-10.w-10')
    expect(spinner).toBeInTheDocument()
  })

  it('applies lg size classes when size="lg"', () => {
    const { container } = render(<EnhancedLoader size="lg" />)
    const spinner = container.querySelector('.h-16.w-16')
    expect(spinner).toBeInTheDocument()
  })

  it('has displayName EnhancedLoader', () => {
    expect(EnhancedLoader.displayName).toBe('EnhancedLoader')
  })

  it('renders inside a centered flex container', () => {
    const { container } = render(<EnhancedLoader message="Processing" />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('flex')
    expect(outer.className).toContain('items-center')
    expect(outer.className).toContain('justify-center')
  })
})
