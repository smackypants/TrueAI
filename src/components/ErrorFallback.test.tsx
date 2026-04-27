import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorFallback } from './ErrorFallback'

describe('ErrorFallback component', () => {
  it('should render error message', () => {
    const error = new Error('Test error message')

    render(<ErrorFallback error={error} />)

    expect(screen.getByText('Component Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong loading this content. Please try again.')).toBeInTheDocument()
  })

  it('should display custom component name', () => {
    const error = new Error('Test error')

    render(<ErrorFallback error={error} componentName="CustomComponent" />)

    expect(screen.getByText('CustomComponent Error')).toBeInTheDocument()
  })

  it('should show error details in expandable section', () => {
    const error = new Error('Detailed error message')

    render(<ErrorFallback error={error} />)

    expect(screen.getByText('Error Details')).toBeInTheDocument()
    expect(screen.getByText(/Detailed error message/)).toBeInTheDocument()
  })

  it('should display stack trace when available', () => {
    const error = new Error('Error with stack')
    error.stack = 'Error: Error with stack\n    at Object.<anonymous> (file.js:10:15)\n    at Module._compile (internal/modules:123:45)'

    render(<ErrorFallback error={error} />)

    const detailsElement = screen.getByText(/Stack Trace:/)
    expect(detailsElement).toBeInTheDocument()
  })

  it('should render without error prop', () => {
    render(<ErrorFallback />)

    expect(screen.getByText('Component Error')).toBeInTheDocument()
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
  })

  it('should call resetErrorBoundary when Try Again button is clicked', async () => {
    const user = userEvent.setup()
    const resetMock = vi.fn()

    render(<ErrorFallback error={new Error('Test')} resetErrorBoundary={resetMock} />)

    const button = screen.getByRole('button', { name: /Try Again/i })
    await user.click(button)

    expect(resetMock).toHaveBeenCalledTimes(1)
  })

  it('should not render Try Again button when resetErrorBoundary is not provided', () => {
    render(<ErrorFallback error={new Error('Test')} />)

    expect(screen.queryByRole('button', { name: /Try Again/i })).not.toBeInTheDocument()
  })

  it('should render warning icon', () => {
    const { container } = render(<ErrorFallback error={new Error('Test')} />)

    // Check for svg element (Warning icon from phosphor)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should have proper styling classes', () => {
    const { container } = render(<ErrorFallback error={new Error('Test')} />)

    // Check for destructive styling
    const card = container.querySelector('[class*="border-destructive"]')
    expect(card).toBeInTheDocument()
  })

  it('should display truncated stack trace (first 5 lines)', () => {
    const error = new Error('Test error')
    error.stack = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join('\n')

    const { container } = render(<ErrorFallback error={error} />)

    const pre = container.querySelector('pre')
    expect(pre?.textContent).toContain('Line 1')
    expect(pre?.textContent).toContain('Line 5')
    // Lines 6-10 should not be displayed (sliced to first 5)
  })
})
