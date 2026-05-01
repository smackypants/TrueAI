/**
 * Shared test helpers for the Vercel AI SDK integration.
 *
 * Wraps the SDK's official `MockLanguageModelV3` + `simulateReadableStream`
 * utilities (re-exported from `ai/test`) into a project-friendly factory
 * that produces models which return either a fixed string (for
 * `generateText`) or a sequence of text-delta chunks (for `streamText`).
 *
 * Replaces the older ad-hoc pattern of `globalThis.spark.llm = vi.fn(...)`
 * for tests that exercise AI-SDK call sites; legacy `spark.llm` consumers
 * keep working with the existing pattern.
 */

import { MockLanguageModelV3, simulateReadableStream } from 'ai/test'
import type { LanguageModel } from 'ai'

export interface MockTextOptions {
  /** Fixed text for `generateText`. Default `'mock response'`. */
  text?: string
  /** Stream chunks for `streamText`. Defaults to splitting `text` on spaces. */
  chunks?: string[]
  /** Reported finish reason. Default `'stop'`. */
  finishReason?: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'other' | 'error'
  /** Reported usage. Defaults to small synthetic numbers. */
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  /** Model id reported by the mock. Default `'mock-model'`. */
  modelId?: string
  /** Provider id reported by the mock. Default `'mock-provider'`. */
  provider?: string
}

const DEFAULT_USAGE = {
  inputTokens: 4,
  outputTokens: 8,
  totalTokens: 12,
}

/**
 * Build a `LanguageModel` whose `generateText` resolves to `text` and
 * whose `streamText` emits the supplied `chunks` (or text split on
 * spaces) as text-delta parts.
 */
export function mockLanguageModel(opts: MockTextOptions = {}): LanguageModel {
  const text = opts.text ?? 'mock response'
  const chunks =
    opts.chunks ?? text.split(/(\s+)/).filter((s) => s.length > 0)
  const finishReason = opts.finishReason ?? 'stop'
  const usage = opts.usage ?? DEFAULT_USAGE
  const modelId = opts.modelId ?? 'mock-model'
  const provider = opts.provider ?? 'mock-provider'

  return new MockLanguageModelV3({
    provider,
    modelId,
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason,
      usage,
      warnings: [],
    }),
    doStream: async () => {
      const id = 'mock-text-id'
      const stream = simulateReadableStream({
        chunks: [
          { type: 'stream-start' as const, warnings: [] },
          { type: 'text-start' as const, id },
          ...chunks.map((delta) => ({ type: 'text-delta' as const, id, delta })),
          { type: 'text-end' as const, id },
          { type: 'finish' as const, finishReason, usage },
        ],
      })
      return { stream }
    },
  } as unknown as ConstructorParameters<typeof MockLanguageModelV3>[0]) as unknown as LanguageModel
}

/**
 * Build a model that throws on every call. Useful for testing failure
 * paths in callers (timeouts, retries, abort wiring).
 */
export function mockFailingLanguageModel(message = 'mock failure'): LanguageModel {
  return new MockLanguageModelV3({
    provider: 'mock-provider',
    modelId: 'mock-model',
    doGenerate: async () => {
      throw new Error(message)
    },
    doStream: async () => {
      throw new Error(message)
    },
  }) as unknown as LanguageModel
}

export { MockLanguageModelV3, simulateReadableStream }
