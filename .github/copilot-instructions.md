# Copilot / Agent Instructions

Project context for the GitHub Copilot coding agent and any other AI agent
working in this repository. Following these conventions makes agent PRs
land cleanly through the protected-branch + auto-merge flow without churn.

## Project at a glance

- **TrueAI LocalAI** — a local-first AI assistant platform.
- Web app: **React + TypeScript + Vite + Tailwind + shadcn/ui**, framer-motion.
- Native mobile: **Capacitor 8** wrapping the web app for **Android**
  (`android/`).
- Local LLM runtime under `src/lib/llm-runtime/`; mobile/native abstractions
  under `src/lib/native/`.
- License: MIT, with mandatory attribution preservation — see
  [`NOTICE`](../NOTICE) and [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Toolchain (must match exactly)

| Tool | Version | Why |
|---|---|---|
| Node.js | **24** | `package-lock.json` was generated with Node 24/npm 11 and includes optional native-binary entries (`lightningcss-*`, `@rollup/rollup-*`, `fsevents`). Older Node fails `npm ci`. |
| npm | **11** (bundled with Node 24) | Same as above. |
| JDK | **Temurin 21** | Capacitor 8 / `capacitor-android` is compiled with `--release 21`. JDK 17 fails `compileDebugJavaWithJavac` with "invalid source release: 21". |

`copilot-setup-steps.yml` pre-installs all of the above. If you're running
shell commands in the agent sandbox, set `JAVA_HOME` per command:

```bash
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 ./android/gradlew ...
```

## Build, lint, test commands

| Task | Command |
|---|---|
| Install deps | `npm ci` |
| **Dev build** (`__APP_DEBUG__=true`) | `npm run build:dev` |
| Production build (`__APP_DEBUG__=false`) | `npm run build` |
| Lint | `npm run lint` |
| Unit tests | `npm test` (if defined in `package.json`) |
| Android debug APK | `npm run android:build` |
| Android release APK | `npm run android:build:release` |

Debug Android workflows (`.github/workflows/android.yml`) use `build:dev`;
release workflows (`build-android.yml`, `release.yml`) use `build`.

## Conventions you MUST follow

### Dependency overrides
`package.json` `overrides` block pins transitive deps past CVE-fixed
versions: `path-to-regexp ^8.4.0`, `postcss ^8.5.10`, `lodash ^4.17.24`,
`brace-expansion@1 ^1.1.13`. **Do not weaken these pins.**

### Credential storage
- LLM API key is persisted under `__llm_runtime_api_key__` via
  `secureStorage` (Capacitor Preferences on native, IndexedDB on web).
  **Never** via `localStorage`.
- The main config blob `__llm_runtime_config__` excludes `apiKey`.
- `kvStore.setSecure()` does its own inline IndexedDB write and **must not**
  delegate to `idbSet` — `idbSet` falls through to `localStorage` on
  transaction failure, which would leak credentials. There's a regression
  test in `src/lib/llm-runtime/kv-store.test.ts`; keep it passing.

### State persistence
App-wide UI state is persisted via `useKV` from `@github/spark/hooks`
(aliased to local shims in `vite.config.ts`). Validate stored values
against a known set so renamed/removed options fall back cleanly — see
the `isTabName` guard around `useKV<string>('active-tab', DEFAULT_TAB)`
in `src/App.tsx`.

### Native mobile abstractions
All native capabilities live in `src/lib/native/` (`platform`,
`secure-storage`, `network`, `clipboard`, `share`, `haptics`,
`app-lifecycle`, `notifications`, `filesystem`). Each module branches on
`isNative()` and falls back to a web API. Import via `@/lib/native`
(barrel) or specific files. Bootstrap via the side-effect import of
`@/lib/native/install` from `main.tsx`.

### Runtime config
`runtime.config.json` MUST live in `public/` so Vite copies it into `dist/`
and `cap sync` includes it in the APK. The app fetches `/runtime.config.json`
at runtime.

### LLM runtime config layering
Hard-coded defaults < `public/runtime.config.json` `llm` block < KV key
`__llm_runtime_config__` (set by Settings → LLM Runtime UI).

### Release process
- **One-shot bump + tag:** Actions → *Release Bump (Tag)* (`release-bump.yml`)
  — bumps `package.json`, Android `versionCode`/`versionName`, prepends a
  CHANGELOG entry, commits, tags `vX.Y.Z`, pushes both.
- **Tag-only (version already committed):** Actions → *Tag Release*
  (`tag-release.yml`).
- Both workflows run as `github-actions[bot]` and require the bot to be in
  the bypass list of `protect-default-branch.json` and
  `protect-release-tags.json` (see `.github/rulesets/README.md`).

## Governance — what your PR must NOT do

The default branch and `v*` tags are protected by GitHub Rulesets. PRs that
violate these rules will be auto-rejected (see
[`CONTRIBUTING.md`](../CONTRIBUTING.md) for the full list):

- ❌ Modify `LICENSE` or `NOTICE`.
- ❌ Strip in-source `Copyright (c) 2024-2026 Skyler Jones ("smackypants") /
  Advanced Technology Research` headers.
- ❌ Edit anything under `.github/**` unless the task explicitly asks for it.
- ❌ Weaken `package.json` `overrides` pins.
- ❌ Add telemetry, analytics, or third-party network calls. This project
  is local-first by design.
- ❌ Disable or bypass CodeQL, Android CI, or any required status check.
- ❌ Use `git push --force` against `main` (blocked by ruleset anyway).

## Definition of done for an agent PR

1. `npm ci` succeeds.
2. `npm run build:dev` succeeds.
3. Any related unit tests pass.
4. `Analyze (javascript-typescript)`, `Analyze (java-kotlin)`, and
   `Android CI` status checks pass on the PR.
5. CODEOWNERS reviewer (`@smackypants`) approves.
6. All review threads resolved.
7. Auto-merge (squash) takes it from there.

## Continuous learning — read this on every task

This repo accumulates lessons learned across PRs in
[`.github/copilot/LEARNINGS.md`](./copilot/LEARNINGS.md). It's
auto-appended by `.github/workflows/learnings-ingest.yml` whenever a
PR is merged into `main`, parsing the `## Lessons learned` section
out of each PR body.

**Before starting any non-trivial task**, read `LEARNINGS.md`. Treat
every entry there as a hard constraint unless your task explicitly
overrides it. Entries are dated; newer entries supersede older ones
on the same subject.

**Before opening your PR**, fill in the `## Lessons learned` section
of `.github/PULL_REQUEST_TEMPLATE.md` with any non-obvious decisions,
gotchas, or new conventions your work uncovered. Keep entries short
(one to three bullet points) and actionable. The ingest workflow
will pick them up automatically — no manual edit of `LEARNINGS.md`
needed.

If your task makes a previous learning *obsolete* (e.g. a tool was
removed, a convention changed), say so explicitly in the
`## Lessons learned` section using the marker `SUPERSEDES:` followed
by the original entry's title — the ingest workflow will record the
supersession so future agents know which entry now applies.

## Auto-fix issue contract

Several GitHub Actions workflows automatically create GitHub Issues and assign
them to the Copilot coding agent (`@copilot`) when scanners or CI detect a
defect. This section defines the contract the agent MUST follow when working
on those issues.

### Recognising auto-generated fix issues

An issue is an auto-generated fix task when **all** of the following are true:

- It carries the label `copilot-fix`.
- The title starts with one of: `[CodeQL`, `[Auto]`, `[Audit]`, `[Security]`.
- The body contains a "Bug type" row with one of:
  `codeql-alert`, `lint-error`, `test-failure`, `dependency-vuln`.

### Branch naming convention

Use **exactly** this pattern — do not invent a different name:

| Bug type | Branch name |
|---|---|
| `codeql-alert` | `copilot/fix-codeql-{alert-number}-{rule-id-slug}` |
| `lint-error` | `copilot/fix-audit-lint-{YYYY-MM-DD}` |
| `test-failure` | push to the **existing** PR branch listed in the issue body — do NOT open a new branch |
| `dependency-vuln` | `copilot/fix-dep-{package-name}-{new-version}` |
| `other` | `copilot/fix-{issue-number}-{short-slug}` |

### Required checks before opening the PR

Run these in order and verify each passes before pushing or marking the PR
ready for review:

```bash
npm ci
npm run lint          # must exit 0 — zero errors
npm run build:dev     # must succeed (tsc + vite)
npm test              # must pass — no newly failing tests
```

If any command fails, fix the failure before proceeding. Do not open a PR
that you know fails CI — it wastes a CI slot and creates noise.

### PR description requirements

- Reference the triggering issue with `Closes #NNN` so it auto-closes on merge.
- Fill in the `## Lessons learned` section of the PR template with any
  non-obvious decisions, gotchas, or new conventions the fix uncovered.
- If the fix supersedes a previous learning in `LEARNINGS.md`, prefix the
  entry with `SUPERSEDES: <original title>`.

### CodeQL gate

The fix must not introduce **any new CodeQL alerts**. The
`Analyze (javascript-typescript)` and `Analyze (java-kotlin)` checks are
required status checks on `main`; a new alert that reaches the Security tab
counts as a regression even if CodeQL doesn't fail the PR build outright.

### Hard constraints (never violate these)

- **Do not weaken `package.json` overrides pins** — `path-to-regexp`,
  `postcss`, `lodash`, `brace-expansion@1`. For dependency vulns, either
  tighten the pin or upgrade the direct dependency; never remove a pin.
- **Do not add telemetry, analytics, or third-party network calls.**
- **Do not modify `LICENSE` or `NOTICE`.**
- **Do not strip copyright headers.**
- **Do not touch `.github/**` files** unless the issue explicitly asks for it.

### Minimal-change principle

Fix only what the issue describes. Do not refactor unrelated code, rename
variables, or reformat files outside the changed lines. The smaller the diff,
the faster the review and the lower the risk of introducing a regression.

---

## Recommended Copilot model

This repo's recommended coding-agent model is **`claude-opus-4.7`**
(the latest, largest Anthropic flagship in GitHub Copilot). When you
trigger an agent task on this repo from the Copilot UI, pick
`claude-opus-4.7` from the model dropdown. Acceptable fallbacks, in
priority order: `claude-opus-4.5`, `claude-sonnet-4.6`, `gpt-5.4`,
`gpt-5.5`, `gpt-5.3-codex`, `gemini-2.5-pro`. See
[`.github/copilot/AGENT_RUNTIME.md`](./copilot/AGENT_RUNTIME.md) for
the full rationale and the owner-only toggles (runner size, firewall,
environments).
