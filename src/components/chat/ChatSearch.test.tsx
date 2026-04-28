import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatSearch } from './ChatSearch'
import type { Message, Conversation } from '@/lib/types'

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'My Conversation',
  model: 'llama3',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello world this is a test message',
  timestamp: Date.now(),
  ...overrides,
})

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  conversations: [makeConversation()],
  messages: [makeMessage()],
  onSelectMessage: vi.fn(),
}

describe('ChatSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog title when open', () => {
    render(<ChatSearch {...defaultProps} />)
    expect(screen.getByText('Search Conversations')).toBeInTheDocument()
  })

  it('shows "Start typing to search" empty state initially', () => {
    render(<ChatSearch {...defaultProps} />)
    expect(screen.getByText('Start typing to search')).toBeInTheDocument()
  })

  it('shows search results when query matches message content', async () => {
    const user = userEvent.setup()
    render(<ChatSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'Hello')
    // Conversation title badge should appear in results
    expect(screen.getByText('My Conversation')).toBeInTheDocument()
  })

  it('shows "No messages found" when query has no matches', async () => {
    const user = userEvent.setup()
    render(<ChatSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'xyznonexistent')
    expect(screen.getByText('No messages found')).toBeInTheDocument()
  })

  it('shows result count text', async () => {
    const user = userEvent.setup()
    render(<ChatSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'Hello')
    expect(screen.getByText('Found 1 result')).toBeInTheDocument()
  })

  it('shows plural "results" for multiple matches', async () => {
    const user = userEvent.setup()
    const messages = [
      makeMessage({ id: 'm1', content: 'search term one' }),
      makeMessage({ id: 'm2', content: 'search term two', conversationId: 'conv-1' }),
    ]
    render(<ChatSearch {...defaultProps} messages={messages} />)
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'search term')
    expect(screen.getByText(/Found 2 results/)).toBeInTheDocument()
  })

  it('calls onSelectMessage and closes dialog when a result is selected', async () => {
    const user = userEvent.setup()
    const onSelectMessage = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ChatSearch
        {...defaultProps}
        onSelectMessage={onSelectMessage}
        onOpenChange={onOpenChange}
      />
    )
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'Hello')
    // Find and click the result button
    const resultButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('w-full')
    )
    await user.click(resultButtons[0])
    expect(onSelectMessage).toHaveBeenCalledWith('conv-1', 'msg-1')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears the search input when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'Hello')
    expect(input).toHaveValue('Hello')
    // The X clear button appears once there is input
    const clearBtn = screen.getByRole('button', { name: '' }) // icon-only button
    await user.click(clearBtn)
    expect(input).toHaveValue('')
  })

  it('does not render dialog content when open=false', () => {
    render(<ChatSearch {...defaultProps} open={false} />)
    expect(screen.queryByText('Search Conversations')).not.toBeInTheDocument()
  })

  it('highlights matched text in results using mark elements', async () => {
    const user = userEvent.setup()
    render(<ChatSearch {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'Hello')
    // Radix Dialog renders in a portal, so use document.body to find mark elements
    await waitFor(() => {
      const mark = document.body.querySelector('mark')
      expect(mark).toBeInTheDocument()
      expect(mark?.textContent?.toLowerCase()).toContain('hello')
    })
  })

  it('shows role badge for matched message', async () => {
    const user = userEvent.setup()
    render(
      <ChatSearch
        {...defaultProps}
        messages={[makeMessage({ role: 'assistant', content: 'Testing search' })]}
      />
    )
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'Testing')
    expect(screen.getByText('assistant')).toBeInTheDocument()
  })

  it('shows "matches" badge when a message has more than one match', async () => {
    const user = userEvent.setup()
    render(
      <ChatSearch
        {...defaultProps}
        messages={[makeMessage({ content: 'foo foo foo' })]}
      />
    )
    const input = screen.getByPlaceholderText('Search messages...')
    await user.type(input, 'foo')
    expect(screen.getByText('3 matches')).toBeInTheDocument()
  })
})
