# Developer tooling

This document covers the developer-side tooling scripts added in Phase 4 of
[`trueai_upgrade_plan.md`](../trueai_upgrade_plan.md). All scripts run on a
stock developer machine — none require CI configuration, runner secrets, or
new runtime dependencies. **No new devDependencies are added either**: the
one tool with a non-trivial install footprint (`knip`) is invoked via `npx`
on demand, mirroring the Phase 3 Maestro pattern.

## Scripts

| Script | What it does | When to run |
|---|---|---|
| `npm run typecheck` | `tsc -p tsconfig.json --noEmit` — runs the TypeScript compiler in type-check mode against the same project Vite uses. | Before opening a PR if you've changed types, prop shapes, or anything CodeQL might flag as "type drift". Faster than a full `vite build` because it skips bundling. |
| `npm run lint:fix` | `eslint . --fix` — applies ESLint autofixes in place. | After a large refactor / before push. **Verify with `npm run lint` afterwards** — `--fix` does not guarantee zero warnings. |
| `npm run check:deps` | `npx --yes knip` — surfaces unused files, exports, and dependencies under a config tuned for this repo (`knip.json`). | Periodically (monthly), or when you suspect a module / dependency has gone unused. **Output is advisory** — review false positives before deleting anything. |
| `scripts/android-doctor.sh` | Preflight that JDK 21 + Android SDK + the Gradle wrapper are all present and sane. | Before `npm run android:build` on a fresh machine, or whenever a Gradle build fails for an unclear reason. |

## `npm run typecheck` — details

`tsconfig.json` has `noEmit: true` already, so `tsc -p tsconfig.json --noEmit`
is purely a type check. Use this in preference to `npm run build:dev` when
all you want is type validation — it is materially faster on a warm cache
because it skips Vite bundling, asset processing, and the `lightningcss`
native binary.

The build (`npm run build` / `npm run build:dev`) still runs `tsc -b` first,
so type errors block builds — `typecheck` is purely a developer-loop
shortcut.

## `npm run lint:fix` — details

`--fix` is conservative: it only applies fixes ESLint considers safe. It
does **not** rewrite hooks, JSX semantics, or anything stateful. Always
follow with `npm run lint` to confirm no warnings remain — autofix
sometimes reveals new problems by reformatting masking code.

## `npm run check:deps` — details

[Knip](https://knip.dev) finds unused files, exports, types, dependencies,
and devDependencies. It is invoked via `npx --yes knip` so:

- **No `package.json`/`package-lock.json` change is required** — keeps the
  hard `overrides` pins (`path-to-regexp`, `postcss`, `lodash`,
  `brace-expansion@1`) and the lockfile audit surface unchanged.
- It always picks up the latest stable Knip on demand — no version drift to
  babysit.

Configuration lives in [`knip.json`](../knip.json). Highlights:

- **Entry points:** `index.html`, `src/main.tsx`, all `*.test.{ts,tsx}` files.
- **Project scope:** `src/**/*.{ts,tsx}`.
- **Ignored:** `src/test/`, `android/`, `dist/`, `build/`, `coverage/`,
  `node_modules/`, `.maestro/`, `scripts/`.
- **Ignored deps:** `@github/spark` — aliased to local shims via
  `vite.config.ts`, so Knip's static analysis cannot resolve it without
  reading the Vite config (which it does, but coverage of aliased deps
  varies between Knip releases).

> ⚠️ **Treat output as advisory.** Knip cannot always see dynamic
> `await import(...)` paths (e.g. provider-factory's runtime-resolved
> hosted-LLM providers in `src/lib/llm-runtime/ai-sdk/`) and may flag them
> as unused. Verify before deleting.

If `knip` regularly reports the same false positives, add them to
`ignoreDependencies` / `ignore` in `knip.json` rather than silencing them
in CI.

## `scripts/android-doctor.sh` — details

Run it directly:

```bash
bash scripts/android-doctor.sh
```

It checks four things in order and prints a clear ✓ / ✗ / ⚠ for each:

1. **Java toolchain** — `java` on PATH and reports a `21.x` version. Fails
   hard if not (Capacitor 8 requires JDK 21; JDK 17 dies with
   `invalid source release: 21`).
2. **Android SDK** — `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) is set and
   points at an existing directory; warns if `platforms/`, `build-tools/`,
   or `adb` are missing.
3. **Gradle wrapper** — `android/gradlew` exists and is executable.
4. **Capacitor web bundle** — warns if `dist/` is missing (so `cap sync`
   would have nothing to copy).

Exit code is `0` on success, `1` if any of the four hard checks fail.
Warnings (`⚠`) do not change the exit code.

## What is **not** included

The Phase 4 plan deliberately keeps the scope tight. The following were
considered and explicitly deferred:

- **CI integration of any of the above scripts.** Wiring `typecheck` /
  `check:deps` / `android-doctor.sh` into GitHub Actions would require
  edits under `.github/**`, which the auto-fix issue contract forbids
  outside explicit scope.
- **`depcheck` as an alternative to `knip`.** Knip is TypeScript-aware and
  understands `tsconfig.json` paths; `depcheck` would surface more false
  positives in this codebase. The plan keeps either-or scope, and Knip wins
  on the merits.
- **Adding `knip` (or any other Phase 4 tool) as a devDependency.** Doing
  so would touch `package-lock.json` and grow the audit surface; `npx`
  invocation is the explicit local-first compromise.
