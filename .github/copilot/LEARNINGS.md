# Project learnings — auto-curated agent memory

> **Read this file at the start of every non-trivial task.**
>
> This is the canonical, append-only knowledge log for the TrueAI
> LocalAI repo. New entries are added automatically by
> `.github/workflows/learnings-ingest.yml` when a PR is merged into
> `main`, by parsing the `## Lessons learned` section of the PR
> body. Manual edits are allowed but discouraged — prefer adding the
> lesson to your PR body so it's tied to a specific change.
>
> **Format:** newest entries first. Each entry has a date, a short
> title, the PR / commit it came from, and one to three bullet
> points. An entry tagged `SUPERSEDES:` replaces an older entry of
> the same title.

---

## 2026-04-28 — PR #39: Fix Vite dynamic-import warning and silence kv-store stderr noise in tests

_Source: [https://github.com/smackypants/trueai-localai/pull/39](https://github.com/smackypants/trueai-localai/pull/39) · merged dc22b77955b0 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Fix Vite dynamic-import warning and silence kv-store stderr noise in tests_.

---

## 2026-04-28 — PR #37: Agent runtime, auto-learning loop, and release scaffolding for hands-off operation

_Source: [https://github.com/smackypants/trueai-localai/pull/37](https://github.com/smackypants/trueai-localai/pull/37) · merged 1d2cca453c0c · author @Copilot_

- (No explicit lessons recorded.) PR title: _Agent runtime, auto-learning loop, and release scaffolding for hands-off operation_.

---

## 2026-04-28 — seed

Seeded from the conventions already enforced in `copilot-instructions.md`,
`CONTRIBUTING.md`, and prior agent-session memories. Source: this PR.

### Toolchain (hard requirement)
- Node 24 / npm 11. `package-lock.json` carries optional native
  binaries (`lightningcss-*`, `@rollup/rollup-*`, `fsevents`) that
  older Node versions strip; CI fails with "Missing: lightningcss-*
  from lock file" otherwise.
- Temurin JDK 21. JDK 17 fails `compileDebugJavaWithJavac` with
  "invalid source release: 21" because capacitor-android is
  compiled with `--release 21`.
- Local Android builds need `JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64`
  set per command (sync bash sessions don't persist env vars).

### Build modes
- Dev build: `npm run build:dev` (`tsc -b && vite build --mode development`,
  sets `__APP_DEBUG__=true`).
- Production build: `npm run build` (`__APP_DEBUG__=false`).
- Debug Android workflows use `build:dev`; release workflows use `build`.

### Credential storage
- LLM API key persists under `__llm_runtime_api_key__` via
  `secureStorage` (Capacitor Preferences on native, IndexedDB on
  web). **Never** via `localStorage`.
- The main config blob `__llm_runtime_config__` excludes `apiKey`.
- `kvStore.setSecure()` does its own inline IndexedDB write and
  **must not** delegate to `idbSet` — `idbSet` falls through to
  `localStorage` on transaction failure, which would leak credentials.
  Regression test in `src/lib/llm-runtime/kv-store.test.ts`.

### Dependency overrides (do not weaken)
`package.json` `overrides` pins past CVE-fixed versions:
`path-to-regexp ^8.4.0`, `postcss ^8.5.10`, `lodash ^4.17.24`,
`brace-expansion@1 ^1.1.13`. Weakening these is a hard PR-rejection.

### Native mobile abstractions
All native capabilities live in `src/lib/native/` (`platform`,
`secure-storage`, `network`, `clipboard`, `share`, `haptics`,
`app-lifecycle`, `notifications`, `filesystem`). Each module branches
on `isNative()` and falls back to a web API. Bootstrap via the
side-effect import of `@/lib/native/install` from `main.tsx`.

### Runtime config
`runtime.config.json` MUST live in `public/` so Vite copies it into
`dist/` and `cap sync` includes it in the APK. The app fetches
`/runtime.config.json` at runtime.

### LLM runtime config layering
Hard-coded defaults < `public/runtime.config.json` `llm` block < KV
key `__llm_runtime_config__` (set by Settings → LLM Runtime UI).

### State persistence
App-wide UI state is persisted via `useKV` from `@github/spark/hooks`
(aliased to local shims via `vite.config.ts`). Validate stored values
against a known set so renamed/removed options fall back cleanly —
see the `isTabName` guard around `useKV<string>('active-tab', DEFAULT_TAB)`
in `src/App.tsx`.

### React hooks
`useIndexedDBCache` returns a new object literal each render; avoid
depending on the whole object in React effect deps (use specific
callbacks/flags instead).

### Governance — paths a PR must not touch unless asked
- `LICENSE`, `NOTICE`
- in-source `Copyright (c) 2024-2026 smackypants / Advanced
  Technology Research` headers
- anything under `.github/**` (unless the task explicitly asks)
- `package.json` `overrides` block

### Local-first invariants
- No telemetry, analytics, or third-party network calls.
- No CodeQL / Android CI / required-status-check bypasses.
- No `git push --force` against `main` (blocked by ruleset anyway).

### Release flow
- One-shot bump + tag + APK build: Actions → **Publish Release
  (Bump → Tag → APKs)** (`publish-release.yml`).
- Tag-only when version already committed: Actions → **Tag Release**
  (`tag-release.yml`).
- Both run as `github-actions[bot]` and require it in the bypass
  list of `protect-default-branch.json` and `protect-release-tags.json`.

### Definition of done for an agent PR
`npm ci` ✓ → `npm run build:dev` ✓ → tests ✓ → CodeQL JS/TS ✓ →
CodeQL Java/Kotlin ✓ → Android CI ✓ → CODEOWNERS approval → all
threads resolved → auto-squash-merge.
