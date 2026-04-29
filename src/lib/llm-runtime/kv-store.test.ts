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
})
