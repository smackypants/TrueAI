/**
 * Branch-coverage gap-fill for `src/lib/indexeddb.ts`.
 *
 * The existing `indexeddb.test.ts` covers all happy paths via fake-indexeddb.
 * This file fills the remaining branches: every `request.onerror` /
 * `transaction.onerror` reject path, the `init()` request.onerror path, the
 * actual `cleanup()` body (when cacheSize ≥ threshold), and the
 * `updateMetadata` try/catch error arm.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { indexedDBManager, initIndexedDB } from './indexeddb'
import type { Conversation, Message } from './types'

function makeConversation(id: string, overrides: Partial<Conversation> = {}): Conversation {
  return {
    id,
    title: `Conversation ${id}`,
    model: 'gpt-test',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  }
}

function makeMessage(id: string, conversationId: string): Message {
  return {
    id,
    conversationId,
    role: 'user',
    content: `msg ${id}`,
    timestamp: 1700000000000,
  }
}

/**
 * Build a fake `db` whose every transaction/request fires `onerror` on the
 * next microtask. Used to exercise every `reject(request.error)` /
 * `reject(transaction.error)` arm in the production code.
 */
function installFailingDb(): () => void {
  const original = (indexedDBManager as unknown as { db: IDBDatabase | null }).db
  const err = new DOMException('boom', 'UnknownError')

  function failingRequest(): IDBRequest {
    const req = {
      result: undefined as unknown,
      error: err,
      onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
    } as unknown as IDBRequest
    queueMicrotask(() => {
      req.onerror?.call(req, new Event('error'))
    })
    return req
  }

  function failingStore(): IDBObjectStore {
    const store = {
      put: () => failingRequest(),
      get: () => failingRequest(),
      getAll: () => failingRequest(),
      delete: () => failingRequest(),
      clear: () => failingRequest(),
      count: () => failingRequest(),
      index: () => ({
        getAll: () => failingRequest(),
        openCursor: () => failingRequest(),
        get: () => failingRequest(),
      }),
    } as unknown as IDBObjectStore
    return store
  }

  const fakeDb = {
    transaction: () => {
      const tx = {
        error: err,
        oncomplete: null as ((this: IDBTransaction, ev: Event) => unknown) | null,
        onerror: null as ((this: IDBTransaction, ev: Event) => unknown) | null,
        objectStore: () => failingStore(),
      } as unknown as IDBTransaction
      queueMicrotask(() => {
        ;(tx as unknown as { onerror: ((ev: Event) => unknown) | null }).onerror?.(new Event('error'))
      })
      return tx
    },
    close: () => {},
  } as unknown as IDBDatabase

  ;(indexedDBManager as unknown as { db: IDBDatabase | null }).db = fakeDb
  return () => {
    ;(indexedDBManager as unknown as { db: IDBDatabase | null }).db = original
  }
}

