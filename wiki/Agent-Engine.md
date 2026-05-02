# Agent Engine

> Internals of `src/lib/agent/tool-loop-agent.ts` — the plan-act-observe loop, tool dispatch, learning, ensembles, versioning.
>
> *Audience: developer · Last reviewed: 2026-05-02*

This page explains the runtime that backs the [Agents](Agents)
feature.

---

## The loop

```mermaid
flowchart LR
  G[Goal + system prompt + tool list] --> P[Plan<br/>(LLM streamText call)]
  P --> D{Tool call requested?}
  D -- yes --> T[Dispatch via toolExecutor]
  T --> O[Observe<br/>(append result to messages)]
  O --> P
  D -- no --> Done{Goal met<br/>or max iterations?}
  Done -- yes --> R[Return final answer]
  Done -- no --> P
```

- **Plan step**: a `streamText()` call to the configured LLM with
  the current message stack and tool definitions.
- **Tool dispatch**: if the LLM emits a tool call, route through
  `toolExecutor` (`src/lib/agent-tools.ts`).
- **Observe**: the tool result is appended as an
  `assistant`/`tool` message and we loop.
- **Termination**: the loop ends when the LLM stops requesting tools
  *or* `max iterations` is hit *or* a self-correction guard trips.

---

## Tool dispatch

`AgentToolExecutor` (in `src/lib/agent-tools.ts`) is a switch over
the 14 built-in tools plus dynamically-registered harness tools. For
each call it:

1. Validates the input against the tool's parameter schema.
2. Runs the tool (sync or async).
3. Returns a `ToolResult` `{ success, output, error?, durationMs }`.

Failures are caught and surfaced as observations rather than thrown
— the agent can decide to retry or give up.

---

## Capabilities

When configuring an agent, several "capabilities" toggle behaviour:

| Capability | What it changes |
| --- | --- |
| `reasoning` | Adds an explicit "think out loud" preamble to each plan turn |
| `planning` | Initial plan-only step before the act loop starts |
| `memory` | Allows the `memory` tool to persist across runs |
| `collaboration` | This agent can be invoked as a sub-agent by `CollaborativeAgentManager` |
| `selfCorrection` | If a tool errors twice in a row, the agent re-plans the whole step |
| `learning` | Feedback feeds the `AgentLearningEngine` |

---

## Learning engine

[`src/lib/agent-learning.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/agent-learning.ts)
takes per-run feedback (thumbs + free text) and produces:

- **Insights** — patterns across runs ("temperature > 0.8 correlates
  with negative feedback")
- **Confidence scores** — for each potential config tweak, how
  likely is it to help?
- **Recommendations** — pushed into the
  [Optimization Recommendations Viewer](Analytics)

Confidence thresholds (CONSERVATIVE / BALANCED / AGGRESSIVE) live in
`src/lib/confidence-thresholds.ts`. The
`thresholdManager` singleton can be mutated at runtime (Auto
Optimization Panel calls `thresholdManager.setConfig` from a
`useEffect`).

---

## Versioning

When an agent's config changes meaningfully (more than a temp tweak
— tool list, capabilities, system prompt), a new `AgentVersion` is
recorded. The Version History panel
(`src/components/agent/AgentVersionHistory.tsx`) lets you:

- Diff versions
- Roll back to a prior version
- Pin a version (auto-optimization respects pins)

---

## Collaborative manager

`CollaborativeAgentManager` chains multiple agents:

1. Take the user goal.
2. Run agent A → produce intermediate output.
3. Pass that output as the goal for agent B.
4. (… N agents)
5. Return the final output.

Each step is a full agent loop (plan-act-observe). Parallelization
is *not* the goal here — that's what [Workflows](Workflows) are for.

---

## Ensemble manager

`EnsembleManager` runs M agents on the **same** goal in parallel and
selects the best answer:

- **Vote** — pick the most-common answer (good for classification)
- **Score** — pick the highest-scored answer per a configurable
  scorer (good for free-text)
- **Best-of-M** — pick the one with the highest internal confidence

Useful for reducing variance in non-deterministic tasks. Costs more
(M × the calls).

---

## Performance monitor

`AgentPerformanceMonitor.tsx` charts per-agent:

- Success rate (over time)
- Average iteration count
- Average duration
- Token spend

Backed by the same `analytics` events the rest of the app emits.

---

## Test coverage

- `tool-loop-agent.test.ts` — happy path, tool error → retry,
  cancellation, max-iteration cap
- `agent-tools.test.ts` — every tool's input validation + output
  shape
- `agent-learning.test.ts` — insight aggregation, threshold
  application

For the AI SDK mock pattern used here, see [Testing](Testing) and
`src/test/ai-sdk-mocks.ts`.

---

## See also

- [Agents](Agents) — user-facing
- [Tools Reference](Tools-Reference) — full tool I/O specs
- [Analytics](Analytics) — recommendations and learning UI
- [Workflow Engine](Workflow-Engine) — when an `agent` workflow node calls in here
