# Contributing

> Wiki-friendly summary of [`CONTRIBUTING.md`](https://github.com/smackypants/TrueAI/blob/main/CONTRIBUTING.md).
>
> *Audience: contributor · Last reviewed: 2026-05-02*

> The canonical contribution policy is
> [`CONTRIBUTING.md`](https://github.com/smackypants/TrueAI/blob/main/CONTRIBUTING.md).
> When in doubt, that file wins.

---

## Who can push directly

Direct push and merge access to `smackypants/TrueAI` is restricted
to:

- The project owner (`@smackypants`)
- `github-actions[bot]` (used by release/automation workflows)
- `Copilot` (the coding agent, for auto-fix issues)
- `Dependabot[bot]` (routine dependency PRs)

**Everyone else contributes via fork.**

---

## The fork → PR flow

1. Fork the repo on GitHub.
2. Clone your fork; create a topic branch.
3. Make your change. Keep the diff focused.
4. **Run the gates locally:**
   ```bash
   npm ci
   npm run lint        # zero errors
   npm run build:dev
   npm test
   ```
5. Commit. Use a clear, descriptive commit message.
6. Push to your fork; open a PR against `main`.
7. Fill in the PR template, including the **`## Lessons learned`**
   section if your work uncovered any non-obvious gotchas.
8. Wait for CI + CODEOWNERS review.

---

## What gets your PR auto-rejected

- ❌ Modifying `LICENSE` or `NOTICE`
- ❌ Stripping `Copyright (c) 2024-2026 Skyler Jones …` headers
- ❌ Editing under `.github/**` without explicit task approval
- ❌ Weakening any `package.json` `overrides` pin (these patch CVEs)
- ❌ Adding telemetry / analytics / a third-party network call
- ❌ Disabling or bypassing CodeQL, Android CI, or any required check

See [Governance & Rulesets](Governance-and-Rulesets) for the full
list and the auto-fix issue contract.

---

## Mandatory attribution (for forks)

Forks **must retain**:

- The `LICENSE` file unmodified
- The `NOTICE` file unmodified
- All in-source copyright headers

…and must give visible credit to the original author. See
[NOTICE](https://github.com/smackypants/TrueAI/blob/main/NOTICE)
and [License & Attribution](License-and-Attribution).

---

## Lessons learned

The `## Lessons learned` section of every merged PR's body is
parsed by `learnings-ingest.yml` and appended to
[`.github/copilot/LEARNINGS.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot/LEARNINGS.md).

Please fill it in with anything non-obvious your work surfaced —
new conventions, gotchas, library quirks, test patterns. One to
three bullet points is enough. If your change makes a previous
learning obsolete, prefix the new entry with
`SUPERSEDES: <original title>`.

---

## Auto-fix issues (for the Copilot agent)

If you're an AI agent assigned to a `copilot-fix`-labelled issue,
follow the contract in
[Governance & Rulesets → Auto-fix issue contract](Governance-and-Rulesets#auto-fix-issue-contract-for-ai-agents).

Key rules:

- Use the prescribed branch name pattern.
- Run `npm ci && npm run lint && npm run build:dev && npm test`
  before opening the PR.
- Reference the triggering issue with `Closes #NNN`.
- Don't introduce new CodeQL alerts.
- Minimal-change principle: fix only what the issue describes.

---

## Reporting security issues

**Don't open a public issue.** See [Security](Security) for private
channels.

---

## See also

- [Governance & Rulesets](Governance-and-Rulesets)
- [Build & Release](Build-and-Release)
- [Testing](Testing)
- [License & Attribution](License-and-Attribution)
- [Security](Security)
- Canonical: [`CONTRIBUTING.md`](https://github.com/smackypants/TrueAI/blob/main/CONTRIBUTING.md)