describe('indexedDBManager — error reject paths', () => {
  let restoreDb: (() => void) | null = null
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Init succeeds first so `db` is non-null; tests then swap it for a
    // failing fake so subsequent transactions reject.
    await indexedDBManager.init()
  })

  afterEach(() => {
    restoreDb?.()
    restoreDb = null
    indexedDBManager.close()
    errorSpy.mockRestore()
  })

  it('cacheConversation rejects when the put request errors', async () => {
    restoreDb = installFailingDb()
    await expect(
      indexedDBManager.cacheConversation(makeConversation('x')),
    ).rejects.toBeInstanceOf(DOMException)
  })

  it('getCachedConversation rejects when the get request errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.getCachedConversation('x')).rejects.toBeInstanceOf(DOMException)
  })

  it('getAllCachedConversations rejects when getAll errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.getAllCachedConversations()).rejects.toBeInstanceOf(DOMException)
  })

  it('cacheMessage rejects when the put request errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.cacheMessage(makeMessage('m', 'c'))).rejects.toBeInstanceOf(
      DOMException,
    )
  })

  it('cacheMessages rejects when the put request errors', async () => {
    restoreDb = installFailingDb()
    await expect(
      indexedDBManager.cacheMessages([makeMessage('m', 'c')]),
    ).rejects.toBeInstanceOf(DOMException)
  })

  it('getCachedMessages rejects when the index getAll errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.getCachedMessages('c')).rejects.toBeInstanceOf(DOMException)
  })

  it('deleteConversationCache rejects when the transaction errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.deleteConversationCache('c')).rejects.toBeInstanceOf(
      DOMException,
    )
  })

  it('deleteMessageCache rejects when the delete request errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.deleteMessageCache('m')).rejects.toBeInstanceOf(DOMException)
  })

  it('getCacheSize rejects when the transaction errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.getCacheSize()).rejects.toBeInstanceOf(DOMException)
  })

  it('getCacheStats rejects when the transaction errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.getCacheStats()).rejects.toBeInstanceOf(DOMException)
  })

  it('clearAll rejects when the transaction errors', async () => {
    restoreDb = installFailingDb()
    await expect(indexedDBManager.clearAll()).rejects.toBeInstanceOf(DOMException)
  })

  it('exportCache rejects when the messages getAll errors', async () => {
    // exportCache awaits getAllCachedConversations first (uses real db), then
    // opens a separate transaction whose getAll we want to fail. Easiest path
    // is to swap to the failing db AFTER the conversations call returns —
    // but that's racy. Instead, install the failing db now: the inner
    // getAllCachedConversations call rejects first via its own onerror.
    restoreDb = installFailingDb()
    await expect(indexedDBManager.exportCache()).rejects.toBeInstanceOf(DOMException)
  })

  it('importCache rejects when the transaction errors', async () => {
    restoreDb = installFailingDb()
    await expect(
      indexedDBManager.importCache({
        conversations: [makeConversation('c')],
        messages: [makeMessage('m', 'c')],
      }),
    ).rejects.toBeInstanceOf(DOMException)
  })
})

describe('indexedDBManager — init() onerror', () => {
  afterEach(() => {
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
  })

  it('init() rejects when indexedDB.open fires onerror', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new DOMException('open failed', 'UnknownError')
    const fakeRequest = {
      result: undefined as unknown,
      error: err,
      onsuccess: null as ((ev: Event) => unknown) | null,
      onerror: null as ((ev: Event) => unknown) | null,
      onupgradeneeded: null as ((ev: Event) => unknown) | null,
    }
    const fakeFactory = {
      open: () => {
        queueMicrotask(() => fakeRequest.onerror?.(new Event('error')))
        return fakeRequest as unknown as IDBOpenDBRequest
      },
    } as unknown as IDBFactory
    indexedDBManager.close()
    globalThis.indexedDB = fakeFactory
    await expect(indexedDBManager.init()).rejects.toBeInstanceOf(DOMException)
    expect(errorSpy).toHaveBeenCalledWith('IndexedDB failed to open:', err)
    errorSpy.mockRestore()
  })

  it('initIndexedDB swallows an open() onerror rejection', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fakeRequest = {
      error: new DOMException('open failed', 'UnknownError'),
      onsuccess: null as ((ev: Event) => unknown) | null,
      onerror: null as ((ev: Event) => unknown) | null,
      onupgradeneeded: null as ((ev: Event) => unknown) | null,
    }
    const fakeFactory = {
      open: () => {
        queueMicrotask(() => fakeRequest.onerror?.(new Event('error')))
        return fakeRequest as unknown as IDBOpenDBRequest
      },
    } as unknown as IDBFactory
    indexedDBManager.close()
    globalThis.indexedDB = fakeFactory
    await expect(initIndexedDB()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('Failed to initialize IndexedDB:', expect.any(DOMException))
    errorSpy.mockRestore()
  })
})

