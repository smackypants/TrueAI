/**
 * Lightweight streaming-chat hook built directly on `streamText` from
 * the Vercel AI SDK.
 *
 * Intentionally NOT using `@ai-sdk/react`'s `useChat`, because that hook
 * assumes a server route (`/api/chat`) that streams `data:` SSE frames
 * back. TrueAI is a pure client (Vite SPA + Capacitor WebView); there
 * is no backend, so we call the language-model directly from the
 * browser/WebView and accumulate the resulting text-delta stream.
 *
 * The hook is provider-agnostic: it talks through `getLanguageModel`,
 * which honours the user's current `LLMRuntimeConfig` (Ollama by
 * default, hosted providers when explicitly configured).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getLanguageModel,
  streamText,
  type ModelMessage,
} from '@/lib/llm-runtime/ai-sdk'

export type StreamingChatStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface UseStreamingChatOptions {
  /** Optional model id override (otherwise uses configured default). */
  model?: string
  /** Optional system prompt prepended to every send. */
  system?: string
  /** Sampling temperature override. */
  temperature?: number
}

export interface UseStreamingChatResult {
  /** Latest assistant message content as it streams in. */
  text: string
  /** Current streaming status. */
  status: StreamingChatStatus
  /** Last error, if any. */
  error: Error | null
  /** Send a user prompt; resolves once the stream completes. */
  send: (prompt: string, history?: ModelMessage[]) => Promise<string>
  /** Abort the in-flight stream, if any. */
  abort: () => void
  /** Reset accumulated text + status to idle. */
  reset: () => void
}

export function useStreamingChat(
  options: UseStreamingChatOptions = {},
): UseStreamingChatResult {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<StreamingChatStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const optsRef = useRef(options)
  // Keep the latest options without re-creating `send` on every render.
  optsRef.current = options

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const reset = useCallback(() => {
    setText('')
    setStatus('idle')
    setError(null)
  }, [])

  const userAbortedRef = useRef(false)

  const abort = useCallback(() => {
    userAbortedRef.current = true
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const send = useCallback(
    async (prompt: string, history: ModelMessage[] = []): Promise<string> => {
      // Cancel any prior stream.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      userAbortedRef.current = false

      const opts = optsRef.current
      setText('')
      setStatus('streaming')
      setError(null)

      try {
        const model = await getLanguageModel(opts.model)
        const messages: ModelMessage[] = []
        if (opts.system && opts.system.length > 0) {
          messages.push({ role: 'system', content: opts.system })
        }
        for (const m of history) messages.push(m)
        messages.push({ role: 'user', content: prompt })

        const result = streamText({
          model,
          messages,
          temperature: opts.temperature,
          abortSignal: controller.signal,
        })

        let acc = ''
        for await (const delta of result.textStream) {
          if (userAbortedRef.current) break
          acc += delta
          setText(acc)
        }
        // Awaiting `result.text` surfaces stream-creation / mid-stream
        // errors that wouldn't be thrown by `textStream` itself
        // (e.g. provider HTTP failures).
        if (!userAbortedRef.current) {
          await result.text
          setStatus('done')
        } else {
          setStatus('idle')
        }
        return acc
      } catch (err) {
        // Distinguish user-initiated abort from real failures.
        if (userAbortedRef.current) {
          setStatus('idle')
          return ''
        }
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setStatus('error')
        throw e
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [],
  )

  return { text, status, error, send, abort, reset }
}
