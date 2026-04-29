# Test Coverage Summary

> **Status:** living document, refreshed alongside PRs that add tests.
> Numbers below come from `npm run test:coverage` (vitest + v8).

## Current snapshot

_As of 2026-04-29 (post Phase 2 — root `ErrorFallback.tsx` + `ThemeSwitcher`)._

| Metric | Value | Δ vs. Phase 1 |
|---|---|---|
| Test files | **123** | +11 |
| Tests | **1477** | +154 |

`src/ErrorFallback.tsx` went from **0% → ~100% lines** in this slice.
The new `src/ErrorFallback.test.tsx` exercises the DEV-mode rethrow,
the placeholder/loaded states, every action button (Try Again, Reload,
Copy, Share, Download, Report on GitHub), the conditional Share /
GitHub buttons, and all three branches of the automatic background
submission (`submitted`, `network-error`, silent reasons such as
`disabled` / `duplicate`).

`src/components/settings/ThemeSwitcher.tsx` (847 lines) went from **0%**
to broad coverage via the new `ThemeSwitcher.test.tsx` (16 tests). It
covers default-theme rendering, activate / preview / exit-preview, the
Create dialog (validation, success, cancel, base-theme selection),
delete (default-theme guard + custom-theme removal + active-id clear),
export (Blob download), Copy CSS (success + failure via `copyText`),
import file-picker invocation, and the editor save / cancel paths.

`npm test` and `npm run test:coverage` both pass cleanly. Coverage reports
are written to `coverage/` (`text`, `json`, `html`, `lcov`).

## Testing infrastructure

- **Runner:** Vitest 4 (`npm test`, `npm run test:ui`, `npm run test:coverage`)
- **Environment:** jsdom 29 (`vitest.config.ts`)
- **Libraries:** `@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/jest-dom`, `fake-indexeddb`, `happy-dom`
- **Coverage provider:** `@vitest/coverage-v8`
- **Global setup:** [`src/test/setup.ts`](src/test/setup.ts) mocks
  `matchMedia`, `IntersectionObserver`, `ResizeObserver`, and the global
  `spark` shim. **`indexedDB` is intentionally NOT mocked** — see the
  comment block in `setup.ts` for the rationale; tests that need IDB
  install their own.

## Conventions enforced across tests

These are codified in [`.github/copilot/LEARNINGS.md`](.github/copilot/LEARNINGS.md)
and as agent memories. New tests must follow them:

- Query DOM via stable `data-slot` attributes (button, switch, checkbox,
  card, skeleton, progress, …) instead of Tailwind class selectors.
- Add `aria-label` to icon-only `<Button>` triggers; query with
  `getByRole('button', { name: /…/ })`. Radix `Tooltip` adds
  `aria-describedby`, **not** an accessible name.
- Radix `Dialog` / `Select` / `Popover` / `DropdownMenu` content renders
  in a portal — query via `screen.*` or `document.body.querySelector`.
- With `vi.useFakeTimers()`, **do not** pass `advanceTimers:` to
  `userEvent.setup()`. Advance manually with
  `await act(async () => { vi.advanceTimersByTime(ms) })` and use
  `fireEvent.click()` afterwards.
- For `vi.mock` factories that need module-level vars, use `vi.hoisted()`.
- When stubbing `URL.createObjectURL`, `navigator.serviceWorker`, or
  `window.location`, capture the original property descriptor and restore
  it in `afterEach` / `finally`.
- `framer-motion`'s `AnimatePresence` defers DOM removal until exit
  animations finish. In jsdom, assert side effects (e.g. `reload` was
  called) instead of element absence after `setShow(false)`.
- Modules with module-level state and `installed` guards
  (`preMountErrorCapture`, `mobile-debug-logger`, `native/install`) are
  tested via top-level `vi.mock` + per-test `vi.resetModules()` + dynamic
  `import()`. `vi.doMock` inside `it()` bodies is unreliable for these.

## Coverage by area (top level)

