# Chat

> Multi-conversation chat interface with streaming, prompt templates, search, filters, and export.
>
> *Audience: end user · Last reviewed: 2026-05-02*

The **Chat** tab is the default view when you open TrueAI. It's a
full-featured chat client backed by whatever LLM you configured in
[First-Run Setup](First-Run-Setup).

---

## At a glance

| Feature | Where | Notes |
| --- | --- | --- |
| Multi-conversation sidebar | Left rail | Each conversation persists locally in IndexedDB |
| Streaming responses | Main pane | Tokens render as they arrive |
| Per-conversation system prompt | Conversation Settings (gear icon) | Overrides the global default |
| Per-conversation model | Conversation Settings | Pin a specific model |
| Prompt templates | "Templates" button | Reusable prompt scaffolds |
| Search across all conversations | Magnifying-glass button | Indexed locally |
| Filters & sort | Filter button on sidebar | Date, model, tag |
| Export | Export dialog | Markdown / JSON |
| Message actions | Hover a message | Copy, regenerate, edit, delete |
| Mobile: pull-to-refresh | Top of sidebar | Re-syncs the conversation list |
| Mobile: swipe between tabs | Anywhere | Configurable in Settings |

<!-- SCREENSHOT: chat tab with sidebar, message bubbles, and templates open -->

---

## Conversations

### Creating one

Click **+ New Conversation** in the sidebar, or use the floating
action button on mobile. Each conversation gets:

- A title (auto-derived from the first message; renamable)
- A system prompt (defaults to the global one in Settings → AI)
- A model (defaults to the runtime default)
- A creation timestamp

State is persisted via the `useKV` hook (which writes to IndexedDB);
see [State & Persistence](State-and-Persistence) for the storage
layer.

### Streaming

Responses stream token-by-token using the same OpenAI-compatible
`/chat/completions` endpoint your provider exposes. The streaming
hook lives at `src/hooks/use-streaming-chat.ts`. If your server
supports server-sent events (Ollama, LM Studio, llama.cpp, OpenAI),
you'll see incremental tokens; if not, the full response arrives at
the end.

### Conversation Settings (per-conversation overrides)

Open the gear icon on any conversation:

- **System prompt** — pinned for this conversation.
- **Model** — overrides the runtime default.
- **Temperature, Top-P, Frequency / Presence penalty, Max tokens** —
  per-conversation overrides for the model parameters defined in
  [Models → Model Configuration](Models#model-configuration).
- **Tags** — used by the filter sidebar.

---

## Prompt Templates

Pre-canned prompts you can insert with one click. Built-in templates
cover summarisation, translation, code review, brainstorming,
explain-like-I'm-five, etc. You can:

- Add your own template (name, body, optional variables)
- Edit / delete custom templates
- Mark favourites

Templates are stored in KV under `prompt-templates`.

> See [Tools Reference](Tools-Reference) for the *agent* tool list,
> which is a separate concept from chat templates.

---

## Search

Click the magnifier in the sidebar header to open
[`ChatSearch`](https://github.com/smackypants/TrueAI/blob/main/src/components/chat/ChatSearch.tsx).
Searches are full-text against:

- Conversation titles
- Message content (both user and assistant)
- System prompts

Search is fully local — your messages never leave the device for
indexing.

---

## Filters & Sort

The filter bar above the conversation list supports:

- **Sort** — newest, oldest, alphabetical, most messages, recently active
- **Filter** — all, with tag X, by model, archived only, favourites only

See [`ConversationFilters`](https://github.com/smackypants/TrueAI/blob/main/src/components/chat/ConversationFilters.tsx).

---

## Export

The **Export** dialog supports:

- **Markdown** (single file with the system prompt + every turn)
- **JSON** (round-trippable; can be re-imported by Settings → Data)

Export uses the [native filesystem](Native-Layer) plugin on Android
(saves to *Documents/*) and a blob-download anchor on the web.

---

## Message actions

Hover (or long-press on mobile) any message:

- **Copy** to clipboard (uses Capacitor Clipboard on Android)
- **Regenerate** — re-runs the assistant turn with the same input
- **Edit** — for user turns; truncates the conversation forward
- **Delete** — single-message delete

See
[`MessageActions`](https://github.com/smackypants/TrueAI/blob/main/src/components/chat/MessageActions.tsx).

---

## Mobile niceties

- **Pull-to-refresh** at the top of the sidebar re-syncs the list.
- **Bottom navigation** keeps Chat / Agents / Workflows / Settings
  reachable with one thumb.
- **Floating action button** opens "New conversation" from any tab.
- **Safe-area aware** — content respects notches.

See [Mobile & Android](Mobile-and-Android) for the full mobile UX
behaviours.

---

## Common questions

- **Are conversations encrypted at rest?** Storage is local
  (IndexedDB on web, app-private files on Android). Disk encryption
  is the OS's responsibility — see [Privacy](Privacy).
- **Why does streaming stutter on my LAN?** See
  [Troubleshooting → streaming hiccups](Troubleshooting).
- **Can I delete *everything*?** Yes — Settings → Data → Wipe all
  data.

---

## See also

- [Models](Models) — what each parameter does
- [Settings](Settings) → AI for the global defaults
- [Settings](Settings) → Data for import / export / wipe
- Canonical: [`CHAT_FEATURES.md`](https://github.com/smackypants/TrueAI/blob/main/CHAT_FEATURES.md), [`FEATURES.md`](https://github.com/smackypants/TrueAI/blob/main/FEATURES.md)
