import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LLM_RUNTIME_CONFIG,
  LLM_RUNTIME_API_KEY_KEY,
  LLM_RUNTIME_CONFIG_KEY,
  ensureLLMRuntimeConfigLoaded,
  getLLMRuntimeConfig,
  subscribeToLLMRuntimeConfig,
  updateLLMRuntimeConfig,
  __resetLLMRuntimeConfigForTests,
} from './config'
import { __resetKvStoreForTests, kvStore } from './kv-store'
import { secureStorage } from '@/lib/native/secure-storage'

/**
 * config.ts orchestrates the layered LLM runtime configuration. These
 * tests cover:
 *   - default values when no overrides exist
 *   - merge semantics (file < stored) and rejection of invalid values
 *   - apiKey routing through secureStorage (never via the main KV blob)
 *   - legacy stripping of an apiKey accidentally persisted in the main blob
 *   - subscribe/unsubscribe and broadcast on update
 *   - the synchronous getLLMRuntimeConfig() returns defaults before load
 */

function mockFetch(payload: unknown | null, opts: { ok?: boolean } = {}) {
  const ok = opts.ok ?? payload !== null
  globalThis.fetch = vi.fn(async () =>
    ({
      ok,
      json: async () => payload,
    }) as unknown as Response,
  ) as unknown as typeof fetch
}

function clearFetch() {
  // Some tests want to assert the "no fetch" path.
  // jsdom doesn't ship fetch, but vitest's environment may. Removing it
  // forces the loader's `typeof fetch !== 'function'` branch.
  // @ts-expect-error - intentional teardown
  delete (globalThis as { fetch?: unknown }).fetch
}

