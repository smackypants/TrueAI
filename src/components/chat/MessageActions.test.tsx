import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageActions } from './MessageActions'
import type { Message } from '@/lib/types'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/native/clipboard', () => ({
  copyText: vi.fn(),
}))

vi.mock('@/lib/native/haptics', () => ({
  haptics: { tap: vi.fn().mockResolvedValue(undefined) },
}))

import { toast } from 'sonner'
import { copyText } from '@/lib/native/clipboard'

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-42',
  conversationId: 'conv-1',
  role: 'assistant',
  content: 'Original content',
  timestamp: Date.now(),
  ...overrides,
})

const defaultProps = {
  message: makeMessage(),
  isVisible: true,
  position: 'left' as const,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onRegenerate: vi.fn(),
  onExport: vi.fn(),
}

describe('MessageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders action buttons when isVisible=true', () => {
    render(<MessageActions {...defaultProps} />)
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
  })

  it('does not render action buttons when isVisible=false', () => {
    render(<MessageActions {...defaultProps} isVisible={false} />)
    expect(screen.queryByRole('button', { name: /^copy$/i })).not.toBeInTheDocument()
  })

  it('shows regenerate button for assistant messages', () => {
    render(<MessageActions {...defaultProps} message={makeMessage({ role: 'assistant' })} />)
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
  })

  it('does not show regenerate button for user messages', () => {
    render(<MessageActions {...defaultProps} message={makeMessage({ role: 'user' })} />)
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
  })

  it('calls onRegenerate with message id when regenerate is clicked', async () => {
    const user = userEvent.setup()
    const onRegenerate = vi.fn()
    render(<MessageActions {...defaultProps} onRegenerate={onRegenerate} />)
    await user.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(onRegenerate).toHaveBeenCalledWith('msg-42')
  })

  it('positions actions on the left when position="left"', () => {
    const { container } = render(<MessageActions {...defaultProps} position="left" />)
    const actionsDiv = container.querySelector('.-top-10') as HTMLElement
    expect(actionsDiv.className).toContain('left-0')
    expect(actionsDiv.className).not.toContain('right-0')
  })

  it('positions actions on the right when position="right"', () => {
    const { container } = render(<MessageActions {...defaultProps} position="right" />)
    const actionsDiv = container.querySelector('.-top-10') as HTMLElement
    expect(actionsDiv.className).toContain('right-0')
    expect(actionsDiv.className).not.toContain('left-0')
  })

  it('calls copyText and shows success toast when copy succeeds', async () => {
    const user = userEvent.setup()
    vi.mocked(copyText).mockResolvedValue(true)
    render(<MessageActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^copy$/i }))
    await waitFor(() => {
      expect(copyText).toHaveBeenCalledWith('Original content')
      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard')
    })
  })

  it('shows error toast when copy fails', async () => {
    const user = userEvent.setup()
    vi.mocked(copyText).mockResolvedValue(false)
    render(<MessageActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^copy$/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy')
    })
  })

  it('shows check icon briefly after successful copy', async () => {
    const user = userEvent.setup()
    vi.mocked(copyText).mockResolvedValue(true)
    const { container } = render(<MessageActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^copy$/i }))
    await waitFor(() => {
      expect(container.querySelector('.text-green-500')).toBeInTheDocument()
    })
  })

  it('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<MessageActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Edit Message')).toBeInTheDocument()
  })

  it('edit dialog pre-fills textarea with message content', async () => {
    const user = userEvent.setup()
    render(<MessageActions {...defaultProps} message={makeMessage({ content: 'My message' })} />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('My message')
  })

  it('calls onEdit with updated content when Save Changes is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<MessageActions {...defaultProps} onEdit={onEdit} message={makeMessage({ content: 'Old content' })} />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(textarea, 'New content')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onEdit).toHaveBeenCalledWith('msg-42', 'New content')
  })

  it('does not call onEdit when content is unchanged', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<MessageActions {...defaultProps} onEdit={onEdit} message={makeMessage({ content: 'Same content' })} />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('opens delete dialog when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<MessageActions {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText('Delete Message')).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })

  it('calls onDelete with message id when delete is confirmed', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<MessageActions {...defaultProps} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    // Confirm delete is the destructive button inside the dialog
    const dialog = screen.getByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: /^delete$/i })
    await user.click(confirmBtn)
    expect(onDelete).toHaveBeenCalledWith('msg-42')
  })

  it('calls onExport when export button is clicked', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    const msg = makeMessage()
    render(<MessageActions {...defaultProps} onExport={onExport} message={msg} />)
    await user.click(screen.getByRole('button', { name: /^export$/i }))
    expect(onExport).toHaveBeenCalledWith(msg)
  })
})

