# TrueAI Upgrade Plan — Testing, Developer Tooling & Agentic Capabilities

> **Status:** Living document. Official tracker for the multi-PR upgrade series.
> **Owner:** `@smackypants` (CODEOWNERS reviewer for all phases below).
> **Execution rule:** One PR per phase. Each PR must land green
> (`npm run lint`, `npm run build:dev`, `npm test`, `Analyze (javascript-typescript)`,
> `Analyze (java-kotlin)`, `Android CI`) and stay backwards compatible with the
> existing local LLM runtime, `useKV`/`@github/spark/hooks` shim, and
> `src/lib/native/` abstractions. See `.github/copilot-instructions.md` for the
> project's hard governance constraints.

---

## 1. Guiding constraints (apply to every phase)

- **Local-first.** No mandatory third-party network calls, no telemetry, no
  analytics. Hosted LLM providers stay opt-in and dynamically imported (the
  pattern already established in `src/lib/llm-runtime/ai-sdk/provider-factory.ts`).
- **Toolchain pinned.** Node 24 / npm 11; JDK Temurin 21 for the Capacitor
  Android build. Do not weaken `package.json` `overrides`
  (`path-to-regexp ^8.4.0`, `postcss ^8.5.10`, `lodash ^4.17.24`,
  `brace-expansion@1 ^1.1.13`).
- **Credential storage.** API keys live exclusively under
  `__llm_runtime_api_key__` via `secureStorage` / `kvStore.setSecure`. Never
  `localStorage`. The `setSecure` IDB-failure path must keep silently failing
  (no `lsSet` fallback) — there's a regression test in
  `src/lib/llm-runtime/kv-store.test.ts`.
- **Governance.** Do not modify `LICENSE`, `NOTICE`, copyright headers, or
  `.github/**` unless the phase explicitly requires a CI/CD change.
- **Zero-warning policy.** Each PR adds **zero** new ESLint warnings or
  TypeScript errors over the baseline this document records.

### 1a. Maestro (mobile E2E) — scope clarification

