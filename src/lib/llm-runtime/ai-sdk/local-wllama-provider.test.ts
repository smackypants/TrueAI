import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetLocalWllamaForTests,
  createLocalWllamaModel,
  getLocalWllamaProgressSnapshot,
  subscribeToLocalWllamaProgress,
  type LocalWllamaProgressEvent,
} from './local-wllama-provider'

interface FakeChunk {
  token: number
  piece: Uint8Array
  currentText: string
}

function makeIterable(parts: string[]): AsyncIterable<FakeChunk> {
  return {
    async *[Symbol.asyncIterator]() {
      let acc = ''
      for (let i = 0; i < parts.length; i++) {
        acc += parts[i]
        yield {
          token: i + 1,
          piece: new TextEncoder().encode(parts[i]),
          currentText: acc,
        }
      }
    },
  }
}

const loadModelFromUrl = vi.fn(async () => {})
const loadModelFromHF = vi.fn(async () => {})
const createChatCompletion = vi.fn(
  async (_messages: unknown, opts: { stream?: boolean }) => {
    if (opts?.stream) return makeIterable(['hel', 'lo', ' world'])
    return 'hello world'
  },
)

class FakeWllama {
  // Receive whatever assets path the adapter passes through.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public assets: any) {}
  isModelLoaded() {
    return true
  }
  loadModelFromUrl = loadModelFromUrl
  loadModelFromHF = loadModelFromHF
  createChatCompletion = createChatCompletion
}

vi.mock('@wllama/wllama', () => ({ Wllama: FakeWllama }))

