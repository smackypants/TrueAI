# Settings

> Every preference TrueAI exposes, where it lives, and what it persists to.
>
> *Audience: end user · Last reviewed: 2026-05-02*

The settings menu (gear icon, top-right) groups preferences into nine
panels. Every change persists locally — to IndexedDB on web, to
Capacitor Preferences on Android. Nothing is sent to a remote server
(see [Privacy](Privacy)).

For the full list of persisted KV keys see
[Settings Reference](Settings-Reference).

---

## Panels

| Panel | What it controls |
| --- | --- |
| [General](#general) | Default tab, language, conversation defaults |
| [Appearance](#appearance) | Theme, density, animation level |
| [Theme Switcher](#theme-switcher) | Live theme selection (light / dark / auto / custom) |
| [AI](#ai) | Default system prompt, default model parameters |
| [LLM Runtime](#llm-runtime) | Provider, base URL, default model, API key |
| [Notifications](#notifications) | Permission, agent-completion alerts, scheduled-run alerts |
| [Privacy](#privacy) | Telemetry (always off), incognito mode, history retention |
| [Data](#data) | Import / export everything, wipe all data |
| [Advanced](#advanced) | Diagnostics, debug logger, hardware scan, dev flags |

<!-- SCREENSHOT: settings menu open with all panels listed -->

---

## General

- **Default tab on launch** — Chat, Agents, Workflows, Models, etc.
- **Language** — UI language (where translations exist).
- **Default conversation title style** — auto-derived / "New chat" / custom.
- **Confirmations** — show "are you sure?" on destructive actions.

See `GeneralSettings.tsx`.

---

## Appearance

- **Density** — comfortable / compact.
- **Animation level** — full / reduced / off (respects OS reduced-motion).
- **Sidebar position** — left / right.
- **Mobile bottom nav visibility** — auto / always / never.

See `AppearanceSettings.tsx`.

---

## Theme Switcher

Quick-pick between built-in themes plus your custom themes. Each
theme is a CSS variable bundle — see
[Themes & Appearance](Themes-and-Appearance) for how to add your own.
Tied to `ThemeToggle` in the app header.

---

## AI

Defaults applied to **new** conversations and agents (existing items
keep their per-instance overrides):

- Default system prompt
- Default temperature, top-p, max tokens, frequency / presence penalty
- Default model (mirrors the LLM Runtime default — change either)

See `AISettings.tsx`.

---

## LLM Runtime

The most important panel for first-run.

- **Provider preset** — Ollama / llama.cpp / LM Studio / OpenAI / Anthropic / Google / Custom
- **Base URL** — auto-filled from preset
- **Default model**
- **API key** — written via the **secure** path (never `localStorage`); see [Privacy](Privacy)
- **Test connection** — probes `{baseUrl}/models`

Layered config rules: defaults < `public/runtime.config.json` < KV
override. See [LLM Runtime](LLM-Runtime) for the full spec.

---

## Notifications

- **System permission** — request / re-request the OS notification
  permission.
- **Agent completion** — toast + optional system notification when a
  scheduled or long-running agent finishes.
- **Scheduled run alerts** — fire ahead of a scheduled agent run.
- **Service worker update** — show the "new version available" prompt.

See [Notifications](Notifications).

---

## Privacy

- **Telemetry** — always **off** and not toggleable. Documented for
  reassurance only.
- **Incognito mode** — don't write conversations to disk for the
  current session.
- **History retention** — auto-delete conversations older than N days
  (off by default).
- **Clear search history** / **Clear download history**.

See [Privacy](Privacy) for the full data inventory.

---

## Data

- **Export everything** → JSON backup (conversations, agents,
  workflows, settings, *excluding* the API key)
- **Import** → restore a JSON backup
- **Wipe all data** → drops every TrueAI key from KV storage,
  optionally including the secure API key

Implementation note for developers: imports use the
`document.createElement('input')` pattern with an `onchange` handler
to read the file (see `DataSettings.tsx`).

---

## Advanced

- **Diagnostics** — collect anonymous diagnostic info (hardware,
  user-agent, last error stack) into a copy-pasteable blob for
  bug reports. Nothing is sent automatically.
- **Mobile debug logger** — capture in-app logs for triage. Shows
  log level, timestamp, message.
- **Hardware scan** — re-run the hardware optimizer's detection.
- **Performance scan** — surface bottlenecks (uses
  `PerformanceScanPanel`).
- **Reset** — restore all settings to defaults (does not touch
  conversations).

---

## Where everything is persisted

| Setting kind | Storage |
| --- | --- |
| Most settings | IndexedDB via `useKV` (KV keys listed in [Settings Reference](Settings-Reference)) |
| API key | Secure KV (IndexedDB on web, Capacitor Preferences on Android) — never `localStorage` |
| Theme accent colours | CSS variables persisted via KV |
| Hardware-scan results | KV (re-runnable any time) |

For the precise KV keys and their schemas, see
[Settings Reference](Settings-Reference) and
[State & Persistence](State-and-Persistence).

---

## See also

- [First-Run Setup](First-Run-Setup)
- [Privacy](Privacy)
- [Themes & Appearance](Themes-and-Appearance)
- [Settings Reference](Settings-Reference) — complete KV-key map
