/**
 * Tests for src/lib/llm-runtime/install.ts
 *
 * The module is a side-effect module: on import it conditionally writes a
 * `sparkShim` onto `window.spark` (if it's absent) and fires off
 * `ensureLLMRuntimeConfigLoaded()`.  Because it uses module-level state
 * and top-level awaits, every test that needs fresh state calls
 * `vi.resetModules()` and re-imports dynamically.
 *
 * The `kv-store`, `client`, and `config` modules are mocked so that no
 * real IndexedDB / network calls are made.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── shared module-level mocks ───────────────────────────────────────────────

vi.mock('./kv-store', () => ({
  kvStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('./client', () => ({
  llm: vi.fn().mockResolvedValue('mocked llm response'),
  llmPrompt: vi.fn().mockResolvedValue('mocked llmPrompt response'),
}))

vi.mock('./config', () => ({
  ensureLLMRuntimeConfigLoaded: vi.fn().mockResolvedValue({}),
}))

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Remove any spark installed by the module under test and reset modules. */
function resetSpark(): void {
  const w = window as unknown as { spark?: unknown }
  delete w.spark
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('llm-runtime/install — spark shim installation', () => {
  beforeEach(() => {
    resetSpark()
    vi.resetModules()
  })

  it('installs window.spark when it is absent', async () => {
    expect((window as unknown as { spark?: unknown }).spark).toBeUndefined()
    await import('./install')
    expect((window as unknown as { spark?: unknown }).spark).toBeDefined()
  })

  it('does not overwrite an existing window.spark', async () => {
    const existing = { marker: 'original' }
    ;(window as unknown as { spark: unknown }).spark = existing
    await import('./install')
    // The shim must not have overwritten the already-present value.
    expect((window as unknown as { spark: { marker: string } }).spark.marker).toBe('original')
  })

  it('installs llmPrompt on the shim', async () => {
    await import('./install')
    const spark = (window as unknown as { spark: Record<string, unknown> }).spark
    expect(typeof spark.llmPrompt).toBe('function')
  })

  it('installs an llm wrapper on the shim', async () => {
    await import('./install')
    const spark = (window as unknown as { spark: Record<string, unknown> }).spark
    expect(typeof spark.llm).toBe('function')
  })

  it('installs kv.get on the shim', async () => {
    await import('./install')
    const spark = (window as unknown as { spark: { kv: Record<string, unknown> } }).spark
    expect(typeof spark.kv.get).toBe('function')
  })

  it('installs kv.set on the shim', async () => {
    await import('./install')
    const spark = (window as unknown as { spark: { kv: Record<string, unknown> } }).spark
    expect(typeof spark.kv.set).toBe('function')
  })

  it('installs kv.delete on the shim', async () => {
    await import('./install')
    const spark = (window as unknown as { spark: { kv: Record<string, unknown> } }).spark
    expect(typeof spark.kv.delete).toBe('function')
  })

  it('installs kv.keys on the shim', async () => {
    await import('./install')
    const spark = (window as unknown as { spark: { kv: Record<string, unknown> } }).spark
    expect(typeof spark.kv.keys).toBe('function')
  })

  it('installs user() which always resolves to null', async () => {
    await import('./install')
    const spark = (window as unknown as {
      spark: { user: () => Promise<null> }
    }).spark
    const result = await spark.user()
    expect(result).toBeNull()
  })
})

describe('llm-runtime/install — shim delegates to kvStore', () => {
  beforeEach(() => {
    resetSpark()
    vi.resetModules()
  })

  it('shim.kv.get delegates to kvStore.get', async () => {
    await import('./install')
    const { kvStore } = await import('./kv-store')
    vi.mocked(kvStore.get).mockResolvedValue('stored-value')

    const spark = (window as unknown as {
      spark: { kv: { get: (key: string) => Promise<unknown> } }
    }).spark
    const val = await spark.kv.get('my-key')

    expect(kvStore.get).toHaveBeenCalledWith('my-key')
    expect(val).toBe('stored-value')
  })

  it('shim.kv.set delegates to kvStore.set', async () => {
    await import('./install')
    const { kvStore } = await import('./kv-store')
    vi.mocked(kvStore.set).mockResolvedValue(undefined)

    const spark = (window as unknown as {
      spark: { kv: { set: (key: string, value: unknown) => Promise<void> } }
    }).spark
    await spark.kv.set('my-key', { data: 1 })

    expect(kvStore.set).toHaveBeenCalledWith('my-key', { data: 1 })
  })

  it('shim.kv.delete delegates to kvStore.delete', async () => {
    await import('./install')
    const { kvStore } = await import('./kv-store')
    vi.mocked(kvStore.delete).mockResolvedValue(undefined)

    const spark = (window as unknown as {
      spark: { kv: { delete: (key: string) => Promise<void> } }
    }).spark
    await spark.kv.delete('my-key')

    expect(kvStore.delete).toHaveBeenCalledWith('my-key')
  })

  it('shim.kv.keys delegates to kvStore.keys', async () => {
    await import('./install')
    const { kvStore } = await import('./kv-store')
    vi.mocked(kvStore.keys).mockResolvedValue(['a', 'b'])

    const spark = (window as unknown as {
      spark: { kv: { keys: () => Promise<string[]> } }
    }).spark
    const keys = await spark.kv.keys()

    expect(kvStore.keys).toHaveBeenCalled()
    expect(keys).toEqual(['a', 'b'])
  })
})

describe('llm-runtime/install — llm shim wraps the client', () => {
  beforeEach(() => {
    resetSpark()
    vi.resetModules()
  })

  it('shim.llm forwards (prompt, modelName, jsonMode) to the client llm()', async () => {
    await import('./install')
    const { llm: clientLlm } = await import('./client')
    vi.mocked(clientLlm).mockResolvedValue('client-response')

    const spark = (window as unknown as {
      spark: {
        llm: (prompt: string, model?: string, json?: boolean) => Promise<string>
      }
    }).spark

    const result = await spark.llm('Hello', 'gpt-4', false)
    expect(clientLlm).toHaveBeenCalledWith('Hello', 'gpt-4', false)
    expect(result).toBe('client-response')
  })
})

describe('llm-runtime/install — config pre-warm', () => {
  beforeEach(() => {
    resetSpark()
    vi.resetModules()
  })

  it('calls ensureLLMRuntimeConfigLoaded() as a side effect on import', async () => {
    await import('./install')
    const { ensureLLMRuntimeConfigLoaded } = await import('./config')
    // Allow the microtask queue to drain so the void-fired promise can run.
    await new Promise((r) => setTimeout(r, 0))
    expect(ensureLLMRuntimeConfigLoaded).toHaveBeenCalled()
  })
})
