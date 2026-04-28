# Security Policy

## Reporting a vulnerability

**Please do not open a public issue, discussion, or pull request to report
security vulnerabilities.** Public reports give attackers a head start
before a fix can ship.

Instead, report privately via one of:

- **GitHub Security Advisories** (preferred): use the *Security → Advisories
  → Report a vulnerability* button on this repository. Only the owner sees
  these reports.
- **Email:** open an issue on
  <https://advancedtechnologyresearch.com/> referencing
  `trueai-localai security report` and request a private channel.

Please include as much of the following as you can:

- The type of issue (e.g. credential exposure, RCE, XSS, prompt injection,
  insecure default).
- Affected file paths, branches, releases, or APK builds.
- Step-by-step reproduction.
- Proof-of-concept (if safe to share) and impact assessment.
- Whether you've disclosed the issue to anyone else.

You can expect an initial acknowledgement within **5 business days** and a
status update at least every **14 days** while the issue is being worked.

## Scope

In scope:

- Code in this repository (`src/`, `android/`, `.github/workflows/`,
  configuration files).
- Released debug or release APKs built from this repository.
- Build / release pipeline (workflow injection, supply-chain risks against
  `package-lock.json` pins, etc.).

Out of scope:

- Vulnerabilities in third-party LLM providers you configure at runtime —
  report those to the provider.
- Issues that require physical access to an unlocked device that has the
  user's API key already entered.
- "Best-practice" findings without a demonstrable exploit.

## How fixes are produced

Once a report is triaged, the owner may:

1. Patch the issue directly, or
2. Dispatch the **GitHub Copilot coding agent** (`copilot-swe-agent[bot]`)
   to draft a fix on a `copilot/*` branch, which is then reviewed and
   approved by the owner before being auto-merged via the standard
   ruleset-protected PR flow (see [`CONTRIBUTING.md`](CONTRIBUTING.md) and
   [`.github/rulesets/README.md`](.github/rulesets/README.md)).

Either way, the fix lands through the normal CODEOWNERS review + required
status checks, so the security boundary around `main` and `v*` tags is
never bypassed.

## Coordinated disclosure

Once a fix is merged and a new release is tagged, a security advisory will
be published on this repository's **Security → Advisories** tab, crediting
the reporter unless they request anonymity.

## Security-related repository protections

For transparency, the following automation enforces our security posture:

- **CodeQL** (`Analyze (javascript-typescript)` + `Analyze (java-kotlin)`)
  runs on every push and PR to `main` and weekly on a schedule. Findings
  appear under **Security → Code scanning**.
- **Dependabot** opens PRs daily for vulnerable npm dependencies, weekly
  for Gradle / GitHub Actions / devcontainer base images.
- **`package.json` overrides** pin transitive deps past their CVE-fixed
  versions (`path-to-regexp`, `postcss`, `lodash`, `brace-expansion@1`).
  PRs that weaken these pins will be rejected (see
  [`CONTRIBUTING.md`](CONTRIBUTING.md)).
- **Branch and tag rulesets** under [`.github/rulesets/`](.github/rulesets/)
  restrict pushes to `main` and `v*` tags to the owner and authorized bot
  identities, and require code owner review + green status checks on every
  merge.
