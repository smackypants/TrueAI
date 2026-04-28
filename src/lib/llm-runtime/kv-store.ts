/**
 * Local key-value store used as the on-device replacement for the GitHub
 * Spark KV service (`/_spark/kv/...`). Backed by IndexedDB with a transparent
 * `localStorage` fallback for environments where IndexedDB is unavailable
 * (e.g. some private-mode browsers or older WebViews).
 *
 * The store keeps an in-memory hot cache so subscribers always observe the
 * latest committed value synchronously after the first hydration, and offers
 * a tiny pub/sub channel so multiple `useKV` hooks observing the same key
 * stay in sync within a single tab.
 *
 * Values are JSON-serialised on write and JSON-parsed on read. Anything that
 * survives a round-trip through `JSON.stringify` is supported, matching the
 * behaviour of the Spark KV service it replaces.
 */

const DB_NAME = 'trueai-localai-kv'
const DB_VERSION = 1
const STORE_NAME = 'kv'
const LS_PREFIX = 'trueai-kv:'

type Listener = (value: unknown) => void

const memoryCache = new Map<string, unknown>()
const listeners = new Map<string, Set<Listener>>()
const hydratedKeys = new Set<string>()

let dbPromise: Promise<IDBDatabase | null> | null = null
let idbFallbackLogged = false

function logIdbFallback(reason: unknown): void {
  if (idbFallbackLogged) return
  idbFallbackLogged = true
  // Logged once per session at debug level so we don't spam in environments
  // (Capacitor WebView with disabled IDB, private-mode browsers, jsdom in
  // tests) where the localStorage fallback is the expected path.
  console.debug('[kv-store] IndexedDB unavailable, falling back to localStorage:', reason)
}

function hasIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        logIdbFallback(req.error)
        resolve(null)
      }
      req.onblocked = () => resolve(null)
    } catch (err) {
      logIdbFallback(err)
      resolve(null)
    }
  })
  return dbPromise
}

function lsGet<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + key)
    if (raw === null) return undefined
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled — best-effort persistence only.
  }
}

function lsDelete(key: string): void {
  try {
    window.localStorage.removeItem(LS_PREFIX + key)
  } catch {
    // ignore
  }
}

function lsKeys(): string[] {
  try {
    const out: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(LS_PREFIX)) out.push(k.slice(LS_PREFIX.length))
    }
    return out
  } catch {
    return []
  }
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  if (!db) return lsGet<T>(key)
  return new Promise<T | undefined>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => {
        const raw = req.result as string | undefined
        if (raw === undefined) {
          resolve(undefined)
          return
        }
        try {
          resolve(JSON.parse(raw) as T)
        } catch {
          resolve(undefined)
        }
      }
      req.onerror = () => resolve(lsGet<T>(key))
    } catch {
      resolve(lsGet<T>(key))
    }
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const serialised = JSON.stringify(value)
  const db = await openDb()
  if (!db) {
    lsSet(key, value)
    return
  }
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(serialised, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => {
        lsSet(key, value)
        resolve()
      }
      tx.onabort = () => {
        lsSet(key, value)
        resolve()
      }
    } catch {
      lsSet(key, value)
      resolve()
    }
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  if (!db) {
    lsDelete(key)
    return
  }
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => {
        lsDelete(key)
        resolve()
      }
      tx.onabort = () => {
        lsDelete(key)
        resolve()
      }
    } catch {
      lsDelete(key)
      resolve()
    }
  })
}

async function idbKeys(): Promise<string[]> {
  const db = await openDb()
  if (!db) return lsKeys()
  return new Promise<string[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAllKeys()
      req.onsuccess = () => {
        const keys = (req.result as IDBValidKey[]).map((k) => String(k))
        resolve(keys)
      }
      req.onerror = () => resolve(lsKeys())
    } catch {
      resolve(lsKeys())
    }
  })
}

