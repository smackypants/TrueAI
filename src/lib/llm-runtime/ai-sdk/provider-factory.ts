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
 *   - `provider: 'local-wasm'` → `createLocalWllamaModel({...})`. True
 *     on-device inference via `@wllama/wllama` (WASM llama.cpp). For
 *     this provider, `baseUrl` is reinterpreted as a `.gguf` URL
 *     (or `hf:owner/repo:path` shortcut) and `apiKey` is ignored.
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

async function buildHandle(cfg: LLMRuntimeConfig): Promise<ProviderHandle> {
  switch (cfg.provider) {
    case 'openai': {
      // Lazy-load hosted-provider packages so they don't bloat the
      // initial JS bundle for the local-first default path. Pass the
      // user-supplied apiKey verbatim (including empty string) so the
      // SDK surfaces its own "missing/invalid key" error rather than
      // a misleading placeholder failure.
      const { createOpenAI } = await import('@ai-sdk/openai')
      const p = createOpenAI({
        apiKey: cfg.apiKey,
        baseURL: cfg.baseUrl || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p.chat(id) }
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      const p = createAnthropic({
        apiKey: cfg.apiKey,
        baseURL: cfg.baseUrl || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p(id) }
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
      const p = createGoogleGenerativeAI({
        apiKey: cfg.apiKey,
        baseURL: cfg.baseUrl || undefined,
      })
      return { cfgKey: cacheKey(cfg), build: (id) => p(id) }
    }
    case 'local-wasm': {
      // Lazy-load the wllama adapter so the WASM-build of llama.cpp
      // and its loader are only fetched when a user actually opts
      // into the on-device runtime.
      const { createLocalWllamaModel } = await import('./local-wllama-provider')
      return {
        cfgKey: cacheKey(cfg),
        build: (id) =>
          createLocalWllamaModel({
            modelSource: cfg.baseUrl,
            modelId: id,
            maxOutputTokens: cfg.maxTokens,
            contextSize: cfg.contextSize,
            defaultSampling: {
              topK: cfg.topK,
              minP: cfg.minP,
              repeatPenalty: cfg.repeatPenalty,
            },
          }),
      }
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
    cachedHandle = await buildHandle(cfg)
  }
  return cachedHandle.build(id)
}

/**
 * Synchronous variant for the local-first default path. Hosted
 * providers (openai, anthropic, google) require the async
 * `getLanguageModel` because their packages are dynamically imported
 * to keep the initial bundle small. Calling this with a hosted
 * provider configured will throw.
 */
export function getLanguageModelSync(modelId?: string): LanguageModel {
  ensureSubscribed()
  const cfg = getLLMRuntimeConfig()
  const id = modelId && modelId.trim().length > 0 ? modelId.trim() : cfg.defaultModel
  if (
    cfg.provider === 'openai' ||
    cfg.provider === 'anthropic' ||
    cfg.provider === 'google' ||
    cfg.provider === 'local-wasm'
  ) {
    throw new Error(
      `getLanguageModelSync does not support provider '${cfg.provider}'. Use the async getLanguageModel() instead.`,
    )
  }
  if (!cachedHandle || cachedHandle.cfgKey !== cacheKey(cfg)) {
    const p = createOpenAICompatible({
      name: 'truelocal',
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey || undefined,
    })
    cachedHandle = { cfgKey: cacheKey(cfg), build: (id2) => p.chatModel(id2) }
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
