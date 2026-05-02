# Security

> Wiki-friendly summary of [`SECURITY.md`](https://github.com/smackypants/TrueAI/blob/main/SECURITY.md).
>
> *Audience: security researcher / contributor · Last reviewed: 2026-05-02*

> The canonical security policy is
> [`SECURITY.md`](https://github.com/smackypants/TrueAI/blob/main/SECURITY.md).
> When in doubt, that file wins.

---

## Reporting a vulnerability

**Please do not open a public issue, discussion, or pull request to
report security vulnerabilities.** Public reports give attackers a
head start before a fix can ship.

Report **privately** via one of:

- **GitHub Security Advisories** — repo → Security → Advisories →
  *Report a vulnerability*. This is the preferred channel.
- The contact methods listed in
  [`SECURITY.md`](https://github.com/smackypants/TrueAI/blob/main/SECURITY.md).

A maintainer will acknowledge and triage as soon as possible.

---

## Scope

In scope:

- Anything in the published web app or APK
- Anything in this repo's `src/`, `android/`, `public/`, build
  scripts, and Capacitor config
- The release pipeline (Actions workflows under `.github/workflows/`)
- The F-Droid build recipe and self-hosted F-Droid repo

Out of scope:

- Issues in upstream dependencies that have not been triaged yet —
  please report those upstream and CC us if it materially affects
  TrueAI
- Self-XSS in the user's own browser-controlled inputs
- Any LLM endpoint *you* configure (you control its security)

---

## Hardened invariants

These are explicitly enforced by tests; regressions are treated as
security bugs:

1. **`kvStore.setSecure()` MUST NOT fall back to `localStorage`.**
   All three IDB failure paths (`tx.onerror`, `tx.onabort`,
   `db.transaction()` throwing) resolve silently. Mitigates CodeQL
   `js/clear-text-storage-of-sensitive-data`. See
   `src/lib/llm-runtime/kv-store.ts:264-297` and
   `kv-store.test.ts → setSecure`.
2. **`mergeConfig(base, null/undefined)` returns a fresh object.**
   `ensureLLMRuntimeConfigLoaded` mutates the merged result with
   `merged.apiKey = apiKey`; sharing the `base` reference would
   leak the user's API key to every importer. See
   `src/lib/llm-runtime/config.ts:75-104`.
3. **API key is excluded from the persisted `__llm_runtime_config__`
   blob.** It lives under its own KV key, written via the secure
   path.
4. **No telemetry, analytics, or third-party network calls** are
   added by the app itself.

---

## Required CodeQL gates

PRs cannot merge into `main` while either CodeQL workflow is
failing:

- `Analyze (javascript-typescript)`
- `Analyze (java-kotlin)`

Both are required status checks per the branch ruleset.

---

## Dependency hygiene

`package.json` carries `overrides` pins to patch known CVEs in
transitive dependencies (`path-to-regexp`, `postcss`, `lodash`,
`brace-expansion@1`). **Do not weaken these pins.** If the upstream
fix supersedes a pin, tighten or upgrade — never remove.

`npm-audit.yml` runs against the GitHub Advisory DB on PRs and on a
schedule; flagged advisories get triaged.

---

## Coordinated disclosure

If your report leads to a fix, you'll be credited in the release
notes (unless you ask not to be). If a CVE is appropriate, the
project will request one.

We aim to acknowledge reports within a few days and ship a fix on a
risk-appropriate timeline.

---

## Thank you 🙏

Responsible disclosure makes everyone safer. Thank you for taking
the time.

---

## See also

- [Privacy](Privacy)
- [Governance & Rulesets](Governance-and-Rulesets)
- [LLM Runtime](LLM-Runtime) — secure storage internals
- Canonical: [`SECURITY.md`](https://github.com/smackypants/TrueAI/blob/main/SECURITY.md)
