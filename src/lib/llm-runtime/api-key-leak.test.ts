/**
 * Security regression: when the user configures a hosted provider
 * (OpenAI, Anthropic, Google) through the new AI-SDK path, the API
 * key MUST land in `secureStorage` (Capacitor Preferences on native,
 * IDB-only on web) and MUST NOT appear anywhere in `localStorage`.
 *
 * Mirrors the existing invariant covered by `kv-store.test.ts` for
 * the legacy `client.ts` path; this file proves the same property
 * holds when the AI-SDK provider factory is the consumer.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  __resetLLMRuntimeConfigForTests,
  LLM_RUNTIME_API_KEY_KEY,
  LLM_RUNTIME_CONFIG_KEY,
  updateLLMRuntimeConfig,
} from './config'
import { __resetKvStoreForTests, kvStore } from './kv-store'
import {
  __resetProviderFactoryForTests,
  getLanguageModel,
} from './ai-sdk/provider-factory'

const SECRET = 'sk-very-secret-do-not-leak'

function localStorageDump(): string {
  const out: string[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k == null) continue
      const v = window.localStorage.getItem(k) ?? ''
      out.push(`${k}=${v}`)
    }
  } catch {
    // ignore
  }
  return out.join('\n')
}

describe('AI-SDK provider factory: api-key storage invariant', () => {
  beforeEach(async () => {
    __resetKvStoreForTests()
    __resetLLMRuntimeConfigForTests()
    __resetProviderFactoryForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
    // Drop any persisted KV keys from previous runs.
    await kvStore.delete(LLM_RUNTIME_CONFIG_KEY)
    await kvStore.delete(LLM_RUNTIME_API_KEY_KEY)
  })

  afterEach(() => {
    __resetProviderFactoryForTests()
  })

  it('does not leak the API key to localStorage when configuring an OpenAI hosted provider', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: SECRET,
      defaultModel: 'gpt-4o-mini',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 1,
      maxTokens: 100,
    })
    const model = await getLanguageModel()
    expect(model.modelId).toBe('gpt-4o-mini')

    const dump = localStorageDump()
    expect(dump).not.toContain(SECRET)
    expect(dump).not.toContain(LLM_RUNTIME_API_KEY_KEY)
  })

  it('does not leak the API key to localStorage when configuring an Anthropic hosted provider', async () => {
    await updateLLMRuntimeConfig({
      provider: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: SECRET,
      defaultModel: 'claude-3-5-sonnet-latest',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 1,
      maxTokens: 100,
    })
    await getLanguageModel()
    const dump = localStorageDump()
    expect(dump).not.toContain(SECRET)
    expect(dump).not.toContain(LLM_RUNTIME_API_KEY_KEY)
  })

  it('does not leak the API key to localStorage when configuring a Google hosted provider', async () => {
    await updateLLMRuntimeConfig({
      provider: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: SECRET,
      defaultModel: 'gemini-1.5-flash',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 1,
      maxTokens: 100,
    })
    await getLanguageModel()
    const dump = localStorageDump()
    expect(dump).not.toContain(SECRET)
    expect(dump).not.toContain(LLM_RUNTIME_API_KEY_KEY)
  })

  it('strips the apiKey from the non-sensitive KV blob', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai-compatible',
      baseUrl: 'http://localhost:8000/v1',
      apiKey: SECRET,
      defaultModel: 'm',
      requestTimeoutMs: 5000,
      temperature: 0.5,
      topP: 1,
      maxTokens: 100,
    })
    const stored = await kvStore.get<Record<string, unknown>>(
      LLM_RUNTIME_CONFIG_KEY,
    )
    expect(stored).toBeDefined()
    expect(stored).not.toHaveProperty('apiKey')
    // And just to be paranoid: dump localStorage too.
    expect(localStorageDump()).not.toContain(SECRET)
  })
})
