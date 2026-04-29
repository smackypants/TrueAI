import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContextualSuggestion } from '@/hooks/use-contextual-ui'

const { mockUseContextualUI } = vi.hoisted(() => ({
  mockUseContextualUI: vi.fn(),
}))

vi.mock('@/hooks/use-contextual-ui', () => ({
  useContextualUI: mockUseContextualUI,
}))

// framer-motion's AnimatePresence renders children synchronously enough for
// jsdom, but disabling animations keeps assertions deterministic.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
          const { children, ...rest } = props
          // Strip framer-only props that React would warn about.
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            transition: _t,
            whileHover: _w,
            ...domProps
          } = rest as Record<string, unknown>
          void _i; void _a; void _e; void _t; void _w
          return <div {...(domProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
        },
      }
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  }
})

import { ContextualSuggestionsPanel } from './contextual-suggestions'

function makeSuggestion(over: Partial<ContextualSuggestion> = {}): ContextualSuggestion {
  return {
    id: 's-1',
    type: 'tip',
    title: 'Default title',
    description: 'Default description',
    priority: 1,
    ...over,
  }
}

describe('ContextualSuggestionsPanel', () => {
  beforeEach(() => {
    mockUseContextualUI.mockReset()
  })

  it('renders nothing when there are no suggestions', () => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [],
      dismissSuggestion: vi.fn(),
    })
    const { container } = render(<ContextualSuggestionsPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the highest-priority suggestion title and description', () => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [
        makeSuggestion({ id: 'low', title: 'Low one', priority: 1 }),
        makeSuggestion({ id: 'high', title: 'High one', description: 'Top desc', priority: 99 }),
        makeSuggestion({ id: 'mid', title: 'Mid one', priority: 50 }),
      ],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    expect(screen.getByText('High one')).toBeInTheDocument()
    expect(screen.getByText('Top desc')).toBeInTheDocument()
    // The non-top suggestions are NOT rendered as their own cards.
    expect(screen.queryByText('Low one')).not.toBeInTheDocument()
    expect(screen.queryByText('Mid one')).not.toBeInTheDocument()
  })

  it.each([
    ['shortcut'],
    ['optimization'],
    ['tip'],
    ['feature'], // hits the default branch of getIcon
  ] as const)('renders for type=%s without crashing', (type) => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [makeSuggestion({ id: type, type, title: `T-${type}` })],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    expect(screen.getByText(`T-${type}`)).toBeInTheDocument()
  })

  it('calls dismissSuggestion with the top suggestion id when the close button is clicked', async () => {
    const dismiss = vi.fn()
    mockUseContextualUI.mockReturnValue({
      suggestions: [makeSuggestion({ id: 'only', priority: 5 })],
      dismissSuggestion: dismiss,
    })
    render(<ContextualSuggestionsPanel />)
    const buttons = screen.getAllByRole('button')
    // First button is the dismiss (X) icon-only button.
    await userEvent.click(buttons[0])
    expect(dismiss).toHaveBeenCalledWith('only')
  })

  it('renders a Take Action button only when suggestion.action is set, and invokes it', async () => {
    const action = vi.fn()
    mockUseContextualUI.mockReturnValue({
      suggestions: [makeSuggestion({ id: 'a', action })],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    const take = screen.getByRole('button', { name: /take action/i })
    await userEvent.click(take)
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('does not render Take Action when no action is provided', () => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [makeSuggestion({ id: 'no-action' })],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    expect(screen.queryByRole('button', { name: /take action/i })).not.toBeInTheDocument()
  })

  it('shows singular "+1 more suggestion" when exactly two suggestions exist', () => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [
        makeSuggestion({ id: 'a', priority: 10 }),
        makeSuggestion({ id: 'b', priority: 1 }),
      ],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    expect(screen.getByText('+1 more suggestion')).toBeInTheDocument()
  })

  it('shows plural "+N more suggestions" when more than two suggestions exist', () => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [
        makeSuggestion({ id: 'a', priority: 10 }),
        makeSuggestion({ id: 'b', priority: 5 }),
        makeSuggestion({ id: 'c', priority: 1 }),
      ],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    expect(screen.getByText('+2 more suggestions')).toBeInTheDocument()
  })

  it('omits the "+N more" footer when there is only one suggestion', () => {
    mockUseContextualUI.mockReturnValue({
      suggestions: [makeSuggestion({ id: 'solo' })],
      dismissSuggestion: vi.fn(),
    })
    render(<ContextualSuggestionsPanel />)
    expect(screen.queryByText(/more suggestion/i)).not.toBeInTheDocument()
  })
})
