import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// --- Module-level mocks (vi.hoisted ensures variables are available before hoisted vi.mock runs) ---
const { mockUseIntersectionObserver, mockImageCache } = vi.hoisted(() => {
  const mockUseIntersectionObserver = vi.fn(() => false)
  const mockImageCache = {
    has: vi.fn(() => false),
    get: vi.fn(() => undefined as string | undefined),
    set: vi.fn(),
  }
  return { mockUseIntersectionObserver, mockImageCache }
})

vi.mock('@/lib/mobile-performance', () => ({
  useIntersectionObserver: mockUseIntersectionObserver,
  ImageCache: mockImageCache,
}))

import { OptimizedImage } from './OptimizedImage'

describe('OptimizedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseIntersectionObserver.mockReturnValue(false)
    mockImageCache.has.mockReturnValue(false)
    mockImageCache.get.mockReturnValue(undefined)
  })

  it('shows a skeleton placeholder before the image loads (lazy, not in view)', () => {
    const { container } = render(
      <OptimizedImage src="/test.jpg" alt="test image" />
    )
    // Image src is null (not in view) so the img element should be absent
    const img = container.querySelector('img')
    expect(img).not.toBeInTheDocument()
  })

  it('renders an img element immediately when loading="eager"', () => {
    render(
      <OptimizedImage src="/eager.jpg" alt="eager image" loading="eager" />
    )
    const img = screen.getByAltText('eager image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/eager.jpg')
    expect(img).toHaveAttribute('loading', 'eager')
  })

  it('sets the img src when in view (lazy loading)', () => {
    mockUseIntersectionObserver.mockReturnValue(true)
    render(
      <OptimizedImage src="/visible.jpg" alt="visible image" />
    )
    const img = screen.getByAltText('visible image')
    expect(img).toHaveAttribute('src', '/visible.jpg')
  })

  it('serves from ImageCache when the src is already cached', () => {
    mockUseIntersectionObserver.mockReturnValue(true)
    mockImageCache.has.mockReturnValue(true)
    mockImageCache.get.mockReturnValue('/cached.jpg')

    render(
      <OptimizedImage src="/cached.jpg" alt="cached image" />
    )
    const img = screen.getByAltText('cached image')
    expect(img).toHaveAttribute('src', '/cached.jpg')
  })

  it('calls onLoad callback and stores in ImageCache when image loads', () => {
    mockUseIntersectionObserver.mockReturnValue(true)
    const onLoad = vi.fn()

    render(
      <OptimizedImage src="/load.jpg" alt="load image" onLoad={onLoad} />
    )
    const img = screen.getByAltText('load image')
    fireEvent.load(img)

    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(mockImageCache.set).toHaveBeenCalledWith('/load.jpg', '/load.jpg')
  })

  it('calls onError callback when image fails to load', () => {
    mockUseIntersectionObserver.mockReturnValue(true)
    const onError = vi.fn()

    render(
      <OptimizedImage src="/bad.jpg" alt="bad image" onError={onError} />
    )
    const img = screen.getByAltText('bad image')
    fireEvent.error(img)

    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('shows placeholder text when image fails and a placeholder is provided', () => {
    mockUseIntersectionObserver.mockReturnValue(true)

    render(
      <OptimizedImage src="/bad.jpg" alt="bad image" placeholder="Image unavailable" />
    )
    const img = screen.getByAltText('bad image')
    fireEvent.error(img)

    expect(screen.getByText('Image unavailable')).toBeInTheDocument()
  })

  it('does not show placeholder when image fails without a placeholder prop', () => {
    mockUseIntersectionObserver.mockReturnValue(true)

    render(
      <OptimizedImage src="/bad.jpg" alt="bad image" />
    )
    const img = screen.getByAltText('bad image')
    fireEvent.error(img)

    // No placeholder text, no img element after error
    expect(screen.queryByAltText('bad image')).not.toBeInTheDocument()
  })

  it('applies objectFit style to the img', () => {
    mockUseIntersectionObserver.mockReturnValue(true)

    render(
      <OptimizedImage src="/img.jpg" alt="styled" objectFit="contain" />
    )
    const img = screen.getByAltText('styled')
    expect(img).toHaveStyle({ objectFit: 'contain' })
  })

  it('applies custom className to the container div', () => {
    const { container } = render(
      <OptimizedImage src="/img.jpg" alt="class test" className="my-custom-class" />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('my-custom-class')
  })

  it('applies width and height to the container', () => {
    const { container } = render(
      <OptimizedImage src="/img.jpg" alt="sized" width={200} height={100} />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ width: '200px', height: '100px' })
  })
})
