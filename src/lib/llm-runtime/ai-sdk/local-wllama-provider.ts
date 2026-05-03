/**
 * On-device GGUF runtime adapter for the Vercel AI SDK.
 *
 * Wraps `@wllama/wllama` (WASM build of llama.cpp, MIT) into a
 * `LanguageModelV3`-shaped object so it can be returned from
 * `getLanguageModel()` alongside the HTTP-server providers.
 *
 * Local-first guarantees:
 *   - `@wllama/wllama` is dynamically imported at first use so it does
 *     not bloat the initial bundle for users who stay on the existing
 *     HTTP-server providers.
 *   - No network call is made by this module beyond the one-shot model
 *     download triggered by `loadModelFromUrl` / `loadModelFromHF`,
 *     which is initiated from a URL the user explicitly saved in
 *     Settings → LLM Runtime.
 *   - No API key is read or transmitted — `cfg.apiKey` is intentionally
 *     ignored on this provider.
 *
 * This is the foundation for PR 1 of the OfflineLLM-comparison plan.
 * Native Capacitor llama.cpp (PRs 2–3), the in-app GGUF importer
 * (PR 4), sampling UX (PR 7) and friends layer on top of this adapter.
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3Message,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
  SharedV3Warning,
} from '@ai-sdk/provider'

/** Minimal structural type for the bits of wllama we use. */
interface WllamaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface WllamaCompletionChunk {
  token: number
  piece: Uint8Array
  currentText: string
}

interface WllamaSamplingConfig {
  temp?: number
  top_p?: number
  top_k?: number
  min_p?: number
  penalty_repeat?: number
}

interface WllamaCompletionOpts {
  nPredict?: number
  sampling?: WllamaSamplingConfig
  abortSignal?: AbortSignal
  stream?: boolean
}

interface WllamaInstance {
  isModelLoaded(): boolean
  loadModelFromUrl(url: string | string[], opts?: Record<string, unknown>): Promise<void>
  loadModelFromHF(modelId: string, filePath: string, opts?: Record<string, unknown>): Promise<void>
  createChatCompletion(
    messages: WllamaChatMessage[],
    opts: WllamaCompletionOpts & { stream: true },
  ): Promise<AsyncIterable<WllamaCompletionChunk>>
  createChatCompletion(
    messages: WllamaChatMessage[],
    opts: WllamaCompletionOpts & { stream?: false },
  ): Promise<string>
}

interface WllamaModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Wllama: new (assetsPath: any, config?: any) => WllamaInstance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: { Wllama?: new (assetsPath: any, config?: any) => WllamaInstance }
}

/**
 * Options used to construct a `local-wasm` adapter. Resolved from the
 * current `LLMRuntimeConfig` by `provider-factory.ts`.
 */
export interface LocalWllamaOptions {
  /**
   * Either:
   *   - an `https://…/<file>.gguf` URL passed verbatim to
   *     `wllama.loadModelFromUrl`, or
   *   - a `hf:<owner>/<repo>:<path/to/file.gguf>` shortcut passed to
   *     `wllama.loadModelFromHF`.
   * When empty, the adapter rejects calls with a clear "no local model
   * configured" error rather than silently falling through.
   */
  modelSource: string
  /** Model id reported as `LanguageModel.modelId` (logical name). */
  modelId: string
  /** Maximum tokens to generate by default. */
  maxOutputTokens?: number
  /**
   * Asset path config for wllama. When omitted the bundled CDN URLs
   * (`@wllama/wllama/esm/wasm-from-cdn`) are used. PR 13 (offline
   * product flavor) will switch this to a self-hosted asset path.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assetsPath?: any
  /**
   * Default context window in tokens, forwarded to wllama as `n_ctx`
   * at model-load time. Sourced from `LLMRuntimeConfig.contextSize`.
   * `undefined` lets wllama pick its own default.
   */
  contextSize?: number
  /**
   * Default sampling knobs sourced from `LLMRuntimeConfig`. Per-call
   * `LanguageModelV3CallOptions` (passed by the AI SDK / chat hook)
   * win over these — these are only the fallback when the caller
   * doesn't specify a value.
   */
  defaultSampling?: {
    topK?: number
    minP?: number
    repeatPenalty?: number
  }
}