"Maestro" in this plan refers **strictly** to the
[maestro.dev](https://maestro.dev) mobile UI E2E framework. It is used to
automate UI flows and validate user journeys against the Capacitor Android
build (and, optionally later, iOS). It does **not** refer to any AI model,
orchestrator, or any other tool that happens to share the name. Every Maestro
artifact lives under `.maestro/` as YAML flow files, run via `maestro test`.

### 1b. AGPL upstream integration — isolation rule

If any AGPL-licensed upstream tool is integrated, it MUST be:

1. **Out-of-process** (CLI invocation, local HTTP, IPC, or similar standard
   boundary), or
2. **A separate, optional package** (e.g., a sibling repo, or an entry under
   `packages/*` with its own `LICENSE` matching the upstream and its own
   distribution path), never bundled into the primary app deliverables
   (web `dist/`, Android APK/AAB).

Under no circumstance is AGPL source code imported directly into the main
application tree (`src/**`) or linked into the shipped app. This preserves
the project's MIT + mandatory-attribution license model
(`LICENSE`, `NOTICE`, `CONTRIBUTING.md`) and keeps Play Store / F-Droid
distribution unaffected. If a phase requires AGPL integration, the PR must
document the isolation boundary explicitly in its description.

---

## 2. Aspirational coverage targets

The original aspirational quality bar for this codebase is **80 / 80 / 75 / 80**:

| Metric     | Target |
|------------|-------:|
| Statements | 80%    |
| Branches   | 80%    |
| Functions  | 75%    |
| Lines      | 80%    |

These targets are **aspirational**, not enforced via Vitest thresholds yet.
A later phase (Phase 2 below) will introduce the threshold gate at the current
baseline so we ratchet up rather than regress.

### 2a. Baseline coverage (recorded for this plan)

Baseline captured against `origin/main` at commit `5ae6e2e` (Vercel AI SDK
parallel runtime), Node 24.14.1 / npm 11.11.0, via `npx vitest run --coverage`:

| Metric     | Baseline | Target | Gap to target |
|------------|---------:|-------:|--------------:|
| Statements | **63.92%** | 80% | **−16.08 pp** |
| Branches   | **54.81%** | 80% | **−25.19 pp** |
| Functions  | **54.31%** | 75% | **−20.69 pp** |
| Lines      | **66.06%** | 80% | **−13.94 pp** |

**Test corpus at baseline:** 190 test files, **2059 tests passing**, 0 failing.
There is one pre-existing unhandled async error from
`src/components/analytics/PerformanceScanPanel.test.tsx` (post-test render
where `analysis.overallScore` is `undefined`) — it surfaces as a Vitest
"Unhandled error" line in test output (logged but non-blocking; suite still
exits 0) and should be cleaned up in Phase 2 alongside other targeted test
work.

#### Notable per-area baseline (informs Phase 2 prioritisation)

| Area                          | Stmts | Branch | Funcs | Lines |
|-------------------------------|------:|-------:|------:|------:|
| `src/lib/agent/`              | 100   | 88.88  | 100   | 100   |
| `src/lib/llm-runtime/ai-sdk/` | 90.69 | 74.41  | 91.66 | 91.89 |
| `src/lib/llm-runtime/`        | 85.17 | 83.81  | 82.14 | 87.38 |
| `src/lib/native/`             | 81.02 | 74.57  | 93.84 | 82.17 |
| `src/lib/`                    | 85.65 | 72.22  | 87.73 | 86.39 |
| `src/hooks/`                  | 89.25 | 78.49  | 91.81 | 91.71 |
| `src/` (top-level: `App.tsx`, `main.tsx`, …) | 25.27 | 18.83 | 9.01 | 30.63 |

The biggest single lever is `src/` top-level (`App.tsx`, `main.tsx`,
`App-Enhanced.tsx`, route shells) — it accounts for the largest absolute
uncovered surface.

---

## 3. Phase plan (one PR per phase)

Phases are ordered so that earlier phases unblock later ones (test
infrastructure before agentic feature work; Maestro scaffolding before any CI
wiring). Adaptive scoping is permitted within each PR — a phase may refactor
or update related config/dependencies if it improves the implementation,
provided backwards compatibility and zero-warning policy hold.

### Phase 1 — Plan + baseline (this PR, doc-only)

- Hard-reset working branch onto `origin/main` so subsequent phases build on
  the already-merged Vercel AI SDK parallel runtime (PR #145).
- Land this `trueai_upgrade_plan.md` as the official tracker, with the
  baseline coverage numbers above and the Maestro/AGPL clarifications.
- **Out of scope:** any code or behaviour change, any new runtime dependency,
  any `.github/**` edit, any `package.json` `overrides` change.
- **Acceptance:** `npm ci`, `npm run lint`, `npm run build:dev`, `npm test`
  all green; `Analyze (javascript-typescript)`, `Analyze (java-kotlin)`,
  `Android CI` pass; CODEOWNERS approval.

### Phase 2 — Vitest coverage gate at baseline + targeted top-level tests

- Add Vitest coverage thresholds in `vitest.config.ts` set to the **current
  baseline** (rounded down) so the suite ratchets up, never down.
- Add `npm run test:coverage:check` script that runs `vitest run --coverage`
  with thresholds enforced.
- Add unit tests targeting the `src/` top-level shells (`App.tsx`,
  `App-Enhanced.tsx`, `main.tsx`) which currently sit at ~25%/30% — the
  largest absolute lever toward the 80/80/75/80 target.
- Fix the pre-existing `PerformanceScanPanel.test.tsx` unhandled-error noise.
- **Acceptance:** baseline thresholds pass; ≥+5pp on `src/` Stmts/Lines;
  zero new lint warnings.

### Phase 3 — Maestro E2E scaffolding for Capacitor Android

- Add `.maestro/` directory with initial flows: app launch, primary tab
  navigation, settings open, LLM-runtime config screen reachable. YAML only,
  no AI-generated content in flows.
- Add `npm run e2e:android` helper that runs `maestro test .maestro/` against
  a debug APK (`android:build`). Maestro is invoked as an external CLI; no
  npm dependency added.
- Document local setup (Maestro CLI install, Android emulator) in
  `docs/MAESTRO_E2E.md`.
- **Out of scope:** wiring Maestro into GitHub Actions (deferred — would
  require `.github/**` edit and an Android emulator runner).
- **Acceptance:** flows run locally against a debug build; docs explain how
  to reproduce; no runtime/app-side changes.

### Phase 4 — Developer tooling sweep (Web + Native)

Pick a tight scope to keep the PR reviewable:
- `npm run typecheck` script (`tsc --noEmit -p tsconfig.json`) so TS errors
  surface independently of `vite build`.
- `npm run lint:fix` script.
- One dead-code/dependency-hygiene tool — `knip` **or** `depcheck` (one of
  them, not both), wired as `npm run check:deps`, run manually for now.
  Selection guidance: prefer `knip` for this repo (TS-aware, understands
  `tsconfig.json` paths, surfaces unused exports as well as unused deps);
  fall back to `depcheck` only if `knip`'s config overhead proves
  disproportionate.
- Android side: Gradle wrapper sanity script (`scripts/android-doctor.sh`)
  that verifies JDK 21 + Android SDK before invoking `./gradlew`.
- **Acceptance:** scripts run green on `main`; zero new runtime deps; no
  `.github/**` edit.

### Phase 5 — Agentic capability extension on `ToolLoopAgent`

Build on the existing Vercel AI SDK integration
(`src/lib/llm-runtime/ai-sdk/`, `src/lib/agent/tool-loop-agent.ts`):

- Introduce a **local-first tool registry** (`src/lib/agent/tool-registry.ts`)
  that allows tools to be registered with explicit `requiresNetwork` /
  `requiresCredential` flags. Network-bound tools must be opt-in and gated
  on a `secureStorage`-backed credential check; the registry refuses to
  expose them otherwise.
- Wire 2–3 zero-network "safe" built-in tools (e.g., `currentTime`,
  `mathEval`, `kvStoreLookup` for non-secure keys only) so the registry has
  real coverage and an end-to-end happy path.
- Unit tests covering: registry registration/dedup, network-gating refusal
  when no credential is present, secret leak regression (mirrors the
  existing api-key-leak regression test pattern).
- **Acceptance:** ToolLoopAgent runs unchanged when no tools are registered
  (full backwards compatibility); coverage on `src/lib/agent/` stays at 100%
  Stmts/Funcs/Lines and ≥90% Branch.

### Phase 6 — Web-side smoke tests mirroring the Maestro flows

- Add Playwright (devDependency only) with a minimal smoke suite that mirrors
  the `.maestro/` flows from Phase 3, run against the Vite dev server.
- `npm run e2e:web` script; no CI wiring in this PR.
- **Acceptance:** flows run locally; no impact on production bundle; no
  `.github/**` edit.

### Phase 7 — CI wiring (single explicit PR, the only phase touching `.github/**`)

- Add Maestro (Phase 3) and Playwright (Phase 6) jobs to existing workflows,
  gated as `continue-on-error: true` initially so they don't block merges
  while flake is being characterised.
- Promote the Vitest threshold gate from Phase 2 into a required check.
- **Acceptance:** existing required checks unchanged in behaviour;
  CODEOWNERS approval; no governance bypass.

### Phase 8 — Optional AGPL upstream integration (only if/when needed)

- Per §1b, integrated strictly out-of-process or as a separate package.
- PR description must explicitly call out the isolation boundary
  (CLI / local HTTP / IPC) and confirm no AGPL code enters `src/**` or any
  shipped app artifact (web `dist/`, Android APK/AAB).
- If structural conflict arises, **stop and ask** before proceeding.

---

## 4. How this tracker is updated

- After each phase merges, the next agent updates §3 with a checked-off
  status line and any deltas to baseline coverage in §2a.
- The 80/80/75/80 target row in §2 is **never** lowered. Thresholds in
  Phase 2 may only ratchet up.
- Lessons learned per PR continue to flow through `## Lessons learned` →
  `.github/copilot/LEARNINGS.md` via the existing ingest workflow.
