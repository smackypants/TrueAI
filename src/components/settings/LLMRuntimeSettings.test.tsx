import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockEnsureLoaded, mockSubscribe, mockUpdate, mockTestConnection } = vi.hoisted(() => ({
  mockEnsureLoaded: vi.fn(),
  mockSubscribe: vi.fn(() => vi.fn()), // returns unsubscribe fn
  mockUpdate: vi.fn(),
  mockTestConnection: vi.fn(),
}))

vi.mock('@/lib/llm-runtime/config', () => {
  const DEFAULT_LLM_RUNTIME_CONFIG = {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    defaultModel: 'llama3.2',
    requestTimeoutMs: 30000,
    temperature: 0.7,
    topP: 1,
    maxTokens: 4096,
  }
  return {
    DEFAULT_LLM_RUNTIME_CONFIG,
    ensureLLMRuntimeConfigLoaded: mockEnsureLoaded,
    subscribeToLLMRuntimeConfig: mockSubscribe,
    updateLLMRuntimeConfig: mockUpdate,
  }
})

vi.mock('@/lib/llm-runtime/client', () => ({
  testLLMRuntimeConnection: mockTestConnection,
}))

import { LLMRuntimeSettings } from './LLMRuntimeSettings'

const defaultConfig = {
  provider: 'ollama' as const,
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  defaultModel: 'llama3.2',
  requestTimeoutMs: 30000,
  temperature: 0.7,
  topP: 1,
  maxTokens: 4096,
}

describe('LLMRuntimeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureLoaded.mockResolvedValue(defaultConfig)
    mockSubscribe.mockReturnValue(vi.fn())
    mockUpdate.mockResolvedValue(defaultConfig)
  })

  it('renders the LLM Runtime section heading', async () => {
    render(<LLMRuntimeSettings />)
    await act(async () => {})
    expect(screen.getByText('LLM Runtime')).toBeInTheDocument()
  })

  it('renders the Provider label and selector', async () => {
    render(<LLMRuntimeSettings />)
    await act(async () => {})
    expect(screen.getByLabelText('Provider')).toBeInTheDocument()
  })

  it('renders the Base URL input with the loaded value', async () => {
    render(<LLMRuntimeSettings />)
    await act(async () => {})
    const input = screen.getByLabelText('Base URL')
    expect(input).toHaveValue('http://localhost:11434/v1')
  })

  it('renders the Default model input', async () => {
    render(<LLMRuntimeSettings />)
    await act(async () => {})
    expect(screen.getByLabelText('Default model')).toBeInTheDocument()
  })

  it('renders Test connection, Save, and Discard changes buttons', async () => {
    render(<LLMRuntimeSettings />)
    await act(async () => {})
    expect(screen.getByRole('button', { name: /Test connection/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Discard changes/i })).toBeInTheDocument()
  })

  it('Save button is disabled when there are no unsaved changes', async () => {
    render(<LLMRuntimeSettings />)
    await act(async () => {})
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeDisabled()
  })

  it('Save button becomes enabled after editing a field', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    const urlInput = screen.getByLabelText('Base URL')
    await user.clear(urlInput)
    await user.type(urlInput, 'http://localhost:9999/v1')

    expect(screen.getByRole('button', { name: /^Save$/i })).not.toBeDisabled()
  })

  it('calls updateLLMRuntimeConfig when Save is clicked', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    const urlInput = screen.getByLabelText('Base URL')
    await user.clear(urlInput)
    await user.type(urlInput, 'http://localhost:9999/v1')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'http://localhost:9999/v1' })
    )
  })

  it('discard changes resets the form', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    const urlInput = screen.getByLabelText('Base URL')
    await user.clear(urlInput)
    await user.type(urlInput, 'http://changed:9999/v1')

    await user.click(screen.getByRole('button', { name: /Discard changes/i }))

    expect(urlInput).toHaveValue('http://localhost:11434/v1')
  })

  it('shows "Testing…" while connection test is in progress', async () => {
    const user = userEvent.setup()
    // Never resolve so we can observe the loading state
    mockTestConnection.mockReturnValue(new Promise(() => {}))

    render(<LLMRuntimeSettings />)
    await act(async () => {})

    await user.click(screen.getByRole('button', { name: /Test connection/i }))

    expect(screen.getByRole('button', { name: /Testing…/i })).toBeInTheDocument()
  })

  it('shows success status when connection test succeeds', async () => {
    const user = userEvent.setup()
    mockTestConnection.mockResolvedValue({ ok: true, status: 200, models: ['llama3.2'] })

    render(<LLMRuntimeSettings />)
    await act(async () => {})

    await user.click(screen.getByRole('button', { name: /Test connection/i }))
    await act(async () => {})

    expect(screen.getByText('✓ Endpoint reachable')).toBeInTheDocument()
  })

  it('shows error status when connection test fails', async () => {
    const user = userEvent.setup()
    mockTestConnection.mockResolvedValue({ ok: false, error: 'Connection refused' })

    render(<LLMRuntimeSettings />)
    await act(async () => {})

    await user.click(screen.getByRole('button', { name: /Test connection/i }))
    await act(async () => {})

    expect(screen.getByText('✗ Could not reach endpoint')).toBeInTheDocument()
    expect(screen.getByText('Connection refused')).toBeInTheDocument()
  })

  it('shows HTTP API key warning when apiKey set and URL is http://', async () => {
    const _user = userEvent.setup()
    mockEnsureLoaded.mockResolvedValue({
      ...defaultConfig,
      apiKey: 'sk-test-key',
      baseUrl: 'http://localhost:11434/v1',
    })

    render(<LLMRuntimeSettings />)
    await act(async () => {})

    expect(
      screen.getByRole('alert')
    ).toBeInTheDocument()
  })

  it('calls subscribeToLLMRuntimeConfig on mount and unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn()
    mockSubscribe.mockReturnValue(unsubscribe)

    const { unmount } = render(<LLMRuntimeSettings />)
    await act(async () => {})

    expect(mockSubscribe).toHaveBeenCalledTimes(1)

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
