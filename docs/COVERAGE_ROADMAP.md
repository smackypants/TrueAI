# Coverage & Release-Readiness Roadmap

This is the durable tracking artifact for the **Master Plan — Path to 100%
coverage, zero-bug, deploy-ready Android release**. It mirrors the
phase-by-phase checklist from the plan and records the frozen baseline that
every subsequent PR must measure against.

> **Operating rule (non-negotiable):** one PR per slice. Each PR is small,
> single-purpose, and individually mergeable, in line with the
> minimal-change principle in [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).
> See also [`TEST_COVERAGE_SUMMARY.md`](../TEST_COVERAGE_SUMMARY.md) for the
> historical Phase A–E coverage push that this roadmap builds on.

---

## Frozen baseline (Phase 0)

Captured on Node 24 / npm 11 against the merge base of this branch. All
later PRs must match-or-exceed every metric below; any regression fails CI
via the vitest thresholds in [`vitest.config.ts`](../vitest.config.ts).

| Signal | Baseline | CI floor (this PR) |
|---|---:|---:|
| Test files | 186 | — |
| Tests passing | 2035 | must stay green |
| Test failures | 0 | 0 |
| Lint errors | 0 | 0 |
| Lint warnings | 22 (pre-existing) | no new warnings on touched files |
| Coverage — statements | 63.64% | **63.5%** |
| Coverage — branches | 54.56% | **54%** |
| Coverage — functions | 54.05% | **54%** |
| Coverage — lines | 65.77% | **65.5%** |
| `npm run build:dev` | ✅ | ✅ |

### Pre-existing defects observed during baseline (not regressed by Phase 0)

