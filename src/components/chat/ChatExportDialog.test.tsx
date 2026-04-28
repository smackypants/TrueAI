import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatExportDialog } from './ChatExportDialog'
import type { Conversation, Message } from '@/lib/types'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'Test Conversation',
  model: 'llama3',
  createdAt: new Date('2024-01-15T10:00:00Z').getTime(),
  updatedAt: new Date('2024-01-15T11:00:00Z').getTime(),
  ...overrides,
})

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello world',
  timestamp: new Date('2024-01-15T10:30:00Z').getTime(),
  ...overrides,
})

const defaultMessages: Message[] = [
  makeMessage({ id: 'msg-1', role: 'user', content: 'Hello' }),
  makeMessage({ id: 'msg-2', role: 'assistant', content: 'Hi there!' }),
]

describe('ChatExportDialog', () => {
  let onOpenChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onOpenChange = vi.fn()
    // Mock URL methods used during file export
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url')
    globalThis.URL.revokeObjectURL = vi.fn()
    // Mock anchor click to avoid jsdom navigation errors
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the dialog title when open', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByText('Export Conversation')).toBeInTheDocument()
  })

  it('does not render dialog content when closed', () => {
    render(
      <ChatExportDialog
        open={false}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.queryByText('Export Conversation')).not.toBeInTheDocument()
  })

  it('shows the message count in the preview', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByText(`${defaultMessages.length} messages will be exported`)).toBeInTheDocument()
  })

  it('shows zero message count when no messages are provided', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={[]}
      />
    )
    expect(screen.getByText('0 messages will be exported')).toBeInTheDocument()
  })

  it('renders the Export button', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument()
  })

  it('renders the Cancel button', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders Include Timestamps toggle', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByText('Include Timestamps')).toBeInTheDocument()
  })

  it('renders Include Metadata toggle', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByText('Include Metadata')).toBeInTheDocument()
  })

  it('renders Export Format label', () => {
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    expect(screen.getByText('Export Format')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) and shows toast on Export click', async () => {
    const { toast } = await import('sonner')
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open={true}
        onOpenChange={onOpenChange}
        conversation={makeConversation()}
        messages={defaultMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    expect(toast.success).toHaveBeenCalledWith('Chat exported successfully')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
