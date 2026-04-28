import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FloatingActionButton } from './floating-action-button'

describe('FloatingActionButton', () => {
  it('renders with an icon', () => {
    render(
      <FloatingActionButton onClick={vi.fn()} icon={<span data-testid="icon">+</span>} />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<FloatingActionButton onClick={onClick} icon={<span>+</span>} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders label when provided', () => {
    render(
      <FloatingActionButton onClick={vi.fn()} icon={<span />} label="New Chat" />
    )
    expect(screen.getByText('New Chat')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(<FloatingActionButton onClick={vi.fn()} icon={<span />} />)
    // No text content other than the icon
    expect(screen.queryByText('New Chat')).not.toBeInTheDocument()
  })

  it('applies sm size class', () => {
    const { container } = render(
      <FloatingActionButton onClick={vi.fn()} icon={<span />} size="sm" />
    )
    expect(container.querySelector('.h-14')).toBeInTheDocument()
  })

  it('applies md size class (default)', () => {
    const { container } = render(
      <FloatingActionButton onClick={vi.fn()} icon={<span />} />
    )
    expect(container.querySelector('.h-16')).toBeInTheDocument()
  })

  it('applies lg size class', () => {
    const { container } = render(
      <FloatingActionButton onClick={vi.fn()} icon={<span />} size="lg" />
    )
    expect(container.querySelector('.h-18')).toBeInTheDocument()
  })

  it('applies a custom className', () => {
    const { container } = render(
      <FloatingActionButton onClick={vi.fn()} icon={<span />} className="my-fab" />
    )
    expect(container.querySelector('.my-fab')).toBeInTheDocument()
  })

  it('is a button element', () => {
    render(<FloatingActionButton onClick={vi.fn()} icon={<span>X</span>} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