These are tracked here so the next phase has an explicit punch list. Each
becomes its own PR per principle 3 ("tests follow code reality; bugs are
follow-ups").

- [ ] **Bug — `PerformanceScanPanel`:** unhandled `TypeError: Cannot read
      properties of undefined (reading 'overallScore')` at
      `src/components/analytics/PerformanceScanPanel.tsx:194` during the
      "calls performanceScanner.scan when Run Full Scan clicked with enough
      data" test. The component reads
      `scanResult.estimatedImprovements.overallScore` without a presence
      guard. Phase 3 bug PR.
- [ ] **Lint hygiene:** 22 warnings (unused `vi`/`fireEvent` imports in
      several `*.test.tsx`; explicit `any` in
      `src/components/harness/BundleAutomationPanel.test.tsx`). Phase 3.2 —
      fix only on touch (minimal-change principle).

---

## Coverage targets (negotiated)

True 100% statement+branch is rarely achievable or valuable (defensive
`default:` arms, `process.env` guards, native-only branches in jsdom). The
operational definition of "100%" used by this roadmap:

| Tier | Target |
|---|---|
| Global (`src/**/*.{ts,tsx}`) | ≥ **95%** statements, ≥ **90%** branches |
| Safety-critical modules | **100%** statements & branches |
| Documented exclusions | listed in [`TEST_COVERAGE_SUMMARY.md`](../TEST_COVERAGE_SUMMARY.md) with `/* v8 ignore next */` and a justifying comment |

**Safety-critical modules (must reach 100%):**

- `src/lib/llm-runtime/kv-store.ts`
- `src/lib/llm-runtime/config.ts`
- `src/lib/llm-runtime/use-kv.ts`
- `src/lib/native/secure-storage.ts`
- `src/lib/native/install.ts`
- `src/lib/offline-queue.ts`

---

## Phase checklist

### Phase 0 — Discovery & baseline (this PR)
- [x] 0.1 Capture lint / test / coverage / build:dev / build baseline
- [x] 0.2 Android baseline (deferred — separate Phase 4 PR; see note below)
- [x] 0.3 v8 coverage report generated
- [ ] 0.4 CodeQL alert snapshot (next PR — needs `gh api` from a reviewer)
- [x] 0.5 Test-file audit (no `.only`, no `it.skip` without an issue link;
      one unhandled error captured above)
- [x] Deliverable — this document, plus floor thresholds in
      `vitest.config.ts`

> **Android baseline (0.2) deferred:** the agent sandbox cannot reliably run
> a full Gradle build chain (Temurin 21 + SDK + Capacitor sync) inside the
> initial-setup window without timing out. Phase 4 opens a dedicated PR
> that runs `assemblePlayDebug`, `assemblePlayRelease`,
> `assembleFdroidRelease`, `bundlePlayRelease` in CI and captures the
> outputs there.

### Phase 1 — Stabilize the existing test suite
- [ ] 1.1 Fix the `PerformanceScanPanel` unhandled error
- [ ] 1.2 Eliminate `act(...)` warnings and stray `console.error` noise
- [ ] 1.3 Standardize timer / `userEvent` patterns per stored memories
- [x] 1.4 Lock vitest thresholds at the baseline (this PR)

### Phase 2 — Coverage uplift, ranked by risk (one PR per group, ≤ ~300 LOC of test code)
- [ ] 2.1 Security/credential surface (kv-store, secure-storage, API-key path)
- [ ] 2.2 LLM runtime (providers, config layering, error/abort paths)
- [ ] 2.3 Native abstractions (`src/lib/native/*` web + native branches)
- [ ] 2.4 Offline queue / service worker / background sync gap-fill
- [ ] 2.5 `useKV` guards and schema-mismatch fallbacks
- [ ] 2.6 Interactive components (chat export, settings, workflow, install
      prompt, error boundaries)
- [ ] 2.7 Utility libraries (diagnostics, mobile-performance, prefetch,
      bundle-automation)
- [ ] 2.8 App shell (`App.tsx`, routing, lazy-load fallbacks)

### Phase 3 — Bug, warning, and visual-bug remediation (one PR per defect)
- [ ] 3.1 TypeScript strictness on touched files
- [ ] 3.2 ESLint warnings on touched files (clear the 22 pre-existing on touch)
- [ ] 3.3 CodeQL alerts (JS/TS + Java/Kotlin) — fix or justified-dismiss
- [ ] 3.4 Runtime console errors / React warnings
- [ ] 3.5 Visual regressions (manual sweep: Chrome desktop + Android emulator)
- [ ] 3.6 Accessibility pass (axe-core where applicable)
- [ ] 3.7 Backwards-compat / `useKV` migration guards

### Phase 4 — Android release readiness
- [ ] 4.1 Asset audit (mipmaps, adaptive icon, splash, notification icon,
      Play & F-Droid metadata)
- [ ] 4.2 Manifest, `targetSdk` / `compileSdk`, ProGuard/R8 sanity
- [ ] 4.3 Build matrix: `assemblePlayDebug`, `assemblePlayRelease`,
      `assembleFdroidRelease`, `bundlePlayRelease`
- [ ] 4.4 On-device smoke checklist (documented in `ANDROID_BUILD_GUIDE.md`)
- [ ] 4.5 Release signing — confirm or document the keystore-secret contract

### Phase 5 — Cross-cutting compatibility
- [ ] 5.1 Browser matrix verification
- [ ] 5.2 Stored-data schema versioning + migration tests
- [ ] 5.3 Capacitor plugin compatibility / `npx cap doctor`

### Phase 6 — Coverage gate & docs
- [ ] 6.1 Raise vitest thresholds to the final agreed targets
- [ ] 6.2 Update `TEST_COVERAGE_SUMMARY.md` (final floors + exclusion list)
- [ ] 6.3 Add / update `RELEASE_PROCESS.md` verification matrix

### Phase 7 — Final validation & release candidate
- [ ] 7.1 Re-run baseline and diff against Phase 0
- [ ] 7.2 RC PR via `release-bump.yml`
- [ ] 7.3 Tag via `tag-release.yml`; verify signed Play AAB + F-Droid APK +
      GitHub Release notes from `CHANGELOG.md`

---

## How to update this document

Each PR that completes a checklist item should:

1. Tick the corresponding `- [ ]` to `- [x]` in the same PR.
2. If a coverage metric improved, ratchet the matching floor in
   `vitest.config.ts` and update the **CI floor** column above.
3. Reference this document and the relevant phase number in the PR body.
4. Fill in `## Lessons learned` in the PR template — `learnings-ingest.yml`
   appends to `.github/copilot/LEARNINGS.md` automatically on merge.
