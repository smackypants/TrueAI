/**
 * OpenAI-compatible chat-completion client used as the on-device replacement
 * for `spark.llm`. Talks to any HTTP endpoint that exposes the
 * `POST {baseUrl}/chat/completions` shape — Ollama (with `/v1`), llama.cpp's
 * `llama-server`, LM Studio, OpenAI itself, and a long tail of compatible
 * gateways (LiteLLM, vLLM, etc.).
 */

import {
  ensureLLMRuntimeConfigLoaded,
  getLLMRuntimeConfig,
  type LLMRuntimeConfig,
} from './config'
import { joinUrl } from './url'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string } | string
}

/**
 * Concatenates a tagged template literal exactly the way Spark's `llmPrompt`
 * does — no escaping, no parameter sanitisation. Kept for full call-site
 * compatibility.
 */
export function llmPrompt(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce<string>(
    (acc, str, i) =>
      acc + str + (values[i] !== undefined && values[i] !== null ? String(values[i]) : ''),
    '',
  )
}

export interface LLMRequestOptions {
  /** Forces JSON-mode where supported (`response_format = json_object`). */
  jsonMode?: boolean
  /** Overrides the configured request timeout. */
  timeoutMs?: number
  /** Overrides the configured sampling temperature. */
  temperature?: number
  /** Overrides the configured top_p. */
  topP?: number
  /**
   * Overrides the configured top_k. `0` (or any non-positive value)
   * is treated as "neutral" and the field is omitted from the
   * outgoing request — keeps hosted OpenAI happy.
   */
  topK?: number
  /**
   * Overrides the configured min_p. `0` is treated as neutral and
   * the field is omitted (hosted providers that don't know `min_p`
   * are unaffected).
   */
  minP?: number
  /**
   * Overrides the configured repeat penalty. `1` (or any value `<= 1`)
   * is treated as neutral and the field is omitted.
   */
  repeatPenalty?: number
  /** Overrides the configured max_tokens cap. */
  maxTokens?: number
  /** Optional system prompt prepended to the user prompt. */
  system?: string
  /** Optional AbortSignal so callers can cancel in-flight requests. */
  signal?: AbortSignal
}

export class LLMRuntimeError extends Error {
  status?: number
  body?: string
  constructor(message: string, status?: number, body?: string) {
    super(message)
    this.name = 'LLMRuntimeError'
    this.status = status
    this.body = body
  }
}

/**
 * Send a single-prompt completion request and return the assistant's
 * message content. Mirrors the signature of the Spark `llm()` helper so
 * existing call sites work unchanged.
 */
export async function llm(
  prompt: string,
  modelName?: string,
  jsonMode?: boolean,
  options: LLMRequestOptions = {},
): Promise<string> {
  // Make sure config is hydrated; if it fails we still get usable defaults.
  let config: LLMRuntimeConfig
  try {
    config = await ensureLLMRuntimeConfigLoaded()
  } catch {
    config = getLLMRuntimeConfig()
  }

  const trimmedModelName = modelName?.trim() ?? ''
  const model = trimmedModelName.length > 0 ? trimmedModelName : config.defaultModel
  const messages: ChatMessage[] = []
  if (options.system && options.system.length > 0) {
    messages.push({ role: 'system', content: options.system })
  }
  messages.push({ role: 'user', content: prompt })

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? config.temperature,
    top_p: options.topP ?? config.topP,
    max_tokens: options.maxTokens ?? config.maxTokens,
  }
  // Local-runtime sampling knobs. Emitted only when non-neutral so
  // hosted OpenAI / Anthropic / Google endpoints — which don't accept
  // these fields — are unaffected by the new defaults.
  const topK = options.topK ?? config.topK
  if (typeof topK === 'number' && topK > 0) {
    body.top_k = topK
  }
  const minP = options.minP ?? config.minP
  if (typeof minP === 'number' && minP > 0) {
    body.min_p = minP
  }
  const repeatPenalty = options.repeatPenalty ?? config.repeatPenalty
  if (typeof repeatPenalty === 'number' && repeatPenalty > 1) {
    body.repeat_penalty = repeatPenalty
  }
  if (jsonMode || options.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const url = joinUrl(config.baseUrl, 'chat/completions')
  const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  // Forward an external abort signal if provided.
  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey && config.apiKey.length > 0) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LLMRuntimeError(`LLM request timed out after ${timeoutMs}ms (${url})`)
    }
    throw new LLMRuntimeError(
      `LLM request failed: could not reach ${url} (${err instanceof Error ? err.message : String(err)})`,
    )
  }
  clearTimeout(timer)

  const text = await response.text()
  if (!response.ok) {
    throw new LLMRuntimeError(
      `LLM request failed: ${response.status} ${response.statusText} - ${text || '(empty body)'}`,
      response.status,
      text,
    )
  }

  let data: ChatCompletionResponse
  try {
    data = JSON.parse(text) as ChatCompletionResponse
  } catch {
    throw new LLMRuntimeError(`LLM response was not valid JSON: ${text.slice(0, 200)}`)
  }

  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    const errMsg =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message ?? 'no completion choices returned'
    throw new LLMRuntimeError(`LLM response missing content: ${errMsg}`)
  }
  return content
}

/**
 * Lightweight reachability probe used by the Settings UI. Tries the
 * `models` endpoint first (most OpenAI-compatible servers expose it) and
 * reports the discovered model IDs when available.
 */
export async function testLLMRuntimeConnection(
  baseUrl: string,
  apiKey: string,
  timeoutMs = 5000,
): Promise<{ ok: boolean; status?: number; error?: string; models?: string[] }> {
  const headers: Record<string, string> = {}
  if (apiKey.length > 0) headers['Authorization'] = `Bearer ${apiKey}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(joinUrl(baseUrl, 'models'), { headers, signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      return { ok: false, status: res.status, error: `${res.status} ${res.statusText}` }
    }
    let models: string[] | undefined
    try {
      const data = (await res.json()) as { data?: Array<{ id?: string }> }
      if (Array.isArray(data.data)) {
        models = data.data
          .map((m) => m.id)
          .filter((id): id is string => typeof id === 'string')
      }
    } catch {
      // /models exists but didn't return JSON — still treat the endpoint as reachable.
    }
    return { ok: true, status: res.status, models }
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: `Timed out after ${timeoutMs}ms` }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
