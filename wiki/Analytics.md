# Analytics

> Real-time dashboards over your usage, model performance, agent learning, and optimization recommendations.
>
> *Audience: end user · Last reviewed: 2026-05-02*

The **Analytics** tab visualizes everything TrueAI records locally:
chat throughput, model usage, agent success rates, performance scans,
and learning insights. All data is local (see [Privacy](Privacy)).

UI lives in `src/components/analytics/`; the underlying analytics
engine in [`src/lib/analytics.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/analytics.ts).

---

## Sub-panels

| Panel | What it shows |
| --- | --- |
| **Analytics Dashboard** | Top-line KPIs: requests, tokens, errors, uptime |
| **Time Series Chart** | Configurable metrics over time |
| **Event Chart** | Discrete event histogram |
| **Model Usage Chart** | Per-model request / token share |
| **Top Items List** | Most-used conversations, agents, models |
| **Category Breakdown** | Spend / usage by category |
| **Metric Card** | Single-value summaries |
| **Learning Dashboard** | Agent learning insights and confidence stats |
| **Auto-Optimization Panel** | Recommended config changes you can apply |
| **Bulk Optimization Panel** | Apply optimizations across many agents at once |
| **Confidence Threshold Config** | Tune what counts as "confident enough" to auto-apply |
| **Performance Scan Panel** | Detect runtime bottlenecks (frame drops, slow tabs) |
| **Optimization Recommendations Viewer** | Explainable list of recommended changes |

<!-- SCREENSHOT: analytics dashboard with time-series chart and metric cards -->

---

## Auto-Optimization & Confidence Thresholds

When the agent learning engine has enough signal, it produces
**recommendations** (e.g. "lower temperature for the Researcher
agent — 87% of negative feedback came at T > 0.8"). The
**Auto-Optimization Panel** can apply these automatically, gated by
the **confidence threshold** you choose:

- `CONSERVATIVE_THRESHOLDS` — only apply highly-certain changes
- `BALANCED_THRESHOLDS` — default
- `AGGRESSIVE_THRESHOLDS` — apply more readily, accept more noise

The threshold values themselves come from
[`src/lib/confidence-thresholds.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/confidence-thresholds.ts).
Changes you apply are versioned via the
[Agent Engine](Agent-Engine)'s version history, so you can roll back.

---

## Bulk Optimization

Pick a set of agents (filter by tag, model, or owner), preview the
deltas the optimizer would apply across all of them, then commit in
one go. Each affected agent gets a new version pinned in history.

---

## Performance Scan

A point-in-time scan of:

- Long task durations (>50 ms main-thread blocks)
- Memory pressure events
- Slow tab transitions
- IndexedDB query slowness
- Hardware reading deltas (battery drop while idle, etc.)

See [Performance](Performance) for the runtime perf system this taps
into and `PerformanceScanPanel.tsx` for the UI.

---

## Recommendations Viewer

Renders the open + applied + dismissed recommendations as cards with:

- Confidence score
- Evidence (how many runs / what feedback drove it)
- Diff preview
- Apply / Dismiss / Snooze actions

`OptimizationRecommendationsViewer.tsx` wraps the list in
`framer-motion`'s `<AnimatePresence mode="popLayout">` for
smooth filter animations.

---

## See also

- [Agents](Agents) — the runs being analyzed
- [Cost Tracking](Cost-Tracking) — spend-side dashboards
- [Performance](Performance) — runtime perf internals
- [Hardware Optimizer](Hardware-Optimizer) — hardware-side recommendations
- Canonical: [`ANALYTICS.md`](https://github.com/smackypants/TrueAI/blob/main/ANALYTICS.md)