Numbers below are line coverage (`% Lines`) from the latest
`npm run test:coverage` run.

| Area | Lines | Notes |
|---|---|---|
| `src/lib` | **86.1%** | Business logic — strongest coverage area. |
| `src/lib/llm-runtime` | 74.5% | `kv-store.ts` has fallback paths still uncovered. |
| `src/lib/native` | **67.4%** *(post Phase 1)* | `install.ts` newly covered (was 0% → 91.1%). |
| `src/hooks` | **91.5%** | Strongest per-area coverage. |
| `src/components/chat` | 72.0% | Some message-bubble + export-dialog branches still uncovered. |
| `src/components/cost` | 80.9% | |
| `src/components/notifications` | 41.9% | `NotificationCenter`, `OfflineQueuePanel`, `CacheManager`, `PerformanceIndicator` untested. |
| `src/components/settings` | 15.0% | Most settings panels untested; `ThemeSwitcher.tsx` newly covered (was 0%). |
| `src/components/agent` | low | Only `AgentCard`, `AgentQuickActions`, `AgentStepView` covered. |
| `src/components/analytics` | mid | Charts covered; dashboards / panels untested. |
| `src/components/models` | 6.7% | Most model panels untested. |
| `src/components/builder` | 0% | Largest untested area; needs decomposition before unit tests. |
| `src/components/cache` | 0% | |
| `src/components/harness` | 0% | |
| `src/components/workflow` | 0% | High-risk per LEARNINGS PR #58. |
| `src/components/ui` | 22.8% | shadcn primitives — only the value-add wrappers warrant tests. |
| `src/App.tsx` / `App-Enhanced.tsx` / `main.tsx` / root `ErrorFallback.tsx` | 0% | App shell — Phase 2 target. |

## Phased roadmap (in progress)

| Phase | Scope | Status |
|---|---|---|
| 0 | Capture baseline coverage | ✅ done |
| 1 | Cover the last `src/lib/**` gap (`native/install.ts`) | ✅ done |
| 2 | App shell — `App.tsx`, `App-Enhanced.tsx`, `main.tsx`, root `ErrorFallback.tsx` | 🟡 in progress (`ErrorFallback.tsx` ✅) |
| 3.1 | Workflow components | ⏳ planned |
| 3.2 | Agent components (11) | ⏳ planned |
| 3.3 | Analytics components (7) | ⏳ planned |
| 3.4 | Models components (10) | ⏳ planned |
| 3.5 | Settings components (7) | ⏳ planned |
| 3.6 | Notifications components (4) | ⏳ planned |
| 3.7 | Cache, Harness, root-level Performance / Prefetch | ⏳ planned |
| 4 | Builder — smoke tests + decomposition tracking issue | ⏳ planned |
| 5 | Selective UI primitives (value-add wrappers only) | ⏳ planned |
| 6 | Coverage thresholds in `vitest.config.ts` | ⏳ planned |

Each phase is intentionally one PR-sized batch — matches the merge cadence
of PRs #59 – #66 in `.github/copilot/LEARNINGS.md`.

## Out of scope (deliberately not tested)

- Pure type files: `src/lib/types.ts`, `lib/workflow-types.ts`,
  `lib/app-builder-types.ts`, `vite-end.d.ts`, `*-variants.ts`.
- Re-export barrels: `src/components/ui/index.ts`, `src/lib/native/index.ts`.
- Vendored shadcn primitives that are pure prop-forwarding wrappers around
  Radix (e.g. `accordion`, `aspect-ratio`, `collapsible`, `hover-card`,
  `popover`, `separator`, `scroll-area`, `tooltip`, `sheet`, `drawer`,
  `menubar`, `navigation-menu`, `context-menu`, `breadcrumb`,
  `pagination`, `sonner`). These are upstream-tested.

## Running tests

```bash
# All tests (watch by default)
npm test

# One-shot run
npx vitest run

# With coverage report
npm run test:coverage

# Web UI
npm run test:ui

# Targeted file
npx vitest run src/lib/native/install.test.ts
```
