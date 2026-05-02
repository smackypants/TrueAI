# Developer FAQ

> Quick answers for people working *on* TrueAI.
>
> *Audience: developer · Last reviewed: 2026-05-02*

For end-user questions see [End-User FAQ](FAQ-End-User).

---

## Toolchain

**Why Node 24?**
The `package-lock.json` includes optional native-binary entries
(`@rolldown-*`, `lightningcss-*`, `fsevents`) that npm 11 (bundled
with Node 24) understands. Older npm chokes. Vite 8 also assumes
Node 24's lockfile shape.

**Why JDK 21?**
Capacitor 8 / `capacitor-android` is compiled with `--release 21`.
JDK 17 fails `compileDebugJavaWithJavac` with "invalid source
release: 21".

**Why does `npm ci` fail on older Node?**
The lockfile records optional binary deps that older npm refuses to
install / mis-resolves. Use Node 24 — `nvm use` picks it up from
`.nvmrc`.

**Should I run `npm install` or `npm ci`?**
**`npm ci`** — it respects the lockfile exactly, which is required
for reproducible builds (and for F-Droid).

---

## Build

**`build:dev` vs `build` — what's the difference?**
`build:dev` is `tsc + vite build --mode development`. It defines
`__APP_DEBUG__=true`, which enables verbose logging, the in-app
performance monitor, and dev-only UI hints. Used by debug Android
workflows. `build` is production (`__APP_DEBUG__=false`); used by
release workflows.

**What does `__APP_DEBUG__` actually toggle?**
A handful of `if (__APP_DEBUG__)` gates around verbose logging,
the always-on `PerformanceMonitor`, and a few dev-only UI affordances.
Tree-shaken in production.

**How does `runtime.config.json` flow into the APK?**
1. You edit `public/runtime.config.json`.
2. `vite build` copies it into `dist/`.
3. `npx cap sync android` includes it in the APK assets.
4. The app fetches `/runtime.config.json` at startup; values are
   merged under user-supplied KV overrides.

See [LLM Runtime](LLM-Runtime) for the full layering rules.

---

## Testing

