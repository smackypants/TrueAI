/**
 * LLM runtime configuration: which OpenAI-compatible endpoint to talk to,
 * which model to use by default, and how long requests are allowed to take.
 *
 * Resolution order (later layers override earlier ones):
 *   1. Hard-coded defaults (Ollama on localhost).
 *   2. `public/runtime.config.json` `llm` block, fetched once at startup.
 *      Lets distributors ship custom defaults baked into the APK.
 *   3. User-provided settings persisted in the local KV store under
 *      `__llm_runtime_config__`. Authored via the Settings UI.
 */

import { kvStore } from './kv-store'
import { secureStorage } from '@/lib/native/secure-storage'

export const LLM_RUNTIME_CONFIG_KEY = '__llm_runtime_config__'
/**
 * The API key is stored separately from the rest of the config because it
 * is sensitive material. On native it lives in Capacitor Preferences
 * (app-private SharedPreferences); on web it goes through `kvStore`'s
 * IDB-only `setSecure` path so it never reaches localStorage. The main
 * config blob (URLs, model names, sampling defaults) is intentionally
 * non-sensitive and uses the regular KV storage.
 */
export const LLM_RUNTIME_API_KEY_KEY = '__llm_runtime_api_key__'

export type LLMProvider =
  | 'ollama'
  | 'llama-cpp'
  | 'lm-studio'
  | 'openai'
  | 'openai-compatible'
  | 'anthropic'
  | 'google'

export interface LLMRuntimeConfig {
  /** Logical provider type (used for sensible default base URLs in the UI). */
  provider: LLMProvider
  /**
   * Base URL of the OpenAI-compatible HTTP endpoint, e.g.
   *   - Ollama:    `http://localhost:11434/v1`
   *   - llama.cpp: `http://localhost:8080/v1`
   *   - LM Studio: `http://localhost:1234/v1`
   *   - OpenAI:    `https://api.openai.com/v1`
   * The client appends `/chat/completions` to this value.
   */
  baseUrl: string
  /** Optional bearer token. Sent as `Authorization: Bearer <apiKey>` if set. */
  apiKey: string
  /** Default model to use when a caller does not specify one. */
  defaultModel: string
  /** Per-request timeout in milliseconds. */
  requestTimeoutMs: number
  /** Default sampling temperature (0..2). */
  temperature: number
  /** Default top_p (0..1). */
  topP: number
  /** Default response token cap. */
  maxTokens: number
}

export const DEFAULT_LLM_RUNTIME_CONFIG: LLMRuntimeConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  defaultModel: 'llama3.2',
  requestTimeoutMs: 120_000,
  temperature: 0.7,
  topP: 1,
  maxTokens: 2000,
}

let cachedConfig: LLMRuntimeConfig | null = null
let configLoadPromise: Promise<LLMRuntimeConfig> | null = null
const subscribers = new Set<(cfg: LLMRuntimeConfig) => void>()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeConfig(
  base: LLMRuntimeConfig,
  patch: Partial<LLMRuntimeConfig> | undefined | null,
): LLMRuntimeConfig {
  if (!patch) return base
  return {
    provider: typeof patch.provider === 'string' ? (patch.provider as LLMProvider) : base.provider,
    baseUrl: typeof patch.baseUrl === 'string' && patch.baseUrl.length > 0 ? patch.baseUrl : base.baseUrl,
    apiKey: typeof patch.apiKey === 'string' ? patch.apiKey : base.apiKey,
    defaultModel:
      typeof patch.defaultModel === 'string' && patch.defaultModel.length > 0
        ? patch.defaultModel
        : base.defaultModel,
    requestTimeoutMs:
      typeof patch.requestTimeoutMs === 'number' && patch.requestTimeoutMs > 0
        ? patch.requestTimeoutMs
        : base.requestTimeoutMs,
    temperature:
      typeof patch.temperature === 'number' && patch.temperature >= 0
        ? patch.temperature
        : base.temperature,
    topP: typeof patch.topP === 'number' && patch.topP >= 0 ? patch.topP : base.topP,
    maxTokens:
      typeof patch.maxTokens === 'number' && patch.maxTokens > 0 ? patch.maxTokens : base.maxTokens,
  }
}

