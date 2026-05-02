# State & Persistence

> How TrueAI persists every byte of state — UI prefs, conversations, agents, workflows, secrets — without a server.
>
> *Audience: developer · Last reviewed: 2026-05-02*

There are three storage layers, each with a clear job:

| Layer | API | Where | Used for |
| --- | --- | --- | --- |
| **`useKV` / `kvStore`** | `useKV(key, default)`, `kvStore.set/get/delete` | IndexedDB (web), Capacitor Preferences (native, secure) | Settings, lists, small structured state |
| **IndexedDB cache** | `useIndexedDBCache`, `indexedDBManager` | IndexedDB (custom stores) | Conversation bodies, large blobs, caches |
| **Service Worker cache** | Cache Storage API | Browser cache | App shell (HTML, JS, CSS, assets) |

For the LLM-runtime-specific config, also see [LLM Runtime](LLM-Runtime).

---

## `useKV`

The primary persistence hook. Reused everywhere.

```ts
const [value, setValue] = useKV<string>('active-tab', DEFAULT_TAB)
```

Behaviour:

- First render returns `default`.
- Async hydrate from KV; re-render with the persisted value.
- `setValue(next)` writes to KV and notifies listeners on the same
  page (and other windows / tabs).
- Validate before trusting persisted values — e.g. wrap with an
  `isTabName` guard so a renamed/removed value falls back cleanly
  (see `src/App.tsx`).

Source: `src/lib/llm-runtime/use-kv.ts` and the underlying store
in `src/lib/llm-runtime/kv-store.ts`. The hook is exported from
`@github/spark/hooks` (a Vite alias to the local shim).

---

## `kvStore` API

```ts
import { kvStore } from '@/lib/llm-runtime/kv-store'

await kvStore.get<string>('active-tab')
await kvStore.set('active-tab', 'chat')
await kvStore.setSecure('__llm_runtime_api_key__', 'sk-…')   // sensitive
await kvStore.delete('active-tab')
```

### `set` vs `setSecure`

- `set` — writes IndexedDB; on hard failure may fall through to
  `localStorage` (acceptable for non-sensitive values).
- `setSecure` — writes IndexedDB only (or Capacitor Preferences on
  native). On *any* failure it does **NOT** fall back to
  `localStorage`. The value remains in the in-memory cache for the
  current page lifetime and is lost on reload — better than leaking
  to disk in cleartext.

> The secure invariant is enforced by tests (`kv-store.test.ts`)
> and exists to satisfy CodeQL's
> `js/clear-text-storage-of-sensitive-data` rule. **Do not "fix" the
> three failure paths to write to `localStorage`.** They are silent
> on purpose.

---

## IndexedDB (large blobs)

`src/lib/indexeddb.ts` exposes a singleton `indexedDBManager` with
typed stores for conversations, attachments, etc. Used through
`useIndexedDBCache(storeName)`.

Pattern: every method is `await ensureDB() → new Promise(...) →
request.onsuccess / request.onerror`. Tests for the error arms swap
in a fake DB whose transactions fire `onerror` via `queueMicrotask`
— see `indexeddb.branches.test.ts`.

The **Cache Manager** UI (`IndexedDBCacheManager.tsx`) lets users see
sizes per store and purge.

---

## Listeners and hydration

`kvStore` keeps:

- An **in-memory cache** (latest value per key)
- A **listeners map** (component-level subscriptions)
- A **hydrated set** (so the same key isn't re-fetched twice)

When `kvStore.set` runs, it:

1. Updates the cache.
2. Persists to the appropriate backend.
3. Notifies subscribers via the listeners map.
4. Cross-tab notification is broadcast through a `BroadcastChannel`
   (where supported).

---

## Test helper: `__resetKvStoreForTests`

Exported from `kv-store.ts` (lines ~341-347). Clears the in-memory
cache, listeners, and hydratedKeys. **Required** in `beforeEach` for
any test that exercises `useKV` — without it, KV state leaks across
tests in the same file.

```ts
beforeEach(async () => {
  __resetKvStoreForTests()
  for (const key of ['my-key-1', 'my-key-2']) {
    await kvStore.delete(key)   // wipe the persisted IDB / localStorage too
  }
})
```

See `src/components/models/HardwareOptimizer.test.tsx` for the
canonical example.

---

## Importing & exporting all data

The Settings → Data panel calls `kvStore` to enumerate every
TrueAI-namespaced key, dump them as JSON, and (on import) write them
back. The export **excludes** the secure API key by default; you can
opt-in to include it.

See [Settings → Data](Settings#data) and
`src/components/settings/DataSettings.tsx`.

---

## See also

- [LLM Runtime](LLM-Runtime) — config layering on top of KV
- [Native Layer](Native-Layer) — secure storage on Android
- [Settings Reference](Settings-Reference) — every persisted KV key
- [Privacy](Privacy) — what stays on device
