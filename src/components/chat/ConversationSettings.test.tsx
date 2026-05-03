import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationSettings } from './ConversationSettings'
import type { Conversation, ModelConfig } from '@/lib/types'

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'Test Chat',
  model: 'model-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  temperature: 0.7,
  maxTokens: 2000,
  streamingEnabled: true,
  contextWindow: 10,
  systemPrompt: '',
  ...overrides,
})

const makeModel = (id: string, name: string): ModelConfig => ({
  id,
  name,
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
})

const defaultProps = {
  conversation: makeConversation(),
  models: [
    makeModel('model-1', 'Llama 3'),
    makeModel('model-2', 'Mistral 7B'),
  ],
  onUpdate: vi.fn(),
  open: true,
  onOpenChange: vi.fn(),
}

describe('ConversationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog title when open', () => {
    render(<ConversationSettings {...defaultProps} />)
    expect(screen.getByText('Conversation Settings')).toBeInTheDocument()
  })

  it('renders title input with current conversation title', () => {
    render(<ConversationSettings {...defaultProps} />)
    const input = screen.getByLabelText('Conversation Title') as HTMLInputElement
    expect(input.value).toBe('Test Chat')
  })

  it('displays the initially selected model name in the trigger', () => {
    render(<ConversationSettings {...defaultProps} />)
    // SelectValue shows the selected item text in the trigger button (no need to open dropdown)
    expect(screen.getByText('Llama 3')).toBeInTheDocument()
  })

  it('shows temperature label with current temperature value', () => {
    render(<ConversationSettings {...defaultProps} conversation={makeConversation({ temperature: 0.9 })} />)
    expect(screen.getByText(/Temperature: 0.9/)).toBeInTheDocument()
  })

  it('shows max tokens label with current value', () => {
    render(<ConversationSettings {...defaultProps} conversation={makeConversation({ maxTokens: 3000 })} />)
    expect(screen.getByText(/Max Tokens: 3000/)).toBeInTheDocument()
  })

  it('shows context window label with current value', () => {
    render(<ConversationSettings {...defaultProps} conversation={makeConversation({ contextWindow: 15 })} />)
    expect(screen.getByText(/Context Window: 15 messages/)).toBeInTheDocument()
  })

  it('calls onUpdate with updated settings when Save Changes is clicked', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ConversationSettings {...defaultProps} onUpdate={onUpdate} />)
    const titleInput = screen.getByLabelText('Conversation Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'New Title')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }))
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<ConversationSettings {...defaultProps} onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('fills Default system prompt when Default preset button is clicked', async () => {
    const user = userEvent.setup()
    render(<ConversationSettings {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^default$/i }))
    const textarea = screen.getByLabelText('System Prompt') as HTMLTextAreaElement
    expect(textarea.value).toContain('helpful assistant')
  })

  it('fills Creative system prompt when Creative preset button is clicked', async () => {
    const user = userEvent.setup()
    render(<ConversationSettings {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^creative$/i }))
    const textarea = screen.getByLabelText('System Prompt') as HTMLTextAreaElement
    expect(textarea.value).toContain('creative writing')
  })

  it('fills Technical system prompt when Technical preset button is clicked', async () => {
    const user = userEvent.setup()
    render(<ConversationSettings {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^technical$/i }))
    const textarea = screen.getByLabelText('System Prompt') as HTMLTextAreaElement
    expect(textarea.value).toContain('technical expert')
  })

  it('fills Tutor system prompt when Tutor preset button is clicked', async () => {
    const user = userEvent.setup()
    render(<ConversationSettings {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /^tutor$/i }))
    const textarea = screen.getByLabelText('System Prompt') as HTMLTextAreaElement
    expect(textarea.value).toContain('tutor')
  })

  it('does not render dialog when open=false', () => {
    render(<ConversationSettings {...defaultProps} open={false} />)
    expect(screen.queryByText('Conversation Settings')).not.toBeInTheDocument()
  })

  it('shows streaming toggle switch', () => {
    render(<ConversationSettings {...defaultProps} />)
    // The streaming section has a Switch (checkbox role in Radix)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('toggles streamingEnabled switch and saves the updated value', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ConversationSettings {...defaultProps} onUpdate={onUpdate} conversation={makeConversation({ streamingEnabled: true })} />)
    const toggle = screen.getByRole('switch')
    await user.click(toggle)
    // Save
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ streamingEnabled: false }))
  })

  it('edits systemPrompt textarea and saves the updated text', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ConversationSettings {...defaultProps} onUpdate={onUpdate} />)
    const textarea = screen.getByLabelText('System Prompt')
    await user.clear(textarea)
    await user.type(textarea, 'Custom prompt text')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ systemPrompt: 'Custom prompt text' }))
  })

  it('saves onUpdate with default field values when no overrides given', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ConversationSettings {...defaultProps} onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Chat',
      model: 'model-1',
    }))
  })

  describe('PR 4 — per-conversation sampling overrides (Top-P / Top-K / Min-P / Repeat Penalty)', () => {
    it('renders Top-P with the conversation value', () => {
      render(
        <ConversationSettings
          {...defaultProps}
          conversation={makeConversation({ topP: 0.85 })}
        />,
      )
      expect(screen.getByText(/Top-P: 0\.85/)).toBeInTheDocument()
    })

    it('falls back to OfflineLLM-aligned defaults (Top-P=1, Top-K=40, Min-P=0.05, Repeat=1.1) when fields are undefined', () => {
      render(<ConversationSettings {...defaultProps} />)
      expect(screen.getByText(/Top-P: 1\.00/)).toBeInTheDocument()
      expect(screen.getByText(/Top-K: 40/)).toBeInTheDocument()
      expect(screen.getByText(/Min-P: 0\.05/)).toBeInTheDocument()
      expect(screen.getByText(/Repeat Penalty: 1\.10/)).toBeInTheDocument()
    })

    it('shows the "disabled" hint when Top-K / Min-P / Repeat Penalty are at their neutral values', () => {
      render(
        <ConversationSettings
          {...defaultProps}
          conversation={makeConversation({ topK: 0, minP: 0, repeatPenalty: 1 })}
        />,
      )
      expect(screen.getByText(/Top-K: disabled/)).toBeInTheDocument()
      expect(screen.getByText(/Min-P: disabled/)).toBeInTheDocument()
      expect(screen.getByText(/Repeat Penalty: disabled/)).toBeInTheDocument()
    })

    it('saves the four new sampling fields on Save Changes', async () => {
      const user = userEvent.setup()
      const onUpdate = vi.fn()
      render(
        <ConversationSettings
          {...defaultProps}
          onUpdate={onUpdate}
          conversation={makeConversation({
            topP: 0.9,
            topK: 80,
            minP: 0.1,
            repeatPenalty: 1.2,
          })}
        />,
      )
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          topP: 0.9,
          topK: 80,
          minP: 0.1,
          repeatPenalty: 1.2,
        }),
      )
    })

    it('renders the "Local-runtime sampling" group heading and explanatory copy', () => {
      render(<ConversationSettings {...defaultProps} />)
      expect(screen.getByText('Local-runtime sampling')).toBeInTheDocument()
      // Sanity: the explanatory blurb mentions the hosted providers that
      // ignore these knobs, so a future copy edit doesn't quietly drop
      // the user-facing rationale.
      expect(
        screen.getByText(/Hosted providers \(OpenAI, Anthropic, Google\)/i),
      ).toBeInTheDocument()
    })
  })
})
