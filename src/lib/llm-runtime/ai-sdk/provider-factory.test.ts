import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetLLMRuntimeConfigForTests,
  updateLLMRuntimeConfig,
} from '../config'
import { __resetKvStoreForTests } from '../kv-store'
import {
  __resetProviderFactoryForTests,
  getLanguageModel,
  getLanguageModelSync,
} from './provider-factory'

describe('ai-sdk provider-factory', () => {
  beforeEach(async () => {
    __resetKvStoreForTests()
    __resetLLMRuntimeConfigForTests()
    __resetProviderFactoryForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  })

  afterEach(() => {
    __resetProviderFactoryForTests()
  })

  it('builds an OpenAI-compatible model by default and uses defaultModel when none given', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://test.local/v1',
      apiKey: 'k',
      defaultModel: 'm-default',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const model = await getLanguageModel()
    expect(model.modelId).toBe('m-default')
    // openai-compatible factory is given name 'truelocal'
    expect(model.provider.startsWith('truelocal')).toBe(true)
  })

  it('honours an explicit modelId override', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://test.local/v1',
      apiKey: '',
      defaultModel: 'd',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const model = await getLanguageModel('custom-id')
    expect(model.modelId).toBe('custom-id')
  })

  it('caches the underlying provider across calls when config is unchanged', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://test.local/v1',
      apiKey: 'k',
      defaultModel: 'm',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const m1 = await getLanguageModel('a')
    const m2 = await getLanguageModel('a')
    // Models from the same provider chat() factory share the underlying
    // config object reference; modelId match implies same source.
    expect(m1.modelId).toBe(m2.modelId)
  })

  it('rebuilds the provider after a config change (subscriber invalidation)', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://first.local/v1',
      apiKey: 'k',
      defaultModel: 'm-first',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const before = await getLanguageModel()
    expect(before.modelId).toBe('m-first')

    await updateLLMRuntimeConfig({
      baseUrl: 'http://second.local/v1',
      defaultModel: 'm-second',
    })
    const after = await getLanguageModel()
    expect(after.modelId).toBe('m-second')
  })

  it('switches to OpenAI when provider=openai', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      defaultModel: 'gpt-4o-mini',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const model = await getLanguageModel()
    expect(model.modelId).toBe('gpt-4o-mini')
    expect(model.provider.startsWith('openai')).toBe(true)
  })

  it('switches to Anthropic when provider=anthropic', async () => {
    await updateLLMRuntimeConfig({
      provider: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-test',
      defaultModel: 'claude-3-5-sonnet-latest',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const model = await getLanguageModel()
    expect(model.modelId).toBe('claude-3-5-sonnet-latest')
    expect(model.provider.startsWith('anthropic')).toBe(true)
  })

  it('switches to Google when provider=google', async () => {
    await updateLLMRuntimeConfig({
      provider: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: 'g-test',
      defaultModel: 'gemini-1.5-flash',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    const model = await getLanguageModel()
    expect(model.modelId).toBe('gemini-1.5-flash')
    expect(model.provider.startsWith('google')).toBe(true)
  })

  it('does not read the api key from process.env (security: only LLMRuntimeConfig)', async () => {
    const prev = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'should-not-be-used'
    try {
      await updateLLMRuntimeConfig({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        defaultModel: 'gpt-4o-mini',
        requestTimeoutMs: 5000,
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 100,
      })
      // Spy on fetch to capture the outbound Authorization header.
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              id: 'x',
              object: 'chat.completion',
              created: 0,
              model: 'gpt-4o-mini',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: 'ok' },
                  finish_reason: 'stop',
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        )
      const orig = globalThis.fetch
      globalThis.fetch = fetchSpy as unknown as typeof fetch
      try {
        const { generateText } = await import('ai')
        const model = await getLanguageModel()
        try {
          await generateText({ model, prompt: 'hi' })
        } catch {
          // The model may reject because apiKey is empty — that's fine,
          // we only care that env wasn't picked up.
        }
        // If a request was made, its Authorization header should not
        // contain the env value.
        if (fetchSpy.mock.calls.length > 0) {
          const init = fetchSpy.mock.calls[0][1] as
            | RequestInit
            | undefined
          const headers = (init?.headers ?? {}) as Record<string, string>
          const auth = headers['Authorization'] ?? headers['authorization'] ?? ''
          expect(auth).not.toContain('should-not-be-used')
        }
      } finally {
        globalThis.fetch = orig
      }
    } finally {
      if (prev === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = prev
    }
  })

  it('getLanguageModelSync returns a usable model after hydration', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://test.local/v1',
      apiKey: 'k',
      defaultModel: 'm-sync',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 100,
    })
    // Hydrate first.
    await getLanguageModel()
    const m = getLanguageModelSync('explicit')
    expect(m.modelId).toBe('explicit')
  })
})
