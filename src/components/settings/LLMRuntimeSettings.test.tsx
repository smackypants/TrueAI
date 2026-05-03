import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
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
    topK: 40,
    minP: 0.05,
    repeatPenalty: 1.1,
    contextSize: 2048,
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

const { mockSubscribeProgress } = vi.hoisted(() => ({
  mockSubscribeProgress: vi.fn(() => () => {}),
}))

vi.mock('@/lib/llm-runtime/ai-sdk/local-wllama-provider', () => ({
  subscribeToLocalWllamaProgress: mockSubscribeProgress,
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
  topK: 40,
  minP: 0.05,
  repeatPenalty: 1.1,
  contextSize: 2048,
  maxTokens: 4096,
}

describe('LLMRuntimeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureLoaded.mockResolvedValue(defaultConfig)
    mockSubscribe.mockReturnValue(vi.fn())
    mockUpdate.mockResolvedValue(defaultConfig)
    // Default: idle replay only.
    mockSubscribeProgress.mockImplementation((listener) => {
      listener({ state: 'idle' })
      return () => {}
    })
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

  it('edits the API key field and saves the new value', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    const keyInput = screen.getByLabelText('API key (optional)')
    await user.type(keyInput, 'sk-secret')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-secret' })
    )
  })

  it('edits the default model input and saves the new value', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    const input = screen.getByLabelText('Default model')
    await user.clear(input)
    await user.type(input, 'mistral')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ defaultModel: 'mistral' })
    )
  })

  it('edits temperature, top P, and max tokens numeric inputs', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    fireEvent.change(screen.getByLabelText('Temperature'), { target: { value: '0.5' } })
    fireEvent.change(screen.getByLabelText('Top P'), { target: { value: '0.9' } })
    fireEvent.change(screen.getByLabelText('Max tokens'), { target: { value: '512' } })

    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.5, topP: 0.9, maxTokens: 512 })
    )
  })

  it('clamps maxTokens to 1 when input is cleared (NaN fallback)', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    fireEvent.change(screen.getByLabelText('Max tokens'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ maxTokens: 1 })
    )
  })

  it('clamps requestTimeoutMs to a 1000ms minimum floor', async () => {
    const user = userEvent.setup()
    render(<LLMRuntimeSettings />)
    await act(async () => {})

    fireEvent.change(screen.getByLabelText('Request timeout (ms)'), { target: { value: '500' } })
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ requestTimeoutMs: 1000 })
    )
  })

  it('shows error toast when updateLLMRuntimeConfig rejects', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    const errorSpy = vi.spyOn(toast, 'error').mockImplementation(() => 't' as never)
    mockUpdate.mockRejectedValueOnce(new Error('disk full'))

    render(<LLMRuntimeSettings />)
    await act(async () => {})

    const urlInput = screen.getByLabelText('Base URL')
    await user.clear(urlInput)
    await user.type(urlInput, 'http://localhost:9999/v1')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))
    await act(async () => {})

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'))
    errorSpy.mockRestore()
  })

  it('renders datalist suggestions after a successful test connection', async () => {
    const user = userEvent.setup()
    mockTestConnection.mockResolvedValue({
      ok: true,
      status: 200,
      models: ['llama3.2', 'mistral', 'codellama'],
    })

    const { container } = render(<LLMRuntimeSettings />)
    await act(async () => {})

    await user.click(screen.getByRole('button', { name: /Test connection/i }))
    await act(async () => {})

    const datalist = container.querySelector('#llm-model-suggestions')
    expect(datalist).not.toBeNull()
    expect(datalist?.querySelectorAll('option').length).toBe(3)
  })

  it('truncates available models display to 12 with an ellipsis', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 15 }, (_, i) => `model-${i}`)
    mockTestConnection.mockResolvedValue({ ok: true, status: 200, models: many })

    render(<LLMRuntimeSettings />)
    await act(async () => {})

    await user.click(screen.getByRole('button', { name: /Test connection/i }))
    await act(async () => {})

    expect(screen.getByText(/Available models \(15\)/)).toBeInTheDocument()
    expect(screen.getByText(/model-0,.*model-11, …/)).toBeInTheDocument()
  })

  describe('PR 3 — extended sampling knobs (Top-K / Min-P / Repeat Penalty / Context Size)', () => {
    it('renders Top-K, Min-P, and Repeat Penalty inputs with defaults for a local provider (ollama)', async () => {
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      const topK = screen.getByLabelText('Top-K') as HTMLInputElement
      const minP = screen.getByLabelText('Min-P') as HTMLInputElement
      const rp = screen.getByLabelText('Repeat penalty') as HTMLInputElement

      expect(topK).toHaveValue(40)
      expect(minP).toHaveValue(0.05)
      expect(rp).toHaveValue(1.1)
    })

    it('does NOT render Context size for the default ollama provider', async () => {
      render(<LLMRuntimeSettings />)
      await act(async () => {})
      // Context size is on-device-only (wllama n_ctx). Hidden for HTTP
      // providers, including ollama.
      expect(screen.queryByLabelText('Context size (tokens)')).toBeNull()
    })

    it('renders Context size when the provider is local-wasm (on-device)', async () => {
      mockEnsureLoaded.mockResolvedValue({
        ...defaultConfig,
        provider: 'local-wasm',
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      const ctx = screen.getByLabelText('Context size (tokens)') as HTMLInputElement
      expect(ctx).toHaveValue(2048)
    })

    it('hides Top-K / Min-P / Repeat Penalty / Context Size for the openai provider', async () => {
      mockEnsureLoaded.mockResolvedValue({
        ...defaultConfig,
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      expect(screen.queryByLabelText('Top-K')).toBeNull()
      expect(screen.queryByLabelText('Min-P')).toBeNull()
      expect(screen.queryByLabelText('Repeat penalty')).toBeNull()
      expect(screen.queryByLabelText('Context size (tokens)')).toBeNull()
      // Sanity: temperature/top-p/max-tokens are still shown for hosted
      // providers — they apply to every OpenAI-API endpoint.
      expect(screen.getByLabelText('Temperature')).toBeInTheDocument()
      expect(screen.getByLabelText('Top P')).toBeInTheDocument()
      expect(screen.getByLabelText('Max tokens')).toBeInTheDocument()
    })

    it('hides the extended knobs for anthropic and google as well', async () => {
      for (const provider of ['anthropic', 'google'] as const) {
        mockEnsureLoaded.mockResolvedValueOnce({ ...defaultConfig, provider })
        const { unmount } = render(<LLMRuntimeSettings />)
        await act(async () => {})
        expect(screen.queryByLabelText('Top-K')).toBeNull()
        expect(screen.queryByLabelText('Min-P')).toBeNull()
        expect(screen.queryByLabelText('Repeat penalty')).toBeNull()
        unmount()
      }
    })

    it('saves edits to Top-K / Min-P / Repeat Penalty', async () => {
      const user = userEvent.setup()
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      fireEvent.change(screen.getByLabelText('Top-K'), { target: { value: '80' } })
      fireEvent.change(screen.getByLabelText('Min-P'), { target: { value: '0.1' } })
      fireEvent.change(screen.getByLabelText('Repeat penalty'), { target: { value: '1.2' } })

      await user.click(screen.getByRole('button', { name: /^Save$/i }))

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          topK: 80,
          minP: 0.1,
          repeatPenalty: 1.2,
        }),
      )
    })

    it('saves edits to Context size when the provider is local-wasm', async () => {
      const user = userEvent.setup()
      mockEnsureLoaded.mockResolvedValue({
        ...defaultConfig,
        provider: 'local-wasm',
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      fireEvent.change(screen.getByLabelText('Context size (tokens)'), {
        target: { value: '4096' },
      })
      await user.click(screen.getByRole('button', { name: /^Save$/i }))

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ contextSize: 4096 }),
      )
    })

    it('clamps Top-K to its [0, 1000] range and Min-P to [0, 1] for blank / out-of-range inputs', async () => {
      const user = userEvent.setup()
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      // Blank → falls back to 0 (the "disabled" sentinel for these knobs).
      fireEvent.change(screen.getByLabelText('Top-K'), { target: { value: '' } })
      // Above range → clamped to upper bound (1).
      fireEvent.change(screen.getByLabelText('Min-P'), { target: { value: '5' } })

      await user.click(screen.getByRole('button', { name: /^Save$/i }))

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ topK: 0, minP: 1 }),
      )
    })

    it('shows the "disabled" hint when Top-K is at its neutral value (0)', async () => {
      mockEnsureLoaded.mockResolvedValue({
        ...defaultConfig,
        topK: 0,
        minP: 0,
        repeatPenalty: 1,
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      // The value-readout span next to each label shows "disabled" when
      // the knob is at its neutral value, so the user understands the
      // field will be omitted from outgoing requests.
      expect(screen.getByTestId('llm-top-k-value')).toHaveTextContent('disabled')
      expect(screen.getByTestId('llm-min-p-value')).toHaveTextContent('disabled')
      expect(screen.getByTestId('llm-repeat-penalty-value')).toHaveTextContent('disabled')
    })

    it('Save button becomes enabled after editing Top-K alone', async () => {
      render(<LLMRuntimeSettings />)
      await act(async () => {})

      fireEvent.change(screen.getByLabelText('Top-K'), { target: { value: '20' } })

      expect(screen.getByRole('button', { name: /^Save$/i })).not.toBeDisabled()
    })
  })

  describe('PR 6 — local-wasm download progress panel', () => {
    const localWasmConfig = { ...defaultConfig, provider: 'local-wasm' as const }

    it('does not render the on-device status panel when provider is hosted', async () => {
      render(<LLMRuntimeSettings />)
      await act(async () => {})
      expect(screen.queryByLabelText('On-device runtime status')).not.toBeInTheDocument()
    })

    it('renders the idle status panel when provider is local-wasm', async () => {
      mockEnsureLoaded.mockResolvedValue(localWasmConfig)
      render(<LLMRuntimeSettings />)
      await act(async () => {})
      const panel = await screen.findByLabelText('On-device runtime status')
      expect(panel).toBeInTheDocument()
      expect(panel).toHaveTextContent(/not loaded yet/i)
    })

    it('renders a progressbar with percent and MB/MB while downloading', async () => {
      mockEnsureLoaded.mockResolvedValue(localWasmConfig)
      // Synchronously deliver a downloading event during subscribe so
      // it's visible by the time render flushes.
      mockSubscribeProgress.mockImplementation((listener) => {
        listener({
          state: 'downloading',
          loaded: 250 * 1024 * 1024,
          total: 1000 * 1024 * 1024,
          source: 'hf:owner/repo:m.gguf',
        })
        return () => {}
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})
      expect(await screen.findByText(/Downloading model… 25%/)).toBeInTheDocument()
      const bar = screen.getByRole('progressbar', { name: /Model download progress/i })
      expect(bar).toHaveAttribute('aria-valuenow', '25')
      expect(screen.getByText(/250\.00 MB \/ 1000\.00 MB|250\.00 MB \/ 1\.00 GB/)).toBeInTheDocument()
    })

    it('shows "ready" copy when the model has finished loading', async () => {
      mockEnsureLoaded.mockResolvedValue(localWasmConfig)
      mockSubscribeProgress.mockImplementation((listener) => {
        listener({ state: 'ready', source: 'hf:owner/repo:m.gguf' })
        return () => {}
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})
      expect(await screen.findByText(/On-device model loaded/i)).toBeInTheDocument()
    })

    it('shows the error message in an alert when the load fails', async () => {
      mockEnsureLoaded.mockResolvedValue(localWasmConfig)
      mockSubscribeProgress.mockImplementation((listener) => {
        listener({
          state: 'error',
          source: 'https://example.test/missing.gguf',
          error: 'HTTP 404 Not Found',
        })
        return () => {}
      })
      render(<LLMRuntimeSettings />)
      await act(async () => {})
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(/HTTP 404 Not Found/)
    })

    it('unsubscribes from the progress feed on unmount', async () => {
      mockEnsureLoaded.mockResolvedValue(localWasmConfig)
      const unsubscribe = vi.fn()
      mockSubscribeProgress.mockImplementation((listener) => {
        listener({ state: 'idle' })
        return unsubscribe
      })
      const { unmount } = render(<LLMRuntimeSettings />)
      await act(async () => {})
      unmount()
      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
