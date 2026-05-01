/**
 * Vercel AI SDK provider factory bound to TrueAI's `LLMRuntimeConfig`.
 *
 * Exposes `getLanguageModel(modelId?)` returning a `LanguageModel`
 * instance built from the user's current runtime configuration:
 *
 *   - `provider: 'ollama' | 'llama-cpp' | 'lm-studio' | 'openai-compatible'`
 *     → `createOpenAICompatible({ baseURL, apiKey, name: 'truelocal' })`.
 *     Default. Local-first; talks to whatever URL the user pointed at.
 *   - `provider: 'openai'`     → `createOpenAI({ apiKey, baseURL })`.
 *   - `provider: 'anthropic'`  → `createAnthropic({ apiKey, baseURL })`.
 *   - `provider: 'google'`     → `createGoogleGenerativeAI({ apiKey, baseURL })`.
 *
 * The provider singleton is invalidated automatically when
 * `subscribeToLLMRuntimeConfig` fires, so the next call sees the new
 * credentials/URL without a reload.
 *
 * Security: the API key is read from the in-memory `LLMRuntimeConfig`
 * (which is hydrated from `secureStorage` — Capacitor Preferences on
 * native, IDB-only on web). It is never read from `process.env` and is
 * never persisted by this module.
 */

import type { LanguageModel } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

import {
  ensureLLMRuntimeConfigLoaded,
  getLLMRuntimeConfig,
  subscribeToLLMRuntimeConfig,
  type LLMRuntimeConfig,
} from '../config'

interface ProviderHandle {
  cfgKey: string
  build: (modelId: string) => LanguageModel
}

let cachedHandle: ProviderHandle | null = null
let unsubscribe: (() => void) | null = null

/**
 * Stable cache key for a config: providers, URLs and keys participate.
 * Sampling defaults are NOT part of the key — they're applied per-call.
 */
function cacheKey(cfg: LLMRuntimeConfig): string {
  return `${cfg.provider}|${cfg.baseUrl}|${cfg.apiKey}|${cfg.defaultModel}`
}

function buildHandle(cfg: LLMRuntimeConfig): ProviderHandle {
  switch (cfg.provider) {
    case 'openai': {
      const p = createOpenAI({
        apiKey: cfg.apiKey || 'missing-api-key',
        baseURL: cfg.baseUrl || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p.chat(id) }
    }
    case 'anthropic': {
      const p = createAnthropic({
        apiKey: cfg.apiKey || 'missing-api-key',
        baseURL: cfg.baseUrl || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p(id) }
    }
    case 'google': {
      const p = createGoogleGenerativeAI({
        apiKey: cfg.apiKey || 'missing-api-key',
        baseURL: cfg.baseUrl || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p(id) }
    }
    case 'ollama':
    case 'llama-cpp':
    case 'lm-studio':
    case 'openai-compatible':
    default: {
      const p = createOpenAICompatible({
        name: 'truelocal',
        baseURL: cfg.baseUrl,
        apiKey: cfg.apiKey || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p.chatModel(id) }
    }
  }
}

function ensureSubscribed(): void {
  if (unsubscribe) return
  unsubscribe = subscribeToLLMRuntimeConfig(() => {
    cachedHandle = null
  })
}

/**
 * Returns a `LanguageModel` for the currently configured provider.
 * Triggers an async config hydration on first use; subsequent calls are
 * cheap (cache hit).
 */
export async function getLanguageModel(modelId?: string): Promise<LanguageModel> {
  ensureSubscribed()
  const cfg = await ensureLLMRuntimeConfigLoaded()
  const id = modelId && modelId.trim().length > 0 ? modelId.trim() : cfg.defaultModel
  if (!cachedHandle || cachedHandle.cfgKey !== cacheKey(cfg)) {
    cachedHandle = buildHandle(cfg)
  }
  return cachedHandle.build(id)
}

/**
 * Synchronous variant: assumes config has already been hydrated. Falls
 * back to defaults otherwise. Intended for hot paths (streaming frames,
 * test helpers); production callers should `ensureLLMRuntimeConfigLoaded()`
 * once at mount and then use this.
 */
export function getLanguageModelSync(modelId?: string): LanguageModel {
  ensureSubscribed()
  const cfg = getLLMRuntimeConfig()
  const id = modelId && modelId.trim().length > 0 ? modelId.trim() : cfg.defaultModel
  if (!cachedHandle || cachedHandle.cfgKey !== cacheKey(cfg)) {
    cachedHandle = buildHandle(cfg)
  }
  return cachedHandle.build(id)
}

/** Test-only: drop the cached provider so the next call rebuilds. */
export function __resetProviderFactoryForTests(): void {
  cachedHandle = null
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}