describe('indexedDBManager — cleanup() above threshold', () => {
  beforeEach(async () => {
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
    await indexedDBManager.init()
  })

  afterEach(() => {
    indexedDBManager.close()
    vi.restoreAllMocks()
  })

  it('runs the deletion cursors and updates metadata when cacheSize ≥ threshold', async () => {
    // Seed an old conversation + an old message (timestamps below the cutoff).
    const oldTs = Date.now() - 60 * 24 * 60 * 60 * 1000 // 60 days ago
    const recentTs = Date.now()

    // Seed via direct put so we can control the timestamp.
    const db = (indexedDBManager as unknown as { db: IDBDatabase }).db
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['conversations', 'messages'], 'readwrite')
      tx.objectStore('conversations').put({
        id: 'old-c',
        data: makeConversation('old-c'),
        timestamp: oldTs,
        size: 100,
      })
      tx.objectStore('conversations').put({
        id: 'new-c',
        data: makeConversation('new-c'),
        timestamp: recentTs,
        size: 100,
      })
      tx.objectStore('messages').put({
        id: 'old-m',
        conversationId: 'old-c',
        data: makeMessage('old-m', 'old-c'),
        timestamp: oldTs,
      })
      tx.objectStore('messages').put({
        id: 'new-m',
        conversationId: 'new-c',
        data: makeMessage('new-m', 'new-c'),
        timestamp: recentTs,
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    // Force the size guard to pass so the cleanup body runs.
    vi.spyOn(indexedDBManager, 'getCacheSize').mockResolvedValue(100 * 1024 * 1024)

    await expect(indexedDBManager.cleanup()).resolves.toBeUndefined()

    // Old records pruned; recent records preserved.
    expect(await indexedDBManager.getCachedConversation('old-c')).toBeNull()
    expect(await indexedDBManager.getCachedConversation('new-c')).not.toBeNull()
    const newMsgs = await indexedDBManager.getCachedMessages('new-c')
    expect(newMsgs).toHaveLength(1)
    const oldMsgs = await indexedDBManager.getCachedMessages('old-c')
    expect(oldMsgs).toHaveLength(0)

    // Metadata was updated with isCleanup=true: lastCleanup should be set.
    const stats = await indexedDBManager.getCacheStats()
    expect(stats.lastCleanup).toBeDefined()
    expect(stats.lastCleanup).toBeGreaterThan(0)
  })
})

describe('syncToIndexedDB — error swallow', () => {
  beforeEach(() => {
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
  })
  afterEach(() => {
    indexedDBManager.close()
  })

  it('logs and swallows when underlying init throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const original = globalThis.indexedDB
    globalThis.indexedDB = {
      open: () => {
        throw new Error('open boom')
      },
    } as unknown as IDBFactory
    indexedDBManager.close()
    // Need to import lazily so the local binding picks up the closed singleton.
    const { syncToIndexedDB } = await import('./indexeddb')
    await expect(
      syncToIndexedDB([makeConversation('c')], [makeMessage('m', 'c')]),
    ).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('Failed to sync to IndexedDB:', expect.any(Error))
    globalThis.indexedDB = original
    indexedDBManager.close()
    errorSpy.mockRestore()
  })
})

describe('updateMetadata — existing-row branch', () => {
  beforeEach(async () => {
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
    await indexedDBManager.init()
  })
  afterEach(() => {
    indexedDBManager.close()
  })

  it('updates an existing metadata row when a second cache call lands on it', async () => {
    // First cacheConversation creates the metadata row; the second one must
    // hit the truthy `metadata ? {...spread} : ...` branch on line 419.
    await indexedDBManager.cacheConversation(makeConversation('c1'))
    await indexedDBManager.cacheConversation(makeConversation('c2'))
    // Give the fire-and-forget updateMetadata onsuccess a tick to land.
    await new Promise((r) => setTimeout(r, 10))
    // Read the metadata row directly from IDB to confirm itemCount > 1.
    const db = (indexedDBManager as unknown as { db: IDBDatabase }).db
    const row = await new Promise<{ itemCount: number } | undefined>((resolve, reject) => {
      const req = db.transaction('metadata', 'readonly').objectStore('metadata').get('conversations')
      req.onsuccess = () => resolve(req.result as { itemCount: number } | undefined)
      req.onerror = () => reject(req.error)
    })
    expect(row?.itemCount).toBeGreaterThanOrEqual(2)
  })
})
