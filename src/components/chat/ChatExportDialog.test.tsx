import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { ChatExportDialog } from './ChatExportDialog'
import type { Conversation, Message } from '@/lib/types'

const mockConversation: Conversation = {
  id: 'conv-1',
  title: 'My Test Chat',
  model: 'llama3.2',
  systemPrompt: 'Be helpful.',
  createdAt: 1700000000000,
  updatedAt: 1700000001000,
}

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello there!',
    timestamp: 1700000000500,
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Hi! How can I help you?',
    timestamp: 1700000000800,
    model: 'llama3.2',
  },
]

describe('ChatExportDialog', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    HTMLElement.prototype.hasPointerCapture = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('renders the dialog when open', () => {
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    expect(screen.getByText('Export Conversation')).toBeInTheDocument()
    expect(screen.getByText('Export this conversation in various formats')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ChatExportDialog
        open={false}
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    expect(screen.queryByText('Export Conversation')).not.toBeInTheDocument()
  })

  it('shows correct message count in preview', () => {
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    expect(screen.getByText('2 messages will be exported')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ChatExportDialog
        open
        onOpenChange={onOpenChange}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('creates an object URL and revokes it on Export click', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('renders format selector with Plain Text default', () => {
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    expect(screen.getByText('Plain Text')).toBeInTheDocument()
    expect(screen.getByText('Export Format')).toBeInTheDocument()
  })

  it('renders Include Timestamps and Include Metadata toggles', () => {
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    expect(screen.getByText('Include Timestamps')).toBeInTheDocument()
    expect(screen.getByText('Include Metadata')).toBeInTheDocument()
  })

  it('passes a Blob to URL.createObjectURL with the right mime type for txt', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
  })

  it('shows success toast after export', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    expect(toast.success).toHaveBeenCalledWith('Chat exported successfully')
  })

  it('passes a Blob with json content structure when JSON is the format', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )

    // Open the format selector and pick JSON
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /JSON/ }))

    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json')
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed.conversation.id).toBe('conv-1')
    expect(parsed.messages).toHaveLength(2)
    expect(parsed.messages[0].content).toBe('Hello there!')
  })

  it('produces a Markdown blob with the conversation title and message icons', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Markdown/ }))

    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/markdown')
    const text = await blob.text()
    expect(text).toContain('# My Test Chat')
    expect(text).toContain('👤')
    expect(text).toContain('🤖')
  })

  it('produces an HTML blob with embedded styles and message divs', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /HTML/ }))

    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/html')
    const text = await blob.text()
    expect(text).toContain('<!DOCTYPE html>')
    expect(text).toContain('My Test Chat')
    expect(text).toContain('class="message user"')
    expect(text).toContain('class="message assistant"')
    expect(text).toContain('Hello there!')
  })

  it('omits metadata header when Include Metadata is toggled off (txt format)', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )

    // Toggle off both switches
    const switches = screen.getAllByRole('switch')
    await user.click(switches[1]) // Include Metadata

    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()
    expect(text).not.toContain('Conversation:')
    // Messages still present
    expect(text).toContain('Hello there!')
  })

  it('omits per-message timestamps when Include Timestamps is toggled off (txt format)', async () => {
    const user = userEvent.setup()
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )

    const switches = screen.getAllByRole('switch')
    await user.click(switches[0]) // Include Timestamps

    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()
    // Headers should be `USER:` (no `[timestamp]` between role and colon)
    expect(text).toMatch(/^USER:\n/m)
    expect(text).toMatch(/^ASSISTANT:\n/m)
  })

  it('handles a conversation with no system prompt without throwing', async () => {
    const user = userEvent.setup()
    const noPrompt = { ...mockConversation, systemPrompt: undefined }
    render(
      <ChatExportDialog
        open
        onOpenChange={vi.fn()}
        conversation={noPrompt}
        messages={mockMessages}
      />
    )
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Markdown/ }))
    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()
    expect(text).not.toContain('System Prompt:')
  })

  it('closes the dialog after a successful export', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ChatExportDialog
        open
        onOpenChange={onOpenChange}
        conversation={mockConversation}
        messages={mockMessages}
      />
    )
    await user.click(screen.getByRole('button', { name: /^Export$/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
