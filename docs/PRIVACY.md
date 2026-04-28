# Privacy Policy — TrueAI LocalAI

_Last updated: 2026-04-28_

TrueAI LocalAI ("the app") is an open-source mobile and web client
for OpenAI-compatible language-model APIs. This document describes
exactly what data the app handles and where it goes.

## 1. Who we are

The app is developed by the TrueAI LocalAI contributors and
distributed under the [MIT License](../LICENSE) via:

* Google Play Store (`com.trueai.localai`)
* F-Droid (official repository, package `com.trueai.localai`)
* GitHub Releases (sideloadable APK)
* Source code: <https://github.com/smackypants/trueai-localai>

There is no operator-run backend. The developers do not receive,
store, or process any user data.

## 2. Data the developer collects

**None.** The app does not include analytics SDKs, advertising SDKs,
or any telemetry that reports to the developer or any third party
under our control by default.

If a future build enables optional crash reporting, it will be:

* off by default,
* gated behind an explicit Settings toggle,
* documented here before shipping.

## 3. Data stored on your device

The following data is stored locally on your device and never
transmitted by the app to the developer:

| Data | Where it is stored | Purpose |
|------|-------------------|---------|
| LLM API key | Capacitor Secure Preferences (Android) / IndexedDB (web) under key `__llm_runtime_api_key__` | Authenticate with the LLM endpoint you configure |
| LLM runtime config (provider, base URL, default model, sampling defaults) | IndexedDB key `__llm_runtime_config__` | Remember your endpoint settings |
| Conversation history, agents, models, app settings, active tab | IndexedDB via the local KV store | Restore your session across app launches |

API keys are written using a secure-storage abstraction that **never**
falls back to plain `localStorage` even if IndexedDB transactions
fail; see [`src/lib/llm-runtime/kv-store.ts`](../src/lib/llm-runtime/kv-store.ts)
and the regression test [`kv-store.test.ts`](../src/lib/llm-runtime/kv-store.test.ts).

You can erase this data at any time by:

* clearing the app's storage from Android Settings → Apps → TrueAI
  LocalAI → Storage → Clear data, or
* uninstalling the app, or
* on the web, clearing site data for the origin you serve the app
  from.

## 4. Data sent to third parties

The only network destination the app contacts under normal use is
**the LLM endpoint that you configure** in Settings → LLM Runtime.

When you send a chat message, the app makes an HTTPS request to that
endpoint containing:

* the conversation messages you have authored,
* any system prompt / agent definition you have configured,
* the API key you provided (sent as a request header),
* sampling parameters (temperature, top-p, etc.).

The endpoint operator's privacy policy applies to that data. If you
point the app at a self-hosted local server (e.g. `llama.cpp`,
`Ollama`, `LM Studio`, `vLLM`, `text-generation-webui` running on
your own machine or LAN), no data leaves your network.

The app may also fetch `/runtime.config.json` from the origin it
itself was loaded from, to read default LLM settings. This file is
served from the same host as the app and contains no personal data.

## 5. Permissions used on Android

| Android permission | Why the app requests it |
|--------------------|------------------------|
| `INTERNET`, `ACCESS_NETWORK_STATE` | Send chat requests to the LLM endpoint you configure; show offline state |
| `VIBRATE` | Haptic feedback for UI interactions (via `@capacitor/haptics`) |
| `POST_NOTIFICATIONS` | Show local notifications you schedule from inside the app (Android 13+) |
| `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` | Allow scheduled local notifications to fire on time, including after device reboot |

The app does **not** request, and does not use:

* the microphone, camera, contacts, calendar, location, SMS, or
  call-log permissions;
* any device-admin or accessibility-service permission;
* background-location or "all-files-access" permissions.

## 6. Children

The app is not directed to children under 13 (or the equivalent
minimum age in your jurisdiction). It does not knowingly collect
personal information from children.

## 7. Changes to this policy

Material changes will be reflected in the "Last updated" date at the
top of this file and called out in the release CHANGELOG.

## 8. Contact

Open an issue at
<https://github.com/smackypants/trueai-localai/issues> for any
privacy-related question.
