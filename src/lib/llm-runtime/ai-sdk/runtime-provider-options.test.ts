import { beforeEach, describe, expect, it } from 'vitest'

import {
  __resetLLMRuntimeConfigForTests,
  updateLLMRuntimeConfig,
} from '../config'
import { __resetKvStoreForTests } from '../kv-store'
import {
  getRuntimeProviderOptions,
  OPENAI_COMPATIBLE_PROVIDER_OPTIONS_KEY,
} from './runtime-provider-options'

describe('getRuntimeProviderOptions', () => {
  beforeEach(() => {
    __resetKvStoreForTests()
    __resetLLMRuntimeConfigForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  })

  describe('openai-compatible providers (Ollama / llama.cpp / LM Studio / openai-compatible)', () => {
    const compatProviders = [
      'ollama',
      'llama-cpp',
      'lm-studio',
      'openai-compatible',
    ] as const

    it.each(compatProviders)(
      'emits top_k/min_p/repeat_penalty under "truelocal" for provider=%s',
      async (provider) => {
        await updateLLMRuntimeConfig({
          provider,
          topK: 40,
          minP: 0.05,
          repeatPenalty: 1.1,
        })
        const opts = getRuntimeProviderOptions()
        expect(opts).toEqual({
          [OPENAI_COMPATIBLE_PROVIDER_OPTIONS_KEY]: {
            top_k: 40,
            min_p: 0.05,
            repeat_penalty: 1.1,
          },
        })
      },
    )

    it('omits neutral / disabled values (topK=0, minP=0, repeatPenalty=1) and returns {}', async () => {
      await updateLLMRuntimeConfig({
        provider: 'ollama',
        topK: 0,
        minP: 0,
        repeatPenalty: 1,
      })
      expect(getRuntimeProviderOptions()).toEqual({})
    })

    it('emits only the non-neutral subset when others are at their neutral values', async () => {
      await updateLLMRuntimeConfig({
        provider: 'ollama',
        topK: 0, // disabled
        minP: 0.1,
        repeatPenalty: 1, // neutral
      })
      expect(getRuntimeProviderOptions()).toEqual({
        [OPENAI_COMPATIBLE_PROVIDER_OPTIONS_KEY]: { min_p: 0.1 },
      })
    })
  })

  describe('hosted and on-device providers', () => {
    it.each(['openai', 'anthropic', 'google', 'local-wasm'] as const)(
      'returns {} for provider=%s so request bodies are byte-identical (or wllama defaults stay authoritative)',
      async (provider) => {
        await updateLLMRuntimeConfig({
          provider,
          topK: 40,
          minP: 0.05,
          repeatPenalty: 1.1,
        })
        expect(getRuntimeProviderOptions()).toEqual({})
      },
    )
  })

  it('accepts an explicit config and ignores the runtime singleton', async () => {
    await updateLLMRuntimeConfig({
      provider: 'openai',
      topK: 40,
    })
    const opts = getRuntimeProviderOptions({
      provider: 'ollama',
      baseUrl: '',
      apiKey: '',
      defaultModel: 'm',
      temperature: 0.7,
      topP: 1,
      maxTokens: 1024,
      topK: 50,
      minP: 0.05,
      repeatPenalty: 1.15,
      contextSize: 2048,
      requestTimeoutMs: 30000,
    })
    expect(opts).toEqual({
      [OPENAI_COMPATIBLE_PROVIDER_OPTIONS_KEY]: {
        top_k: 50,
        min_p: 0.05,
        repeat_penalty: 1.15,
      },
    })
  })
})
