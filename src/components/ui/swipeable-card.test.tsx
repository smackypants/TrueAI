import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { render, screen, act } from '@testing-library/react'

// Capture the onDragEnd handler passed to motion.div so tests can drive
// handleDragEnd with synthetic PanInfo objects (jsdom can't simulate drag).
const capturedHandlers: Array<(e: unknown, info: { offset: { x: number; y: number } }) => void> = []

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
          const {
            children,
            initial: _i,
            animate: _a,
            exit: _e,
            transition: _t,
            whileHover: _w,
            drag: _d,
            dragConstraints: _dc,
            dragElastic: _de,
            onDragStart: _ods,
            onDragEnd,
            style: _s,
            ...rest
          } = props as Record<string, unknown> & {
            children?: React.ReactNode
            onDragEnd?: (e: unknown, info: { offset: { x: number; y: number } }) => void
          }
          void _i; void _a; void _e; void _t; void _w; void _d; void _dc; void _de; void _ods; void _s
          if (typeof onDragEnd === 'function') {
            capturedHandlers.push(onDragEnd)
          }
          return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
        },
      }
    ),
  }
})

import { SwipeableCard } from './swipeable-card'

describe('SwipeableCard', () => {
  beforeEach(() => {
    capturedHandlers.length = 0
  })

  it('renders children', () => {
    render(<SwipeableCard><span>Hello</span></SwipeableCard>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders in disabled mode as a plain div', () => {
    const { container } = render(
      <SwipeableCard disabled><span>Disabled content</span></SwipeableCard>
    )
    expect(screen.getByText('Disabled content')).toBeInTheDocument()
    // The disabled path returns a bare <div>.
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBe(1)
  })

  it('renders leftAction label when provided', () => {
    render(
      <SwipeableCard
        leftAction={{ icon: <span>🗑</span>, label: 'Delete', color: 'bg-red-500' }}
      >
        <span>Content</span>
      </SwipeableCard>
    )
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('renders rightAction label when provided', () => {
    render(
      <SwipeableCard
        rightAction={{ icon: <span>⭐</span>, label: 'Star', color: 'bg-yellow-500' }}
      >
        <span>Content</span>
      </SwipeableCard>
    )
    expect(screen.getByText('Star')).toBeInTheDocument()
  })

  it('renders both actions when both are provided', () => {
    render(
      <SwipeableCard
        leftAction={{ icon: <span />, label: 'Delete', color: 'bg-red-500' }}
        rightAction={{ icon: <span />, label: 'Star', color: 'bg-yellow-500' }}
      >
        <span>Card</span>
      </SwipeableCard>
    )
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Star')).toBeInTheDocument()
  })

  it('applies className to the draggable wrapper when enabled', () => {
    const { container } = render(
      <SwipeableCard className="custom-class">
        <span>X</span>
      </SwipeableCard>
    )
    // className is applied to the inner motion.div (passed through by mock)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('does NOT render action backgrounds when no actions provided', () => {
    render(<SwipeableCard><span>Plain</span></SwipeableCard>)
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.queryByText('Star')).not.toBeInTheDocument()
  })

  it('calls onSwipeLeft when drag offset.x < -threshold', () => {
    const onSwipeLeft = vi.fn()
    render(
      <SwipeableCard onSwipeLeft={onSwipeLeft}>
        <span>Swipeable</span>
      </SwipeableCard>
    )
    const handler = capturedHandlers[capturedHandlers.length - 1]
    expect(handler).toBeDefined()
    act(() => {
      handler({}, { offset: { x: -150, y: 0 } })
    })
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('calls onSwipeRight when drag offset.x > threshold', () => {
    const onSwipeRight = vi.fn()
    render(
      <SwipeableCard onSwipeRight={onSwipeRight}>
        <span>Swipeable</span>
      </SwipeableCard>
    )
    const handler = capturedHandlers[capturedHandlers.length - 1]
    expect(handler).toBeDefined()
    act(() => {
      handler({}, { offset: { x: 150, y: 0 } })
    })
    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('does not invoke either callback when drag offset is within threshold', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()
    render(
      <SwipeableCard onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        <span>X</span>
      </SwipeableCard>
    )
    const handler = capturedHandlers[capturedHandlers.length - 1]
    act(() => {
      handler({}, { offset: { x: 50, y: 0 } })
    })
    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('handles drag past threshold without callbacks (no throw)', () => {
    render(<SwipeableCard><span>NoCb</span></SwipeableCard>)
    const handler = capturedHandlers[capturedHandlers.length - 1]
    expect(() => {
      act(() => {
        handler({}, { offset: { x: 200, y: 0 } })
      })
    }).not.toThrow()
    expect(() => {
      act(() => {
        handler({}, { offset: { x: -200, y: 0 } })
      })
    }).not.toThrow()
  })
})
