# Agents

> Autonomous AI agents that plan, call tools, observe results, and iterate to a goal.
>
> *Audience: end user · Last reviewed: 2026-05-02*

An **agent** in TrueAI is a goal-directed loop: you give it an
objective, pick which of the 14 built-in tools it can call, and the
agent plans → acts → observes → repeats until the goal is met or it
gives up. The runtime lives in
[`src/lib/agent/tool-loop-agent.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/agent/tool-loop-agent.ts);
the UI lives in `src/components/agent/`.

---

## Lifecycle

```mermaid
flowchart LR
  Create[Create<br/>(template or scratch)]
  Configure[Configure<br/>goal · tools · params]
  Run[Run]
  Plan[Plan step]
  Act[Tool call]
  Obs[Observe result]
  Done{Goal met<br/>or max iterations?}
  Done -- yes --> Finish[Finish<br/>+ feedback prompt]
  Done -- no --> Plan

  Create --> Configure --> Run --> Plan --> Act --> Obs --> Done
  Finish --> History[(Run history)]
  Finish --> Learning[(Learning engine)]
```

State is persisted in KV; every run is recorded for replay. See
[Agent Engine](Agent-Engine) for internals.

---

## Creating an agent

Two paths:

1. **From a template** (Quick Start) — pick one of the 8 built-in
   templates, optionally tweak the goal, save.
2. **From scratch** — fill in goal, capabilities, tools, advanced
   parameters.

### The 8 built-in templates

| Template | Default tools |
| --- | --- |
| Research Assistant | web_search, summarizer, memory |
| Data Analyst | data_analyzer, json_parser, calculator |
| Code Reviewer | file_reader, code_interpreter, validator |
| Content Creator | summarizer, sentiment_analyzer, translator |
| Translator | translator, validator |
| Sentiment Analyzer | sentiment_analyzer, summarizer |
| API Orchestrator | api_caller, json_parser, validator |
| General Assistant | calculator, datetime, memory, web_search |

See [`AgentTemplates`](https://github.com/smackypants/TrueAI/blob/main/src/components/agent/AgentTemplates.tsx).

---

## The 14 tools

Defined in
[`src/lib/agent-tools.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/agent-tools.ts).
See [Tools Reference](Tools-Reference) for full input/output specs.

| Category | Tool | Purpose |
| --- | --- | --- |
| Computation | `calculator` | Evaluate math expressions |
| Computation | `datetime` | Current time, parse / format dates |
| Computation | `code_interpreter` | Run small JS snippets in a sandbox |
| Data | `memory` | Read / write the agent's scratchpad |
| Data | `file_reader` | Read uploaded / cached files |
| Data | `json_parser` | Parse + path-extract from JSON |
| Data | `data_analyzer` | Aggregate stats over arrays of records |
| Communication | `web_search` | Hit a configured search endpoint |
| Communication | `api_caller` | Generic HTTP request (GET/POST/PUT/DELETE) |
| Analysis | `sentiment_analyzer` | Text → sentiment score |
| Analysis | `summarizer` | Long text → bullet summary |
| Analysis | `validator` | Schema-check inputs / outputs |
| Generation | `translator` | Text → other languages |
| Generation | `image_generator` | Calls a configured image-gen endpoint |

> Want more tools? Bring your own with the
> [Harness System](Harness-System).

---

## Advanced configuration

When creating an agent (or via the **Config** button on an existing
agent), you can set:

- **Temperature, max tokens, top-p, penalties** — the same model
  parameters as Chat
- **Max iterations** — hard cap on tool-loop turns
- **System prompt** — overrides the default agent system prompt
- **Memory** — let the agent persist scratchpad across runs
- **Capabilities** — toggles for *reasoning*, *planning*, *memory*,
  *collaboration*, *self-correction*, *learning*

See [`AgentConfigPanel`](https://github.com/smackypants/TrueAI/blob/main/src/components/agent/AgentConfigPanel.tsx).

---

## Running and watching

When an agent runs, the **Step View** streams every plan, tool call,
observation, and decision in real time:

```
[plan]    "I'll start by searching for…"
[tool]    web_search({ query: "..."})
[obs]     200 OK · 8 results
[plan]    "Now I'll summarize the top 3…"
[tool]    summarizer({ text: "..."})
[obs]     "Key points: …"
[done]    "Final answer: …"
```

See
[`AgentStepView`](https://github.com/smackypants/TrueAI/blob/main/src/components/agent/AgentStepView.tsx)
and the run-history persistence in `src/lib/types.ts → AgentRun`.

---

## Scheduling

The **Agent Scheduler** lets you run an agent automatically:

- Frequency: once · daily · weekly · monthly
- Next run / last run timestamps
- Background execution (best-effort on web; uses
  `@capacitor/local-notifications` to alert you on Android)

See
[`AgentScheduler`](https://github.com/smackypants/TrueAI/blob/main/src/components/agent/AgentScheduler.tsx)
and [Notifications](Notifications).

---

## Collaborative & ensemble modes

- **Collaborative agents** (`CollaborativeAgentManager`) — chain N
  agents, each handing off to the next. Useful for "researcher →
  writer → editor" pipelines.
- **Ensembles** (`EnsembleManager`) — run M agents in parallel on
  the same goal and pick the best answer (vote / score). Useful for
  reducing variance in non-deterministic tasks.

For workflow-shaped chaining (with branches / decisions / explicit
edges), use the [Workflow Builder](Workflows) instead.

---

## Learning loop & feedback

After a run, you can submit thumbs-up/-down + free-text feedback via
the **Feedback Dialog**. The
[`AgentLearningEngine`](https://github.com/smackypants/TrueAI/blob/main/src/lib/agent-learning.ts)
aggregates feedback into:

- **Learning insights** — surfaced in the Learning Insights Panel
  ("your agent does better on shorter goals" etc.)
- **Confidence thresholds** — surfaced in
  [Analytics → Confidence Threshold Config](Analytics)
- **Auto-versioning** — when an agent's config changes meaningfully,
  a new version is recorded; you can roll back via
  [`AgentVersionHistory`](https://github.com/smackypants/TrueAI/blob/main/src/components/agent/AgentVersionHistory.tsx)

---

## Performance monitoring

The **Agent Performance Monitor** charts per-agent success rate,
average iteration count, average duration, and token spend over time.
See `AgentPerformanceMonitor.tsx` and the
[Analytics](Analytics) tab for the dashboard view.

---

## Mobile

`MobileAgentList` swaps the desktop card grid for a thumb-friendly
vertical list. Pull-to-refresh works the same as in Chat.

---

## See also

- [Tools Reference](Tools-Reference) — full I/O specs for every tool
- [Workflows](Workflows) — when you need branching / parallel paths
- [Harness System](Harness-System) — adding your own tools
- [Agent Engine](Agent-Engine) — internals
- [Analytics](Analytics) — agent metrics
- Canonical: [`FEATURES.md`](https://github.com/smackypants/TrueAI/blob/main/FEATURES.md)
