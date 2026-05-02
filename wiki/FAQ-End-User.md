# End-User FAQ

> Quick answers for people running TrueAI on a phone, laptop, or desktop.
>
> *Audience: end user · Last reviewed: 2026-05-02*

For developer / build / contribution questions, see the
[Developer FAQ](FAQ-Developer).

---

## General

**What *is* TrueAI LocalAI?**
A local-first AI assistant platform. Chat, autonomous agents, visual
workflows, model management, fine-tuning helpers, analytics, cost
tracking, and a small app builder — all in one app, all running on
your own hardware. Web app + Android APK.

**Is it free?**
Yes. MIT licensed. No subscriptions, no paywall. Donations
([PayPal](https://www.paypal.com/donate/?hosted_button_id=YASFVWFCH3YKS))
help keep development going but are entirely optional.

**Does it phone home?**
No. There is no telemetry, no analytics SDK, no third-party network
calls by default. The app talks **only** to the LLM endpoint you
configure. See [Privacy](Privacy).

**Does it need internet?**
After install, no — provided your LLM endpoint is local (Ollama,
llama.cpp, LM Studio). If you point it at a hosted API
(OpenAI/Anthropic/Google) you'll need internet for those calls. The
app shell, conversations, agents, workflows, and settings work fully
offline. See [Offline & Sync](Offline-and-Sync).

**Who owns my data?**
You. It's stored in your browser's IndexedDB (web) or your phone's
app-private storage (Android). Nothing leaves your device unless you
explicitly export it.

**Why local-first?**
See the [project manifesto](https://github.com/smackypants/TrueAI/blob/main/README.md#-project-manifesto-local-ai-belongs-to-everyone).
Short version: AI shouldn't be another rented dependency.

---

## Install & update

**Which Android versions are supported?**
Android 8.0 (API 26) and newer. arm64-v8a strongly recommended.

**Why isn't it on the Play Store yet?**
The Play Store path is opt-in and requires Play developer-account
configuration. It's wired up (`play-release.yml`, `fastlane/`); ETA
depends on the project owner. F-Droid distribution is the
recommended path today — see [Installation](Installation).

**How do I add the F-Droid repo?**
F-Droid client → Settings → Repositories → Add new repository →
`https://smackypants.github.io/trueai-localai/fdroid/repo`. The
fingerprint and a QR code are attached to each
[GitHub Release](https://github.com/smackypants/trueai-localai/releases).

**How do I update?**
- F-Droid: F-Droid handles updates automatically.
- APK download: re-install the new APK over the old one.
- Web: refresh the page; the service worker prompts you when a new
  version is ready.

---

## LLM setup

**How do I run Ollama?**
Install Ollama (`https://ollama.com`), then `ollama serve` and
`ollama pull llama3.2`. In TrueAI: Settings → LLM Runtime → Ollama
preset. Test connection. Done.

**Why does `localhost` not work on Android?**
On Android, `localhost` means *the phone*, not your computer. To
talk to a model server on your computer, point the app at your
computer's LAN IP (e.g. `http://192.168.1.10:11434/v1`). Make sure
the server is listening on `0.0.0.0`, not just `127.0.0.1`. See
[First-Run Setup](First-Run-Setup#3-special-case-connecting-from-the-android-app).

**How do I use OpenAI?**
Settings → LLM Runtime → OpenAI preset → paste your API key →
Test connection. Costs are tracked under
[Cost Tracking](Cost-Tracking).

**Where's my API key stored?**
- Android: `@capacitor/preferences` (app-private SharedPreferences).
- Web: IndexedDB via the secure KV path. **Never** `localStorage`.
- Excluded from the main config blob; lives under its own KV key
  (`__llm_runtime_api_key__`). See [Privacy](Privacy).

**How do I switch providers?**
Settings → LLM Runtime → pick a different preset. Existing
conversations keep their per-conversation model overrides until you
change them.

---

## Models

**What's GGUF?**
The on-disk format used by `llama.cpp`-family runtimes (Ollama,
LM Studio, llama-server). It bundles weights, tokenizer, and
metadata. See [Glossary](Glossary).

**Why quantize?**
Quantization (Q4 / Q5 / Q8 …) shrinks the model so it fits in less
RAM/VRAM and runs faster, at some quality cost. Q4_K_M is a popular
balance. See [Models → Quantization](Models#quantization).

**Which model fits my hardware?**
Open the [Hardware Optimizer](Hardware-Optimizer) — it scans your
device and recommends a profile. Or use the
[System Requirements](System-Requirements) table as a starting
point.

---

## Agents & workflows

**What can agents do?**
Anything you can express as "given a goal, plan a sequence of tool
calls". The 14 built-in tools cover math, time, web search, JSON
parsing, sentiment, summarisation, translation, file reading, API
calls, and more. See [Tools Reference](Tools-Reference).

**Are templates customizable?**
Yes — every template (agent or workflow) can be cloned and edited.
The original template stays read-only.

**Can workflows run offline?**
Workflow nodes that don't need the network (e.g. `calculator`,
`json_parser`, `validator`) — yes. Nodes that call your LLM endpoint
or hit external APIs need network. See
[Offline & Sync](Offline-and-Sync).

---

## Cost & budgets

**How are costs calculated for local models?**
Always $0. Token usage is still tracked so you can see how heavily
you're hammering your local hardware.

**Do budgets work with self-hosted endpoints?**
Token-based budgets do (limit by tokens-per-day). Dollar-based
budgets default to $0 spend on local models, so you'll only ever get
warned about hosted-API spend.

---

## Privacy

**Are conversations encrypted at rest?**
The app stores them via standard browser IndexedDB / Android
app-private files. Disk encryption is the OS's responsibility (most
modern phones encrypt by default; full-disk encryption on desktop is
your call). See [Privacy](Privacy).

**Can I export everything?**
Yes — Settings → Data → Export. JSON dump that includes
conversations, agents, workflows, settings. The API key is excluded
by default; you can opt in.

**Can I wipe everything?**
Yes — Settings → Data → Wipe all data. Includes the secure API key
if you tick that box.

**Is the F-Droid build identical to the GitHub-Releases APK?**
Same source. The F-Droid build flavor strips any Play-Services
hooks (it doesn't ship any today, but the flavor exists for future
safety). See [`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md).

---

## Performance

**Why is the app slow on my phone?**
Run the [Hardware Optimizer](Hardware-Optimizer) — it'll flip you
to the **Conservative** profile. Also reduce animation in
Settings → Appearance, and clear large IndexedDB caches in
Settings → Data.

**What does the hardware optimizer do?**
Detects your CPU/RAM/GPU/network/battery and recommends a
performance profile that tunes streaming chunk size, prefetching,
animation level, IDB cache cap, and concurrent agent runs. See
[Hardware Optimizer](Hardware-Optimizer).

---

## Mobile UX

**How do gestures work?**
- Swipe left/right between tabs (configurable in Appearance).
- Pull down at the top of the conversation list to refresh.
- Long-press a message for actions.
- Hardware back button: closes any open dialog/sheet first; from
  the home view, minimises the app rather than exits.

**Why doesn't \[feature X] work offline?**
Most things do; chat and HuggingFace browsing don't (they need a
live model server / HF API). See
[Offline & Sync → What does *not* work offline](Offline-and-Sync#what-does-not-work-offline).

---

## Still stuck?

- [Troubleshooting](Troubleshooting) — symptom → cause → fix table
- [Glossary](Glossary) — terms that come up a lot
- [Security](Security) — for vulnerability reports (private)
- Open an issue: https://github.com/smackypants/TrueAI/issues
