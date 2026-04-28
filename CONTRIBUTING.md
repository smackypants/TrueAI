# Contributing to TrueAI LocalAI

Thank you for your interest in this project! This document explains who can
make changes directly, how outside contributors can propose changes, and the
attribution requirements that apply to every fork and derivative work.

---

## 1. Who can push directly

Direct push, merge, and tag access to this repository is restricted to:

- **The project owner** — [@smackypants](https://github.com/smackypants) /
  Advanced Technology Research.
- **Authorized automation / agent identities** explicitly listed in the
  ruleset bypass list under
  [`.github/rulesets/`](.github/rulesets/README.md#bot-allowlist--agents-that-must-keep-working).
  At minimum this includes `github-actions[bot]` (CI, CodeQL, release
  workflows), `dependabot[bot]` (security/version PRs), and the Copilot
  coding agent (`copilot-swe-agent[bot]`).

These restrictions are enforced server-side by GitHub Rulesets — see
[`.github/rulesets/README.md`](.github/rulesets/README.md). Any push or tag
created by an actor outside the bypass list is rejected by GitHub.

---

## 2. How everyone else contributes

If you are **not** the owner or an authorized bot, the only supported way to
propose a change is:

1. **Fork** this repository on GitHub.
2. Make your changes in a branch on **your fork**.
3. **Retain `LICENSE` and `NOTICE` unmodified.** Both files **must** stay in
   the root of every fork and every derivative work. The MIT License legally
   requires this; removing or altering them violates the license.
4. **Preserve all copyright headers** in source files. Do not strip the
   `Copyright (c) 2024-2026 smackypants / Advanced Technology Research`
   notices from any file you copy.
5. **Give clear attribution** in your fork's `README.md` — at minimum:

   > Based on **TrueAI LocalAI** by smackypants / Advanced Technology
   > Research — <https://github.com/smackypants/trueai-localai> — used
   > under the MIT License.

6. Open a **pull request** against `main` of this repository. CODEOWNERS
   will route the review to the owner; status checks (`Analyze
   (javascript-typescript)`, `Analyze (java-kotlin)`, `Android CI`) must
   pass; conversations must be resolved before merge.

---

## 3. PRs that will be auto-rejected

The following are grounds for **immediate closure** of a pull request:

- Removing, renaming, or modifying [`LICENSE`](LICENSE) or [`NOTICE`](NOTICE).
- Stripping copyright headers from existing files.
- Editing files under `.github/**` (workflows, CODEOWNERS, rulesets, issue
  templates) when you are not the owner. The
  [`protect-workflows-and-config` ruleset](.github/rulesets/protect-workflows-and-config.json)
  blocks these merges at the platform level.
- Editing `package.json`, `package-lock.json`, or `android/app/build.gradle`
  with the intent of weakening security pins (see
  [the dependency overrides in `package.json`](package.json) — those CVE
  pins must be preserved).
- Adding telemetry, network calls to third-party services, or anything that
  exfiltrates user data. This project is local-first by design.
- Submitting AI-generated content without disclosing it, or submitting
  content under a license incompatible with MIT.

---

## 4. Forking and credit — your obligations

This project is licensed under the [MIT License](LICENSE). MIT is permissive
but **not attribution-free**: you may use, copy, modify, and redistribute the
code, *provided you keep the copyright notice and license text intact in
every copy or substantial portion of the software.*

Concretely, every fork and every derivative work **must**:

1. Ship the unmodified `LICENSE` file.
2. Ship the unmodified `NOTICE` file.
3. Preserve in-source `Copyright (c)` headers.
4. Visibly credit the original author in the project's primary README, with
   a link back to <https://github.com/smackypants/trueai-localai>.

Failure to do so is a license violation and will be enforced — including by
filing DMCA takedown notices with GitHub against non-compliant forks.

---

## 5. Reporting security issues

Do not open a public issue or PR for security problems. See
[`SECURITY.md`](SECURITY.md) for the private reporting channel.

---

## 6. Automation & bug-fix workflow

Bug fixes on this project are designed to flow through automation as much
as possible while keeping the owner in the loop on every merge.

**Triggering an automated bug fix:**

1. **Open an issue** describing the bug (or a security advisory for
   security bugs — see [`SECURITY.md`](SECURITY.md)).
2. The owner can then **dispatch the GitHub Copilot coding agent**
   (`copilot-swe-agent[bot]`) to draft a fix. The agent:
   - Pushes its work to a `copilot/<task-name>` branch (unprotected by
     ruleset, so the agent can iterate freely).
   - Opens a PR back to `main`.
   - Re-runs CI (CodeQL JS/TS, CodeQL Java/Kotlin, Android CI) on each
     push.
3. **Owner reviews and approves** the PR. CODEOWNERS routes the review
   automatically.
4. **Auto-merge** can then be enabled — see
   [`.github/rulesets/README.md`](.github/rulesets/README.md#auto-merge--merge-conflict-resolution)
   for the full auto-merge flow. GitHub waits for all required status
   checks to pass and then squash-merges.

**Resolving merge conflicts on agent / Dependabot PRs:**

Because PR branches (`copilot/*`, `dependabot/*`) are *not* protected by
the branch ruleset, any actor with write access — including the bot that
opened the PR — can push a rebase or merge commit to fix conflicts. The
owner's prior approval is **not** dismissed (`dismiss_stale_reviews_on_push`
is `false` in the ruleset), so once CI is green again auto-merge fires.

**What's automated end-to-end:**

| Surface | Automation | How a bug fix lands |
|---|---|---|
| npm dependency CVEs | Dependabot (daily) | PR opened automatically → owner approves → auto-merge |
| GitHub Actions CVEs | Dependabot (weekly) | PR opened automatically → owner approves → auto-merge |
| Android / Gradle CVEs | Dependabot (weekly) | PR opened automatically → owner approves → auto-merge |
| Devcontainer base image | Dependabot (weekly) | PR opened automatically → owner approves → auto-merge |
| Code-level bugs (logic, UI, perf) | Copilot coding agent (owner-dispatched) | Agent opens PR on `copilot/*` → owner approves → auto-merge |
| Security findings | CodeQL surfaces in Security tab; reporter via private advisory; fix produced by owner or Copilot agent | Same as above; published via Security Advisory after release |

**Checks that gate every merge** (configured in
`.github/rulesets/protect-default-branch.json`):

- `Analyze (javascript-typescript)` — CodeQL JS/TS.
- `Analyze (java-kotlin)` — CodeQL Java/Kotlin (Android).
- `Android CI` — debug APK build.

If any of these fails on a PR, the merge — including auto-merge — is
blocked until the bot or contributor pushes a fix.

---

## 7. Local development quick reference

| Task | Command |
|---|---|
| Install deps (Node 24, npm 11) | `npm ci` |
| Dev build | `npm run build:dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` (if configured in `package.json`) |
| Android debug APK | `npm run android:build` |

CI runs on Node 24 / Temurin JDK 21. PRs that don't build under those
versions will fail status checks and cannot be merged.

---

Thanks for respecting these rules — they exist so the project stays
maintainable and properly attributed.
