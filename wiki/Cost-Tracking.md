# Cost Tracking

> Real-time tracking of API spending, with budgets and alerts. Pure local; nothing leaves your device.
>
> *Audience: end user · Last reviewed: 2026-05-02*

The **Cost** tab tracks every model call TrueAI makes for you,
calculates an estimated cost based on the model's pricing, and lets
you set budgets with alert thresholds. Useful when you've pointed the
LLM Runtime at a *paid* hosted provider (OpenAI, Anthropic, Google);
informational when you're using a local model (cost = $0.00).

The data model is in
[`src/lib/workflow-types.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/workflow-types.ts)
(`CostEntry`, `Budget`); the UI is
[`src/components/cost/CostTracking.tsx`](https://github.com/smackypants/TrueAI/blob/main/src/components/cost/CostTracking.tsx).

---

## What gets tracked

For every chat turn, agent step, or workflow node that calls a model,
TrueAI records a `CostEntry`:

- Timestamp
- Model id
- Prompt tokens, completion tokens
- Estimated cost (per the model's pricing table)
- Resource (chat / agent / workflow / fine-tune)
- Reference id (conversation / agent / workflow run)

Local models report 0 cost.

<!-- SCREENSHOT: cost tab with the cost over time chart and budget cards -->

---

## Dashboard

The Cost tab shows:

- **Total spend (today / this week / this month)**
- **Spend over time** chart
- **Top models by cost**
- **Top resources by cost** (which conversations / agents / workflows
  spent the most)
- **Recent activity feed**

---

## Budgets

A **budget** is a `Budget` record:

- Period — daily / weekly / monthly
- Limit (USD)
- Alert threshold (% of limit, e.g. 80%)
- Optional scope — global / per model / per resource

When usage crosses the alert threshold you get a **toast + system
notification** (uses [Notifications](Notifications)). When usage
crosses the limit:

- A persistent banner is shown
- New requests can be blocked (configurable: warn-only vs hard-stop)

Budgets are evaluated at request time, so you find out *before* a big
spend lands.

---

## Pricing tables

Cost estimates rely on a built-in pricing table for popular models.
You can override per-model pricing in the Cost panel for:

- Models the table doesn't know
- Custom contracts / negotiated rates

Pricing is stored locally — there's no central catalog the app
phones home to.

---

## Local models

When you talk to Ollama / llama.cpp / LM Studio, every entry is
logged with cost = 0. The dashboard still tracks **token usage**, so
you can see how heavily you're hammering your local hardware. This
data feeds the [Hardware Optimizer](Hardware-Optimizer)'s
recommendations.

---

## Export

The **Export** button dumps the entire `CostEntry[]` (and any custom
pricing overrides) as JSON. Useful for spreadsheets, taxes, or
sharing with a teammate.

There is no server to import to — exports are for your records.

---

## Common questions

- **Are the costs accurate?** They're *estimates*. Providers
  occasionally change prices; check the pricing table in the Cost
  panel and update if needed.
- **Can I get alerts on a per-conversation budget?** Yes — set a
  scoped budget with the conversation as the resource.
- **Does cost data sync across devices?** No — TrueAI doesn't have
  any sync; export/import via [Settings → Data](Settings#data) if
  you want to move data manually.

---

## See also

- [Notifications](Notifications) — how alerts surface
- [Workflows](Workflows) and [Agents](Agents) — the things being costed
- [Settings Reference](Settings-Reference) — `cost-entries`, `budgets` KV keys
- [Privacy](Privacy)
