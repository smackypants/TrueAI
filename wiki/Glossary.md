# Glossary

> The terms that come up across the docs and codebase.
>
> *Audience: both · Last reviewed: 2026-05-02*

---

**Agent**
A goal-directed loop in TrueAI: plan → call tool → observe →
repeat until the goal is met. Configured with a goal, a list of
tools, and parameters. See [Agents](Agents).

**Auto-fix issue**
An issue automatically opened by one of the auto-fix workflows
(`codeql-autofix.yml`, `auto-lint-fix.yml`, etc.) and assigned to
`@copilot`. Carries the `copilot-fix` label. See
[Governance & Rulesets → Auto-fix issue contract](Governance-and-Rulesets#auto-fix-issue-contract-for-ai-agents).

**Capacitor**
The framework that wraps the React web app into an Android APK.
TrueAI uses Capacitor 8. See [Native Layer](Native-Layer).

**CodeQL**
GitHub's static analysis engine. TrueAI runs both
`Analyze (javascript-typescript)` and `Analyze (java-kotlin)` as
required status checks on `main`.

**Confidence threshold**
The minimum learning-engine confidence required for an
auto-optimization recommendation to be applied. Three presets:
CONSERVATIVE, BALANCED, AGGRESSIVE. See
[Analytics](Analytics#auto-optimization--confidence-thresholds).

**Custom tool / Harness**
A user-supplied tool that extends the built-in 14-tool palette,
loaded from a URL or a manifest. Subject to security caveats. See
[Harness System](Harness-System).

**Decision node**
A workflow node that evaluates a condition and routes to one of its
outgoing edges. See [Workflow Engine](Workflow-Engine#decision-conditions).

**Ensemble**
M agents running in parallel on the same goal, with the result
selected by vote / score / best-of-M. See
[Agents → Collaborative & ensemble modes](Agents#collaborative--ensemble-modes).

**F-Droid**
A FOSS-only Android app catalog. TrueAI ships through F-Droid via a
self-hosted repo and (eventually) the upstream catalog. See
[`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md).

**GGUF**
The on-disk model format used by `llama.cpp`-family runtimes
(Ollama, LM Studio, llama-server). Bundles weights, tokenizer,
metadata.

**Harness**
See *Custom tool*.

**IndexedDB**
The browser's structured-data store. TrueAI uses it for both
small KV state (via `useKV`) and large blobs (via `useIndexedDBCache`).
See [State & Persistence](State-and-Persistence).

**KV store**
The thin abstraction (`src/lib/llm-runtime/kv-store.ts`) over
IndexedDB / Capacitor Preferences for small structured state. Has a
`set()` (general) and `setSecure()` (credentials) split. See
[LLM Runtime](LLM-Runtime#secure-kv-invariant).

**llama.cpp**
The C++ inference engine that runs GGUF models. `llama-server` is
its OpenAI-compatible HTTP wrapper.

**Manifest (harness)**
A JSON file describing a bundle of harness tools — id, name,
parameters, code URL. See
[Harness System → Two ways to install](Harness-System#two-ways-to-install).

**Merge node**
A workflow node that waits for *every* upstream parallel branch to
complete before continuing. See
[Workflow Engine](Workflow-Engine#parallel-and-merge).

**Ollama**
A friendly local LLM runtime (`ollama serve`). Default suggested
provider in TrueAI for first-time users. https://ollama.com

**OpenAI-compatible**
The de-facto API surface for hosted and local LLM servers
(`POST /v1/chat/completions`, `GET /v1/models`). TrueAI talks this
protocol natively.

**Performance profile**
A bundle of runtime knobs (chunk size, prefetch radius, animation
level, IDB cap, concurrent agent runs) tuned for a hardware class.
Three built-in profiles: Conservative, Balanced, Aggressive. See
[Hardware Optimizer](Hardware-Optimizer).

**Prefetch**
Idle-time loading of the JS chunk and data for a tab the user is
about to open. Disabled on metered / Save-Data connections. See
[Performance → Prefetching](Performance#prefetching).

**Prompt template**
A reusable prompt scaffold inserted into the chat input with one
click. Distinct from agent *templates*. See
[Chat → Prompt Templates](Chat#prompt-templates).

**PWA**
Progressive Web App. TrueAI is installable as a PWA on the web; on
Android, the same UX is delivered by the Capacitor APK.

**Quantization**
Compressing model weights from 16-bit to lower bit-width (Q4 / Q5 /
Q8 …) to fit smaller hardware, with some quality cost. See
[Models → Quantization](Models#quantization).

**Ruleset (GitHub)**
A server-side branch / tag protection policy. TrueAI's are in
`.github/rulesets/`. See [Governance & Rulesets](Governance-and-Rulesets).

**Service worker**
The script that runs in the browser background and caches the app
shell + handles offline behaviour. See
[Offline & Sync](Offline-and-Sync).

**Spark / spark.* shim**
TrueAI was originally a GitHub Spark template. The `spark.*` API
surface (`spark.kv`, `spark.llm`, `spark.llmPrompt`, `useKV`) is
now implemented locally by shims in `src/lib/llm-runtime/`. See
[LLM Runtime](LLM-Runtime).

**Tool (agent)**
A capability an agent can call (calculator, web_search,
sentiment_analyzer, …). 14 built-in plus harness-provided ones. See
[Tools Reference](Tools-Reference).

**Tool loop**
The plan-act-observe loop that drives an agent to completion. See
[Agent Engine → The loop](Agent-Engine#the-loop).

**`useKV`**
React hook that persists state to the KV store with cross-tab
notification. See [State & Persistence](State-and-Persistence#usekv).

**Vercel AI SDK**
The provider-agnostic LLM SDK TrueAI uses
(`@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google` /
`@ai-sdk/openai-compatible`). Wired in via
`src/lib/llm-runtime/ai-sdk/`. See [LLM Runtime](LLM-Runtime).

**Workflow**
A directed graph of nodes connected by edges, executed by the
workflow runtime. See [Workflows](Workflows).

---

## See also

- [Architecture Overview](Architecture-Overview)
- [End-User FAQ](FAQ-End-User)
- [Developer FAQ](FAQ-Developer)
