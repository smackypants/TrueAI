import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './skeleton'

describe('Skeleton', () => {
  it('should render a skeleton element', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toBeInTheDocument()
  })

  it('should have the data-slot attribute', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('data-slot', 'skeleton')
  })

  it('should apply custom className', () => {
    render(<Skeleton className="custom-class" data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('custom-class')
  })

  it('should have animate-pulse class for animation', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('should have rounded-md class for border radius', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('rounded-md')
  })

  it('should forward all props to the div element', () => {
    render(
      <Skeleton
        id="test-id"
        title="Loading..."
        aria-label="Loading skeleton"
        data-testid="skeleton"
      />
    )
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('id', 'test-id')
    expect(skeleton).toHaveAttribute('title', 'Loading...')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading skeleton')
  })

  it('should render children content', () => {
    render(
      <Skeleton>
        <span>Loading content</span>
      </Skeleton>
    )
    expect(screen.getByText('Loading content')).toBeInTheDocument()
  })

  it('should render as a div element', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton.tagName).toBe('DIV')
  })

  it('should support custom dimensions via className', () => {
    render(<Skeleton className="h-12 w-12" data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('h-12')
    expect(skeleton).toHaveClass('w-12')
  })

  it('should support custom shape via className', () => {
    render(<Skeleton className="rounded-full" data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('rounded-full')
  })

  it('should be styleable with inline styles', () => {
    render(
      <Skeleton style={{ width: '100px', height: '20px' }} data-testid="skeleton" />
    )
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveStyle({ width: '100px', height: '20px' })
  })

  it('should support accessibility attributes', () => {
    render(
      <Skeleton
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-testid="skeleton"
      />
    )
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-live', 'polite')
    expect(skeleton).toHaveAttribute('aria-busy', 'true')
  })

  describe('Skeleton variations', () => {
    it('should render text skeleton', () => {
      render(<Skeleton className="h-4 w-[250px]" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toBeInTheDocument()
    })

    it('should render circular skeleton for avatar', () => {
      render(<Skeleton className="h-12 w-12 rounded-full" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('rounded-full')
    })

    it('should render rectangle skeleton for image', () => {
      render(<Skeleton className="h-[200px] w-full" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toBeInTheDocument()
    })
  })

  describe('Skeleton compositions', () => {
    it('should render card skeleton with multiple elements', () => {
      render(
        <div className="space-y-2">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" data-testid="skeleton-image" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" data-testid="skeleton-text-1" />
            <Skeleton className="h-4 w-[200px]" data-testid="skeleton-text-2" />
          </div>
        </div>
      )

      expect(screen.getByTestId('skeleton-image')).toBeInTheDocument()
      expect(screen.getByTestId('skeleton-text-1')).toBeInTheDocument()
      expect(screen.getByTestId('skeleton-text-2')).toBeInTheDocument()
    })
  })
})
