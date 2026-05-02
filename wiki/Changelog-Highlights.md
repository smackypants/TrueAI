# Changelog Highlights

> Curated highlights. The full, chronological changelog lives in [`CHANGELOG.md`](https://github.com/smackypants/TrueAI/blob/main/CHANGELOG.md).
>
> *Audience: both · Last reviewed: 2026-05-02*

This page exists so wiki readers can see "what's changed lately"
without diving into the full changelog. It's a curated list — every
release worth highlighting from a *user* or *integrator* perspective
gets a short note here.

For the canonical, machine-generated entry list see
[`CHANGELOG.md`](https://github.com/smackypants/TrueAI/blob/main/CHANGELOG.md).

---

## Recent themes

### ToolNeuron-competitive features

- Visual **Workflow Builder** with 6 node types and a 6-template
  library
- **Cost Tracking & Budget Management** with alerts and exports
- **Collaborative agent** + **ensemble** modes
- **Hardware Optimizer** with auto-applied profiles

See [`TOOLNEURON_COMPARISON.md`](https://github.com/smackypants/TrueAI/blob/main/TOOLNEURON_COMPARISON.md)
for the side-by-side.

### Local-first, no-Spark runtime

- Replaced the GitHub Spark hosted LLM/KV runtime with local shims
  under `src/lib/llm-runtime/`
- KV persisted to IndexedDB (web) / Capacitor Preferences (Android)
- Secure path for credentials with a hard "no localStorage" invariant

### Native Android polish

- Capacitor 8 with first-party plugins (preferences, network,
  clipboard, share, haptics, app, status-bar, splash-screen,
  keyboard, local-notifications, filesystem)
- Back-button handler stack
- App-resume queue flush
- F-Droid distribution (self-hosted repo + upstream catalog path)

### Performance + offline

- Service worker with cache-first shell
- IndexedDB cache manager
- Offline action queue with retries and resume-flush
- Lazy panel loading + idle prefetch
- Hardware-driven performance profiles

### AI SDK integration

- Vercel AI SDK wired in via `src/lib/llm-runtime/ai-sdk/`
- Provider factory dynamically imports hosted SDKs (OpenAI /
  Anthropic / Google) to keep the local-only bundle small

### Developer ergonomics

- Test patterns documented in this wiki ([Testing](Testing))
- AI SDK mocks in `src/test/ai-sdk-mocks.ts`
- Auto-fix issue contract for the Copilot agent
- `learnings-ingest.yml` so lessons compound over time

---

## Where new entries go

Each merged PR's `## Lessons learned` section is appended to
[`.github/copilot/LEARNINGS.md`](https://github.com/smackypants/TrueAI/blob/main/.github/copilot/LEARNINGS.md)
by `learnings-ingest.yml`. User-facing release notes are added to
`CHANGELOG.md` by `release-bump.yml`. This wiki page is updated
manually when there's something noteworthy to call out.

---

## See also

- [Roadmap](Roadmap)
- Canonical: [`CHANGELOG.md`](https://github.com/smackypants/TrueAI/blob/main/CHANGELOG.md), [`RELEASE_NOTES.md`](https://github.com/smackypants/TrueAI/blob/main/RELEASE_NOTES.md)