/**
 * Default WASM asset URLs for `@wllama/wllama`.
 *
 * Points at jsDelivr's CDN copy of the package's bundled WASM blobs.
 * These are only fetched when a user explicitly switches the runtime
 * to `local-wasm` and only the first time (browsers cache them).
 *
 * The version is pinned to match the exact `@wllama/wllama` version
 * declared in `package.json` (also pinned, not range-prefixed) so the
 * JS bindings and the WASM blobs cannot drift even across patch
 * upgrades. If you bump the npm dependency, update both numbers.
 *
 * PR 13 of the OfflineLLM-comparison plan (offline product flavor)
 * will swap this for a self-hosted asset path baked into the APK so
 * the offline flavor never touches the network.
 */
const WLLAMA_PINNED_VERSION = '2.4.0'
const DEFAULT_WLLAMA_ASSETS = {
  'single-thread/wllama.wasm': `https://cdn.jsdelivr.net/npm/@wllama/wllama@${WLLAMA_PINNED_VERSION}/esm/single-thread/wllama.wasm`,
  'multi-thread/wllama.wasm': `https://cdn.jsdelivr.net/npm/@wllama/wllama@${WLLAMA_PINNED_VERSION}/esm/multi-thread/wllama.wasm`,
}

/**
 * Lifecycle / download-progress event for the on-device runtime.
 *
 * Emitted to subscribers from `subscribeToLocalWllamaProgress()`. The
 * Settings → LLM Runtime panel renders the latest event so users can
 * see *why* the first chat send is slow (one-shot multi-GB GGUF
 * download) instead of staring at a spinner.
 */
export interface LocalWllamaProgressEvent {
  /** Coarse state machine. */
  state: 'idle' | 'downloading' | 'ready' | 'error'
  /** Bytes downloaded so far across all model shards (downloading). */
  loaded?: number
  /** Total bytes across all model shards (downloading). */
  total?: number
  /**
   * The resolved model source (`https://…` URL or `hf:owner/repo:file`
   * shortcut) the lifecycle event refers to. Helps the UI ignore stale
   * events after the user reconfigures the runtime.
   */
  source?: string
  /** Human-readable error message, present only when state is 'error'. */
  error?: string
}

type ProgressListener = (event: LocalWllamaProgressEvent) => void

const progressListeners = new Set<ProgressListener>()
let lastProgressEvent: LocalWllamaProgressEvent = { state: 'idle' }

function emitProgress(event: LocalWllamaProgressEvent): void {
  lastProgressEvent = event
  for (const listener of progressListeners) {
    try {
      listener(event)
    } catch {
      // Swallow listener errors so one bad subscriber can't break the
      // load. Keeps the runtime decoupled from any UI-side bugs.
    }
  }
}

/**
 * Subscribe to download / lifecycle events from the on-device runtime.
 * Listeners are invoked synchronously when the provider hits a load,
 * download-progress, ready, or error transition. Returns an unsubscribe
 * function. The current state is delivered immediately on subscribe so
 * the UI can render the right initial status without racing.
 */
export function subscribeToLocalWllamaProgress(
  listener: ProgressListener,
): () => void {
  progressListeners.add(listener)
  // Replay current state synchronously so a freshly mounted Settings
  // panel doesn't flash an "idle" frame mid-download.
  try {
    listener(lastProgressEvent)
  } catch {
    /* see emitProgress */
  }
  return () => {
    progressListeners.delete(listener)
  }
}

/** Read the most recent lifecycle event without subscribing. */
export function getLocalWllamaProgressSnapshot(): LocalWllamaProgressEvent {
  return lastProgressEvent
}