describe('llm-runtime/config', () => {
  beforeEach(async () => {
    __resetLLMRuntimeConfigForTests()
    __resetKvStoreForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
    await secureStorage.remove(LLM_RUNTIME_API_KEY_KEY)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getLLMRuntimeConfig (sync)', () => {
    it('returns the hard-coded defaults before any load completes', () => {
      clearFetch()
      const cfg = getLLMRuntimeConfig()
      expect(cfg).toEqual(DEFAULT_LLM_RUNTIME_CONFIG)
    })

    it('returns the cached value once loaded', async () => {
      mockFetch(null) // fetch returns ok:false → no patch
      await ensureLLMRuntimeConfigLoaded()
      // Subsequent sync reads should serve the cached merged config.
      const cfg = getLLMRuntimeConfig()
      expect(cfg.provider).toBe(DEFAULT_LLM_RUNTIME_CONFIG.provider)
      expect(cfg.baseUrl).toBe(DEFAULT_LLM_RUNTIME_CONFIG.baseUrl)
    })
  })

  describe('ensureLLMRuntimeConfigLoaded', () => {
    it('falls back to defaults when fetch is unavailable and storage is empty', async () => {
      clearFetch()
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg).toEqual(DEFAULT_LLM_RUNTIME_CONFIG)
    })

    it('applies the runtime.config.json `llm` block over defaults', async () => {
      mockFetch({
        llm: {
          provider: 'openai',
          baseUrl: 'https://api.example.com/v1',
          defaultModel: 'gpt-test',
          temperature: 0.2,
          maxTokens: 512,
        },
      })
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg.provider).toBe('openai')
      expect(cfg.baseUrl).toBe('https://api.example.com/v1')
      expect(cfg.defaultModel).toBe('gpt-test')
      expect(cfg.temperature).toBe(0.2)
      expect(cfg.maxTokens).toBe(512)
      // unchanged fields keep defaults
      expect(cfg.topP).toBe(DEFAULT_LLM_RUNTIME_CONFIG.topP)
      expect(cfg.requestTimeoutMs).toBe(DEFAULT_LLM_RUNTIME_CONFIG.requestTimeoutMs)
    })

    it('ignores a malformed runtime.config.json (non-object root or missing llm)', async () => {
      mockFetch('not-an-object')
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg).toEqual(DEFAULT_LLM_RUNTIME_CONFIG)
    })

    it('ignores runtime.config.json when llm field is not an object', async () => {
      mockFetch({ llm: 'oops' })
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg).toEqual(DEFAULT_LLM_RUNTIME_CONFIG)
    })

    it('ignores runtime.config.json when fetch returns non-ok', async () => {
      mockFetch({ llm: { provider: 'openai' } }, { ok: false })
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg).toEqual(DEFAULT_LLM_RUNTIME_CONFIG)
    })

    it('survives a fetch that throws', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('network down')
      }) as unknown as typeof fetch
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg).toEqual(DEFAULT_LLM_RUNTIME_CONFIG)
    })

    it('layers stored KV config over runtime.config.json', async () => {
      mockFetch({
        llm: { provider: 'openai', baseUrl: 'https://from-file.example/v1' },
      })
      // Stored config (Settings UI) should win for the fields it specifies.
      await kvStore.set(LLM_RUNTIME_CONFIG_KEY, {
        baseUrl: 'http://localhost:11434/v1',
        defaultModel: 'llama-from-store',
      })
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg.provider).toBe('openai') // from file
      expect(cfg.baseUrl).toBe('http://localhost:11434/v1') // from store overrides file
      expect(cfg.defaultModel).toBe('llama-from-store')
    })

    it('rejects invalid stored values and keeps the lower layer', async () => {
      mockFetch(null)
      await kvStore.set(LLM_RUNTIME_CONFIG_KEY, {
        // Empty baseUrl, negative timeout, NaN topP — all invalid; defaults must be kept.
        baseUrl: '',
        requestTimeoutMs: -1,
        topP: 0,
        maxTokens: 0,
        temperature: -5,
        defaultModel: '',
      })
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg.baseUrl).toBe(DEFAULT_LLM_RUNTIME_CONFIG.baseUrl)
      expect(cfg.requestTimeoutMs).toBe(DEFAULT_LLM_RUNTIME_CONFIG.requestTimeoutMs)
      expect(cfg.topP).toBe(DEFAULT_LLM_RUNTIME_CONFIG.topP)
      expect(cfg.maxTokens).toBe(DEFAULT_LLM_RUNTIME_CONFIG.maxTokens)
      expect(cfg.temperature).toBe(DEFAULT_LLM_RUNTIME_CONFIG.temperature)
      expect(cfg.defaultModel).toBe(DEFAULT_LLM_RUNTIME_CONFIG.defaultModel)
    })

    it('strips a legacy apiKey field from the stored config blob', async () => {
      mockFetch(null)
      // Simulate a record persisted by an older app version that put apiKey
      // alongside the rest of the config. The loader must drop it so we
      // never round-trip credentials through the non-secure KV path.
      await kvStore.set(LLM_RUNTIME_CONFIG_KEY, {
        baseUrl: 'http://localhost:11434/v1',
        apiKey: 'leaked-from-legacy-record',
      })
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg.apiKey).toBe('') // default empty, NOT the legacy value
    })

    it('reads the apiKey from secureStorage and applies it last', async () => {
      mockFetch(null)
      await secureStorage.set(LLM_RUNTIME_API_KEY_KEY, 'sk-from-secure')
      const cfg = await ensureLLMRuntimeConfigLoaded()
      expect(cfg.apiKey).toBe('sk-from-secure')
    })

    it('returns the same promise for concurrent callers (load happens once)', async () => {
      const fetchSpy = vi.fn(async () => ({ ok: false, json: async () => null }))
      globalThis.fetch = fetchSpy as unknown as typeof fetch
      const [a, b, c] = await Promise.all([
        ensureLLMRuntimeConfigLoaded(),
        ensureLLMRuntimeConfigLoaded(),
        ensureLLMRuntimeConfigLoaded(),
      ])
      expect(a).toBe(b)
      expect(b).toBe(c)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateLLMRuntimeConfig', () => {
    it('persists non-sensitive fields via kvStore and writes apiKey via secureStorage', async () => {
      clearFetch()
      const next = await updateLLMRuntimeConfig({
        baseUrl: 'http://example.test/v1',
        defaultModel: 'phi-3',
        apiKey: 'sk-secret',
      })
      expect(next.baseUrl).toBe('http://example.test/v1')
      expect(next.defaultModel).toBe('phi-3')
      expect(next.apiKey).toBe('sk-secret')

      // Main config blob must NOT contain apiKey.
      const stored = await kvStore.get<Record<string, unknown>>(LLM_RUNTIME_CONFIG_KEY)
      expect(stored).toBeDefined()
      expect(stored).not.toHaveProperty('apiKey')
      expect(stored?.baseUrl).toBe('http://example.test/v1')

      // apiKey must live in secureStorage.
      expect(await secureStorage.get(LLM_RUNTIME_API_KEY_KEY)).toBe('sk-secret')
    })

    it('removes the apiKey from secureStorage when cleared (empty string)', async () => {
      clearFetch()
      await updateLLMRuntimeConfig({ apiKey: 'sk-old' })
      expect(await secureStorage.get(LLM_RUNTIME_API_KEY_KEY)).toBe('sk-old')

      await updateLLMRuntimeConfig({ apiKey: '' })
      expect(await secureStorage.get(LLM_RUNTIME_API_KEY_KEY)).toBeUndefined()
    })

    it('updates the cached config so later sync reads see the new value', async () => {
      clearFetch()
      await updateLLMRuntimeConfig({ defaultModel: 'updated-model' })
      const cached = getLLMRuntimeConfig()
      expect(cached.defaultModel).toBe('updated-model')
    })
  })

  describe('subscribeToLLMRuntimeConfig', () => {
    it('notifies subscribers after load completes', async () => {
      clearFetch()
      const cb = vi.fn()
      const unsub = subscribeToLLMRuntimeConfig(cb)
      await ensureLLMRuntimeConfigLoaded()
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({
        provider: DEFAULT_LLM_RUNTIME_CONFIG.provider,
      }))
      unsub()
    })

    it('notifies subscribers on every update', async () => {
      clearFetch()
      await ensureLLMRuntimeConfigLoaded()
      const cb = vi.fn()
      const unsub = subscribeToLLMRuntimeConfig(cb)
      await updateLLMRuntimeConfig({ defaultModel: 'm1' })
      await updateLLMRuntimeConfig({ defaultModel: 'm2' })
      expect(cb).toHaveBeenCalledTimes(2)
      expect(cb.mock.calls[0][0].defaultModel).toBe('m1')
      expect(cb.mock.calls[1][0].defaultModel).toBe('m2')
      unsub()
    })

    it('stops notifying after unsubscribe', async () => {
      clearFetch()
      await ensureLLMRuntimeConfigLoaded()
      const cb = vi.fn()
      const unsub = subscribeToLLMRuntimeConfig(cb)
      unsub()
      await updateLLMRuntimeConfig({ defaultModel: 'after' })
      expect(cb).not.toHaveBeenCalled()
    })

    it('isolates subscriber errors so one bad listener does not break others', async () => {
      clearFetch()
      await ensureLLMRuntimeConfigLoaded()
      const good = vi.fn()
      const bad = vi.fn(() => {
        throw new Error('subscriber boom')
      })
      const unsub1 = subscribeToLLMRuntimeConfig(bad)
      const unsub2 = subscribeToLLMRuntimeConfig(good)
      await expect(updateLLMRuntimeConfig({ defaultModel: 'safe' })).resolves.toBeDefined()
      expect(bad).toHaveBeenCalled()
      expect(good).toHaveBeenCalled()
      unsub1()
      unsub2()
    })
  })
})
