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
