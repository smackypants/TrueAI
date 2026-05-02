import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { llm, llmPrompt, LLMRuntimeError, testLLMRuntimeConnection } from './client'
import { __resetLLMRuntimeConfigForTests, updateLLMRuntimeConfig } from './config'
import { __resetKvStoreForTests } from './kv-store'

describe('llmPrompt', () => {
  it('concatenates strings and interpolated values', () => {
    const name = 'world'
    const count = 3
    expect(llmPrompt`hello ${name}, ${count} times`).toBe('hello world, 3 times')
  })

  it('treats null and undefined as empty', () => {
    expect(llmPrompt`a${null}b${undefined}c`).toBe('abc')
  })
})

describe('llm client', () => {
  let originalFetch: typeof fetch

  beforeEach(async () => {
    __resetKvStoreForTests()
    __resetLLMRuntimeConfigForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
    originalFetch = globalThis.fetch
    // Stub the runtime.config.json fetch so it doesn't get mocked away by the
    // per-test fetch stubs below.
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://test.local/v1',
      apiKey: 'test-key',
      defaultModel: 'test-model',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('POSTs to {baseUrl}/chat/completions with bearer auth and returns content', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const out = await llm('ping')
    expect(out).toBe('pong')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://test.local/v1/chat/completions')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-key')
    expect(headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(init.body as string) as {
      model: string
      messages: Array<{ role: string; content: string }>
      temperature: number
      top_p: number
      max_tokens: number
    }
    expect(body.model).toBe('test-model')
    expect(body.messages).toEqual([{ role: 'user', content: 'ping' }])
    expect(body.temperature).toBe(0.5)
    expect(body.top_p).toBe(0.9)
    expect(body.max_tokens).toBe(100)
  })

  it('honours an explicit model override', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }),
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    await llm('hi', 'custom-model')
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as {
      model: string
    }
    expect(body.model).toBe('custom-model')
  })

  it('sets response_format=json_object when jsonMode is true', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 }),
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    await llm('give json', undefined, true)
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as {
      response_format?: { type: string }
    }
    expect(body.response_format).toEqual({ type: 'json_object' })
  })

  it('omits Authorization header when apiKey is empty', async () => {
    await updateLLMRuntimeConfig({ apiKey: '' })
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch
    await llm('hi')
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })

  describe('local-runtime sampling knobs (PR 2)', () => {
    it('emits top_k / min_p / repeat_penalty when the configured values are non-neutral', async () => {
      // Default config from beforeEach is missing the PR-2 fields, so
      // they fall through to DEFAULT_LLM_RUNTIME_CONFIG (40 / 0.05 / 1.1).
      // updateLLMRuntimeConfig leaves those defaults in place.
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
      )
      globalThis.fetch = fetchSpy as unknown as typeof fetch
      await llm('hi')
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      ) as Record<string, unknown>
      expect(body.top_k).toBe(40)
      expect(body.min_p).toBeCloseTo(0.05)
      expect(body.repeat_penalty).toBeCloseTo(1.1)
    })

    it('omits the knobs when the user has set them to their neutral values', async () => {
      await updateLLMRuntimeConfig({ topK: 0, minP: 0, repeatPenalty: 1 })
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
      )
      globalThis.fetch = fetchSpy as unknown as typeof fetch
      await llm('hi')
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      ) as Record<string, unknown>
      // Neutral values must NOT appear in the wire payload — keeps
      // hosted OpenAI / Anthropic / Google requests unchanged.
      expect(body).not.toHaveProperty('top_k')
      expect(body).not.toHaveProperty('min_p')
      expect(body).not.toHaveProperty('repeat_penalty')
    })

    it('honours per-call overrides for the new knobs', async () => {
      await updateLLMRuntimeConfig({ topK: 0, minP: 0, repeatPenalty: 1 })
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
      )
      globalThis.fetch = fetchSpy as unknown as typeof fetch
      await llm('hi', undefined, false, {
        topK: 50,
        minP: 0.07,
        repeatPenalty: 1.2,
      })
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      ) as Record<string, unknown>
      expect(body.top_k).toBe(50)
      expect(body.min_p).toBeCloseTo(0.07)
      expect(body.repeat_penalty).toBeCloseTo(1.2)
    })
  })

  it('throws LLMRuntimeError on non-2xx responses', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('boom', { status: 500, statusText: 'Server Error' })) as unknown as typeof fetch
    await expect(llm('hi')).rejects.toBeInstanceOf(LLMRuntimeError)
  })

  it('throws LLMRuntimeError when content is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'no model' } }), { status: 200 }),
    ) as unknown as typeof fetch
    await expect(llm('hi')).rejects.toThrow(/missing content/)
  })

  it('reports reachable endpoints from testLLMRuntimeConnection', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'm-1' }, { id: 'm-2' }] }), { status: 200 }),
    ) as unknown as typeof fetch
    const result = await testLLMRuntimeConnection('http://test.local/v1', '')
    expect(result.ok).toBe(true)
    expect(result.models).toEqual(['m-1', 'm-2'])
  })

  it('reports unreachable endpoints from testLLMRuntimeConnection', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('network error')) as unknown as typeof fetch
    const result = await testLLMRuntimeConnection('http://nope.local/v1', '')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/network error/)
  })
})

