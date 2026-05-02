# System Requirements

> *Audience: end user · Last reviewed: 2026-05-02*

What you need depends on **whether you run the model locally** or
talk to a hosted API. The TrueAI app itself is light; the heavy
hardware requirements come from the LLM you point it at.

---

## To run the TrueAI app

### Web (any modern browser)

| Requirement | Minimum | Recommended |
| --- | --- | --- |
| Browser | Chromium 120 / Firefox 120 / Safari 17 | Latest stable |
| RAM | 2 GB free for the tab | 4 GB+ |
| Disk | ~50 MB for IndexedDB cache | 500 MB+ for big conversation/model histories |
| Network | None (after install) | LAN access to your model server |

The app uses standard web APIs only — no WebAssembly model runtime
is bundled (the LLM lives in *your* server). Required browser
features:

- Service Workers (for offline + install-as-PWA)
- IndexedDB (for state and credential storage)
- `Notification` API (optional, for completion alerts)

### Android

| Requirement | Minimum | Recommended |
| --- | --- | --- |
| Android version | **8.0 (API 26)** | 10+ |
| Architecture | armeabi-v7a, arm64-v8a, x86_64 | arm64-v8a |
| RAM | 2 GB | 4 GB+ |
| Storage | 100 MB free | 1 GB+ for cached conversations |
| Network | LAN access to model server (or internet for hosted APIs) | — |

The APK is a Capacitor 8 wrapper; see
[Mobile & Android](Mobile-and-Android) for the native plugin matrix.

---

## To run the model

This is where hardware matters. TrueAI doesn't ship a model — you
point it at a server. Below are rough guidelines per provider; for the
authoritative tuning matrix see
[`HARDWARE_OPTIMIZATION.md`](https://github.com/smackypants/TrueAI/blob/main/HARDWARE_OPTIMIZATION.md)
and the in-app [Hardware Optimizer](Hardware-Optimizer).

### Local model servers (Ollama, llama.cpp, LM Studio)

| Model size | Quantization | Min RAM/VRAM | Notes |
| --- | --- | --- | --- |
| **1–3B** (e.g. Llama 3.2 1B/3B) | Q4 | 4 GB | Runs on any modern laptop, even some phones |
| **7–8B** (Llama 3.1 8B, Mistral 7B) | Q4 | 8 GB | Comfortable on 16 GB laptops, GPU optional |
| **13–14B** | Q4 | 16 GB | GPU strongly recommended |
| **30–34B** | Q4 | 24 GB+ VRAM | Workstation / server class |
| **70B+** | Q4 | 48 GB+ VRAM | Multi-GPU or CPU offload |

### Hosted providers (OpenAI / Anthropic / Google)

No local hardware needed beyond what the TrueAI app itself uses.
You'll need a working internet connection and a paid API key. Use
[Cost Tracking](Cost-Tracking) to set budgets.

---

## What the app *automatically* tunes for your hardware

The **Hardware Optimizer** (Models tab → Hardware Optimizer, plus the
auto-optimization hook in `useAutoPerformanceOptimization`) detects:

- CPU cores and GPU class
- Available memory
- Battery state and charging status (mobile)
- Network reachability (LAN vs. metered cellular)

…and chooses an appropriate **performance profile** (conservative /
balanced / aggressive) for chat streaming chunk size, prefetching,
animation budget, and IndexedDB cache size. See
[Hardware Optimizer](Hardware-Optimizer) and
[Performance](Performance) for details.

---

## What's *not* required

- No Google Play Services on Android.
- No external accounts for the app itself (only for hosted API
  providers if you choose one).
- No always-on internet — once configured against a local model
  server, the app works fully offline. Conversations and most
  workflows degrade gracefully when the server is unreachable; see
  [Offline & Sync](Offline-and-Sync).

---

## See also

- [Installation](Installation)
- [Hardware Optimizer](Hardware-Optimizer)
- [Mobile & Android](Mobile-and-Android)
- Canonical: [`HARDWARE_OPTIMIZATION.md`](https://github.com/smackypants/TrueAI/blob/main/HARDWARE_OPTIMIZATION.md), [`MOBILE_OPTIMIZATION_COMPLETE.md`](https://github.com/smackypants/TrueAI/blob/main/MOBILE_OPTIMIZATION_COMPLETE.md)
