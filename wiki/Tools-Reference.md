# Tools Reference

> Every built-in agent tool, with inputs and outputs.
>
> *Audience: both · Last reviewed: 2026-05-02*

These are the 14 tools an agent can call out of the box. Defined in
[`src/lib/agent-tools.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/agent-tools.ts);
typed as `AgentTool` in `src/lib/types.ts`.

For user-supplied tools, see [Harness System](Harness-System).
For how tools are dispatched from inside an agent run, see
[Agent Engine](Agent-Engine#tool-dispatch).

---

## Computation

### `calculator`

Evaluate a math expression.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ expression: string }` | e.g. `"2 * (3 + 4)"` |
| Output | `{ result: number }` | |
| Errors | `"invalid expression"` | Parser rejected the input |

### `datetime`

Get current time or parse / format a date.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ op: "now" \| "format" \| "parse", value?: string, format?: string, tz?: string }` | |
| Output | `{ result: string }` | |

### `code_interpreter`

Run a small JS snippet in a sandbox and return its result.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ code: string }` | Pure expressions or async functions |
| Output | `{ result: unknown, logs: string[] }` | |
| Errors | `"timeout"` `"runtime"` | Sandbox guards |

> ⚠️ Sandboxed but not airtight. Don't use untrusted code.

---

## Data

### `memory`

Read/write the agent's scratchpad. Persisted across iterations of a
single run; persisted across runs only if the agent's `memory`
capability is enabled.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ op: "get" \| "set" \| "list" \| "delete", key?: string, value?: unknown }` | |
| Output | varies by op | |

### `file_reader`

Read an uploaded / cached file by id.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ fileId: string, mode?: "text" \| "base64" }` | |
| Output | `{ content: string, mimeType: string, size: number }` | |
| Errors | `"not found"` | |

### `json_parser`

Parse JSON and (optionally) extract a path.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ json: string, path?: string }` | path is dot.notation |
| Output | `{ value: unknown }` | |
| Errors | `"invalid json"` `"path not found"` | |

### `data_analyzer`

Aggregate stats over an array of records.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ data: object[], op: "count" \| "sum" \| "avg" \| "min" \| "max" \| "groupBy", field?: string, groupField?: string }` | |
| Output | `{ result: number \| Record<string, number> }` | |

---

## Communication

### `web_search`

Hit a configured search endpoint.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ query: string, limit?: number }` | |
| Output | `{ results: Array<{ title, url, snippet }> }` | |
| Errors | `"endpoint not configured"` `"network"` | |

> Configure the search endpoint in Settings → AI. No endpoint is
> baked in by default — TrueAI does not phone home.

### `api_caller`

Make a generic HTTP request.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ url: string, method?: "GET" \| "POST" \| "PUT" \| "DELETE", headers?: object, body?: unknown }` | |
| Output | `{ status: number, headers: object, body: unknown }` | |
| Errors | `"network"` `"timeout"` | Retried via offline queue |

> ⚠️ Unrestricted by default — agents can hit arbitrary URLs. Use a
> deny-list in Settings → AI if you need to constrain.

---

## Analysis

### `sentiment_analyzer`

Score text sentiment.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ text: string }` | |
| Output | `{ sentiment: "positive" \| "negative" \| "neutral", score: number }` | -1.0 … 1.0 |

### `summarizer`

Summarise long text into a short bullet list.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ text: string, maxBullets?: number }` | |
| Output | `{ summary: string, bullets: string[] }` | |

### `validator`

Schema-check an input against a JSON Schema.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ value: unknown, schema: object }` | |
| Output | `{ valid: boolean, errors?: string[] }` | |

---

## Generation

### `translator`

Translate text between languages.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ text: string, from?: string, to: string }` | ISO 639-1 codes |
| Output | `{ translation: string, detectedFrom?: string }` | |

### `image_generator`

Call a configured image-generation endpoint.

| Field | Type | Notes |
| --- | --- | --- |
| Input | `{ prompt: string, size?: string, n?: number }` | |
| Output | `{ images: Array<{ url?: string, base64?: string }> }` | |
| Errors | `"endpoint not configured"` `"network"` | |

> Like `web_search`, no endpoint is baked in. Configure it in
> Settings → AI.

---

## Common contract

Every tool returns a `ToolResult`:

```ts
interface ToolResult {
  success: boolean
  output?: unknown
  error?: string
  durationMs: number
}
```

Failures are surfaced to the agent as observations — the agent
decides whether to retry, change strategy, or give up. See
[Agent Engine](Agent-Engine).

---

## Categories (for UI grouping)

`getToolCategory(tool)` (from `agent-tools.ts`) returns one of:

- `computation` — calculator, datetime, code_interpreter
- `data` — memory, file_reader, json_parser, data_analyzer
- `communication` — web_search, api_caller
- `analysis` — sentiment_analyzer, summarizer, validator
- `generation` — translator, image_generator

Used by the agent tool picker.

---

## See also

- [Agents](Agents)
- [Agent Engine](Agent-Engine)
- [Workflows](Workflows) — `tool` workflow nodes call into here
- [Harness System](Harness-System) — adding your own
