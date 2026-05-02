# First-Run Setup

> *Audience: end user · Last reviewed: 2026-05-02*

After [installing](Installation), TrueAI needs to know **where to send
your chat messages**. The app does not embed any model — it talks to a
model server you control. This page walks through that one-time
setup.

---

## 1. Open the LLM Runtime panel

**Settings (⚙️) → LLM Runtime**

<!-- SCREENSHOT: settings → llm runtime panel -->

You'll see:

- A **Provider preset** dropdown (Ollama / llama.cpp / LM Studio / OpenAI / Anthropic / Google / Custom)
- A **Base URL** field (auto-filled from the preset; editable)
- A **Default model** field
- An **API key** field (only relevant for hosted providers)
- A **Test connection** button

---

## 2. Pick a provider preset

| Preset | Default base URL | Default model | Notes |
| --- | --- | --- | --- |
| **Ollama** | `http://localhost:11434/v1` | `llama3.2` | Best zero-config local option. `ollama serve` + `ollama pull llama3.2`. |
| **llama.cpp `llama-server`** | `http://localhost:8080/v1` | (server-loaded) | Pass your GGUF with `--model`. |
| **LM Studio** | `http://localhost:1234/v1` | (server-loaded) | Enable the OpenAI-compatible server in LM Studio. |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` | Requires API key. |
| **Anthropic** | `https://api.anthropic.com/v1` | `claude-3-5-haiku-latest` | Requires API key. |
| **Google** | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.0-flash` | Requires API key. |
| **Custom** | (you fill it in) | (you fill it in) | Any OpenAI-compatible endpoint. |

> Defaults can also be baked into the APK at build time by editing
> the `llm` block of
> [`public/runtime.config.json`](https://github.com/smackypants/TrueAI/blob/main/public/runtime.config.json).
> See [LLM Runtime](LLM-Runtime) for the layered-config rules.

---

## 3. Special case: connecting from the Android app

`localhost` on Android refers to **the phone**, not your desktop /
home server. To talk to a server running on another machine on your
LAN, point the app at that machine's IP address instead.

```
http://192.168.1.10:11434/v1     # Ollama on a desktop in your LAN
```

Tips:

- Make sure your model server is **listening on `0.0.0.0`** (or the
  LAN IP), not just `127.0.0.1`. Ollama: `OLLAMA_HOST=0.0.0.0 ollama serve`.
- If the test fails, check your desktop firewall — port 11434 (Ollama),
  8080 (llama.cpp), 1234 (LM Studio).
- If you're on a hostile network (public Wi-Fi), prefer to run the
  server on the same device or use a Tailscale / WireGuard tunnel.

---

## 4. Test the connection

Click **Test connection**. The app probes `{baseUrl}/models` and lists
the models the server reports. If you see your model in the list, you're
done.

A failure looks like:

- **Network error** → wrong URL, server not running, firewall blocking.
- **404 / 405** → server doesn't expose the OpenAI-compatible
  `/models` endpoint at this URL — double-check the path (most
  providers want `/v1` at the end).
- **401 / 403** → API key missing or wrong (hosted providers).

See [Troubleshooting → "Test connection" timeout](Troubleshooting) for
the full table.

---

## 5. Where your API key is stored

If you entered an API key for a hosted provider, the key is persisted
**securely**:

- **On Android** — via `@capacitor/preferences` (app-private
  SharedPreferences, encrypted-at-rest by Android keystore on modern
  devices).
- **On the web** — via IndexedDB. **Never `localStorage`** — that's a
  hard security invariant enforced by `kvStore.setSecure()` (and
  guarded by a regression test).

The main config blob (`__llm_runtime_config__`) explicitly **excludes**
the API key. The key lives under its own KV entry,
`__llm_runtime_api_key__`, written via the secure path.

> Internals: see [LLM Runtime](LLM-Runtime) and
> [State & Persistence](State-and-Persistence). For the security
> rationale, see the kv-store invariant documented in
> [Privacy](Privacy).

---

## 6. Optional: bake defaults into your build

If you're building your own APK or self-hosting, edit
`public/runtime.config.json` **before** building:

```json
{
  "llm": {
    "provider": "ollama",
    "baseUrl": "http://192.168.1.10:11434/v1",
    "defaultModel": "llama3.2"
  }
}
```

Vite copies this file into `dist/`, and `cap sync` includes it in the
APK. The app fetches `/runtime.config.json` at runtime; values you
later set via Settings override these defaults (see
[LLM Runtime](LLM-Runtime) for the full layering rules).

---

## You're set

Head back to the **Chat** tab and send your first message. From here:

- **Use models without typing prompts** → [Prompt Templates](Chat#prompt-templates)
- **Run multi-step tasks** → [Agents](Agents)
- **Chain agents and tools visually** → [Workflows](Workflows)
- **See a model that doesn't fit your hardware?** → [Hardware Optimizer](Hardware-Optimizer)
- **Hosted provider — worried about cost?** → [Cost Tracking](Cost-Tracking)

---

## See also

- [Installation](Installation)
- [Settings](Settings)
- [LLM Runtime](LLM-Runtime) (developer-facing internals)
- [Privacy](Privacy)
- [End-User FAQ → LLM setup](FAQ-End-User#llm-setup)
