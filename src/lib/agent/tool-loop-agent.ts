/**
 * AI-SDK-flavoured wrapper around `AgentToolExecutor`.
 *
 * Replaces the inline planner→tool loop in `App.tsx` (the
 * `agent.goal` block, ~lines 706-730 of the legacy implementation)
 * with a typed `ToolLoopAgent` whose tools are the existing TrueAI
 * `AgentTool` set, exposed with Zod input schemas.
 *
 * The agent's `model` is supplied by the caller (typically via
 * `getLanguageModel(modelId)`), so the same multi-provider plumbing
 * — Ollama, OpenAI-compatible, OpenAI, Anthropic, Google — applies
 * automatically.
 *
 * The wrapped tool executors fail-closed in the local-first runtime
 * (e.g. `web_search`, `image_generator`, `translator`) exactly the
 * way the legacy executor did; nothing here introduces new
 * third-party network calls.
 */

import { z } from 'zod'
import { tool, ToolLoopAgent, type LanguageModel } from '@/lib/llm-runtime/ai-sdk'
import { AgentToolExecutor, toolExecutor as defaultExecutor } from '../agent-tools'
import type { AgentTool } from '../types'

export interface BuildAgentToolsOptions {
  /** Tool executor; defaults to the singleton from `agent-tools.ts`. */
  executor?: AgentToolExecutor
  /** Restrict the exposed tool set; defaults to all tools. */
  tools?: AgentTool[]
}

const ALL_TOOLS: AgentTool[] = [
  'calculator',
  'datetime',
  'memory',
  'web_search',
  'code_interpreter',
  'file_reader',
  'json_parser',
  'api_caller',
  'data_analyzer',
  'image_generator',
  'sentiment_analyzer',
  'summarizer',
  'translator',
  'validator',
]

const TOOL_DESCRIPTIONS: Record<AgentTool, string> = {
  calculator: 'Evaluate a basic arithmetic expression. Input: an expression like "(2+3)*4".',
  datetime: 'Get the current date/time, or compute a relative date. Input: a natural-language query.',
  memory: 'Read or write the agent\'s short-term memory store. Input: a key=value or just a key.',
  web_search: 'Web search. Local-first runtime: this fails closed unless a search backend is wired.',
  code_interpreter: 'Run a small JavaScript snippet in a sandbox. Input: the snippet.',
  file_reader: 'Read a file from the device (size-capped). Input: the file path.',
  json_parser: 'Parse / re-serialise a JSON document. Input: the JSON text.',
  api_caller: 'GET an HTTP URL (15s timeout, 16KB cap). Input: the URL.',
  data_analyzer: 'Compute summary stats over an array of numbers. Input: comma-separated numbers.',
  image_generator: 'Image generation. Local-first runtime: this fails closed unless wired.',
  sentiment_analyzer: 'Score the sentiment of a text. Input: the text.',
  summarizer: 'Produce a short summary of a longer text. Input: the text.',
  translator: 'Translate text. Local-first runtime: this fails closed unless wired.',
  validator: 'Validate that input matches a known shape (email, url, json). Input: type:value.',
}

/**
 * Build a `tools` map suitable for `ToolLoopAgent({ tools })` or
 * `generateText({ tools })`. Each tool has a one-string-arg input
 * schema (matching the legacy `executeTool(tool, input)` signature)
 * and an `execute` that delegates to the existing `AgentToolExecutor`.
 */
export function buildAgentTools(opts: BuildAgentToolsOptions = {}) {
  const executor = opts.executor ?? defaultExecutor
  const allowed = opts.tools ?? ALL_TOOLS

  const out: Record<string, ReturnType<typeof tool>> = {}
  for (const t of allowed) {
    // Each tool is a single-string-arg call that delegates to the
    // existing AgentToolExecutor; the SDK's `tool()` helper preserves
    // the input/output generics, but iterating with a heterogeneous
    // map collapses them — cast at the assignment boundary so the
    // returned object remains a `ToolSet` consumable by ToolLoopAgent.
    const t_def = tool({
      description: TOOL_DESCRIPTIONS[t],
      inputSchema: z.object({
        input: z
          .string()
          .describe('Free-form input to the tool (single string argument).'),
      }),
      execute: async ({ input }) => {
        const result = await executor.executeTool(t, input)
        return {
          success: result.success,
          output: result.output,
          ...(result.error ? { error: result.error } : {}),
        }
      },
    }) as unknown as ReturnType<typeof tool>
    out[t] = t_def
  }
  return out
}

export interface BuildTrueAIAgentOptions extends BuildAgentToolsOptions {
  /** AI-SDK language model the agent will reason with. */
  model: LanguageModel
  /** Optional system prompt; a sensible default is supplied. */
  system?: string
}

const DEFAULT_SYSTEM = `You are a TrueAI on-device agent. You have access to a small set of \
tools; pick the smallest combination that accomplishes the user's goal. \
If a tool is unavailable in this local-first runtime (e.g. web_search, \
image_generator, translator), explain that limitation in your final \
answer instead of inventing tool output.`

/**
 * Construct a TrueAI-flavoured `ToolLoopAgent` ready to `generate(...)`
 * against a goal. Equivalent in behaviour to the legacy planner→tool
 * loop, but typed, single-shot, and provider-agnostic.
 */
export function buildTrueAIAgent(opts: BuildTrueAIAgentOptions) {
  // Cast through unknown: the `system` setting on `ToolLoopAgent` and
  // the per-tool generic narrowing both confuse TS's structural
  // matcher when the tools map is a `Record<string, Tool>`. The
  // runtime contract is correct.
  return new ToolLoopAgent({
    model: opts.model,
    system: opts.system ?? DEFAULT_SYSTEM,
    tools: buildAgentTools(opts),
  } as unknown as ConstructorParameters<typeof ToolLoopAgent>[0])
}
