import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/lib/types'

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello there',
  timestamp: new Date('2024-01-15T10:30:00').getTime(),
  ...overrides,
})

describe('MessageBubble', () => {
  it('renders message content', () => {
    render(<MessageBubble message={makeMessage({ content: 'Test message content' })} />)
    expect(screen.getByText('Test message content')).toBeInTheDocument()
  })

  it('applies flex-row-reverse for user messages', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'user' })} />)
    const outerDiv = container.querySelector('.flex.gap-3') as HTMLElement
    expect(outerDiv.className).toContain('flex-row-reverse')
  })

  it('does not apply flex-row-reverse for assistant messages', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'assistant' })} />)
    const outerDiv = container.querySelector('.flex.gap-3') as HTMLElement
    expect(outerDiv.className).not.toContain('flex-row-reverse')
  })

  it('applies muted/italic styling for system messages', () => {
    const { container } = render(
      <MessageBubble message={makeMessage({ role: 'system', content: 'System info' })} />
    )
    // System messages use bg-muted and italic text
    const bubble = container.querySelector('.italic') as HTMLElement
    expect(bubble).toBeInTheDocument()
  })

  it('user message bubble has accent background', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'user' })} />)
    const bubble = container.querySelector('.bg-accent') as HTMLElement
    expect(bubble).toBeInTheDocument()
  })

  it('assistant message bubble has card background', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'assistant' })} />)
    const bubble = container.querySelector('.bg-card') as HTMLElement
    expect(bubble).toBeInTheDocument()
  })

  it('shows timestamp in HH:MM format', () => {
    render(<MessageBubble message={makeMessage({ timestamp: new Date('2024-01-15T10:30:00').getTime() })} />)
    // The formatted time will be locale-dependent but should include digits and a colon
    const timeEl = screen.getByText(/\d{1,2}:\d{2}/)
    expect(timeEl).toBeInTheDocument()
  })

  it('shows model name in timestamp area when model is set', () => {
    render(<MessageBubble message={makeMessage({ model: 'llama3.2', role: 'assistant' })} />)
    expect(screen.getByText(/llama3\.2/)).toBeInTheDocument()
  })

  it('does not show model name when model is not set', () => {
    render(<MessageBubble message={makeMessage({ model: undefined })} />)
    // timestamp is shown, but no model suffix
    expect(screen.queryByText(/•/)).not.toBeInTheDocument()
  })

  it('shows streaming cursor when isStreaming is true', () => {
    const { container } = render(
      <MessageBubble message={makeMessage({ role: 'assistant' })} isStreaming />
    )
    // The streaming cursor is a span with a specific class
    const cursor = container.querySelector('.inline-block.w-2.h-4.bg-current') as HTMLElement
    expect(cursor).toBeInTheDocument()
  })

  it('does not show streaming cursor when isStreaming is false', () => {
    const { container } = render(
      <MessageBubble message={makeMessage({ role: 'assistant' })} isStreaming={false} />
    )
    const cursor = container.querySelector('.inline-block.w-2.h-4.bg-current')
    expect(cursor).not.toBeInTheDocument()
  })

  it('toggles hover state on mouse enter and leave', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'assistant' })} />)
    const outer = container.querySelector('.flex.gap-3') as HTMLElement
    expect(outer).toBeInTheDocument()

    // Initially the avatar has the no-ring class. After mouse enter, the
    // hovered ring class is applied.
    fireEvent.mouseEnter(outer)
    const ring = container.querySelector('.ring-accent\\/30')
    expect(ring).toBeInTheDocument()

    fireEvent.mouseLeave(outer)
    expect(container.querySelector('.ring-accent\\/30')).not.toBeInTheDocument()
  })

  it('toggles hover state on touch start', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'assistant' })} />)
    const outer = container.querySelector('.flex.gap-3') as HTMLElement
    fireEvent.touchStart(outer)
    expect(container.querySelector('.ring-accent\\/30')).toBeInTheDocument()
    fireEvent.touchCancel(outer)
    expect(container.querySelector('.ring-accent\\/30')).not.toBeInTheDocument()
  })

  it('renders a User avatar icon for user messages', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'user' })} />)
    // Avatar fallback uses the accent background for user messages
    const fallback = container.querySelector('.bg-accent.text-accent-foreground')
    expect(fallback).toBeInTheDocument()
  })

  it('renders a Robot avatar icon for assistant messages', () => {
    const { container } = render(<MessageBubble message={makeMessage({ role: 'assistant' })} />)
    const fallback = container.querySelector('.bg-primary.text-primary-foreground')
    expect(fallback).toBeInTheDocument()
  })

  it('forwards content with whitespace preserved', () => {
    const multiline = 'line one\nline two\n  indented'
    render(<MessageBubble message={makeMessage({ content: multiline })} />)
    // The <p> has whitespace-pre-wrap so the textContent includes the newlines
    expect(screen.getByText(/line one/).textContent).toContain('line two')
  })
})
