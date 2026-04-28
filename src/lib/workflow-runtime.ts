/**
 * Real workflow executor. Replaces the previous `executeWorkflow` stub
 * in `src/App.tsx` (which only fired a toast). Walks the workflow's
 * directed graph from the `start` node along edges, executing each
 * `agent` / `tool` / `decision` / `loop` node with the existing
 * `AgentToolExecutor` and the LLM client. State is intentionally pure
 * here so it's straightforward to unit-test; the App-level wrapper is
 * responsible for persisting `WorkflowExecution` records and recording
 * cost entries.
 *
 * Design notes:
 *  - Each non-control node receives the previous node's output as
 *    its input. Initial input is the empty string.
 *  - Decision nodes evaluate `data.condition` as a JS expression with
 *    `last` (string) and `vars` (Record<string, unknown>) in scope,
 *    inside a `new Function(...)` sandbox. A truthy result picks the
 *    edge whose `condition === 'true'` (or the first outgoing edge
 *    when none match); a falsy result picks `'false'` / second edge.
 *  - Loop nodes iterate their (single) outgoing edge `iterations`
 *    times; after the last iteration the runtime resumes after the
 *    loop. We enforce a hard `maxSteps` cap (default 100) so a
 *    malformed graph can't run forever.
 *  - `parallel` / `merge` are recorded as pass-through in this v1.
 */

import type { Workflow, WorkflowEdge, WorkflowNode } from './workflow-types'
import type { AgentTool } from './types'
import { toolExecutor as defaultToolExecutor } from './agent-tools'

type NodeType = WorkflowNode['type']

export interface WorkflowRunStep {
  /** Unique id within the run. */
  id: string
  nodeId: string
  nodeType: NodeType
  label: string
  input: string
  output: string
  success: boolean
  startedAt: number
  duration: number
  error?: string
  /** For agent/tool nodes that called the LLM, populated. */
  tokensIn?: number
  tokensOut?: number
  model?: string
}

export interface WorkflowRunResult {
  status: 'completed' | 'error' | 'cancelled'
  steps: WorkflowRunStep[]
  /** Map of nodeId → last output produced by that node. */
  results: Record<string, string>
  error?: string
  tokensIn: number
  tokensOut: number
  /** Set of distinct model ids used by agent nodes during the run. */
  modelsUsed: string[]
}

export interface WorkflowAgent {
  id: string
  name?: string
  goal?: string
  /** Maps to `Agent.systemPrompt` on the app-level `Agent` type. */
  systemPrompt?: string
  model?: string
}

export interface WorkflowRuntimeDeps {
  /** Agent-tool executor. Defaults to the singleton from `agent-tools.ts`. */
  toolExecutor?: {
    executeTool(tool: AgentTool, input: string): Promise<{ success: boolean; output: string }>
  }
  /** LLM call. Defaults to `globalThis.spark.llm` (the local-runtime shim). */
  llm?: (prompt: string, model: string) => Promise<string>
  /** Resolves a workflow `agent` node's referenced agent. */
  resolveAgent?: (agentId: string) => WorkflowAgent | undefined
  /** Default model used when an agent node has no `agentId` or no model. */
  defaultModel?: string
  /** Hard cap on executed steps to bound malformed graphs. Default 100. */
  maxSteps?: number
  /** Per-step progress callback. */
  onStep?: (step: WorkflowRunStep) => void
}

/** Internal: pick the next node id from `current` along outgoing edges. */
function outgoing(edges: WorkflowEdge[], from: string): WorkflowEdge[] {
  return edges.filter(e => e.source === from)
}

/** Evaluate a decision condition in a `new Function` sandbox. Returns
 *  `true` on parse/eval errors so a typo doesn't dead-end the run. */
function evalCondition(
  expr: string | undefined,
  last: string,
  vars: Record<string, unknown>,
): boolean {
  if (!expr || !expr.trim()) return true
  try {
    const fn = new Function('last', 'vars', `"use strict"; return (${expr});`)
    return Boolean(fn(last, vars))
  } catch {
    return true
  }
}

function pickDecisionEdge(
  edges: WorkflowEdge[],
  branch: boolean,
): WorkflowEdge | undefined {
  if (edges.length === 0) return undefined
  // Prefer an edge explicitly labelled 'true' / 'false'.
  const wanted = branch ? 'true' : 'false'
  const labelled = edges.find(
    e => (e.label ?? '').toLowerCase() === wanted ||
         (e.condition ?? '').toLowerCase() === wanted,
  )
  if (labelled) return labelled
  // Otherwise: 1st edge for true, 2nd for false (or first if only one).
  return branch ? edges[0] : edges[1] ?? edges[0]
}