let cachedInstance: WllamaInstance | null = null
let cachedModelSource: string | null = null
/**
 * The `n_ctx` value the cached model was loaded with. wllama bakes the
 * context size into the loaded model, so a config change must
 * invalidate the cache and reload.
 */
let cachedContextSize: number | undefined = undefined
/**
 * In-flight load for a *specific* normalized model source. Keyed so that
 * a concurrent call for a different source cannot piggy-back on the
 * wrong promise (which would resolve to the wrong loaded model).
 */
let loadInFlightSource: string | null = null
let loadInFlightContextSize: number | undefined = undefined
let loadInFlight: Promise<WllamaInstance> | null = null

/**
 * Test-only: drop the cached `Wllama` instance so the next call
 * rebuilds. Mirrors the pattern in `provider-factory.ts`.
 */
export function __resetLocalWllamaForTests(): void {
  cachedInstance = null
  cachedModelSource = null
  cachedContextSize = undefined
  loadInFlightSource = null
  loadInFlightContextSize = undefined
  loadInFlight = null
  progressListeners.clear()
  lastProgressEvent = { state: 'idle' }
}

async function importWllama(): Promise<WllamaModule> {
  // Dynamic import keeps wllama out of the initial bundle. The cast
  // through `unknown` is required because TS resolves the module's
  // declared types (which include node-only references) but we only
  // touch the small structural surface defined above.
  const mod = (await import('@wllama/wllama')) as unknown as WllamaModule
  return mod
}