async function loadRuntimeConfigJson(): Promise<Partial<LLMRuntimeConfig> | null> {
  if (typeof fetch !== 'function') return null
  try {
    const res = await fetch('/runtime.config.json', { cache: 'no-store' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!isObject(data)) return null
    const llm = (data as { llm?: unknown }).llm
    if (!isObject(llm)) return null
    return llm as Partial<LLMRuntimeConfig>
  } catch {
    return null
  }
}

async function loadStoredConfig(): Promise<Partial<LLMRuntimeConfig> | null> {
  try {
    const stored = await kvStore.get<Partial<LLMRuntimeConfig>>(LLM_RUNTIME_CONFIG_KEY)
    // Defensive: if a legacy record contains an apiKey field (e.g. from a
    // previous version that stored everything together), strip it here so
    // we never re-publish sensitive material via the non-secure path.
    if (stored && 'apiKey' in stored) {
      const { apiKey: _legacy, ...rest } = stored
      return rest as Partial<LLMRuntimeConfig>
    }
    return stored ?? null
  } catch {
    return null
  }
}

async function loadStoredApiKey(): Promise<string | null> {
  try {
    const v = await secureStorage.get(LLM_RUNTIME_API_KEY_KEY)
    return v ?? null
  } catch {
    return null
  }
}

/** Returns the cached, fully-resolved config. Triggers a load if needed. */
export function getLLMRuntimeConfig(): LLMRuntimeConfig {
  if (cachedConfig) return cachedConfig
  // Kick off async load but return the defaults synchronously so callers
  // never block. Subscribers will be notified once the real values resolve.
  void ensureLLMRuntimeConfigLoaded()
  return DEFAULT_LLM_RUNTIME_CONFIG
}

/**
 * Resolves the layered config exactly once and caches it. Safe to call from
 * many places; subsequent calls return the cached promise.
 */
export function ensureLLMRuntimeConfigLoaded(): Promise<LLMRuntimeConfig> {
  if (cachedConfig) return Promise.resolve(cachedConfig)
  if (configLoadPromise) return configLoadPromise
  configLoadPromise = (async () => {
    const fileCfg = await loadRuntimeConfigJson()
    const storedCfg = await loadStoredConfig()
    const apiKey = await loadStoredApiKey()
    const merged = mergeConfig(mergeConfig(DEFAULT_LLM_RUNTIME_CONFIG, fileCfg), storedCfg)
    if (apiKey != null) merged.apiKey = apiKey
    cachedConfig = merged
    for (const cb of subscribers) {
      try {
        cb(merged)
      } catch {
        // ignore subscriber errors
      }
    }
    return merged
  })()
  return configLoadPromise
}

/** Persist a new (partial) config and broadcast it. */
export async function updateLLMRuntimeConfig(
  patch: Partial<LLMRuntimeConfig>,
): Promise<LLMRuntimeConfig> {
  const current = await ensureLLMRuntimeConfigLoaded()
  const next = mergeConfig(current, patch)
  cachedConfig = next
  // Split sensitive material out of the main blob: apiKey goes through
  // secureStorage (Capacitor Preferences on native, IDB-only on web);
  // everything else goes via kvStore. This keeps the API key off the
  // localStorage fallback path even when IDB is unavailable.
  const { apiKey, ...nonSensitive } = next
  await kvStore.set(LLM_RUNTIME_CONFIG_KEY, nonSensitive)
  if (apiKey && apiKey.length > 0) {
    await secureStorage.set(LLM_RUNTIME_API_KEY_KEY, apiKey)
  } else {
    await secureStorage.remove(LLM_RUNTIME_API_KEY_KEY)
  }
  for (const cb of subscribers) {
    try {
      cb(next)
    } catch {
      // ignore
    }
  }
  return next
}

/** Subscribe to config changes; returns an unsubscribe function. */
export function subscribeToLLMRuntimeConfig(
  cb: (cfg: LLMRuntimeConfig) => void,
): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

/** Test-only helper: forget the cached config so the next call reloads. */
export function __resetLLMRuntimeConfigForTests(): void {
  cachedConfig = null
  configLoadPromise = null
  subscribers.clear()
}
