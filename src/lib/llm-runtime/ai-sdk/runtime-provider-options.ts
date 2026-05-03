/**
 * Bridge between `LLMRuntimeConfig`'s OfflineLLM-aligned sampling
 * defaults (`topK` / `minP` / `repeatPenalty`) and the Vercel AI SDK's
 * `providerOptions` extension mechanism.
 *
 * Why this exists
 * ---------------
 * The legacy direct-HTTP path in `client.ts` already emits `top_k`,
 * `min_p`, and `repeat_penalty` as OpenAI-extension body fields when
 * the user sets non-neutral values (>0/>0/>1). The AI SDK path
 * (`generateText` / `streamText` via `getLanguageModel`) does NOT —
 * `streamText` only forwards the standardised knobs (`temperature`,
 * `topP`, `topK`, `frequency/presencePenalty`, `maxOutputTokens`).
 * Anything provider-specific has to ride through `providerOptions`.
 *
 * For our default `openai-compatible` provider (Ollama / llama.cpp /
 * LM Studio), `@ai-sdk/openai-compatible` spreads
 * `providerOptions[providerOptionsName]` into the chat-completion
 * request body verbatim. Our provider-factory configures
 * `createOpenAICompatible({ name: 'truelocal' })`, so the right key
 * for those extension fields is `truelocal`.
 *
 * For hosted providers (`openai`, `anthropic`, `google`) the same
 * fields would be rejected, so we emit nothing — keeping their request
 * bodies byte-identical to the pre-PR behaviour. For `local-wasm` the
 * defaults are already wired into the wllama adapter via
 * `createLocalWllamaModel({ defaultSampling: ... })` in
 * `provider-factory.ts`, so we also emit nothing there to avoid double
 * application.
 *
 * Usage
 * -----
 *   const chat = useStreamingChat({
 *     providerOptions: getRuntimeProviderOptions(),
 *     temperature: 0.7,
 *   })
 *
 * The returned shape is compatible with `streamText`'s
 * `providerOptions` parameter and with `useStreamingChat`'s
 * `providerOptions` option.
 */

import type { ProviderOptions } from '@ai-sdk/provider-utils'

import {
  getLLMRuntimeConfig,
  type LLMRuntimeConfig,
  type LLMProvider,
} from '../config'

/**
 * The provider-options key that `provider-factory.ts` configures via
 * `createOpenAICompatible({ name: 'truelocal' })`. Bumped together
 * with the `name` argument there.
 */
export const OPENAI_COMPATIBLE_PROVIDER_OPTIONS_KEY = 'truelocal'

/**
 * Providers for which the runtime-config sampling defaults are
 * forwarded as OpenAI-extension body fields. Mirrors the
 * `openai-compatible` switch arm in `provider-factory.ts`.
 */
const OPENAI_COMPATIBLE_PROVIDERS: ReadonlySet<LLMProvider> = new Set<LLMProvider>([
  'ollama',
  'llama-cpp',
  'lm-studio',
  'openai-compatible',
])

/**
 * Build the `ProviderOptions` blob that maps the supplied (or current)
 * `LLMRuntimeConfig` to AI-SDK provider-extension fields.
 *
 * - `topK > 0`           → `top_k`
 * - `minP > 0`           → `min_p`
 * - `repeatPenalty > 1`  → `repeat_penalty`
 *
 * Neutral / disabled values are omitted, matching `client.ts` so a
 * user with the OfflineLLM-aligned defaults (40 / 0.05 / 1.1) gets
 * the same wire body across both code paths.
 *
 * For non-`openai-compatible` providers, returns `{}` so callers can
 * unconditionally spread the result without changing hosted-provider
 * or `local-wasm` request bodies.
 */
export function getRuntimeProviderOptions(
  config: LLMRuntimeConfig = getLLMRuntimeConfig(),
): ProviderOptions {
  if (!OPENAI_COMPATIBLE_PROVIDERS.has(config.provider)) return {}

  const extras: Record<string, number> = {}
  if (typeof config.topK === 'number' && config.topK > 0) {
    extras.top_k = config.topK
  }
  if (typeof config.minP === 'number' && config.minP > 0) {
    extras.min_p = config.minP
  }
  if (typeof config.repeatPenalty === 'number' && config.repeatPenalty > 1) {
    extras.repeat_penalty = config.repeatPenalty
  }
  if (Object.keys(extras).length === 0) return {}
  return { [OPENAI_COMPATIBLE_PROVIDER_OPTIONS_KEY]: extras }
}
