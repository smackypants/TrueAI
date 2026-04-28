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
- ❌ Strip in-source `Copyright (c) 2024-2026 smackypants / Advanced
  Technology Research` headers.
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
