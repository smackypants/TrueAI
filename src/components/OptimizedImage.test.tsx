import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OptimizedImage } from './OptimizedImage'

vi.mock('@/lib/mobile-performance', () => ({
  useIntersectionObserver: vi.fn(() => true),
  ImageCache: { has: vi.fn(() => false), get: vi.fn(), set: vi.fn() },
  useThrottle: (fn: Function) => fn
}))

describe('OptimizedImage', () => {
  it('renders container div', () => {
    const { container } = render(<OptimizedImage src="img.png" alt="test" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders img element when in view (eager)', () => {
    render(<OptimizedImage src="img.png" alt="my image" loading="eager" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'img.png')
  })

  it('passes alt text to img', () => {
    render(<OptimizedImage src="img.png" alt="descriptive alt" loading="eager" />)
    expect(screen.getByAltText('descriptive alt')).toBeInTheDocument()
  })

  it('shows placeholder on error', () => {
    render(<OptimizedImage src="bad.png" alt="img" loading="eager" placeholder="Image not found" />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.getByText('Image not found')).toBeInTheDocument()
  })

  it('calls onLoad callback when image loads', () => {
    const onLoad = vi.fn()
    render(<OptimizedImage src="img.png" alt="img" loading="eager" onLoad={onLoad} />)
    fireEvent.load(screen.getByRole('img'))
    expect(onLoad).toHaveBeenCalled()
  })

  it('calls onError callback on error', () => {
    const onError = vi.fn()
    render(<OptimizedImage src="bad.png" alt="img" loading="eager" onError={onError} />)
    fireEvent.error(screen.getByRole('img'))
    expect(onError).toHaveBeenCalled()
  })

  it('applies custom className to container', () => {
    const { container } = render(<OptimizedImage src="img.png" alt="img" className="my-class" />)
    expect(container.firstChild).toHaveClass('my-class')
  })
})