**How do I mock Radix Selects in jsdom?**
`screen.getByRole('combobox', { name: <Label text> })` for the
trigger (Radix wires `<Label htmlFor>` to the trigger id), then
`screen.getByRole('option', { name: ... })` for the option. If the
`<Label>` lacks `htmlFor`, fall back to placeholder text. See
[Testing → Selects](Testing#selects).

**How do I mock Radix Tabs in jsdom?**
Use `@testing-library/user-event`'s `await user.click(trigger)` —
`fireEvent.click` doesn't fire the pointer events Radix uses. See
[Testing → Tabs](Testing#tabs).

**How do I write Android-only branch tests?**
Pair every `src/lib/native/foo.ts` with `foo.android.test.ts`:
top-level `vi.mock('./platform', …)` + `vi.mock('@capacitor/foo')` +
per-test `vi.resetModules()` + dynamic `await import(...)`. See
[Testing → Android branch tests](Testing#android-branch-tests).

**Why are my `useKV` tests bleeding state between tests?**
You forgot the reset. `beforeEach`: call `__resetKvStoreForTests()`
*and* `await kvStore.delete(key)` for every persisted key. See
[Testing → useKV reset](Testing#usekv-reset-must-do-per-file).

**Where are the AI SDK mocks?**
`src/test/ai-sdk-mocks.ts`. Use `mockLanguageModel` /
`mockFailingLanguageModel` for streaming tests. See
[Testing → AI SDK mocks](Testing#ai-sdk-mocks).

---

## Contributing

**Why was my PR auto-rejected?**
Probably one of:
- Modified `LICENSE` / `NOTICE`
- Edited under `.github/**` without explicit approval
- Stripped a copyright header
- Weakened a `package.json` `overrides` pin
- Added telemetry / analytics / a third-party network call
- Required CI checks failed

See [Governance & Rulesets](Governance-and-Rulesets) for the full
list.

**Can I weaken an `overrides` pin?**
**No.** They patch CVEs. If the upstream has been fixed, *tighten*
the pin or upgrade the direct dependency; never remove or relax.

**Can I add an analytics SDK?**
**No.** Local-first by charter. Same answer for crash reporters,
feature flag SDKs, etc. Open an issue if you have a use case that
needs telemetry — there may be a local-only alternative.

**Can I edit `.github/**`?**
Only if your task explicitly asks for it. Workflows, rulesets,
copilot configs, issue templates — all gated behind explicit
approval. See [Governance & Rulesets](Governance-and-Rulesets).

---

## Releases

**How do I cut a release?**
Use **Actions → Release Bump (Tag)** (`release-bump.yml`). It bumps
`package.json` + Android version, prepends a CHANGELOG entry,
commits, tags, pushes. Downstream workflows take over from there.
See [Build & Release](Build-and-Release).

**What's the difference between `release-bump` and `tag-release`?**
- `release-bump.yml` — one-shot bump + tag (most common).
- `tag-release.yml` — tag-only, when you've already bumped the
  version manually in a PR.

Both run as `github-actions[bot]` and are in the bypass list.

---

## Native

**How do I add a new Capacitor plugin?**
1. `npm install @capacitor/foo`
2. `npx cap sync android`
3. Create `src/lib/native/foo.ts` with the `if (isNative()) { … } else { /* fallback */ }` shape. See [Native Layer → Adding a new capability](Native-Layer#adding-a-new-capability).
4. Add `foo.test.ts` (web branch) and `foo.android.test.ts` (native branch).
5. Re-export from `src/lib/native/index.ts`.

**Where do I put the web fallback?**
In the same `foo.ts` file, in the `else` branch of the `isNative()`
check. Use the most graceful web API available
(`navigator.clipboard`, `Notification`, blob downloads, …). Don't
throw — fail soft.

---

## CodeQL

**A CodeQL rule fires on my PR — what's the auto-fix contract?**
If the issue was opened by `codeql-autofix.yml` and labelled
`copilot-fix`:

1. Branch: `copilot/fix-codeql-{alert-number}-{rule-id-slug}`
2. Run `npm ci && npm run lint && npm run build:dev && npm test` —
   all must pass before opening the PR.
3. Reference the issue: `Closes #NNN`
4. Fill in the `## Lessons learned` section of the PR template.
5. The fix must not introduce new CodeQL alerts.

See [Governance & Rulesets → Auto-fix issue contract](Governance-and-Rulesets#auto-fix-issue-contract-for-ai-agents).

**The alert is a false positive — what now?**
Don't dismiss it from the Security tab silently — open the auto-fix
issue and add a comment explaining why it's a false positive. Wait
for the maintainer to dismiss it on the GitHub side.

---

## Misc

**The agent says it can't access `.github/agents/` — why?**
Those files are instructions for *other* agents. Reading them could
cause cross-agent interference. The sandbox blocks access by
design.

**Where are accumulated lessons recorded?**
[`.github/copilot/LEARNINGS.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot/LEARNINGS.md).
Append via the `## Lessons learned` section of your PR body —
`learnings-ingest.yml` parses and appends automatically on merge.

**What's the recommended Copilot model for this repo?**
`claude-opus-4.7` (per
[`.github/copilot/AGENT_RUNTIME.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot/AGENT_RUNTIME.md)).
Acceptable fallbacks: `claude-opus-4.5`, `claude-sonnet-4.6`,
`gpt-5.4`, `gpt-5.5`, `gpt-5.3-codex`, `gemini-2.5-pro`.

---

## See also

- [Testing](Testing)
- [Build & Release](Build-and-Release)
- [Native Layer](Native-Layer)
- [LLM Runtime](LLM-Runtime)
- [Governance & Rulesets](Governance-and-Rulesets)
- [Contributing](Contributing)