interface NodeExecResult {
  output: string
  success: boolean
  error?: string
  /** True/false result of a decision node condition evaluation. */
  branch?: boolean
  tokensIn?: number
  tokensOut?: number
  model?: string
}

function estimateTokens(s: string): number {
  // Same heuristic as runAgent / sendMessage in App.tsx.
  return Math.ceil(s.length / 4)
}

async function executeNode(
  node: WorkflowNode,
  input: string,
  deps: Required<Omit<WorkflowRuntimeDeps, 'onStep'>> & Pick<WorkflowRuntimeDeps, 'onStep'>,
  vars: Record<string, unknown>,
): Promise<NodeExecResult> {
  switch (node.type) {
    case 'start':
    case 'end':
    case 'merge':
    case 'parallel':
      return { output: input, success: true }

    case 'tool': {
      const toolName = (node.data?.toolName ?? '') as AgentTool
      if (!toolName) {
        return { output: '', success: false, error: 'tool node missing toolName' }
      }
      const toolInput =
        typeof node.data?.config?.input === 'string'
          ? (node.data.config.input as string)
          : input
      const res = await deps.toolExecutor.executeTool(toolName, toolInput)
      return { output: res.output, success: res.success }
    }

    case 'agent': {
      const agentId = node.data?.agentId
      const agent = agentId ? deps.resolveAgent(agentId) : undefined
      const model = agent?.model ?? deps.defaultModel
      const goal = agent?.goal ?? node.data?.label ?? ''
      const instructions = agent?.systemPrompt ?? ''
      const prompt =
        `You are an AI agent inside a workflow step.\n` +
        (instructions ? `Instructions: ${instructions}\n` : '') +
        (goal ? `Goal: ${goal}\n` : '') +
        (input ? `Input from previous step:\n${input}\n` : '') +
        `Respond with the result of this step in 1-3 sentences.`
      try {
        const out = await deps.llm(prompt, model)
        return {
          output: out,
          success: true,
          tokensIn: estimateTokens(prompt),
          tokensOut: estimateTokens(out),
          model,
        }
      } catch (err) {
        return {
          output: '',
          success: false,
          error: err instanceof Error ? err.message : String(err),
          model,
        }
      }
    }

    case 'decision': {
      // Output mirrors the input; the branch decision is carried in the
      // dedicated `branch` field rather than overloading `error`.
      const branch = evalCondition(node.data?.condition, input, vars)
      return { output: input, success: true, branch }
    }

    case 'loop': {
      // Loop control is handled by the run loop using `data.iterations`;
      // executing the node itself is a pass-through.
      return { output: input, success: true }
    }

    default:
      return { output: input, success: true }
  }
}

/**
 * Execute `workflow` to completion (or step cap / error) and return a
 * structured result. Pure with respect to React state — the caller
 * persists the run record and dispatches cost tracking.
 */
