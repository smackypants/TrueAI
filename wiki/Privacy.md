# Privacy

> Wiki-friendly summary of [`docs/PRIVACY.md`](https://github.com/smackypants/TrueAI/blob/main/docs/PRIVACY.md).
>
> *Audience: end user / contributor · Last reviewed: 2026-05-02*

> Canonical privacy policy:
> [`docs/PRIVACY.md`](https://github.com/smackypants/TrueAI/blob/main/docs/PRIVACY.md).
> When in doubt, that file wins.

---

## TL;DR

- **No telemetry.** None. Not optional, not opt-in, not even a
  diagnostic ping.
- **No analytics SDK.** None.
- **No third-party network calls** by default.
- The app talks **only** to the LLM endpoint *you* configure
  (Ollama / llama.cpp / LM Studio / OpenAI / Anthropic / Google /
  whatever).
- Your data lives **on your device**. You can export it. You can
  wipe it.

---

## Where data lives

| What | Web | Android |
| --- | --- | --- |
| Conversations, agents, workflows, settings | IndexedDB | App-private files (Capacitor Filesystem / Preferences) |
| API key | IndexedDB **only** (secure path; never `localStorage`) | App-private SharedPreferences via `@capacitor/preferences` |
| App shell (HTML, JS, CSS) | Cache Storage (service worker) | Bundled in the APK |
| Cost-tracking entries | IndexedDB | App-private files |
| Diagnostics blob | Built on demand; never sent anywhere automatically | same |

OS-level disk encryption is the OS's responsibility. Most modern
phones encrypt by default; full-disk encryption on desktops is your
choice.

---

## What leaves the device

| Outbound traffic | When | Where it goes |
| --- | --- | --- |
| Chat / agent / workflow LLM calls | When you trigger them | The LLM endpoint *you* configured |
| HuggingFace API (model browsing) | When you open the HF browser | `huggingface.co` (only if you use that feature) |
| `web_search` agent tool | When an agent calls it | The search endpoint *you* configured (none baked-in) |
| `api_caller` agent tool | When an agent calls it | Whatever URL the agent decides to hit |
| `image_generator` agent tool | When called | The image-gen endpoint *you* configured |
| Service-worker version check | On page load | The origin you loaded the app from (your own server, or a static-host of your APK) |

That's it. There is no analytics endpoint, no crash reporter, no
session beacon, no "hello, I'm online" call.

---

## Android permissions requested

| Permission | Why |
| --- | --- |
| Internet | Talk to your LLM endpoint |
| Network state | Detect online/offline transitions |
| Vibrate | Haptic feedback |
| Post notifications (Android 13+) | Agent completion alerts |
| Read/write Documents | Chat exports |

**Not requested:** location, microphone, camera, contacts, SMS,
phone, calendar.

See [Mobile & Android](Mobile-and-Android#permissions-requested).

---

## Your controls

- **Settings → Privacy → Incognito mode** — don't write
  conversations to disk for the current session.
- **Settings → Privacy → Retention** — auto-delete conversations
  older than N days.
- **Settings → Data → Export everything** — JSON dump of all your
  data. Excludes the API key by default; you can opt in.
- **Settings → Data → Wipe all data** — drops every TrueAI key,
  optionally including the secure API key.
- **Settings → Notifications → Quiet hours** — suppress all but
  critical alerts.
- **Settings → AI → endpoint allow-list / deny-list** — constrain
  which URLs `api_caller` can reach.

---

## Hardened invariants (cross-link)

The "no leak" promises are backed by tests, not just policy:

- The **secure KV** path never falls back to `localStorage`.
- The **API key** is excluded from the persisted main config blob.
- **`mergeConfig`** never returns the base reference (so the API
  key can't accidentally land in `DEFAULT_LLM_RUNTIME_CONFIG`).

See [Security → Hardened invariants](Security#hardened-invariants).

---

## F-Droid suitability

The F-Droid build flavor satisfies F-Droid's
[inclusion policy](https://f-droid.org/docs/Inclusion_Policy/):

- No proprietary dependencies
- No analytics
- Reproducible build recipe
- All assets / code under FOSS licenses

See [`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md).

---

## Reporting concerns

For privacy-relevant *security* issues (e.g. a leak through a code
path you discovered), use the private channels in
[Security](Security). For general questions, open an issue.

---

## See also

- [Security](Security)
- [Settings → Privacy](Settings#privacy)
- [Settings → Data](Settings#data)
- [Mobile & Android → Permissions](Mobile-and-Android#permissions-requested)
- Canonical: [`docs/PRIVACY.md`](https://github.com/smackypants/TrueAI/blob/main/docs/PRIVACY.md)
