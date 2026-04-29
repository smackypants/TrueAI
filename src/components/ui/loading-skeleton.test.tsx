import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  MessageListSkeleton,
  ConversationListSkeleton,
  AgentCardSkeleton,
  ModelCardSkeleton,
} from './loading-skeleton'

describe('MessageListSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<MessageListSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders 3 skeleton items', () => {
    const { container } = render(<MessageListSkeleton />)
    // Each item is a flex row with a circular avatar skeleton and a content block
    const rows = container.querySelectorAll('.flex.gap-3')
    expect(rows).toHaveLength(3)
  })
})

describe('ConversationListSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ConversationListSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders 5 conversation skeleton rows', () => {
    const { container } = render(<ConversationListSkeleton />)
    const rows = container.querySelectorAll('.space-y-2.p-2')
    expect(rows).toHaveLength(5)
  })
})

describe('AgentCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<AgentCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders a card element', () => {
    const { container } = render(<AgentCardSkeleton />)
    // The Card component wraps content in a div with class containing "rounded"
    expect(container.querySelector('[class*="rounded"]')).toBeInTheDocument()
  })
})

describe('ModelCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ModelCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders a card element', () => {
    const { container } = render(<ModelCardSkeleton />)
    expect(container.querySelector('[class*="rounded"]')).toBeInTheDocument()
  })
})
