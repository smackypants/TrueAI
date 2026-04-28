# Agent runtime — fastest, largest model, unrestricted

This document collects the things the **owner** has to flip in the
GitHub UI to give every agent / bot / Copilot in this repo the highest
possible ceiling: largest models, fastest runners, and the broadest
allowed network and permission scopes.

The repo-side configuration (workflow files, `dependabot.yml`,
rulesets, the auto-merge workflow) is already wired up for this — but
some toggles only exist in the UI and cannot be set from a PR.

---

## 1. Copilot coding agent — model selection

> **Recommended model for this repo: `Claude Opus 4.7`** — the
> latest and largest Anthropic model available in GitHub Copilot at
> the time of writing. Pick it from the model dropdown every time
> you start a coding-agent task on this repo. Pin it in your
> personal settings if Copilot lets you.

Model selection for the Copilot coding agent is **per-user**, not
per-repo: GitHub does not currently expose a way to force a specific
model from a repository file. The workaround is to make `claude-opus-4.7`
the explicit, documented default here so every contributor (and every
agent session triggered by the owner) picks the same one.

1. Open https://github.com/settings/copilot
2. Under **Models**, enable every model you have access to. The
   recommended-and-required pick for this repo:
   - **`claude-opus-4.7`** — latest / largest Anthropic flagship.
3. Acceptable fallbacks if Opus 4.7 isn't available on your plan
   (in priority order):
   - `claude-opus-4.5`
   - `claude-sonnet-4.6`
   - `gpt-5.4` / `gpt-5.5`
   - `gpt-5.3-codex`
   - `gemini-2.5-pro`
4. When kicking off a new agent task in the **Copilot → Agents**
   view, pick **Claude Opus 4.7** from the dropdown. The agent
   will use that model for the entire session.

> The model choice is not stored in the repo. Every user who triggers
> the coding agent on this repo should pick **`claude-opus-4.7`**
> unless they have a specific reason not to.

## 2. Copilot coding agent — runner size

The repo's `.github/workflows/copilot-setup-steps.yml` reads the
runner label from a repository (or org) Actions **variable** named
`COPILOT_RUNNER`, with a safe fallback to `ubuntu-latest`.

To upgrade to a larger runner:

1. Provision a larger-runner group at the org level — see
   [Managing larger runners](https://docs.github.com/en/actions/using-github-hosted-runners/managing-larger-runners).
2. On this repo: **Settings → Secrets and variables → Actions →
   Variables → New repository variable**.
3. Name: `COPILOT_RUNNER`. Value: the runner label, e.g.
   `ubuntu-4-core`, `ubuntu-8-core`, `ubuntu-16-core`. Save.

The next time the coding agent runs setup steps, it will pick up the
new label automatically. No PR / workflow edit required.

> ⚠️ Larger Linux x64 runners are supported. macOS / ARM runners are
> not compatible with the coding agent.

## 3. Copilot coding agent — firewall (unrestricted network)

By default the coding agent runs behind GitHub's integrated firewall,
which limits outbound HTTP to a curated allowlist. To give the agent
broader (or fully unrestricted) network access for `npm install`,
Gradle dependency resolution, container pulls, etc.:

1. **Settings → Copilot → Coding agent**.
2. Under **Firewall**, choose one of:
   - **Custom allowlist** — add the hosts your build needs
     (e.g. `dl.google.com`, `services.gradle.org`, `repo.maven.apache.org`,
     `objects.githubusercontent.com`, `github.com`,
     `registry.npmjs.org`, `*.googleapis.com`).
   - **Disabled** — no outbound restriction. Use only if you trust
     the threat model on this private repo.
3. Save.

Tip: starting with the **custom allowlist** preset for "JavaScript /
TypeScript + Android" is usually enough; only fully disable if you
hit repeated firewall blocks during setup.

## 4. Copilot coding agent — task timeout

Already maxed out in `copilot-setup-steps.yml`:

```yaml
timeout-minutes: 59   # 59 is the hard cap enforced by the agent
```

No further action.

## 5. Dependabot — fast hands-off patching

`.github/dependabot.yml` is configured for the most aggressive auto-
patching the platform allows:

- All four ecosystems (`npm`, `devcontainers`, `github-actions`,
  `gradle`) on a **daily** schedule.
- `open-pull-requests-limit` raised to 20 (npm) / 10 (others).
- **Update grouping** so all minor + patch bumps in an ecosystem
  arrive as a single PR instead of 10+ serial PRs — that PR auto-
  merges in one CI cycle.
- A separate `*-security` group for security advisories that
  includes major bumps.
- `.github/workflows/dependabot-auto-merge.yml` flips on auto-squash-
  merge for every non-major bump the moment CI + CODEOWNERS go green.

Owner-side requirements (one-time, in Settings):

| Setting | Path | Required value |
|---|---|---|
| Read-and-write Actions token | Settings → Actions → General → Workflow permissions | ✅ Read and write permissions |
| GHA can create / approve PRs | Settings → Actions → General → Workflow permissions | ✅ Allow GitHub Actions to create and approve pull requests |
| Auto-merge | Settings → General → Pull Requests | ✅ Allow auto-merge |
| Squash merging | Settings → General → Pull Requests | ✅ Allow squash merging |
| Auto-delete head branches | Settings → General → Pull Requests | ✅ recommended |

## 6. github-actions[bot] — ruleset bypass

The bot needs to push tags + commits directly to `main` from the
release workflows. `scripts/configure-rulesets.sh` patches every
ruleset's `bypass_actors` to include the live App ID.

Run once, as a repo admin:

```bash
gh auth login                        # admin scopes
scripts/configure-rulesets.sh        # idempotent
```

Verify under Settings → Rules → Rulesets that all three rulesets are
**Active** (not Evaluate) and the bypass list contains:

- Repo admin (Owner)
- `github-actions[bot]`
- `copilot-swe-agent[bot]` (if installed)
- `dependabot[bot]` (`pull_request` mode)

## 7. Quick verification

Run `scripts/verify-owner-setup.sh` from a workstation where `gh` is
authenticated as a repo admin. It checks all five owner-only steps
in one shot and reports ✅ / ❌ per item.

```bash
scripts/verify-owner-setup.sh
```

---

## Summary — what's repo-controlled vs UI-only

| Capability | Repo-controlled | Owner UI |
|---|---|---|
| Coding agent toolchain (Node 24, JDK 21, Android SDK) | ✅ `copilot-setup-steps.yml` | — |
| Coding agent timeout (59 min cap) | ✅ `copilot-setup-steps.yml` | — |
| Coding agent runner size | ✅ via `COPILOT_RUNNER` variable | ✅ create the variable |
| Coding agent model (Opus / GPT-5.4 etc.) | — | ✅ user's personal Copilot settings |
| Coding agent firewall | — | ✅ Settings → Copilot → Coding agent |
| Dependabot schedule + grouping | ✅ `dependabot.yml` | — |
| Dependabot auto-merge | ✅ `dependabot-auto-merge.yml` | ✅ enable auto-merge + squash |
| Ruleset bypass actors | ✅ `scripts/configure-rulesets.sh` | ✅ run the script once |
| Environments (`release` / `play` / `fdroid`) | ✅ workflows reference them | ✅ create + attach secrets |
