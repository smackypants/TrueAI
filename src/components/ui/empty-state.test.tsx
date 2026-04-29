import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState illustration="/img.png" title="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders the image with the provided src and uses title as alt text', () => {
    render(<EmptyState illustration="/test-img.png" title="My title" />)
    const img = screen.getByRole('img', { name: 'My title' })
    expect(img).toHaveAttribute('src', '/test-img.png')
  })

  it('renders description when provided', () => {
    render(<EmptyState illustration="/img.png" title="Title" description="Some description" />)
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<EmptyState illustration="/img.png" title="Title" />)
    // Only the title is present, no extra paragraph
    expect(screen.queryByText('Some description')).not.toBeInTheDocument()
  })

  it('renders an action slot when provided', () => {
    render(
      <EmptyState
        illustration="/img.png"
        title="Title"
        action={<button>Click me</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('does not render an action wrapper when action is not provided', () => {
    const { container } = render(<EmptyState illustration="/img.png" title="Title" />)
    // The action wrapper div has class "mt-4"
    expect(container.querySelector('.mt-4')).not.toBeInTheDocument()
  })

  it('applies sm size classes to the image', () => {
    const { container } = render(
      <EmptyState illustration="/img.png" title="Title" size="sm" />
    )
    expect(container.querySelector('img')?.className).toContain('w-24')
    expect(container.querySelector('img')?.className).toContain('h-24')
  })

  it('applies md size classes by default', () => {
    const { container } = render(<EmptyState illustration="/img.png" title="Title" />)
    expect(container.querySelector('img')?.className).toContain('w-32')
    expect(container.querySelector('img')?.className).toContain('h-32')
  })

  it('applies lg size classes to the image', () => {
    const { container } = render(
      <EmptyState illustration="/img.png" title="Title" size="lg" />
    )
    expect(container.querySelector('img')?.className).toContain('w-48')
    expect(container.querySelector('img')?.className).toContain('h-48')
  })

  it('applies a custom className to the outer wrapper', () => {
    const { container } = render(
      <EmptyState illustration="/img.png" title="Title" className="custom-class" />
    )
    expect((container.firstChild as HTMLElement).className).toContain('custom-class')
  })
})