function notify(key: string, value: unknown): void {
  const set = listeners.get(key)
  if (!set) return
  for (const l of set) {
    try {
      l(value)
    } catch (err) {
      console.error('[kv-store] listener threw:', err)
    }
  }
}

export interface KvStore {
  get<T = unknown>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  /**
   * Like `set`, but persists ONLY to IndexedDB. Falls back to in-memory
   * only (no localStorage write) when IDB is unavailable. Use for
   * sensitive material such as API keys.
   */
  setSecure(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
  /**
   * Get the cached value if it has been hydrated already, without performing
   * an async read. Returns `undefined` if not loaded or not present.
   */
  peek<T = unknown>(key: string): T | undefined
  /**
   * Get the existing value, or write `initialValue` and return it if absent.
   * Mirrors Spark's `getOrSetKey` semantics.
   */
  getOrSet<T>(key: string, initialValue: T): Promise<T>
  subscribe(key: string, listener: Listener): () => void
}

export const kvStore: KvStore = {
  async get<T = unknown>(key: string): Promise<T | undefined> {
    if (hydratedKeys.has(key)) {
      return memoryCache.get(key) as T | undefined
    }
    const value = await idbGet<T>(key)
    memoryCache.set(key, value)
    hydratedKeys.add(key)
    return value
  },

  async set(key: string, value: unknown): Promise<void> {
    memoryCache.set(key, value)
    hydratedKeys.add(key)
    notify(key, value)
    await idbSet(key, value)
  },

  /**
   * Persist a value, but ONLY to IndexedDB — never the localStorage
   * fallback. Use this for sensitive material (API keys, tokens) so a
   * device without IDB simply forgets the value on reload rather than
   * writing it to the lower-trust, world-readable localStorage origin
   * partition. Mitigates CodeQL js/clear-text-storage-of-sensitive-data
   * for the localStorage path.
   *
   * Note: this method MUST NOT delegate to `idbSet`, which falls through
   * to localStorage on transaction failure. We do an inline IDB write
   * with no fallback so a failed write simply leaves the value in the
   * in-memory cache for this page load.
   */
  async setSecure(key: string, value: unknown): Promise<void> {
    memoryCache.set(key, value)
    hydratedKeys.add(key)
    notify(key, value)
    const db = await openDb()
    if (!db) return
    const serialised = JSON.stringify(value)
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(serialised, key)
        tx.oncomplete = () => resolve()
        // Critical: on error/abort we resolve WITHOUT a localStorage
        // fallback so sensitive material never lands in localStorage.
        tx.onerror = () => resolve()
        tx.onabort = () => resolve()
      } catch {
        resolve()
      }
    })
  },

  async delete(key: string): Promise<void> {
    memoryCache.delete(key)
    hydratedKeys.add(key)
    notify(key, undefined)
    await idbDelete(key)
  },

  async keys(): Promise<string[]> {
    return idbKeys()
  },

  peek<T = unknown>(key: string): T | undefined {
    return memoryCache.get(key) as T | undefined
  },

  async getOrSet<T>(key: string, initialValue: T): Promise<T> {
    const existing = (await kvStore.get(key)) as T | undefined
    if (existing !== undefined) return existing
    await kvStore.set(key, initialValue)
    return initialValue
  },

  subscribe(key: string, listener: Listener): () => void {
    let set = listeners.get(key)
    if (!set) {
      set = new Set()
      listeners.set(key, set)
    }
    set.add(listener)
    return () => {
      const s = listeners.get(key)
      if (!s) return
      s.delete(listener)
      if (s.size === 0) listeners.delete(key)
    }
  },
}

/**
 * Test-only helper: wipes the in-memory cache and listener registry so
 * each unit test starts from a clean slate. Does not touch IndexedDB.
 */
export function __resetKvStoreForTests(): void {
  memoryCache.clear()
  listeners.clear()
  hydratedKeys.clear()
  dbPromise = null
  idbFallbackLogged = false
}
