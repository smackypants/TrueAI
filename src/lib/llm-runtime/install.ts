/**
 * Side-effect module that installs `window.spark` so legacy call sites
 * (`spark.llm`, `spark.llmPrompt`, `spark.kv`) keep working without any
 * source changes. Replaces the real `@github/spark/spark` import via a
 * Vite path alias (see `vite.config.ts`).
 *
 * This module is imported for its side effect from `src/main.tsx`; it must
 * execute before the React tree renders so that synchronous spark.* uses
 * during the first render are safe.
 */

import { kvStore } from './kv-store'
import { llm, llmPrompt } from './client'
import { ensureLLMRuntimeConfigLoaded } from './config'

interface SparkGlobal {
  llmPrompt: typeof llmPrompt
  llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
  kv: {
    get: <T = unknown>(key: string) => Promise<T | undefined>
    set: (key: string, value: unknown) => Promise<void>
    delete: (key: string) => Promise<void>
    keys: () => Promise<string[]>
  }
  user: () => Promise<null>
}

const sparkShim: SparkGlobal = {
  llmPrompt,
  // Spark's signature was `(prompt, modelName?, jsonMode?)`; preserve it.
  llm: (prompt, modelName, jsonMode) => llm(prompt, modelName, jsonMode),
  kv: {
    get: (key) => kvStore.get(key),
    set: (key, value) => kvStore.set(key, value),
    delete: (key) => kvStore.delete(key),
    keys: () => kvStore.keys(),
  },
  // Spark exposed a `user()` that hit `/_spark/user`. There is no remote
  // identity in a fully-local runtime; return null so callers that probe
  // it get a defined-but-empty answer instead of a network error.
  user: async () => null,
}

if (typeof window !== 'undefined') {
  // Don't redeclare the `Window.spark` type here — the existing global
  // `spark` declaration in src/vite-end.d.ts (and the upstream
  // @github/spark .d.ts files) already provides typing for call sites.
  // Cast through `unknown` to install our local-runtime shim onto the
  // window without overwriting an existing one (e.g. tests or a future
  // hosted variant that may have already done so).
  const w = window as unknown as { spark?: SparkGlobal }
  if (!w.spark) {
    w.spark = sparkShim
  }
}

// Kick off configuration loading so the first user prompt isn't blocked on
// a cold runtime.config.json fetch.
void ensureLLMRuntimeConfigLoaded()

export {}
