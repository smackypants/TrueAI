# Governance & Rulesets

> Branch and tag protections, allowed bots, required checks, and the auto-fix issue contract.
>
> *Audience: developer / contributor · Last reviewed: 2026-05-02*

This repo is **owner-controlled**. Direct push to `main` and to
`v*` tags is restricted server-side by GitHub Rulesets. Outside
contributors propose changes via forks; PRs that violate the rules
are auto-rejected.

---

## Who can push directly

The bypass list of `protect-default-branch.json` and
`protect-release-tags.json` (see
[`.github/rulesets/`](https://github.com/smackypants/TrueAI/tree/main/.github/rulesets))
includes:

- `@smackypants` (project owner)
- `github-actions[bot]` (used by `release-bump.yml`,
  `tag-release.yml`, `learnings-ingest.yml`, etc.)
- `Copilot` (the coding agent)
- `Dependabot[bot]` (for routine dependency PRs)

Everyone else: fork → PR.

---

## Required status checks on `main`

A PR cannot merge into `main` until **all** of the following pass:

- `Android CI` (`android.yml`)
- `Analyze (javascript-typescript)` (CodeQL)
- `Analyze (java-kotlin)` (CodeQL)
- `pr-quality` (lint + typecheck + tests)

Plus CODEOWNERS approval (`@smackypants`).

`main` cannot be force-pushed. Tags matching `v*` are immutable
(no force-push, no delete) outside the bypass list.

---

## Hard prohibitions (auto-rejected)

PRs that do any of the following will be rejected:

- ❌ Modify `LICENSE` or `NOTICE`.
- ❌ Strip the in-source
  `Copyright (c) 2024-2026 Skyler Jones ("smackypants") /
  Advanced Technology Research` headers.
- ❌ Edit anything under `.github/**` unless the task explicitly
  asks for it.
- ❌ Weaken `package.json` `overrides` pins
  (`path-to-regexp ^8.4.0`, `postcss ^8.5.10`, `lodash ^4.17.24`,
  `brace-expansion@1 ^1.1.13`).
- ❌ Add telemetry, analytics, or third-party network calls
  (project is local-first by charter).
- ❌ Disable / bypass CodeQL, Android CI, or any required status
  check.
- ❌ Use `git push --force` against `main` (also blocked by ruleset).

For the full policy, see
[`CONTRIBUTING.md`](https://github.com/smackypants/TrueAI/blob/main/CONTRIBUTING.md).

---

## Auto-fix issue contract (for AI agents)

Several workflows automatically open issues assigned to `@copilot`
when a defect is detected. The agent's contract for handling them is
codified in
[`.github/copilot-instructions.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot-instructions.md).

### Recognising auto-generated fix issues

All of:

- Carries the `copilot-fix` label
- Title starts with `[CodeQL`, `[Auto]`, `[Audit]`, or `[Security]`
- Body contains a "Bug type" row of one of: `codeql-alert`,
  `lint-error`, `test-failure`, `dependency-vuln`

### Branch naming convention

| Bug type | Branch |
| --- | --- |
| `codeql-alert` | `copilot/fix-codeql-{alert-number}-{rule-id-slug}` |
| `lint-error` | `copilot/fix-audit-lint-{YYYY-MM-DD}` |
| `test-failure` | push to the **existing** PR branch in the issue body — **do NOT** open a new branch |
| `dependency-vuln` | `copilot/fix-dep-{package-name}-{new-version}` |
| other | `copilot/fix-{issue-number}-{short-slug}` |

### Required pre-PR checks

```bash
npm ci
npm run lint        # exit 0 — zero errors
npm run build:dev
npm test
```

PR description requirements:

- `Closes #NNN` to auto-close the triggering issue.
- Fill in the `## Lessons learned` section of the PR template.
- For supersessions, prefix with `SUPERSEDES: <original title>`.
- The fix must not introduce new CodeQL alerts.

### Minimal-change principle

Fix only what the issue describes. Don't refactor unrelated code,
don't reformat outside the changed lines, don't fix unrelated bugs
(open a separate issue if you spot one).

---

## `LEARNINGS.md` ingestion

`.github/workflows/learnings-ingest.yml` runs on every merge to
`main` and parses the `## Lessons learned` section of the PR body,
appending entries to
[`.github/copilot/LEARNINGS.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot/LEARNINGS.md).

- Entries are dated; newer entries supersede older ones on the same
  subject.
- Use `SUPERSEDES: <original title>` to mark explicit supersessions.
- AI agents read `LEARNINGS.md` before starting any non-trivial task
  and treat entries as hard constraints.

---

## Where to read more

- [`.github/rulesets/README.md`](https://github.com/smackypants/TrueAI/blob/main/.github/rulesets/README.md) — the rulesets themselves
- [`.github/copilot-instructions.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot-instructions.md) — agent contract
- [`.github/copilot/LEARNINGS.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot/LEARNINGS.md) — accumulated lessons
- [`CONTRIBUTING.md`](https://github.com/smackypants/TrueAI/blob/main/CONTRIBUTING.md) — outside contributor guide
- [`SECURITY.md`](https://github.com/smackypants/TrueAI/blob/main/SECURITY.md) — private security reporting

---

## See also

- [Contributing](Contributing) — fork flow, attribution preservation
- [CI Workflows](CI-Workflows) — what the required checks actually run
- [Build & Release](Build-and-Release) — release-bump details
