# Workflow Engine

> Internals of `src/lib/workflow-runtime.ts` — node ordering, decisions, parallel branches, error propagation.
>
> *Audience: developer · Last reviewed: 2026-05-02*

This page documents the runtime that backs the visual
[Workflows](Workflows) builder. Type contract:
[`src/lib/workflow-types.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/workflow-types.ts).

---

## Inputs

```ts
runWorkflow(workflow: Workflow): AsyncIterable<WorkflowRunStep>
```

`Workflow` is a `{ nodes, edges, variables }` graph. The runtime
returns an async iterable so the UI can stream step events into
`WorkflowExecution.results` in real time.

---

## Node types

```ts
type WorkflowNodeType =
  | 'start' | 'end'
  | 'agent' | 'tool'
  | 'decision'
  | 'loop' | 'parallel' | 'merge'
```

| Type | Semantics |
| --- | --- |
| `start` | Single entry. Output is the initial `variables`. |
| `end` | Terminator. Multiple allowed; first to fire ends the workflow if it has no other live branches. |
| `agent` | Resolve `data.agentId`, run the agent with the upstream payload as its goal, return its result. |
| `tool` | Resolve `data.toolName`, dispatch through `toolExecutor`, return the result. |
| `decision` | Evaluate `data.condition` against the variables map. Choose the outgoing edge whose `condition` matches; fall back to the unlabelled "default" edge if any; otherwise fail. |
| `parallel` | Fire all outgoing edges concurrently. |
| `merge` | Wait for *every* upstream branch to complete (or fail), then continue. |
| `loop` | Run a downstream sub-graph N times (`data.iterations`) or until a condition; result is an array of per-iteration outputs. |

---

## Execution algorithm

```mermaid
flowchart TB
  Start[Build adjacency map<br/>from edges]
  Ready[Queue 'start' as ready]
  Loop{Ready queue empty?}
  Pick[Pop next ready node]
  Run[Execute node<br/>(agent / tool / …)]
  Emit[Yield WorkflowRunStep<br/>+ update execution.results]
  Update[Mark node done<br/>and check downstream readiness<br/>(all inputs satisfied?)]
  Final[Yield 'completed'<br/>or 'error']

  Start --> Ready --> Loop
  Loop -- no --> Pick --> Run --> Emit --> Update --> Loop
  Loop -- yes --> Final
```

A node is **ready** when:

- `start` — always at t=0.
- Any other node — every incoming edge's source has completed *and*,
  for `decision`-driven paths, this edge is the one selected.
- `merge` — *every* incoming edge's source has completed.

---

## Variables and per-node results

Every node writes its output to `WorkflowExecution.results[nodeId]`.
Downstream nodes read upstream outputs through:

- **Direct payload** passed as the input to the next node.
- **Variable references** in node configs (e.g. a tool node's
  parameter `"$nodeA.result.summary"` resolves at runtime).

The shared `variables` map is also writable by special nodes (a
future `set-variable` node will be added; today, agents write into
it via the `memory` tool).

---

## Decision conditions

`decision.data.condition` is a small expression evaluated against
the variables map. Evaluation is intentionally narrow (no `eval`):

- Comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`)
- Boolean (`&&`, `||`, `!`)
- Variable lookup (`$var.path.to.value`)
- String / number / boolean literals

Outgoing edges may carry a `condition` label; the runtime picks the
first matching edge in deterministic order (edge `id` ascending).

---

## Parallel and merge

`parallel` doesn't itself do work — it's a marker that the node's
outgoing edges should fan out concurrently. The runtime
`Promise.all`s the resulting branch promises. `merge` blocks the
downstream branch until every upstream completes (success **or**
failure).

A failure in one parallel branch does **not** abort the others by
default — the workflow status becomes `error` only if no terminating
`end` is reachable.

---

## Error propagation

Each node executes inside a try/catch. On throw:

- The node's result is set to `{ error: message, stack }`.
- The branch becomes "failed".
- The downstream-readiness check treats failed inputs as "satisfied
  with error" so a `merge` won't deadlock — it gets the error in its
  inputs and can fail itself or pass the error through.
- The workflow's overall `status` is set to `error` if no `end` is
  reachable; otherwise `completed` once an `end` fires (with errors
  visible in `results`).

Cancellation is handled by an `AbortController` set on the
execution; cancellation marks status as `cancelled` and stops
yielding new steps.

---

## Streaming step events

`WorkflowRunStep` (in `workflow-runtime.ts`) is the unit yielded by
the async iterator:

```ts
interface WorkflowRunStep {
  nodeId: string
  status: 'started' | 'completed' | 'error'
  result?: unknown
  error?: string
  timestamp: number
}
```

The UI subscribes via the workflow execution viewer and updates
node colours / inspector content live.

---

## Test coverage

`src/lib/workflow-runtime.test.ts` covers:

- Linear flows
- Decision routing (matching + default fallback + no-match failure)
- Parallel + merge happy path
- Parallel branch failure semantics
- Cycle detection (workflows are validated to be acyclic except via
  explicit `loop` nodes)
- Cancellation mid-run

---

## See also

- [Workflows](Workflows) — user-facing
- [Workflow Templates Reference](Workflow-Templates-Reference) — the six built-ins as graphs
- [Agent Engine](Agent-Engine) — `agent` nodes ultimately call here
- [Tools Reference](Tools-Reference) — `tool` nodes
