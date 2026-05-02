# Roadmap

> Where TrueAI is heading, distilled from `trueai_upgrade_plan.md` and `COMPETITIVE_SUMMARY.md`. **Subject to change.**
>
> *Audience: both · Last reviewed: 2026-05-02*

This page tracks intent, not commitments. Anything here can be
re-prioritized. For the canonical (and more frequently updated)
upgrade plan see
[`trueai_upgrade_plan.md`](https://github.com/smackypants/TrueAI/blob/main/trueai_upgrade_plan.md).

---

## Near-term (next few releases)

- **Play Store distribution** — `play-release.yml` is wired; ETA
  depends on developer-account configuration.
- **More agent tools** — speech-to-text, file diffing, Git ops
  (proposals welcome).
- **Workflow editor polish** — undo history, copy/paste of node
  subgraphs, lasso selection.
- **Knowledge bases** — type contracts already exist
  (`KnowledgeBase`, `KBDocument`, `DocumentChunk` in
  `workflow-types.ts`); UI is the next step.
- **Maestro E2E coverage** — broaden flows beyond smoke tests.
- **ESLint cleanup** — clear the ~91 pre-existing warnings demoted
  to `warn` in `eslint.config.js` so we can re-tighten the rules.

---

## Medium-term

- **iOS via Capacitor** — same React app, second native target. Will
  require an iOS native layer (`src/lib/native/*.ios.test.ts`)
  mirroring the Android one.
- **Desktop via Tauri** — investigate. Would unlock filesystem
  access and a real local model runtime in a single download.
- **Plugin marketplace** — curated harness directory with signed
  manifests.
- **Multi-device sync** — opt-in only, end-to-end encrypted.
  Strict no-server constraint applies (likely WebRTC or relay
  via a self-hosted endpoint).
- **Voice mode** — speech-to-text + text-to-speech with a local
  pipeline.

---

## Aspirational

- **Local fine-tuning UI that actually trains** (today it
  orchestrates an external job).
- **Inline image generation** integrated with the chat surface.
- **Agent marketplace** — share agent configs as portable bundles.
- **Cross-platform encrypted backups** with a user-supplied key.

---

## Out of scope (by charter)

- ❌ Telemetry / analytics SDKs
- ❌ Required cloud accounts
- ❌ Hosted-only features that don't gracefully degrade locally
- ❌ Dependencies that are CVE magnets without a path to patch

---

## How priorities get set

Roughly: bug-impact > security > local-first feature parity with
hosted platforms > polish. Issues with reproducible repros and
clear repro steps move faster than vague feature requests.

---

## See also

- [Changelog Highlights](Changelog-Highlights)
- [Contributing](Contributing) — how to nominate something
- [Governance & Rulesets](Governance-and-Rulesets)
- Canonical: [`trueai_upgrade_plan.md`](https://github.com/smackypants/TrueAI/blob/main/trueai_upgrade_plan.md), [`COMPETITIVE_SUMMARY.md`](https://github.com/smackypants/TrueAI/blob/main/COMPETITIVE_SUMMARY.md), [`TOOLNEURON_COMPARISON.md`](https://github.com/smackypants/TrueAI/blob/main/TOOLNEURON_COMPARISON.md)
