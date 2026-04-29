import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
  it('should render a badge element', () => {
    render(<Badge>Badge text</Badge>)
    const badge = screen.getByText('Badge text')
    expect(badge).toBeInTheDocument()
  })

  it('should render as a span by default', () => {
    render(<Badge data-testid="badge">Text</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge.tagName).toBe('SPAN')
  })

  it('should have the data-slot attribute', () => {
    render(<Badge data-testid="badge">Text</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('should apply custom className', () => {
    render(<Badge className="custom-class" data-testid="badge">Text</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('custom-class')
  })

  it('should render with default variant', () => {
    render(<Badge data-testid="badge">Default</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge).toBeInTheDocument()
  })

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge).toBeInTheDocument()
  })

  it('should render with destructive variant', () => {
    render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge).toBeInTheDocument()
  })

  it('should render with outline variant', () => {
    render(<Badge variant="outline" data-testid="badge">Outline</Badge>)
    const badge = screen.getByTestId('badge')
    expect(badge).toBeInTheDocument()
  })

  it('should render as child component when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test" data-testid="badge-link">Link Badge</a>
      </Badge>
    )
    const link = screen.getByTestId('badge-link')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveAttribute('data-slot', 'badge')
  })

  it('should forward all props to the span element', () => {
    render(
      <Badge
        id="test-id"
        title="Test title"
        aria-label="Test badge"
        data-testid="badge"
      >
        Text
      </Badge>
    )
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveAttribute('id', 'test-id')
    expect(badge).toHaveAttribute('title', 'Test title')
    expect(badge).toHaveAttribute('aria-label', 'Test badge')
  })

  it('should render children content', () => {
    render(
      <Badge>
        <span>Icon</span>
        <span>Text</span>
      </Badge>
    )
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
  })

  it('should handle click events when rendered as button via asChild', async () => {
    let clicked = false
    const handleClick = () => { clicked = true }

    render(
      <Badge asChild>
        <button onClick={handleClick} data-testid="badge-button">
          Click me
        </button>
      </Badge>
    )
    const button = screen.getByTestId('badge-button')

    const userEvent = (await import('@testing-library/user-event')).default
    await userEvent.click(button)
    expect(clicked).toBe(true)
  })

  it('should render with combined variant and className', () => {
    render(
      <Badge variant="secondary" className="extra-class" data-testid="badge">
        Text
      </Badge>
    )
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('extra-class')
  })

  it('should handle empty children', () => {
    render(<Badge data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toBeEmptyDOMElement()
  })

  it('should render with numbers as children', () => {
    render(<Badge>42</Badge>)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should be styleable with inline styles', () => {
    render(
      <Badge style={{ backgroundColor: 'rgb(255, 0, 0)' }} data-testid="badge">
        Styled
      </Badge>
    )
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveStyle('background-color: rgb(255, 0, 0)')
  })
})
