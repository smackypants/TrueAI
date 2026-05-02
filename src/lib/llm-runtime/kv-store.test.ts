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

/**
 * Targeted branch-coverage tests for the IndexedDB error/abort/catch paths
 * and the localStorage exception paths. These mirror the production
 * fall-through behaviour: any IDB failure must fall back to localStorage
 * (except `setSecure`, which must NOT fall back so credentials never leak).
 */
describe('kvStore — IDB error & exception paths', () => {
  beforeEach(() => {
    __resetKvStoreForTests()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('openDb logs once and resolves null when indexedDB.open throws synchronously', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        throw new Error('open boom')
      }),
    } as unknown as IDBFactory)

    // get/set should still succeed via localStorage fallback.
    await kvStore.set('open-throws', { v: 1 })
    expect(window.localStorage.getItem('trueai-kv:open-throws')).toBe('{"v":1}')
    expect(debugSpy).toHaveBeenCalledWith(
      '[kv-store] IndexedDB unavailable, falling back to localStorage:',
      expect.any(Error),
    )

    // Second call must NOT log again (idbFallbackLogged guard).
    debugSpy.mockClear()
    __resetKvStoreForTests()
    await kvStore.set('open-throws-2', 'x')
    // First call after reset re-runs openDb and re-logs once.
    expect(debugSpy).toHaveBeenCalledTimes(1)
  })

  it('openDb resolves null on req.onerror and falls back to localStorage', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const open = vi.fn(() => {
      const req: Partial<IDBOpenDBRequest> & { error?: DOMException } = {
        error: new DOMException('idb denied', 'InvalidStateError'),
      }
      queueMicrotask(() => {
        ;(req.onerror as unknown as ((e: Event) => void) | null)?.(new Event('error'))
      })
      return req as IDBOpenDBRequest
    })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('onerror', 1)
    expect(window.localStorage.getItem('trueai-kv:onerror')).toBe('1')
    expect(debugSpy).toHaveBeenCalled()
  })

  it('openDb resolves null on req.onblocked', async () => {
    const open = vi.fn(() => {
      const req: Partial<IDBOpenDBRequest> = {}
      queueMicrotask(() => {
        ;(req.onblocked as unknown as ((e: Event) => void) | null)?.(new Event('blocked'))
      })
      return req as IDBOpenDBRequest
    })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('blocked', 'v')
    // Falls back to localStorage when the upgrade is blocked.
    expect(window.localStorage.getItem('trueai-kv:blocked')).toBe('"v"')
  })

  it('openDb runs onupgradeneeded and creates the object store when missing', async () => {
    const createdStores: string[] = []
    const open = vi.fn(() => {
      const stored = new Map<string, string>()
      const fakeDb = {
        objectStoreNames: {
          contains: (n: string) => createdStores.includes(n),
        },
        createObjectStore: (n: string) => {
          createdStores.push(n)
          return {} as IDBObjectStore
        },
        transaction: () => {
          const tx: Partial<IDBTransaction> = {}
          const store = {
            put: (value: string, key: string) => {
              stored.set(String(key), String(value))
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
      const req: Partial<IDBOpenDBRequest> & { result?: IDBDatabase } = {
        result: fakeDb,
      }
      queueMicrotask(() => {
        ;(req.onupgradeneeded as unknown as ((e: Event) => void) | null)?.(new Event('upgrade'))
        ;(req.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
      })
      return req as IDBOpenDBRequest
    })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('upgrade', 'v')
    expect(createdStores).toContain('kv')
  })

  it('lsGet returns undefined when localStorage.getItem throws', async () => {
    vi.stubGlobal('indexedDB', undefined)
    vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const value = await kvStore.get<string>('throws-on-get')
    expect(value).toBeUndefined()
  })

  it('lsKeys returns [] when localStorage iteration throws', async () => {
    vi.stubGlobal('indexedDB', undefined)
    vi.spyOn(window.localStorage.__proto__, 'key').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const keys = await kvStore.keys()
    expect(keys).toEqual([])
  })

  it('idbGet returns undefined when stored value is invalid JSON', async () => {
    const stored = new Map<string, string>([['bad', 'not-json{']])
    const open = makeFakeIdbOpen(stored)
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    const value = await kvStore.get<unknown>('bad')
    expect(value).toBeUndefined()
  })

  it('idbGet falls back to lsGet when get-request fires onerror', async () => {
    window.localStorage.setItem('trueai-kv:fallback', '"ls-value"')
    const open = makeFakeIdbOpen(new Map(), { getError: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    const value = await kvStore.get<string>('fallback')
    expect(value).toBe('ls-value')
  })

  it('idbGet falls back to lsGet when db.transaction throws', async () => {
    window.localStorage.setItem('trueai-kv:tx-throws', '"ls-fallback"')
    const open = makeFakeIdbOpen(new Map(), { transactionThrows: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    const value = await kvStore.get<string>('tx-throws')
    expect(value).toBe('ls-fallback')
  })

  it('idbSet falls back to localStorage on tx.onerror', async () => {
    const open = makeFakeIdbOpen(new Map(), { putErrors: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('put-errors', { x: 1 })
    expect(window.localStorage.getItem('trueai-kv:put-errors')).toBe('{"x":1}')
  })

  it('idbSet falls back to localStorage on tx.onabort', async () => {
    const open = makeFakeIdbOpen(new Map(), { putAborts: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('put-aborts', 7)
    expect(window.localStorage.getItem('trueai-kv:put-aborts')).toBe('7')
  })

  it('idbSet falls back to localStorage when db.transaction throws', async () => {
    const open = makeFakeIdbOpen(new Map(), { transactionThrows: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.set('set-tx-throws', 'v')
    expect(window.localStorage.getItem('trueai-kv:set-tx-throws')).toBe('"v"')
  })

  it('idbDelete falls back to localStorage on tx.onerror', async () => {
    window.localStorage.setItem('trueai-kv:del-errors', '"keep-or-clear"')
    const open = makeFakeIdbOpen(new Map(), { deleteErrors: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.delete('del-errors')
    expect(window.localStorage.getItem('trueai-kv:del-errors')).toBeNull()
  })

  it('idbDelete falls back to localStorage on tx.onabort', async () => {
    window.localStorage.setItem('trueai-kv:del-aborts', '"x"')
    const open = makeFakeIdbOpen(new Map(), { deleteAborts: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.delete('del-aborts')
    expect(window.localStorage.getItem('trueai-kv:del-aborts')).toBeNull()
  })

  it('idbDelete falls back to localStorage when db.transaction throws', async () => {
    window.localStorage.setItem('trueai-kv:del-tx', '"x"')
    const open = makeFakeIdbOpen(new Map(), { transactionThrows: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    await kvStore.delete('del-tx')
    expect(window.localStorage.getItem('trueai-kv:del-tx')).toBeNull()
  })

  it('idbKeys falls back to lsKeys on req.onerror', async () => {
    window.localStorage.setItem('trueai-kv:k1', '1')
    window.localStorage.setItem('trueai-kv:k2', '2')
    const open = makeFakeIdbOpen(new Map(), { keysError: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    const k = await kvStore.keys()
    expect(k).toEqual(expect.arrayContaining(['k1', 'k2']))
  })

  it('idbKeys falls back to lsKeys when db.transaction throws', async () => {
    window.localStorage.setItem('trueai-kv:k3', '3')
    const open = makeFakeIdbOpen(new Map(), { transactionThrows: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)

    const k = await kvStore.keys()
    expect(k).toContain('k3')
  })

  it('setSecure resolves silently on tx.onabort and does NOT write localStorage', async () => {
    const open = makeFakeIdbOpen(new Map(), { putAborts: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)
    const lsSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    await kvStore.setSecure('__llm_runtime_api_key__', 'aborted-secret')
    expect(lsSpy).not.toHaveBeenCalled()
    // Value remains in the in-memory cache for this page load.
    expect(kvStore.peek('__llm_runtime_api_key__')).toBe('aborted-secret')
  })

  it('setSecure resolves silently when db.transaction throws and does NOT write localStorage', async () => {
    const open = makeFakeIdbOpen(new Map(), { transactionThrows: true })
    vi.stubGlobal('indexedDB', { open } as unknown as IDBFactory)
    const lsSpy = vi.spyOn(window.localStorage.__proto__, 'setItem')

    await kvStore.setSecure('__llm_runtime_api_key__', 'throws-secret')
    expect(lsSpy).not.toHaveBeenCalled()
    expect(kvStore.peek('__llm_runtime_api_key__')).toBe('throws-secret')
  })

  it('subscribe unsubscribe is a no-op when the listener set was already cleared', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const unsubscribe = kvStore.subscribe('orphan', vi.fn())
    // Wipe the listeners map (and everything else).
    __resetKvStoreForTests()
    // Calling unsubscribe must not throw and must hit the early-return branch.
    expect(() => unsubscribe()).not.toThrow()
  })
})

/**
 * Build a fake `indexedDB.open` impl that returns a db with configurable
 * failure modes per request type. Centralised so the IDB-error tests above
 * stay focused on what they're asserting rather than wiring boilerplate.
 */
function makeFakeIdbOpen(
  stored: Map<string, string>,
  opts: {
    getError?: boolean
    putErrors?: boolean
    putAborts?: boolean
    deleteErrors?: boolean
    deleteAborts?: boolean
    keysError?: boolean
    transactionThrows?: boolean
  } = {},
): () => IDBOpenDBRequest {
  return () => {
    const fakeDb = {
      objectStoreNames: { contains: () => true },
      transaction: () => {
        if (opts.transactionThrows) throw new Error('tx denied')
        const tx: Partial<IDBTransaction> = {}
        const store = {
          put: (value: string, key: string) => {
            stored.set(String(key), String(value))
            queueMicrotask(() => {
              if (opts.putErrors) {
                ;(tx.onerror as unknown as ((e: Event) => void) | null)?.(new Event('error'))
              } else if (opts.putAborts) {
                ;(tx.onabort as unknown as ((e: Event) => void) | null)?.(new Event('abort'))
              } else {
                ;(tx.oncomplete as unknown as ((e: Event) => void) | null)?.(new Event('complete'))
              }
            })
            return {} as IDBRequest
          },
          get: (key: string) => {
            const r: Partial<IDBRequest<unknown>> & { result?: unknown } = {}
            queueMicrotask(() => {
              if (opts.getError) {
                ;(r.onerror as unknown as ((e: Event) => void) | null)?.(new Event('error'))
              } else {
                r.result = stored.get(String(key))
                ;(r.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
              }
            })
            return r as IDBRequest<unknown>
          },
          getAllKeys: () => {
            const r: Partial<IDBRequest<IDBValidKey[]>> & { result?: IDBValidKey[] } = {}
            queueMicrotask(() => {
              if (opts.keysError) {
                ;(r.onerror as unknown as ((e: Event) => void) | null)?.(new Event('error'))
              } else {
                r.result = Array.from(stored.keys())
                ;(r.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
              }
            })
            return r as IDBRequest<IDBValidKey[]>
          },
          delete: (key: string) => {
            stored.delete(String(key))
            queueMicrotask(() => {
              if (opts.deleteErrors) {
                ;(tx.onerror as unknown as ((e: Event) => void) | null)?.(new Event('error'))
              } else if (opts.deleteAborts) {
                ;(tx.onabort as unknown as ((e: Event) => void) | null)?.(new Event('abort'))
              } else {
                ;(tx.oncomplete as unknown as ((e: Event) => void) | null)?.(new Event('complete'))
              }
            })
            return {} as IDBRequest
          },
        }
        tx.objectStore = vi.fn(() => store) as unknown as IDBTransaction['objectStore']
        return tx as IDBTransaction
      },
    } as unknown as IDBDatabase
    const req: Partial<IDBOpenDBRequest> & { result?: IDBDatabase } = {
      result: fakeDb,
    }
    queueMicrotask(() => {
      ;(req.onsuccess as unknown as ((e: Event) => void) | null)?.(new Event('success'))
    })
    return req as IDBOpenDBRequest
  }
}
