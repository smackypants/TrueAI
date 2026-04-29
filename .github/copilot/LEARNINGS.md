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

## 2026-04-29 — PR #100: [WIP] Fix TypeScript compile errors on enhance-agent-bug-scanning

_Source: [https://github.com/smackypants/trueai-localai/pull/100](https://github.com/smackypants/trueai-localai/pull/100) · merged c2455c46f794 · author @Codex_

- (No explicit lessons recorded.) PR title: _[WIP] Fix TypeScript compile errors on enhance-agent-bug-scanning_.

---

## 2026-04-29 — PR #111: Complete the 5 PR/release automation recommendations and auto-apply Copilot review suggestions

_Source: [https://github.com/smackypants/trueai-localai/pull/111](https://github.com/smackypants/trueai-localai/pull/111) · merged 8a302c7a4918 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Complete the 5 PR/release automation recommendations and auto-apply Copilot review suggestions_.

---

## 2026-04-29 — PR #109: Repair the failing test suite (1778/1778 green) so coverage runs again

_Source: [https://github.com/smackypants/trueai-localai/pull/109](https://github.com/smackypants/trueai-localai/pull/109) · merged 107ebbb4698c · author @Copilot_

- (No explicit lessons recorded.) PR title: _Repair the failing test suite (1778/1778 green) so coverage runs again_.

---

## 2026-04-29 — PR #104: Improve test coverage for HuggingFace + KV store utilities; stabilize brittle model component tests

_Source: [https://github.com/smackypants/trueai-localai/pull/104](https://github.com/smackypants/trueai-localai/pull/104) · merged f1abb64f12f2 · author @Codex_

- (No explicit lessons recorded.) PR title: _Improve test coverage for HuggingFace + KV store utilities; stabilize brittle model component tests_.

---

## 2026-04-29 — PR #103: test: cover ContextualSuggestionsPanel and smart-layout primitives

_Source: [https://github.com/smackypants/trueai-localai/pull/103](https://github.com/smackypants/trueai-localai/pull/103) · merged 56e753709762 · author @Copilot_

- (No explicit lessons recorded.) PR title: _test: cover ContextualSuggestionsPanel and smart-layout primitives_.

---

## 2026-04-29 — PR #102: test: cover ThemeSwitcher settings component

_Source: [https://github.com/smackypants/trueai-localai/pull/102](https://github.com/smackypants/trueai-localai/pull/102) · merged f213a0c10df1 · author @Copilot_

- Stateful `useKV` mock via `React.useState` is significantly simpler than the `vi.fn(() => [def, vi.fn()])` pattern when a test needs to drive multi-step UI state.
- A Proxy-based `framer-motion` passthrough + Fragment `AnimatePresence` is a reusable recipe for testing animation-heavy components in jsdom.

---

## 2026-04-29 — PR #101: Add comprehensive test coverage for core UI components

_Source: [https://github.com/smackypants/trueai-localai/pull/101](https://github.com/smackypants/trueai-localai/pull/101) · merged 82c993743e2c · author @Claude_

- (No explicit lessons recorded.) PR title: _Add comprehensive test coverage for core UI components_.

---

## 2026-04-29 — PR #76: feat: expand automated bug scanning — fix agent dispatch, add TS check, lint issue dispatch, build CI watch

_Source: [https://github.com/smackypants/trueai-localai/pull/76](https://github.com/smackypants/trueai-localai/pull/76) · merged 9240c2ae13c3 · author @Copilot_

- `github/copilot-swe-agent@v1` is GitHub-internal infrastructure — it is **not** a user-callable action. The Copilot coding agent is triggered by assigning issues to `@copilot`; `copilot-setup-steps.yml` provisions its environment. A `workflow_dispatch` issue-dispatch workflow is the correct pattern for "run the agent on demand".
- When adding a row to a bash heredoc markdown table, embed the value as a shell variable (`${TS_LABEL}`) inside a fixed-width table row string rather than constructing the entire row as a variable — keeps indentation consistent with the surrounding heredoc.
- `workflow_run: workflows: [...]` accepts a list; adding a second workflow name is a one-line expansion that costs nothing in extra complexity.

---

## 2026-04-29 — PR #75: [WIP] Fix unit test failure on explore codebase and fix bugs

_Source: [https://github.com/smackypants/trueai-localai/pull/75](https://github.com/smackypants/trueai-localai/pull/75) · merged 0511f6144575 · author @Copilot_

- (No explicit lessons recorded.) PR title: _[WIP] Fix unit test failure on explore codebase and fix bugs_.

---

## 2026-04-29 — PR #73: Add Copilot cloud agent workflow with connectivity preflight and base-ref fix

_Source: [https://github.com/smackypants/trueai-localai/pull/73](https://github.com/smackypants/trueai-localai/pull/73) · merged 06406a583da7 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Add Copilot cloud agent workflow with connectivity preflight and base-ref fix_.

---

## 2026-04-29 — PR #71: test: fix lint errors and add test coverage for settings and performance components

_Source: [https://github.com/smackypants/trueai-localai/pull/71](https://github.com/smackypants/trueai-localai/pull/71) · merged f749ddb6e74f · author @Copilot_

- (No explicit lessons recorded.) PR title: _test: fix lint errors and add test coverage for settings and performance components_.

---

## 2026-04-29 — PR #70: feat: full automated bug scanning + Copilot agent auto-fix pipeline (Phases 1–8)

_Source: [https://github.com/smackypants/trueai-localai/pull/70](https://github.com/smackypants/trueai-localai/pull/70) · merged cc4bf5a57477 · author @Copilot_

- (No explicit lessons recorded.) PR title: _feat: full automated bug scanning + Copilot agent auto-fix pipeline (Phases 1–8)_.

---

## 2026-04-29 — PR #69: feat: automated bug scanning and Copilot agent auto-fix pipeline (Phases 2–8)

_Source: [https://github.com/smackypants/trueai-localai/pull/69](https://github.com/smackypants/trueai-localai/pull/69) · merged 90ef45960fa8 · author @Copilot_

- The `code_scanning_alert` event never fires if Code Scanning is not enabled in repo settings — the `continue-on-error: true` workaround in `codeql.yml` is load-bearing until the owner completes the UI step.
- `pull_request_target` workflows inherit the permissions of the base branch, which is why `dependabot-auto-merge.yml` uses that trigger — the new `issues: write` permission was added to the existing `permissions` block rather than introducing a new job.
- For `workflow_run` triggers, the `branches` filter matches the HEAD branch of the triggering workflow run (not a base branch), making it suitable for filtering `copilot/**` branches cleanly.

---

## 2026-04-29 — PR #68: test(native): cover install.ts and refresh TEST_COVERAGE_SUMMARY (Phase 0+1)

_Source: [https://github.com/smackypants/trueai-localai/pull/68](https://github.com/smackypants/trueai-localai/pull/68) · merged 14c43821ea9d · author @Copilot_

- `src/lib/native/install.ts` self-installs at import. Tests must use top-level `vi.mock` + `vi.hoisted` for per-test mocks, plus per-test `vi.resetModules()` + dynamic `import()` to reset the `installed` flag. Async side effects gated by `setTimeout` (e.g. `SplashScreen.hide`) require `vi.waitFor(...)` since explicit calls return immediately due to the guard.

---

## 2026-04-29 — PR #67: test: cover Android-specific native paths (installer, install bootstrap, platform fallbacks)

_Source: [https://github.com/smackypants/trueai-localai/pull/67](https://github.com/smackypants/trueai-localai/pull/67) · merged 3d722fb0efa0 · author @Copilot_

- (No explicit lessons recorded.) PR title: _test: cover Android-specific native paths (installer, install bootstrap, platform fallbacks)_.

---

## 2026-04-29 — PR #66: Add test coverage for 15 previously untested components

_Source: [https://github.com/smackypants/trueai-localai/pull/66](https://github.com/smackypants/trueai-localai/pull/66) · merged af9f5a1ea4b0 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Add test coverage for 15 previously untested components_.

---

## 2026-04-29 — PR #63: Add comprehensive component test coverage (847 → 1086 tests)

_Source: [https://github.com/smackypants/trueai-localai/pull/63](https://github.com/smackypants/trueai-localai/pull/63) · merged 0521fbf8a6a9 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Add comprehensive component test coverage (847 → 1086 tests)_.

---

## 2026-04-29 — PR #65: test: add 56 new tests across 7 previously untested components

_Source: [https://github.com/smackypants/trueai-localai/pull/65](https://github.com/smackypants/trueai-localai/pull/65) · merged 0b674e7ed132 · author @Copilot_

- (No explicit lessons recorded.) PR title: _test: add 56 new tests across 7 previously untested components_.

---

## 2026-04-28 — PR #64: test: add coverage for 6 untested components (58 new tests)

_Source: [https://github.com/smackypants/trueai-localai/pull/64](https://github.com/smackypants/trueai-localai/pull/64) · merged 491aa7334c34 · author @Copilot_

- (No explicit lessons recorded.) PR title: _test: add coverage for 6 untested components (58 new tests)_.

---

## 2026-04-28 — PR #61: test: add mobile component tests + fix swipeable-card opacity bug

_Source: [https://github.com/smackypants/trueai-localai/pull/61](https://github.com/smackypants/trueai-localai/pull/61) · merged f003eabd3736 · author @Copilot_

- `framer-motion` `AnimatePresence` defers DOM removal until exit animations complete. In jsdom there is no animation engine, so elements stay in the DOM after `setShow(false)`. Don't assert element absence after state-driven exit; instead verify side effects (`skipWaiting` called, `reload` called).
- `window.location.reload` is not configurable in jsdom. Use `vi.stubGlobal('location', { reload: vi.fn() })` and clean up with `vi.unstubAllGlobals()`.
- `useThrottle` initialises `lastRun = Date.now()` at mount time. With `vi.useFakeTimers()` no real time elapses between `renderHook` and the first invocation, so the throttle blocks the call. Always `vi.advanceTimersByTime(delay + 1)` before the first call in fake-timer throttle tests.

---

## 2026-04-28 — PR #62: feat: mobile debug logger with structured event capture and bug-pattern analysis

_Source: [https://github.com/smackypants/trueai-localai/pull/62](https://github.com/smackypants/trueai-localai/pull/62) · merged 1c4a7020752b · author @Copilot_

- `installMobileDebugLogger()` mirrors the `installPreMountErrorCapture()` pattern: synchronous, returns cleanup, guarded by `_installed` flag, safe against SSR/no-window environments.
- `PerformanceObserver` with `{ type: 'navigation', buffered: true }` captures slow loads that have already fired before the observer was registered — no need to hook `window.addEventListener('load')` separately.
- Storing only non-`undefined` data fields via `...(data !== undefined ? { data } : {})` keeps entries compact; JSON serialisation silently drops `undefined` values inside objects anyway.

---

## 2026-04-28 — PR #60: test: add visual/content component test coverage — chat, VirtualList, AnimatedCard, EnhancedLoader (+ accessibility fixes)

_Source: [https://github.com/smackypants/trueai-localai/pull/60](https://github.com/smackypants/trueai-localai/pull/60) · merged d66b265e0f26 · author @Copilot_

- **Radix UI portals**: Dialog/Select/Popover content renders outside the `container` returned by `render()`. Always use `document.body.querySelector()` or Testing Library's `screen.*` helpers (which search the whole document) when asserting on portal content — `container.querySelector()` will return null.
- **Icon-only button accessibility**: Radix `TooltipContent` provides `aria-describedby` (not `aria-labelledby`) on the trigger, so icon-only buttons wrapped in Tooltip have an empty accessible name unless `aria-label` is added explicitly. Add `aria-label` to all icon-only buttons — it fixes both the accessibility gap and enables `getByRole('button', { name: /.../ })` in tests.
- **Radix Select options in tests**: `SelectItem` options are not in the DOM until the trigger is clicked; portal content may still be inaccessible via `role="option"` in jsdom. Test the selected item's display text via `SelectValue` in the trigger instead of querying the open dropdown.

---

## 2026-04-28 — PR #59: test: add comprehensive coverage for diagnostics, benchmark, serviceWorker, preloader, and pre-mount error capture

_Source: [https://github.com/smackypants/trueai-localai/pull/59](https://github.com/smackypants/trueai-localai/pull/59) · merged cc08560b489b · author @Copilot_

- When testing `preMountErrorCapture` renderFallback via event dispatch, `vi.doMock('./diagnostics', factory)` inside `it()` bodies does NOT reliably intercept the module when `preMountErrorCapture` is freshly imported with `vi.resetModules()` — the mock hangs/times out. The correct pattern is a **separate test file** with `vi.mock('./diagnostics', factory)` at the top level (gets hoisted), combined with per-test `vi.resetModules()` + dynamic `await import('./preMountErrorCapture')` to reset module-level flags (`installed`, `reactMounted`, `fallbackShown`).
- When testing `PromiseRejectionEvent`, always call `.catch(() => {})` on the rejected promise passed to the constructor — otherwise the test environment emits a spurious "Unhandled error" even though the test itself passes.

---

## 2026-04-28 — PR #58: fix: 19 bugs — tab switching, SW updates, agent tools, workflow builder, chat, cost, offline queue, analytics, perf hooks

_Source: [https://github.com/smackypants/trueai-localai/pull/58](https://github.com/smackypants/trueai-localai/pull/58) · merged 0adad30cb130 · author @Copilot_

- (No explicit lessons recorded.) PR title: _fix: 19 bugs — tab switching, SW updates, agent tools, workflow builder, chat, cost, offline queue, analytics, perf hooks_.

---

## 2026-04-28 — PR #57: test: add coverage for use-performance-optimization and llm-runtime/install

_Source: [https://github.com/smackypants/trueai-localai/pull/57](https://github.com/smackypants/trueai-localai/pull/57) · merged eeee71dbae31 · author @Copilot_

- When testing hooks that register `navigator.connection` event listeners, always call `unmount()` before tearing down the navigator stub — cleanup effects re-read the property and will throw if it's already gone.

---

## 2026-04-28 — PR #56: fix(ci): update release.yml to auto-attach APKs to latest release

_Source: [https://github.com/smackypants/trueai-localai/pull/56](https://github.com/smackypants/trueai-localai/pull/56) · merged 37d13754d055 · author @Copilot_

- `release.yml`'s `workflow_dispatch` trigger did not specify `ref:` in the `actions/checkout` step, so manual runs checked out `HEAD` instead of the intended tag. Always resolve the target tag explicitly before checkout when a workflow can be triggered by multiple event types.
- The `release: [published]` event is a reliable safety-net trigger for attaching release artifacts; the `push: tags: v*` event can be silently skipped when the tag is pushed by another workflow (e.g. `release-bump.yml`) rather than by a direct git push.
- For `workflow_dispatch` inputs that have a natural default (e.g., "latest release"), marking them `required: false` with auto-detection via `gh release view` improves usability significantly.

---

## 2026-04-28 — PR #55: test: add coverage for serviceWorker and preMountErrorCapture (0% → meaningful coverage)

_Source: [https://github.com/smackypants/trueai-localai/pull/55](https://github.com/smackypants/trueai-localai/pull/55) · merged 15cee64fa912 · author @Copilot_

- jsdom 29 partially implements `navigator.serviceWorker` — `'serviceWorker' in navigator` is always `true`, but methods like `getRegistrations()` may hang; always stub with a full mock including `getRegistrations: vi.fn().mockResolvedValue([])` when testing SW-adjacent code
- Module-level state in error-capture modules survives `vi.resetModules()` window listeners — avoid dispatching global `ErrorEvent` / `PromiseRejectionEvent` across module-isolation boundaries; test DOM quiescence via timer advancement instead

---

## 2026-04-28 — PR #54: chore(release): bump version to 8.0.0

_Source: [https://github.com/smackypants/trueai-localai/pull/54](https://github.com/smackypants/trueai-localai/pull/54) · merged 2659c7bdf0e1 · author @Copilot_

- (No explicit lessons recorded.) PR title: _chore(release): bump version to 8.0.0_.

---

## 2026-04-28 — PR #52: fix: resolve all lint warnings and lockfile sync issue

_Source: [https://github.com/smackypants/trueai-localai/pull/52](https://github.com/smackypants/trueai-localai/pull/52) · merged c680591b2dd0 · author @Copilot_

- When Capacitor plugin modules are lazily imported via `try/catch` dynamic imports, type the holding variable with `import type { Plugin } from '@capacitor/plugin'` + `| null` instead of `any`. For enum-valued variables (e.g. `Style`, `KeyboardResize`), use `typeof import('@capacitor/status-bar').Style | null` — this gives full enum-member access (`Style.Dark`) without losing type safety.
- A stale `packages/spark-tools` entry with `"extraneous": true` in `package-lock.json` is a pre-existing artefact from when a workspace package was removed; `npm install --package-lock-only` preserves it and `npm ci` ignores it safely.

---

## 2026-04-28 — PR #53: feat(ci): add Full APK Release workflow (bump → signed APKs → GitHub Release → Play/F-Droid)

_Source: [https://github.com/smackypants/trueai-localai/pull/53](https://github.com/smackypants/trueai-localai/pull/53) · merged 4c5117cba9ef · author @Copilot_

- When a new release workflow reuses `release-bump.yml` via `workflow_call`, the tag push from the bump job also triggers `release.yml`'s `on: push: tags: v*` listener. That's harmless because `softprops/action-gh-release` upserts — document this in the orchestrator's header comment so future agents don't treat it as a duplicate-run bug.
- Always `chmod 600` decoded keystore files immediately after writing them to `$RUNNER_TEMP` — default permissions on runner temp are world-readable, exposing signing keys to any co-located process.
- For a production-only signing workflow, treat a missing `ANDROID_KEYSTORE_BASE64` secret as a hard failure (`exit 1`), not a warning — silently falling through to unsigned artifacts defeats the purpose of the workflow.

---

## 2026-04-28 — PR #50: Fix Android and CI builds: lock file sync + Node.js 24 action upgrades

_Source: [https://github.com/smackypants/trueai-localai/pull/50](https://github.com/smackypants/trueai-localai/pull/50) · merged c01b1cef5a97 · author @Copilot_

- `package-lock.json` can go out of sync when a new transitive dependency (`react-is@17.0.2` required by `jest-diff`) is added without regenerating the lock file. Always run `npm install --package-lock-only` under Node 24/npm 11 to keep it in sync after any dependency changes.
- `actions/checkout@v4`, `actions/setup-java@v4`, and `android-actions/setup-android@v3` use the Node.js 20 action runtime which is deprecated. Use `@v5`, `@v5`, and `@v4` respectively for Node.js 24 compatibility.

---

## 2026-04-28 — PR #51: fix: resolve package-lock.json sync issue blocking all CI builds for v7.3.0 release

_Source: [https://github.com/smackypants/trueai-localai/pull/51](https://github.com/smackypants/trueai-localai/pull/51) · merged e374cb1adfc7 · author @Claude_

- (No explicit lessons recorded.) PR title: _fix: resolve package-lock.json sync issue blocking all CI builds for v7.3.0 release_.

---

## 2026-04-28 — PR #48: fix(tests): resolve TypeScript compilation errors blocking Android CI builds

_Source: [https://github.com/smackypants/trueai-localai/pull/48](https://github.com/smackypants/trueai-localai/pull/48) · merged 1181f387b8dc · author @Claude_

- (No explicit lessons recorded.) PR title: _fix(tests): resolve TypeScript compilation errors blocking Android CI builds_.

---

## 2026-04-28 — PR #46: Round-3 follow-up prompt: address out-of-scope review findings on agent-tools, workflow event types, and executeWorkflow deps

_Source: [https://github.com/smackypants/trueai-localai/pull/46](https://github.com/smackypants/trueai-localai/pull/46) · merged b8eb382477a7 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Round-3 follow-up prompt: address out-of-scope review findings on agent-tools, workflow event types, and executeWorkflow deps_.

---

## 2026-04-28 — PR #44: chore(release): bump to v7.0.0

_Source: [https://github.com/smackypants/trueai-localai/pull/44](https://github.com/smackypants/trueai-localai/pull/44) · merged a09fd7c84fb7 · author @Copilot_

- When prepping a release via PR (rather than the one-shot `release-bump.yml`), run `npm install --package-lock-only` after editing `package.json` so the lockfile's top-level `version` stays in sync — `npm ci` doesn't require it, but reviewers will flag the drift.

---

## 2026-04-28 — PR #43: fix(build): drop unused @ts-expect-error unblocking Android build pipeline

_Source: [https://github.com/smackypants/trueai-localai/pull/43](https://github.com/smackypants/trueai-localai/pull/43) · merged b8f3af227479 · author @Copilot_

- A single TS2578 silently breaks the whole Android toolchain because every `android:*` script chains through `build:dev` / `build`. `npm test` alone won't catch it — vitest's transpiler is more permissive than `tsc -b`. Validate Android changes with `npm run build:dev`.
- When a `@ts-expect-error` becomes unused after upstream type changes, delete it; don't reintroduce a wrong cast to keep the directive "valid".

---

## 2026-04-28 — PR #42: Real workflow execution + replace simulated agent-tools with real I/O or fail-closed

_Source: [https://github.com/smackypants/trueai-localai/pull/42](https://github.com/smackypants/trueai-localai/pull/42) · merged b28b2c2b1ca8 · author @Copilot_

- Simulated agent-tools weren't just "fake" — they actively misled the agent loop's final-summary LLM call into summarising plausible-looking lies. Fail-closed is strictly better than fabricated success when no provider is configured.
- Workflow execution belongs in a pure `runWorkflow(workflow, deps)` module, not inline in `App.tsx`. The React wrapper becomes a state-persistence + cost-tracking shim and the engine gets full unit coverage without a render harness.
- `api_caller` needs HTTPS-only even in a local-first app — the tool explicitly hits the network and `http://localhost` is one prompt-injection away from SSRF against developer/native services.
- The existing `Agent` type uses `systemPrompt` (not `instructions`); `WorkflowAgent` mirrors that name 1:1 to keep the mapping obvious.

---

## 2026-04-28 — PR #41: Add tests for under-covered LLM runtime, native, and hook modules

_Source: [https://github.com/smackypants/trueai-localai/pull/41](https://github.com/smackypants/trueai-localai/pull/41) · merged e538fb68e678 · author @Copilot_

- (No explicit lessons recorded.) PR title: _Add tests for under-covered LLM runtime, native, and hook modules_.

---

## 2026-04-28 — PR #40: Wire toolExecutor into runAgent and activate cost auto-tracking

_Source: [https://github.com/smackypants/trueai-localai/pull/40](https://github.com/smackypants/trueai-localai/pull/40) · merged 34f2b8b1c97a · author @Copilot_

- (No explicit lessons recorded.) PR title: _Wire toolExecutor into runAgent and activate cost auto-tracking_.

---

## 2026-04-28 — PR #38: F-Droid: integrate and deploy via self-hosted repo + upstream catalog

_Source: [https://github.com/smackypants/trueai-localai/pull/38](https://github.com/smackypants/trueai-localai/pull/38) · merged d245bae6a94c · author @Copilot_

- (No explicit lessons recorded.) PR title: _F-Droid: integrate and deploy via self-hosted repo + upstream catalog_.

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
