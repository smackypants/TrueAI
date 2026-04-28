# Repository Rulesets

This folder contains importable GitHub **Ruleset** JSON files that lock the
repository down so that **only the owner and explicitly authorized agent /
bot identities** can change protected refs and paths. Everyone else must fork
the repository and open a pull request, retaining the project's `LICENSE`
and `NOTICE` files (see [`/CONTRIBUTING.md`](../../CONTRIBUTING.md)).

| File | What it protects | Required for |
|---|---|---|
| `protect-default-branch.json` | `refs/heads/main`, `refs/heads/master` | All code review, status checks, no force-push |
| `protect-release-tags.json`   | `refs/tags/v*`                         | Locking release tags to the release workflow |
| `protect-workflows-and-config.json` | Sensitive paths on `main`/`master` | Defense-in-depth on `.github/**`, `LICENSE`, `NOTICE`, `package.json`, `package-lock.json`, `android/app/build.gradle`, etc. |

---

## How to import (one-time, owner only)

### Option A — automated (recommended): `scripts/configure-rulesets.sh`

From a workstation where `gh` is authenticated as a repo admin (and `jq`
+ `python3` are installed):

```bash
# Dry-run first to inspect what will be POSTed.
scripts/configure-rulesets.sh --dry-run

# Apply for real (idempotent — re-run any time).
scripts/configure-rulesets.sh
```

The script:

1. Calls `GET /repos/{owner}/{repo}/installations` to discover the live
   `app_id` for `github-actions[bot]`, `copilot-swe-agent[bot]`, and
   `dependabot[bot]`.