/**
 * Targeted coverage for the error/abort/edge branches in client.ts that the
 * happy-path tests above don't reach.
 */
describe('llm — error & abort paths', () => {
  let originalFetch: typeof fetch

  beforeEach(async () => {
    __resetKvStoreForTests()
    __resetLLMRuntimeConfigForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
    originalFetch = globalThis.fetch
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://test.local/v1',
      apiKey: '',
      defaultModel: 'test-model',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('rejects immediately when an already-aborted external signal is passed', async () => {
    let captured: AbortSignal | undefined
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      captured = init?.signal ?? undefined
      // Simulate the platform throwing an AbortError because the controller
      // signal is already aborted by the time fetch is invoked.
      throw new DOMException('aborted', 'AbortError')
    }) as unknown as typeof fetch

    const ext = new AbortController()
    ext.abort()
    await expect(llm('hi', undefined, false, { signal: ext.signal })).rejects.toThrow(
      /timed out after/,
    )
    expect(captured?.aborted).toBe(true)
  })

  it('forwards a later external abort to the inner controller (signal listener path)', async () => {
    const ext = new AbortController()
    let innerSignal: AbortSignal | undefined
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      innerSignal = init?.signal ?? undefined
      // Trigger the external abort *after* fetch is invoked but before it
      // resolves, so the addEventListener('abort', ...) path runs.
      ext.abort()
      // Yield once so the listener fires on the inner controller.
      await new Promise((r) => setTimeout(r, 0))
      throw new DOMException('aborted', 'AbortError')
    }) as unknown as typeof fetch

    await expect(llm('hi', undefined, false, { signal: ext.signal })).rejects.toThrow(
      /timed out after/,
    )
    expect(innerSignal?.aborted).toBe(true)
  })

  it('falls back to defaults when ensureLLMRuntimeConfigLoaded rejects', async () => {
    // Mock the resolved config so the explicit call throws but the cached
    // values from getLLMRuntimeConfig still work.
    const cfgModule = await import('./config')
    const ensureSpy = vi
      .spyOn(cfgModule, 'ensureLLMRuntimeConfigLoaded')
      .mockRejectedValueOnce(new Error('config blew up'))

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'recovered' } }] }), {
        status: 200,
      }),
    ) as unknown as typeof fetch

    const out = await llm('hi')
    expect(out).toBe('recovered')
    expect(ensureSpy).toHaveBeenCalled()
  })

  it('wraps a generic fetch rejection in LLMRuntimeError with the URL and message', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch

    await expect(llm('hi')).rejects.toThrow(/could not reach .*ECONNREFUSED/)
  })

  it('wraps a non-Error rejection by stringifying it', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue('weird-thrown-value') as unknown as typeof fetch

    await expect(llm('hi')).rejects.toThrow(/could not reach .*weird-thrown-value/)
  })

  it('throws LLMRuntimeError when the response body is not valid JSON', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('not-json-at-all', { status: 200 })) as unknown as typeof fetch

    await expect(llm('hi')).rejects.toThrow(/not valid JSON/)
  })

  it('uses string `error` field as the missing-content message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'string-error-shape' }), { status: 200 }),
    ) as unknown as typeof fetch

    await expect(llm('hi')).rejects.toThrow(/missing content: string-error-shape/)
  })

  it('uses default message when neither error nor choices are present', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })) as unknown as typeof fetch

    await expect(llm('hi')).rejects.toThrow(/no completion choices returned/)
  })

  it('prepends a system message when options.system is provided', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }),
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await llm('user prompt', undefined, false, { system: 'you are helpful' })
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as {
      messages: Array<{ role: string; content: string }>
    }
    expect(body.messages).toEqual([
      { role: 'system', content: 'you are helpful' },
      { role: 'user', content: 'user prompt' },
    ])
  })
})

describe('testLLMRuntimeConnection — edge paths', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('attaches Authorization header when apiKey is non-empty', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    )
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await testLLMRuntimeConnection('http://test.local/v1', 'sk-abc')
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer sk-abc')
  })

  it('returns ok:false with status text on non-OK responses', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' })) as unknown as typeof fetch

    const result = await testLLMRuntimeConnection('http://test.local/v1', '')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
    expect(result.error).toBe('404 Not Found')
  })

  it('returns ok:true with undefined models when payload is not the standard shape', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ unrelated: true }), { status: 200 })) as unknown as typeof fetch

    const result = await testLLMRuntimeConnection('http://test.local/v1', '')
    expect(result.ok).toBe(true)
    expect(result.models).toBeUndefined()
  })

  it('returns ok:true with undefined models when JSON parsing fails', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('not-json', { status: 200 })) as unknown as typeof fetch

    const result = await testLLMRuntimeConnection('http://test.local/v1', '')
    expect(result.ok).toBe(true)
    expect(result.models).toBeUndefined()
  })

  it('reports timeout when fetch rejects with AbortError', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new DOMException('aborted', 'AbortError')) as unknown as typeof fetch

    const result = await testLLMRuntimeConnection('http://test.local/v1', '', 1234)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Timed out after 1234ms')
  })

  it('stringifies non-Error rejections', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue('plain-string-failure') as unknown as typeof fetch

    const result = await testLLMRuntimeConnection('http://test.local/v1', '')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('plain-string-failure')
  })
})
