import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { kvStore, __resetKvStoreForTests } from './kv-store'

function makeTransaction(): {
  tx: IDBTransaction
  store: { put: (value: string, key: string) => void }
} {
  const store = {
    put: vi.fn(),
  }

  const tx = {
    oncomplete: null,
    onerror: null,
    onabort: null,
    objectStore: vi.fn(() => store),
  } as unknown as IDBTransaction

  return { tx, store }
}

function waitMicrotasks(times = 2): Promise<void> {
  let p = Promise.resolve()
  for (let i = 0; i < times; i++) {
    p = p.then(() => Promise.resolve())
  }
  return p.then(() => undefined)
}

describe('kvStore', () => {
  beforeEach(() => {
    __resetKvStoreForTests()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to localStorage on set/get when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)

    await kvStore.set('alpha', { ok: true })
    expect(window.localStorage.getItem('trueai-kv:alpha')).toBe('{"ok":true}')

    __resetKvStoreForTests()
    const value = await kvStore.get<{ ok: boolean }>('alpha')
    expect(value).toEqual({ ok: true })
  })

  it('does not write to localStorage when using setSecure and IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)

    await kvStore.setSecure('__llm_runtime_api_key__', 'secret')
    expect(window.localStorage.getItem('trueai-kv:__llm_runtime_api_key__')).toBeNull()
    expect(kvStore.peek('__llm_runtime_api_key__')).toBe('secret')
  })

  it('does not fall back to localStorage when IndexedDB transaction errors in setSecure', async () => {
    const { tx } = makeTransaction()

    const db = {
      transaction: vi.fn(() => tx),
    } as unknown as IDBDatabase

    const open = vi.fn(() => {
      const req: Partial<IDBOpenDBRequest> = {
        result: db,
      }

      queueMicrotask(() => {
        req.onsuccess?.(new Event('success'))
      })

      return req as IDBOpenDBRequest
    })

    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    const lsSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    const promise = kvStore.setSecure('secure', { token: 'abc' })
    await waitMicrotasks(3)

    ;(tx.onerror as unknown as ((ev: Event) => void) | null)?.(new Event('error'))
    await promise

    expect(lsSpy).not.toHaveBeenCalled()
    expect(kvStore.peek('secure')).toEqual({ token: 'abc' })
  })

  it('returns undefined for unknown keys (localStorage fallback path)', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const value = await kvStore.get<string>('missing')
    expect(value).toBeUndefined()
  })

  it('serves subsequent gets from the in-memory cache after first hydration', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await kvStore.set('cached', 42)

    const lsSpy = vi.spyOn(window.localStorage.__proto__, 'getItem')
    const value = await kvStore.get<number>('cached')
    expect(value).toBe(42)
    // Memory cache hit: no localStorage read should occur for the second get.
    expect(lsSpy).not.toHaveBeenCalled()
  })

  it('delete removes the value, notifies subscribers, and re-get returns undefined', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await kvStore.set('toDelete', 'v')
    expect(window.localStorage.getItem('trueai-kv:toDelete')).toBe('"v"')

    const listener = vi.fn()
    kvStore.subscribe('toDelete', listener)

    await kvStore.delete('toDelete')

    expect(listener).toHaveBeenCalledWith(undefined)
    expect(window.localStorage.getItem('trueai-kv:toDelete')).toBeNull()
    __resetKvStoreForTests()
    expect(await kvStore.get('toDelete')).toBeUndefined()
  })

  it('subscribe + set notifies and unsubscribe stops further notifications', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const listener = vi.fn()
    const unsubscribe = kvStore.subscribe('topic', listener)

    await kvStore.set('topic', 'first')
    expect(listener).toHaveBeenCalledWith('first')

    unsubscribe()
    await kvStore.set('topic', 'second')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notify swallows listener errors and keeps notifying others', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const throwing = vi.fn(() => {
      throw new Error('boom')
    })
    const ok = vi.fn()
    kvStore.subscribe('multi', throwing)
    kvStore.subscribe('multi', ok)

    await kvStore.set('multi', 1)

    expect(throwing).toHaveBeenCalledWith(1)
    expect(ok).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('getOrSet writes initialValue when key is absent and returns existing value otherwise', async () => {
    vi.stubGlobal('indexedDB', undefined)

    const first = await kvStore.getOrSet('seed', 'init')
    expect(first).toBe('init')
    expect(window.localStorage.getItem('trueai-kv:seed')).toBe('"init"')

    const second = await kvStore.getOrSet('seed', 'other')
    expect(second).toBe('init')
  })

  it('peek returns undefined for unhydrated keys and the cached value otherwise', async () => {
    vi.stubGlobal('indexedDB', undefined)
    expect(kvStore.peek('peeked')).toBeUndefined()
    await kvStore.set('peeked', { x: 1 })
    expect(kvStore.peek<{ x: number }>('peeked')).toEqual({ x: 1 })
  })

  it('keys() returns the localStorage prefix-stripped keys when IDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)
    await kvStore.set('alpha', 1)
    await kvStore.set('beta', 2)
    const k = await kvStore.keys()
    expect(k).toEqual(expect.arrayContaining(['alpha', 'beta']))
  })

  it('writes through IndexedDB when available and survives __resetKvStoreForTests', async () => {
    // Use a real IDB request shim that completes the put transaction.
    const stored = new Map<string, string>()
    const open = vi.fn(() => {
      const req: Partial<IDBOpenDBRequest> = {}
      queueMicrotask(() => {
        const fakeDb = {
          transaction: () => {
            const tx: Partial<IDBTransaction> & { _trigger?: () => void } = {}
            const store = {
              put: (value: string, key: string) => {
                stored.set(String(key), String(value))
                queueMicrotask(() => {
                  ;(tx.oncomplete as unknown as ((e: Event) => void) | null)?.(new Event('complete'))
                })
                return {} as IDBRequest
              },
              get: (key: string) => {
                const r: Partial<IDBRequest<unknown>> & { result?: unknown } = {}
                queueMicrotask(() => {
                  r.result = stored.get(String(key))
                  ;(r.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
                })
                return r as IDBRequest<unknown>
              },
              getAllKeys: () => {
                const r: Partial<IDBRequest<IDBValidKey[]>> & { result?: IDBValidKey[] } = {}
                queueMicrotask(() => {
                  r.result = Array.from(stored.keys())
                  ;(r.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
                })
                return r as IDBRequest<IDBValidKey[]>
              },
              delete: (key: string) => {
                stored.delete(String(key))
                queueMicrotask(() => {
                  ;(tx.oncomplete as unknown as ((e: Event) => void) | null)?.(new Event('complete'))
                })
                return {} as IDBRequest
              },
            }
            tx.objectStore = vi.fn(() => store) as unknown as IDBTransaction['objectStore']
            return tx as IDBTransaction
          },
        } as unknown as IDBDatabase
        ;(req as unknown as { result: IDBDatabase }).result = fakeDb
        ;(req.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
      })
      return req as IDBOpenDBRequest
    })

    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('idb-key', { hello: 'world' })
    __resetKvStoreForTests()

    const value = await kvStore.get<{ hello: string }>('idb-key')
    expect(value).toEqual({ hello: 'world' })

    const keys = await kvStore.keys()
    expect(keys).toContain('idb-key')

    await kvStore.delete('idb-key')
    __resetKvStoreForTests()
    expect(await kvStore.get('idb-key')).toBeUndefined()
  })
})