2. Patches each ruleset JSON in this folder, replacing every
   placeholder `actor_id: -1` with the matching real ID (or dropping the
   entry entirely if that bot isn't installed).
3. Recursively strips every `_comment` field (the Rulesets API rejects
   unknown keys).
4. POSTs new rulesets, or PUTs over an existing ruleset of the same
   name — so it's safe to re-run after an `app_id` rotation.

After the script completes, verify under
`https://github.com/smackypants/trueai-localai/settings/rules`.

### Option B — manual UI

1. Open **Settings → Rules → Rulesets** on the repository.
2. Click **New ruleset → Import a ruleset**.
3. Upload one of the JSON files in this folder. Repeat for each file.
4. Edit the `bypass_actors` list — see **Bot allowlist** below — replacing
   every `actor_id: -1` placeholder with a real GitHub App / actor ID.
5. Set **Enforcement status** to **Active** (not *Evaluate*).
6. Save.

> The owner (`smackypants`) is always able to bypass via the
> `RepositoryRole` admin entry (`actor_id: 5`). Do not remove that entry.

---

## Bot allowlist — agents that **must** keep working

The repository relies on the following automated identities. Each one needs a
matching `bypass_actors` entry in the rulesets that touch refs/paths it
writes to. Check the `Required in` column to know which JSON files to edit.

| Bot / agent | Why it needs bypass | Required in |
|---|---|---|
| **`github-actions[bot]`** (the built-in `GITHUB_TOKEN`) | `release-bump.yml` runs `git push origin HEAD` to `main` and pushes the `vX.Y.Z` tag. `tag-release.yml` pushes the `vX.Y.Z` tag. Both also edit `package.json` and `android/app/build.gradle`. | `protect-default-branch.json`, `protect-release-tags.json`, `protect-workflows-and-config.json` |
| **`copilot-swe-agent[bot]`** (Copilot coding agent) | Pushes to its own `copilot/*` working branches (no main/tag bypass needed). Only add it to `protect-workflows-and-config.json` if you ever let the agent merge its own PRs. | (optional) `protect-workflows-and-config.json` |
| **`dependabot[bot]`** | Opens PRs that update `package.json` / `package-lock.json`. Doesn't push to `main` directly, but its PRs need to be merge-able when the owner approves. | `protect-workflows-and-config.json` (use `bypass_mode: "pull_request"`) |
| **CodeQL** | Read-only — runs as `github-actions[bot]`. No bypass needed beyond what `github-actions[bot]` already has. | (none) |
| **Custom GitHub Apps you authorize** | Add as needed. | Any ruleset whose protections they would otherwise hit. |

### How to find the numeric `actor_id` for a GitHub App

The Ruleset API stores integration bypass entries by **GitHub App ID**, not by
the `[bot]` username. Find an App ID with one of these methods:

**Option A — browser:** open the App's GitHub page, e.g.
`https://github.com/apps/copilot-swe-agent`, view the page source, search for
`"app_id":` — the integer that follows is the App ID.

**Option B — gh CLI:**

```bash
# Lists every GitHub App installed on the repo, with App ID + slug.
gh api "/repos/smackypants/trueai-localai/installations" \
  --jq '.installations[] | {id: .app_id, slug: .app_slug}'
```

Common IDs at the time of writing (verify before importing — these can
change):

| Slug | Typical `app_id` |
|---|---|
| `github-actions` | `15368` |
| `dependabot` | `29110` |
| `copilot-swe-agent` | look up via gh CLI — varies per installation |

Once you have the IDs, edit each `bypass_actors` block and replace every
`actor_id: -1` with the correct integer.

---

## Verifying nothing is broken after import

After importing all three rulesets, run these sanity checks:

1. **Release workflow still works** — trigger
   *Actions → Release Bump (Tag) → Run workflow* with a patch version. It
   should commit + push to `main` and create the `vX.Y.Z` tag without a
   "ruleset blocked the push" error. If it fails with `GH013` you forgot to
   add `github-actions[bot]` to the `main` branch and `v*` tag bypass lists.
2. **Copilot coding agent still works** — start a Copilot task; it should be
   able to push commits to its `copilot/*` branch and open a PR.
3. **Dependabot PRs still open** — wait for the next daily run, or trigger
   *Insights → Dependency graph → Dependabot → Last checked → Check for
   updates*. PRs should appear normally; merging requires your CODEOWNERS
   approval, which is the intended behavior.
4. **CodeQL stays green** — `Analyze (javascript-typescript)` and
   `Analyze (java-kotlin)` are now required status checks; confirm both run
   on a test PR.
5. **External contributor flow** — confirm a non-collaborator account cannot
   push to `main` or create a `v*` tag and is forced to fork + PR.

If anything breaks, the most common cause is a missing or wrong `actor_id`
in a `bypass_actors` entry — re-check the IDs from the gh CLI command above.

---

## Auto-merge & merge-conflict resolution

The default-branch ruleset is intentionally tuned so that GitHub's built-in
**auto-merge** flow works with a single owner approval, and so that bots
(the Copilot coding agent, owner-run conflict-fix commands, etc.) can
rebase / merge `main` into a PR branch to resolve conflicts **without**
invalidating that approval.

### Repo settings the owner must enable (one-time)

These are **repo settings**, not ruleset rules — I cannot set them from a PR.
Enable them in **Settings → General → Pull Requests**:

- ✅ **Allow auto-merge** — required for the "Enable auto-merge" button on a
  PR to appear at all.
- ✅ **Allow squash merging** *and/or* **Allow rebase merging** — the
  default-branch ruleset's `allowed_merge_methods` is `["squash", "rebase"]`.
  Enable at least one of these; disable "Allow merge commits" if you want to
  enforce linear history (the ruleset already requires linear history).
- ✅ **Automatically delete head branches** — recommended; keeps the repo
  clean after auto-merge.

### Why the PR rule is configured this way

| Parameter | Value | Why |
|---|---|---|
| `required_approving_review_count` | `1` | Owner approval suffices. |
| `require_code_owner_review` | `true` | The CODEOWNERS file routes every PR to the owner — combined with `required_approving_review_count: 1` this means **only the owner's approval can satisfy the rule**. |
| `dismiss_stale_reviews_on_push` | `false` | Lets a bot push a conflict-resolution commit without wiping out the owner's approval. Auto-merge will still wait for status checks to be green on the new commit. |
| `require_last_push_approval` | `false` | Without this, auto-merge cannot proceed after any later push. With our setup, the owner's first approval is sufficient even if CI re-runs. |
| `required_review_thread_resolution` | `true` | All review conversations must be resolved before auto-merge fires. |
| `allowed_merge_methods` | `["squash", "rebase"]` | Linear history. |

### Recommended workflow for hands-off merges

1. Open a PR (you, Copilot agent, Dependabot, or an external fork).
2. Owner reviews & **approves** the PR.
3. Owner clicks **Enable auto-merge** (squash). GitHub will now wait for:
   - All required status checks to pass: `Analyze (javascript-typescript)`,
     `Analyze (java-kotlin)`, `Android CI`.
   - All review threads to be resolved.
   - No new "request changes" review.
4. When all conditions go green, GitHub merges automatically. Head branch
   is deleted (if you enabled that setting).

### Resolving merge conflicts on a PR

Because the default-branch ruleset only protects `main` / `master`, **PR
branches are unprotected** and any actor with write access (you, the
Copilot agent, `github-actions[bot]`, Dependabot rebasing its own PRs) can
push directly to them to fix conflicts. Two ways to do it:

- **From the PR page:** click *"Update branch" → "Update with merge commit"*
  or *"Update with rebase"*. The squash/rebase merge into `main` later still
  produces a single linear commit, so the temporary merge commit on the PR
  branch is harmless.
- **From a bot / Copilot agent:** push a conflict-resolution commit to the
  PR branch as you normally would. With `dismiss_stale_reviews_on_push:
  false` your existing approval survives, and once CI goes green again
  auto-merge fires automatically.

For PRs from **forks**, the contributor must have left "Allow edits by
maintainers" checked on the PR (default). If they didn't, you can't push a
conflict fix to their branch — you have to either ask them to rebase or
push a fixup commit yourself by checking out their fork locally.

### Dependabot auto-merge

This repo ships `.github/workflows/dependabot-auto-merge.yml`, which
calls `gh pr merge --auto --squash` on every Dependabot PR that is
**not** a major version bump. CODEOWNERS approval + all required status
checks are still required before the merge actually happens — the
workflow only flips the auto-merge switch.

Pre-requisites (one-time, owner sets in the GitHub UI):

- ✅ Settings → General → Pull Requests → **Allow auto-merge**
- ✅ Settings → General → Pull Requests → **Allow squash merging**
- ✅ Settings → Actions → General → Workflow permissions →
  **Read and write permissions** + **Allow GitHub Actions to create
  and approve pull requests**

Major-version bumps are intentionally skipped; the workflow leaves a
comment on the PR instead, so you can review breaking changes by hand.

---

## End-to-end "publish a release" flow

For a single-click full release (bump → tag → APK → GitHub Release in
one visible workflow run):

1. **Actions → Publish Release (Bump → Tag → APKs) → Run workflow.**
   - Inputs: `version` (semver, no leading `v`) and `notes` (one-line).
   - Composition: this orchestrator (`publish-release.yml`) calls
     `release-bump.yml` (which now exposes a `workflow_call` trigger)
     and then `release.yml` with the resulting `vX.Y.Z` tag.
2. The `build-and-release` job runs in the **`release`** environment —
   create that environment under Settings → Environments and attach
   any signing / publishing secrets you want gated by manual approval.
3. The `play-release.yml` and `fdroid-repo.yml` workflows similarly run
   in the **`play`** and **`fdroid`** environments respectively, so
   Play Console + F-Droid signing keys can be scoped per environment.

The legacy individual workflows (`release-bump.yml`, `tag-release.yml`,
`release.yml` on tag-push) still work exactly as before — `publish-release.yml`
is purely additive.
