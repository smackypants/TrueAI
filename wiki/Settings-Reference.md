# Settings Reference

> Every persisted KV key TrueAI uses, where it's read/written, and what shape it has.
>
> *Audience: developer · Last reviewed: 2026-05-02*

This is the storage map. For the storage *layers* see
[State & Persistence](State-and-Persistence). For the *user-facing*
preference panels see [Settings](Settings).

The list is curated — non-exhaustive but covers the keys that
matter. To find the rest: `grep "useKV(" src` or
`grep "kvStore\." src`.

---

## Naming convention

- App-domain keys: kebab-case, descriptive (`active-tab`,
  `agents`, `workflows`, `cost-entries`, `budgets`).
- Runtime / internal keys: double-underscore prefix
  (`__llm_runtime_config__`, `__llm_runtime_api_key__`).
- Subsystem-scoped keys: `subsystem-purpose` (e.g.
  `prompt-templates`, `custom-themes`, `harness-bundles`).

---

## LLM runtime

| Key | Storage | Shape | Notes |
| --- | --- | --- | --- |
| `__llm_runtime_config__` | KV (general) | `{ provider, baseUrl, defaultModel, … }` | Excludes `apiKey`. Layered under `runtime.config.json` defaults. See [LLM Runtime](LLM-Runtime). |
| `__llm_runtime_api_key__` | KV (**secure**) | `string` | Written via `kvStore.setSecure()`. **Never** falls back to `localStorage`. |

---

## App shell

| Key | Shape | Notes |
| --- | --- | --- |
| `active-tab` | `string` | Validated against `isTabName` — invalid values fall back to `DEFAULT_TAB` |
| `theme` / `active-theme` | `string` | Built-in or custom theme id |
| `custom-themes` | `Theme[]` | User-defined themes |
| `density` | `"comfortable" \| "compact"` | |
| `animation-level` | `"full" \| "reduced" \| "off"` | |
| `prefetch-enabled` | `boolean` | |

---

## Chat

| Key | Shape | Notes |
| --- | --- | --- |
| `conversations` | `Conversation[]` | List metadata; bodies stored separately for large convos |
| `conversation:{id}` | `Conversation` | Single-conversation override / cache |
| `prompt-templates` | `PromptTemplate[]` | Built-in + user-defined |
| `chat-search-history` | `string[]` | Local search-bar history |

---

## Agents

| Key | Shape | Notes |
| --- | --- | --- |
| `agents` | `Agent[]` | All agents |
| `agent-runs` | `AgentRun[]` | Run history (rolled / capped) |
| `agent-feedback` | `AgentFeedback[]` | Per-run thumbs + free text |
| `agent-learning-metrics` | `AgentLearningMetrics` | Aggregated learning state |
| `learning-insights` | `LearningInsight[]` | Surfaced in Learning Insights Panel |
| `agent-versions` | `AgentVersion[]` | Version history per agent |
| `agent-schedules` | `AgentSchedule[]` | Per-agent schedule rules |

---

## Workflows

| Key | Shape | Notes |
| --- | --- | --- |
| `workflows` | `Workflow[]` | All workflows |
| `workflow-runs` | `WorkflowExecution[]` | Run history |
| `workflow-templates-installed` | `string[]` | Which templates the user has cloned |

---

## Models

| Key | Shape | Notes |
| --- | --- | --- |
| `model-configs` | `Record<modelId, ModelConfig>` | Per-model param overrides |
| `gguf-library` | `GGUFModel[]` | Local catalog |
| `huggingface-search-cache` | `HuggingFaceModel[]` | Recent HF queries |
| `fine-tuning-datasets` | `FineTuningDataset[]` | |
| `fine-tuning-jobs` | `FineTuningJob[]` | |
| `quantization-jobs` | `QuantizationJob[]` | |
| `performance-profiles` | `PerformanceProfile[]` | Custom profiles |
| `active-performance-profile` | `string` | Currently applied profile id |
| `hardware-scan-result` | `HardwareScanResult` | Last scan output |

---

## Cost

| Key | Shape | Notes |
| --- | --- | --- |
| `cost-entries` | `CostEntry[]` | One per model call |
| `budgets` | `Budget[]` | Active budget rules |
| `pricing-overrides` | `Record<modelId, Pricing>` | User-supplied pricing |

---

## Harness

| Key | Shape | Notes |
| --- | --- | --- |
| `harnesses` | `HarnessManifest[]` | Installed harnesses |
| `custom-tools` | `CustomTool[]` | Tools registered from harnesses |
| `harness-bundles` | `BundleManifest[]` | Auto-update tracking |

---

## Notifications

| Key | Shape | Notes |
| --- | --- | --- |
| `notifications` | `Notification[]` | History feed |
| `notification-prefs` | `{ … }` | Per-trigger toggles, quiet hours |

---

## Offline / sync

| Key | Shape | Notes |
| --- | --- | --- |
| `offline-queue` | `QueuedAction[]` | Survives reload via IDB |
| `sync-status` | `{ lastFlush, errors }` | |

---

## App settings (catch-all)

| Key | Shape | Notes |
| --- | --- | --- |
| `app-settings` | `AppSettings` | The omnibus settings object — incognito mode, retention, confirmations, etc. |
| `feature-flags` | `Record<string, boolean>` | Internal toggles |

---

## Diagnostics

| Key | Shape | Notes |
| --- | --- | --- |
| `mobile-debug-logger:logs` | `LogEntry[]` | Capped circular buffer |
| `pre-mount-error-capture` | `Error[]` | Errors before React mounts |

---

## See also

- [State & Persistence](State-and-Persistence)
- [LLM Runtime](LLM-Runtime)
- [Settings](Settings) — the user-facing panels these keys back
- Source of truth: `src/lib/types.ts`, `src/lib/workflow-types.ts`
