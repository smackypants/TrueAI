import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VirtualList } from './VirtualList'

// useThrottle from mobile-performance is a hook that throttles calls;
// for tests we can mock the whole module so handleScroll passes through.
vi.mock('@/lib/mobile-performance', () => ({
  useThrottle: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}))

describe('VirtualList', () => {
  const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']
  const renderItem = (item: string, index: number) => (
    <div data-testid={`item-${index}`}>{item}</div>
  )

  it('renders the outer container with the given height', () => {
    const { container } = render(
      <VirtualList
        items={items}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.style.height).toBe('200px')
  })

  it('renders visible items when the list is short', () => {
    render(
      <VirtualList
        items={items}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
      />
    )
    // All 5 items should be visible (containerHeight 400 > total 250)
    items.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  })

  it('renders only a windowed subset for large lists', () => {
    // 100 items at 50px each; containerHeight 100px shows ~2 visible + overscan (3)
    const bigItems = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
    const { container } = render(
      <VirtualList
        items={bigItems}
        itemHeight={50}
        containerHeight={100}
        renderItem={(item, index) => <div data-testid={`row-${index}`}>{item}</div>}
        overscan={0}
      />
    )
    // With 0 overscan, startIndex=0, endIndex=ceil((0+100)/50)=2 → items 0,1,2
    const rendered = container.querySelectorAll('[data-testid^="row-"]')
    // Fewer than 100 rows should be in the DOM
    expect(rendered.length).toBeLessThan(100)
  })

  it('sets the inner container total height equal to items.length * itemHeight', () => {
    const { container } = render(
      <VirtualList
        items={items}
        itemHeight={60}
        containerHeight={300}
        renderItem={renderItem}
      />
    )
    const inner = container.querySelector('[style*="height: 300px"] > div') as HTMLElement
    expect(inner.style.height).toBe(`${items.length * 60}px`)
  })

  it('applies custom className to outer container', () => {
    const { container } = render(
      <VirtualList
        items={items}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
        className="my-list"
      />
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('my-list')
  })

  it('handles an empty items array', () => {
    const { container } = render(
      <VirtualList
        items={[]}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    )
    // No items should be rendered
    expect(container.querySelectorAll('[data-testid^="item-"]').length).toBe(0)
  })

  it('positions each visible item absolutely at the correct top offset', () => {
    render(
      <VirtualList
        items={['A', 'B', 'C']}
        itemHeight={40}
        containerHeight={300}
        renderItem={(item, i) => <div data-testid={`pos-${i}`}>{item}</div>}
      />
    )
    // Each row wrapper should have an absolute style with top = index * itemHeight
    const rowA = screen.getByTestId('pos-0').parentElement as HTMLElement
    const rowB = screen.getByTestId('pos-1').parentElement as HTMLElement
    expect(rowA.style.top).toBe('0px')
    expect(rowB.style.top).toBe('40px')
  })
})