async function getOrCreateInstance(opts: LocalWllamaOptions): Promise<WllamaInstance> {
  const src = opts.modelSource?.trim() ?? ''
  if (src.length === 0) {
    throw new Error(
      "Local on-device runtime is selected but no model source is configured. " +
        "Open Settings → LLM Runtime and set 'Base URL' to a .gguf URL " +
        "(or a 'hf:owner/repo:path/to/file.gguf' shortcut).",
    )
  }
  const ctx = typeof opts.contextSize === 'number' && opts.contextSize > 0
    ? opts.contextSize
    : undefined
  if (cachedInstance && cachedModelSource === src && cachedContextSize === ctx) {
    return cachedInstance
  }
  // Only piggy-back on an in-flight load when it is for the *same*
  // normalized source AND the same n_ctx. Otherwise we'd hand callers
  // an instance loaded with the wrong model or wrong context window.
  if (loadInFlight && loadInFlightSource === src && loadInFlightContextSize === ctx) {
    return loadInFlight
  }

  // Build the load config: n_ctx (when explicit) plus a wllama
  // `progressCallback` that fans out to the pub-sub. Always present —
  // the only cost when nothing is subscribed is a single Set iteration
  // per shard chunk, which wllama already invokes sparingly.
  const loadCfg: Record<string, unknown> = {}
  if (ctx !== undefined) loadCfg.n_ctx = ctx
  loadCfg.progressCallback = ({ loaded, total }: { loaded: number; total: number }) => {
    emitProgress({ state: 'downloading', loaded, total, source: src })
  }

  const inFlight = (async (): Promise<WllamaInstance> => {
    const mod = await importWllama()
    const Ctor = mod.Wllama ?? mod.default?.Wllama
    if (!Ctor) {
      throw new Error('@wllama/wllama did not export a Wllama constructor')
    }
    const assets = opts.assetsPath ?? DEFAULT_WLLAMA_ASSETS
    const instance = new Ctor(assets)
    // Seed a 0/0 downloading event so the UI can show a panel
    // immediately even before wllama emits its first progress tick
    // (which only fires once the HTTP response starts streaming).
    emitProgress({ state: 'downloading', loaded: 0, total: 0, source: src })
    try {
      if (src.startsWith('hf:')) {
        // Format: hf:<owner>/<repo>:<path>
        const rest = src.slice(3)
        const colon = rest.lastIndexOf(':')
        if (colon < 0) {
          throw new Error(
            `Invalid hf: shortcut '${src}'. Expected 'hf:<owner>/<repo>:<path/to/file.gguf>'.`,
          )
        }
        const repo = rest.slice(0, colon)
        const file = rest.slice(colon + 1)
        await instance.loadModelFromHF(repo, file, loadCfg)
      } else {
        await instance.loadModelFromUrl(src, loadCfg)
      }
    } catch (err) {
      emitProgress({
        state: 'error',
        source: src,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
    cachedInstance = instance
    cachedModelSource = src
    cachedContextSize = ctx
    emitProgress({ state: 'ready', source: src })
    return instance
  })()

  loadInFlightSource = src
  loadInFlightContextSize = ctx
  loadInFlight = inFlight.finally(() => {
    // Clear only if no newer load has replaced us in the meantime.
    if (loadInFlight === inFlight) {
      loadInFlight = null
      loadInFlightSource = null
      loadInFlightContextSize = undefined
    }
  })
  return loadInFlight
}

/**
 * Flatten a `LanguageModelV3` prompt into a wllama chat message list.
 * Non-text parts (files, tool calls, reasoning) are skipped — surface
 * a warning so the AI SDK's caller knows. PR 17 (vision) will lift
 * this restriction by routing image parts through wllama-vision.
 */
function toWllamaMessages(
  prompt: ReadonlyArray<LanguageModelV3Message>,
): { messages: WllamaChatMessage[]; warnings: SharedV3Warning[] } {
  const messages: WllamaChatMessage[] = []
  const warnings: SharedV3Warning[] = []
  for (const m of prompt) {
    if (m.role === 'system') {
      messages.push({ role: 'system', content: m.content })
      continue
    }
    if (m.role === 'tool') {
      // The local-wasm provider does not support tool execution yet.
      warnings.push({
        type: 'other',
        message: 'tool messages are not supported by local-wasm; skipping',
      })
      continue
    }
    let text = ''
    let droppedNonText = false
    for (const part of m.content) {
      if (part.type === 'text') {
        text += part.text
      } else {
        // Reasoning, file, tool-call, tool-result, tool-approval — none
        // are supported by the local-wasm provider yet. Drop them and
        // emit a single warning per message so the caller can decide
        // how to surface the omission. PR 17 (vision) will lift the
        // restriction for image parts.
        droppedNonText = true
      }
    }
    if (droppedNonText) {
      warnings.push({
        type: 'other',
        message: `non-text parts in ${m.role} message dropped (local-wasm provider)`,
      })
    }
    messages.push({ role: m.role, content: text })
  }
  return { messages, warnings }
}

function toWllamaSampling(
  callOpts: LanguageModelV3CallOptions,
  defaults?: LocalWllamaOptions['defaultSampling'],
): WllamaSamplingConfig {
  const out: WllamaSamplingConfig = {}
  if (typeof callOpts.temperature === 'number') out.temp = callOpts.temperature
  if (typeof callOpts.topP === 'number') out.top_p = callOpts.topP
  // Per-call top_k wins; otherwise fall back to the runtime-config
  // default (`LLMRuntimeConfig.topK`). `0` is treated as "neutral"
  // (top-k disabled) and the field is left unset.
  const topK = typeof callOpts.topK === 'number' ? callOpts.topK : defaults?.topK
  if (typeof topK === 'number' && topK > 0) {
    out.top_k = topK
  }
  // min_p has no AI-SDK call-option, so it always comes from the
  // runtime-config default. `0` = disabled.
  if (typeof defaults?.minP === 'number' && defaults.minP > 0) {
    out.min_p = defaults.minP
  }
  // OpenAI-style frequency/presence penalty don't map cleanly to
  // llama.cpp's `penalty_repeat`. Surface frequencyPenalty as
  // penalty_repeat when it's strictly > 0; otherwise fall back to
  // the runtime-config `repeatPenalty` (treating `<= 1` as neutral).
  if (typeof callOpts.frequencyPenalty === 'number' && callOpts.frequencyPenalty > 0) {
    out.penalty_repeat = 1 + callOpts.frequencyPenalty
  } else if (typeof defaults?.repeatPenalty === 'number' && defaults.repeatPenalty > 1) {
    out.penalty_repeat = defaults.repeatPenalty
  }
  return out
}

const TERMINAL_FINISH: LanguageModelV3FinishReason = { unified: 'stop', raw: undefined }
const SYNTHETIC_USAGE: LanguageModelV3Usage = {
  inputTokens: {
    total: undefined,
    noCache: undefined,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: undefined,
    text: undefined,
    reasoning: undefined,
  },
}

/**
 * Build a `LanguageModelV3` adapter backed by an on-device wllama
 * instance. The same instance is reused across calls until the
 * configured `modelSource` changes.
 */
export function createLocalWllamaModel(opts: LocalWllamaOptions): LanguageModelV3 {
  const provider = 'local-wasm'
  const modelId = opts.modelId

  return {
    specificationVersion: 'v3',
    provider,
    modelId,
    supportedUrls: {},
    async doGenerate(
      callOpts: LanguageModelV3CallOptions,
    ): Promise<LanguageModelV3GenerateResult> {
      const instance = await getOrCreateInstance(opts)
      const { messages, warnings } = toWllamaMessages(callOpts.prompt)
      const text = await instance.createChatCompletion(messages, {
        nPredict: callOpts.maxOutputTokens ?? opts.maxOutputTokens,
        sampling: toWllamaSampling(callOpts, opts.defaultSampling),
        abortSignal: callOpts.abortSignal,
        stream: false,
      })
      return {
        content: [{ type: 'text', text }],
        finishReason: TERMINAL_FINISH,
        usage: SYNTHETIC_USAGE,
        warnings,
      }
    },
    async doStream(
      callOpts: LanguageModelV3CallOptions,
    ): Promise<LanguageModelV3StreamResult> {
      const instance = await getOrCreateInstance(opts)
      const { messages, warnings } = toWllamaMessages(callOpts.prompt)
      const iterable = await instance.createChatCompletion(messages, {
        nPredict: callOpts.maxOutputTokens ?? opts.maxOutputTokens,
        sampling: toWllamaSampling(callOpts, opts.defaultSampling),
        abortSignal: callOpts.abortSignal,
        stream: true,
      })
      const id = `local-wasm-${Date.now().toString(36)}`
      let prevText = ''
      const stream = new ReadableStream<LanguageModelV3StreamPart>({
        async start(controller) {
          try {
            controller.enqueue({ type: 'stream-start', warnings })
            controller.enqueue({ type: 'text-start', id })
            for await (const chunk of iterable) {
              // wllama gives us the cumulative text in `currentText`;
              // emit only the new tail as a delta so the AI SDK's
              // text-delta concatenation matches the model's output.
              const next = chunk.currentText
              if (next.length > prevText.length && next.startsWith(prevText)) {
                const delta = next.slice(prevText.length)
                if (delta.length > 0) {
                  controller.enqueue({ type: 'text-delta', id, delta })
                }
                prevText = next
              } else if (next !== prevText) {
                // Defensive: if currentText drifted (shouldn't), emit
                // the whole thing as a single delta so the user still
                // sees the model output.
                controller.enqueue({ type: 'text-delta', id, delta: next })
                prevText = next
              }
            }
            controller.enqueue({ type: 'text-end', id })
            controller.enqueue({
              type: 'finish',
              finishReason: TERMINAL_FINISH,
              usage: SYNTHETIC_USAGE,
            })
            controller.close()
          } catch (err) {
            controller.enqueue({ type: 'error', error: err })
            controller.close()
          }
        },
      })
      return { stream }
    },
  }
}