describe('local-wllama-provider', () => {
  beforeEach(() => {
    __resetLocalWllamaForTests()
    loadModelFromUrl.mockClear()
    loadModelFromHF.mockClear()
    createChatCompletion.mockClear()
  })

  afterEach(() => {
    __resetLocalWllamaForTests()
  })

  it('rejects calls when no model source is configured', async () => {
    const model = createLocalWllamaModel({ modelSource: '', modelId: 'm' })
    await expect(
      model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).rejects.toThrow(/no model source is configured/i)
  })

  it('loads via loadModelFromUrl for plain URLs and reports the configured modelId', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'my-model',
    })
    expect(model.specificationVersion).toBe('v3')
    expect(model.provider).toBe('local-wasm')
    expect(model.modelId).toBe('my-model')
    const result = await model.doGenerate({
      prompt: [
        { role: 'system', content: 'you are helpful' },
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      ],
    })
    expect(loadModelFromUrl).toHaveBeenCalledWith(
      'https://example.test/m.gguf',
      expect.objectContaining({ progressCallback: expect.any(Function) }),
    )
    expect(loadModelFromHF).not.toHaveBeenCalled()
    expect(result.content).toEqual([{ type: 'text', text: 'hello world' }])
    expect(result.finishReason).toEqual({ unified: 'stop', raw: undefined })
    // System + user message both passed through.
    const [messages] = createChatCompletion.mock.calls[0]
    expect(messages).toEqual([
      { role: 'system', content: 'you are helpful' },
      { role: 'user', content: 'hi' },
    ])
  })

  it('loads via loadModelFromHF for hf: shortcuts', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'hf:Mozilla/Llama-3.2-1B-Instruct-llamafile:Llama-3.2-1B-Instruct.Q4_K_M.gguf',
      modelId: 'llama-3.2',
    })
    await model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    expect(loadModelFromHF).toHaveBeenCalledWith(
      'Mozilla/Llama-3.2-1B-Instruct-llamafile',
      'Llama-3.2-1B-Instruct.Q4_K_M.gguf',
      expect.objectContaining({ progressCallback: expect.any(Function) }),
    )
    expect(loadModelFromUrl).not.toHaveBeenCalled()
  })

  it('rejects malformed hf: shortcuts with a clear error', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'hf:no-colon-after-repo',
      modelId: 'm',
    })
    await expect(
      model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).rejects.toThrow(/invalid hf: shortcut/i)
  })

  it('reuses the cached instance on subsequent calls with the same source', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    await model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'a' }] }],
    })
    await model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'b' }] }],
    })
    // Loaded exactly once.
    expect(loadModelFromUrl).toHaveBeenCalledTimes(1)
    expect(createChatCompletion).toHaveBeenCalledTimes(2)
  })

  it('treats whitespace-only differences in modelSource as the same source', async () => {
    const a = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    const b = createLocalWllamaModel({
      modelSource: '  https://example.test/m.gguf  ',
      modelId: 'm',
    })
    await a.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'a' }] }],
    })
    await b.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'b' }] }],
    })
    // Cache hit despite whitespace.
    expect(loadModelFromUrl).toHaveBeenCalledTimes(1)
  })

  it('rebuilds the cached instance when the model source changes', async () => {
    const a = createLocalWllamaModel({
      modelSource: 'https://example.test/a.gguf',
      modelId: 'a',
    })
    const b = createLocalWllamaModel({
      modelSource: 'https://example.test/b.gguf',
      modelId: 'b',
    })
    await a.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }],
    })
    await b.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'y' }] }],
    })
    // Each distinct source must trigger its own load — the in-flight
    // promise from `a` must NOT be returned for `b` (which would
    // otherwise hand `b` an instance loaded with the wrong model).
    expect(loadModelFromUrl).toHaveBeenCalledTimes(2)
    expect(loadModelFromUrl.mock.calls.map((c) => c[0])).toEqual([
      'https://example.test/a.gguf',
      'https://example.test/b.gguf',
    ])
  })

  it('drops reasoning parts and surfaces a warning instead of forwarding them as text', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    const { stream } = await model.doStream({
      prompt: [
        {
          role: 'assistant',
          content: [
            { type: 'reasoning', text: 'internal scratchpad' },
            { type: 'text', text: 'final answer' },
          ],
        },
      ],
    })
    const reader = stream.getReader()
    const first = await reader.read()
    const warnings = (
      first.value as { warnings: Array<{ message?: string }> }
    ).warnings
    expect(warnings.some((w) => /non-text parts/i.test(w.message ?? ''))).toBe(true)
    while (true) {
      const { done } = await reader.read()
      if (done) break
    }
    const [messages] = createChatCompletion.mock.calls[0]
    // The reasoning text must NOT have been forwarded to wllama.
    expect(messages).toEqual([{ role: 'assistant', content: 'final answer' }])
  })

  it('streams text-delta parts that concatenate to the full response', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    const { stream } = await model.doStream({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    const reader = stream.getReader()
    const parts: { type: string; delta?: string }[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value as { type: string; delta?: string })
    }
    const types = parts.map((p) => p.type)
    expect(types[0]).toBe('stream-start')
    expect(types).toContain('text-start')
    expect(types).toContain('text-end')
    expect(types[types.length - 1]).toBe('finish')
    const deltas = parts
      .filter((p) => p.type === 'text-delta')
      .map((p) => p.delta ?? '')
      .join('')
    expect(deltas).toBe('hello world')
  })

  it('emits an error stream part when the underlying generator throws', async () => {
    createChatCompletion.mockImplementationOnce(
      async (_m: unknown, opts: { stream?: boolean }) => {
        if (opts?.stream) {
          // Async iterable that throws on first iteration. The generator
          // body has no `yield` because the throw makes any subsequent
          // statement unreachable; the empty function still satisfies
          // the AsyncIterable contract via the `throw` thrown from
          // `next()`.
          return {
            // eslint-disable-next-line require-yield
            async *[Symbol.asyncIterator]() {
              throw new Error('boom')
            },
          }
        }
        return ''
      },
    )
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    const { stream } = await model.doStream({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    const reader = stream.getReader()
    const types: string[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      types.push((value as { type: string }).type)
    }
    expect(types).toContain('error')
  })

  it('passes sampling parameters through to wllama', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
      maxOutputTokens: 256,
    })
    await model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      temperature: 0.5,
      topP: 0.8,
      topK: 20,
      frequencyPenalty: 0.2,
    })
    const [, opts] = createChatCompletion.mock.calls[0]
    expect(opts).toMatchObject({
      nPredict: 256,
      stream: false,
      sampling: { temp: 0.5, top_p: 0.8, top_k: 20 },
    })
    // frequencyPenalty 0.2 → penalty_repeat 1.2
    expect(
      (opts as { sampling: { penalty_repeat?: number } }).sampling.penalty_repeat,
    ).toBeCloseTo(1.2)
  })

  it('drops non-text content parts and surfaces a warning on the stream', async () => {
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    const { stream } = await model.doStream({
      prompt: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'describe this' },
            // file part (image) — must be dropped with a warning
            {
              type: 'file',
              mediaType: 'image/png',
              data: new Uint8Array([1, 2, 3]),
            },
          ],
        },
      ],
    })
    const reader = stream.getReader()
    const first = await reader.read()
    expect(first.value).toMatchObject({ type: 'stream-start' })
    const warnings = (
      first.value as { warnings: Array<{ message?: string }> }
    ).warnings
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings[0].message).toMatch(/non-text parts/i)
    // Drain the rest so the stream is fully consumed.
    while (true) {
      const { done } = await reader.read()
      if (done) break
    }
    // The text-only content was forwarded to wllama.
    const [messages] = createChatCompletion.mock.calls[0]
    expect(messages).toEqual([{ role: 'user', content: 'describe this' }])
  })

  describe('PR 2 — context size + sampling defaults from LLMRuntimeConfig', () => {
    it('forwards contextSize as n_ctx to loadModelFromUrl', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        contextSize: 4096,
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      expect(loadModelFromUrl).toHaveBeenCalledWith(
        'https://example.test/m.gguf',
        expect.objectContaining({ n_ctx: 4096, progressCallback: expect.any(Function) }),
      )
    })

    it('forwards contextSize as n_ctx to loadModelFromHF', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'hf:owner/repo:file.gguf',
        modelId: 'm',
        contextSize: 8192,
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      expect(loadModelFromHF).toHaveBeenCalledWith(
        'owner/repo',
        'file.gguf',
        expect.objectContaining({ n_ctx: 8192, progressCallback: expect.any(Function) }),
      )
    })

    it('passes a progressCallback even when contextSize is unset (PR 6)', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      expect(loadModelFromUrl).toHaveBeenCalledWith(
        'https://example.test/m.gguf',
        expect.objectContaining({ progressCallback: expect.any(Function) }),
      )
      // n_ctx must NOT be set when contextSize is unspecified — let
      // wllama pick its own default.
      const cfg = loadModelFromUrl.mock.calls[0][1] as Record<string, unknown>
      expect(cfg).not.toHaveProperty('n_ctx')
    })

    it('reloads when contextSize changes between calls', async () => {
      const small = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        contextSize: 2048,
      })
      await small.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      const big = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        contextSize: 8192,
      })
      await big.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      expect(loadModelFromUrl).toHaveBeenCalledTimes(2)
      expect(loadModelFromUrl).toHaveBeenNthCalledWith(
        1,
        'https://example.test/m.gguf',
        expect.objectContaining({ n_ctx: 2048, progressCallback: expect.any(Function) }),
      )
      expect(loadModelFromUrl).toHaveBeenNthCalledWith(
        2,
        'https://example.test/m.gguf',
        expect.objectContaining({ n_ctx: 8192, progressCallback: expect.any(Function) }),
      )
    })

    it('falls back to defaultSampling.topK / minP / repeatPenalty when call options omit them', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        defaultSampling: { topK: 40, minP: 0.05, repeatPenalty: 1.1 },
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      const [, opts] = createChatCompletion.mock.calls[0]
      const sampling = (opts as { sampling: WllamaSampling }).sampling
      expect(sampling.top_k).toBe(40)
      expect(sampling.min_p).toBeCloseTo(0.05)
      expect(sampling.penalty_repeat).toBeCloseTo(1.1)
    })

    it('per-call topK overrides defaultSampling.topK', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        defaultSampling: { topK: 40, minP: 0.05, repeatPenalty: 1.1 },
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        topK: 20,
      })
      const [, opts] = createChatCompletion.mock.calls[0]
      const sampling = (opts as { sampling: WllamaSampling }).sampling
      expect(sampling.top_k).toBe(20)
    })

    it('per-call frequencyPenalty overrides defaultSampling.repeatPenalty', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        defaultSampling: { repeatPenalty: 1.1 },
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        frequencyPenalty: 0.3,
      })
      const [, opts] = createChatCompletion.mock.calls[0]
      const sampling = (opts as { sampling: WllamaSampling }).sampling
      expect(sampling.penalty_repeat).toBeCloseTo(1.3)
    })

    it('omits neutral defaults (topK=0, minP=0, repeatPenalty=1) so wllama uses its own defaults', async () => {
      const model = createLocalWllamaModel({
        modelSource: 'https://example.test/m.gguf',
        modelId: 'm',
        defaultSampling: { topK: 0, minP: 0, repeatPenalty: 1 },
      })
      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
      const [, opts] = createChatCompletion.mock.calls[0]
      const sampling = (opts as { sampling: WllamaSampling }).sampling
      expect(sampling.top_k).toBeUndefined()
      expect(sampling.min_p).toBeUndefined()
      expect(sampling.penalty_repeat).toBeUndefined()
    })
  })
})

