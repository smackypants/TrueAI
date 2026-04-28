import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  const onSend = vi.fn()

  beforeEach(() => {
    onSend.mockClear()
  })

  it('renders a textarea for message input', () => {
    render(<ChatInput onSend={onSend} />)
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
  })

  it('renders a send button', () => {
    render(<ChatInput onSend={onSend} />)
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('calls onSend with trimmed input when form is submitted', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, '  Hello world  ')
    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).toHaveBeenCalledWith('Hello world')
  })

  it('does not call onSend when message is empty', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('does not call onSend when message is only whitespace', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, '   ')
    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clears the textarea after sending', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Test message')
    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(textarea).toHaveValue('')
  })

  it('sends message on Enter key', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Enter message')
    await user.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledWith('Enter message')
  })

  it('does not send on Shift+Enter (newline only)', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'Line one')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows character count when input exceeds 100 characters', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    const longText = 'a'.repeat(101)
    await user.type(textarea, longText)
    expect(screen.getByText('101')).toBeInTheDocument()
  })

  it('does not show character count when input is 100 characters or fewer', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    const textarea = screen.getByPlaceholderText('Type your message...')
    await user.type(textarea, 'a'.repeat(100))
    expect(screen.queryByText('100')).not.toBeInTheDocument()
  })

  it('disables the textarea when disabled prop is true', () => {
    render(<ChatInput onSend={onSend} disabled />)
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled()
  })

  it('shows stop button when isStreaming is true', () => {
    render(<ChatInput onSend={onSend} isStreaming onStop={vi.fn()} />)
    expect(screen.getByRole('button', { name: /stop generation/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send message/i })).not.toBeInTheDocument()
  })

  it('calls onStop when stop button is clicked', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    render(<ChatInput onSend={onSend} isStreaming onStop={onStop} />)
    await user.click(screen.getByRole('button', { name: /stop generation/i }))
    expect(onStop).toHaveBeenCalledTimes(1)
  })
})