export async function runWorkflow(
  workflow: Workflow,
  rawDeps: WorkflowRuntimeDeps = {},
): Promise<WorkflowRunResult> {
  const deps: Required<Omit<WorkflowRuntimeDeps, 'onStep'>> &
    Pick<WorkflowRuntimeDeps, 'onStep'> = {
    toolExecutor: rawDeps.toolExecutor ?? defaultToolExecutor,
    llm:
      rawDeps.llm ??
      (async (prompt, model) => {
        // Lazy reference to globalThis.spark.llm so tests can override
        // by passing `llm` in deps without needing a global mock.
        const g = globalThis as unknown as {
          spark?: { llm?: (p: string, m: string) => Promise<string> }
        }
        if (g.spark?.llm) return g.spark.llm(prompt, model)
        throw new Error('No LLM client available (spark.llm undefined)')
      }),
    resolveAgent: rawDeps.resolveAgent ?? (() => undefined),
    defaultModel: rawDeps.defaultModel ?? 'gpt-4o-mini',
    maxSteps: rawDeps.maxSteps ?? 100,
    onStep: rawDeps.onStep,
  }

  const steps: WorkflowRunStep[] = []
  const results: Record<string, string> = {}
  const vars: Record<string, unknown> = { ...(workflow.variables ?? {}) }
  const modelsUsed = new Set<string>()
  let tokensIn = 0
  let tokensOut = 0

  if (!workflow.nodes || workflow.nodes.length === 0) {
    return {
      status: 'error',
      steps,
      results,
      error: 'workflow has no nodes',
      tokensIn,
      tokensOut,
      modelsUsed: [],
    }
  }

  // Start at the first `start` node, or the first node if no explicit start.
  const startNode =
    workflow.nodes.find(n => n.type === 'start') ?? workflow.nodes[0]
  let currentId: string | undefined = startNode.id
  let lastOutput = ''

  // Loop counters: nodeId → remaining iterations.
  const loopRemaining = new Map<string, number>()

  while (currentId && steps.length < deps.maxSteps) {
    const node = workflow.nodes.find(n => n.id === currentId)
    if (!node) {
      return {
        status: 'error',
        steps,
        results,
        error: `dangling edge to missing node ${currentId}`,
        tokensIn,
        tokensOut,
        modelsUsed: [...modelsUsed],
      }
    }

    const startedAt = Date.now()
    const exec = await executeNode(node, lastOutput, deps, vars)
    const duration = Date.now() - startedAt

    const step: WorkflowRunStep = {
      id: `wfstep-${startedAt}-${steps.length}`,
      nodeId: node.id,
      nodeType: node.type,
      label: node.data?.label ?? node.type,
      input: lastOutput,
      output: exec.output,
      success: exec.success,
      startedAt,
      duration,
      error: node.type === 'decision' ? undefined : exec.error,
      tokensIn: exec.tokensIn,
      tokensOut: exec.tokensOut,
      model: exec.model,
    }
    steps.push(step)
    deps.onStep?.(step)
    results[node.id] = exec.output
    if (exec.tokensIn) tokensIn += exec.tokensIn
    if (exec.tokensOut) tokensOut += exec.tokensOut
    if (exec.model) modelsUsed.add(exec.model)

    if (!exec.success && node.type !== 'decision') {
      return {
        status: 'error',
        steps,
        results,
        error: exec.error ?? `node ${node.id} failed`,
        tokensIn,
        tokensOut,
        modelsUsed: [...modelsUsed],
      }
    }

    if (node.type === 'end') {
      return {
        status: 'completed',
        steps,
        results,
        tokensIn,
        tokensOut,
        modelsUsed: [...modelsUsed],
      }
    }

    lastOutput = exec.output

    // Decide where to go next.
    const nextEdges = outgoing(workflow.edges, node.id)
    if (nextEdges.length === 0) {
      // No outgoing edges: terminate cleanly.
      return {
        status: 'completed',
        steps,
        results,
        tokensIn,
        tokensOut,
        modelsUsed: [...modelsUsed],
      }
    }

    if (node.type === 'decision') {
      // exec.branch is the boolean result of the condition — see executeNode.
      const branch = exec.branch ?? false
      const edge = pickDecisionEdge(nextEdges, branch)
      currentId = edge?.target
      continue
    }

    if (node.type === 'loop') {
      const requested = Math.max(0, node.data?.iterations ?? 1)
      const remaining = loopRemaining.has(node.id)
        ? loopRemaining.get(node.id)!
        : requested
      if (remaining > 0) {
        loopRemaining.set(node.id, remaining - 1)
        // Body edge: prefer one labelled 'body', else first; loop-exit
        // edge: labelled 'exit'/'done', else last (when 2+ exist).
        const bodyEdge =
          nextEdges.find(e => /^(body|loop|continue)$/i.test(e.label ?? '')) ??
          nextEdges[0]
        currentId = bodyEdge.target
      } else {
        loopRemaining.delete(node.id)
        const exitEdge =
          nextEdges.find(e => /^(exit|done|out|after)$/i.test(e.label ?? '')) ??
          nextEdges[nextEdges.length - 1]
        currentId = exitEdge.target
      }
      continue
    }

    // Default: take the first outgoing edge.
    currentId = nextEdges[0].target
  }

  if (steps.length >= deps.maxSteps) {
    return {
      status: 'error',
      steps,
      results,
      error: `workflow exceeded max steps (${deps.maxSteps})`,
      tokensIn,
      tokensOut,
      modelsUsed: [...modelsUsed],
    }
  }

  return {
    status: 'completed',
    steps,
    results,
    tokensIn,
    tokensOut,
    modelsUsed: [...modelsUsed],
  }
}