describe('PR 6 — local-wllama download progress pub-sub', () => {
  beforeEach(() => {
    __resetLocalWllamaForTests()
    loadModelFromUrl.mockClear()
    loadModelFromHF.mockClear()
    createChatCompletion.mockClear()
  })

  afterEach(() => {
    __resetLocalWllamaForTests()
  })

  it('replays the current state synchronously on subscribe (idle initially)', () => {
    const events: LocalWllamaProgressEvent[] = []
    const unsub = subscribeToLocalWllamaProgress((e) => events.push(e))
    expect(events).toEqual([{ state: 'idle' }])
    expect(getLocalWllamaProgressSnapshot()).toEqual({ state: 'idle' })
    unsub()
  })

  it('emits downloading → ready around a successful load and forwards loaded/total bytes', async () => {
    // Make loadModelFromUrl simulate wllama invoking progressCallback
    // partway through the download.
    loadModelFromUrl.mockImplementationOnce(
      async (_url: string, opts: { progressCallback?: (p: { loaded: number; total: number }) => void }) => {
        opts.progressCallback?.({ loaded: 100, total: 1000 })
        opts.progressCallback?.({ loaded: 1000, total: 1000 })
      },
    )
    const events: LocalWllamaProgressEvent[] = []
    const unsub = subscribeToLocalWllamaProgress((e) => events.push(e))
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    await model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    unsub()
    // Sequence: initial idle replay → seeded 0/0 downloading → wllama
    // 100/1000 → wllama 1000/1000 → ready.
    expect(events[0]).toEqual({ state: 'idle' })
    expect(events[1]).toEqual({
      state: 'downloading',
      loaded: 0,
      total: 0,
      source: 'https://example.test/m.gguf',
    })
    expect(events[2]).toEqual({
      state: 'downloading',
      loaded: 100,
      total: 1000,
      source: 'https://example.test/m.gguf',
    })
    expect(events[3]).toEqual({
      state: 'downloading',
      loaded: 1000,
      total: 1000,
      source: 'https://example.test/m.gguf',
    })
    expect(events[events.length - 1]).toEqual({
      state: 'ready',
      source: 'https://example.test/m.gguf',
    })
  })

  it('emits an error event when the load throws and propagates the error', async () => {
    loadModelFromUrl.mockImplementationOnce(async () => {
      throw new Error('boom: 404 not found')
    })
    const events: LocalWllamaProgressEvent[] = []
    const unsub = subscribeToLocalWllamaProgress((e) => events.push(e))
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/missing.gguf',
      modelId: 'm',
    })
    await expect(
      model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).rejects.toThrow(/boom: 404 not found/)
    unsub()
    const last = events[events.length - 1]
    expect(last.state).toBe('error')
    expect(last.error).toMatch(/boom: 404 not found/)
    expect(last.source).toBe('https://example.test/missing.gguf')
  })

  it('stops invoking listeners after unsubscribe', async () => {
    const seen: LocalWllamaProgressEvent[] = []
    const unsub = subscribeToLocalWllamaProgress((e) => seen.push(e))
    expect(seen).toHaveLength(1) // idle replay
    unsub()
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    await model.doGenerate({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    })
    // No more events delivered after unsubscribe.
    expect(seen).toHaveLength(1)
    // But the snapshot still reflects the latest state for newcomers.
    expect(getLocalWllamaProgressSnapshot().state).toBe('ready')
  })

  it('isolates listener errors so one bad subscriber cannot break the load', async () => {
    const good: LocalWllamaProgressEvent[] = []
    const unsubBad = subscribeToLocalWllamaProgress(() => {
      throw new Error('listener exploded')
    })
    const unsubGood = subscribeToLocalWllamaProgress((e) => good.push(e))
    const model = createLocalWllamaModel({
      modelSource: 'https://example.test/m.gguf',
      modelId: 'm',
    })
    await expect(
      model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).resolves.toBeDefined()
    unsubBad()
    unsubGood()
    expect(good[good.length - 1].state).toBe('ready')
  })
})

interface WllamaSampling {
  temp?: number
  top_p?: number
  top_k?: number
  min_p?: number
  penalty_repeat?: number
}
