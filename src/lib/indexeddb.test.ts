/**
 * Tests for src/lib/indexeddb.ts
 *
 * IMPORTANT: this file installs `fake-indexeddb/auto` LOCALLY (top of file)
 * and does NOT modify src/test/setup.ts. The shared setup intentionally
 * leaves `globalThis.indexedDB` unset so kv-store falls through to
 * localStorage silently — see the comment in src/test/setup.ts:48-60.
 *
 * Because indexedDBManager is a module-level singleton that caches an open
 * `db` handle, every test calls `indexedDBManager.close()` and resets the
 * fake-indexeddb backing store via `IDBFactory` so the upgrade path runs
 * fresh each time.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  indexedDBManager,
  initIndexedDB,
  syncToIndexedDB,
  loadFromIndexedDB,
} from './indexeddb'
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

function makeMessage(id: string, conversationId: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    conversationId,
    role: 'user',
    content: `msg ${id}`,
    timestamp: 1700000000000,
    ...overrides,
  }
}

describe('indexedDBManager (fake-indexeddb)', () => {
  beforeEach(() => {
    // Reset fake-indexeddb's backing store and the manager's cached handle
    // so every test starts with a fresh DB and exercises the upgrade path.
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(() => {
    indexedDBManager.close()
  })

  it('init creates the conversations/messages/metadata stores (upgrade path)', async () => {
    await indexedDBManager.init()
    // calling again is a no-op once `db` is set
    await indexedDBManager.init()
    const stats = await indexedDBManager.getCacheStats()
    expect(stats.conversations).toBe(0)
    expect(stats.messages).toBe(0)
    expect(stats.totalSize).toBe(0)
  })

  it('caches and retrieves a conversation by id', async () => {
    const conv = makeConversation('c1', { title: 'Hello' })
    await indexedDBManager.cacheConversation(conv)
    const got = await indexedDBManager.getCachedConversation('c1')
    expect(got).toEqual(conv)
    expect(await indexedDBManager.getCachedConversation('missing')).toBeNull()
  })

  it('returns all cached conversations sorted newest-first', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c-old'))
    // Force a different timestamp on the second put by waiting a tick.
    await new Promise(r => setTimeout(r, 5))
    await indexedDBManager.cacheConversation(makeConversation('c-new'))
    const all = await indexedDBManager.getAllCachedConversations()
    expect(all).toHaveLength(2)
    expect(all[0].id).toBe('c-new')
    expect(all[1].id).toBe('c-old')
  })

  it('caches a single message and many at once and reads them back per-conversation', async () => {
    await indexedDBManager.cacheMessage(makeMessage('m1', 'c1', { timestamp: 1 }))
    await indexedDBManager.cacheMessages([
      makeMessage('m2', 'c1', { timestamp: 3 }),
      makeMessage('m3', 'c1', { timestamp: 2 }),
      makeMessage('m4', 'c2', { timestamp: 1 }),
    ])
    const c1Msgs = await indexedDBManager.getCachedMessages('c1')
    // sorted ascending by timestamp
    expect(c1Msgs.map(m => m.id)).toEqual(['m1', 'm3', 'm2'])
    const c2Msgs = await indexedDBManager.getCachedMessages('c2')
    expect(c2Msgs.map(m => m.id)).toEqual(['m4'])
    const c3Msgs = await indexedDBManager.getCachedMessages('c3')
    expect(c3Msgs).toEqual([])
  })

  it('cacheMessages with empty array resolves immediately', async () => {
    await expect(indexedDBManager.cacheMessages([])).resolves.toBeUndefined()
  })

  it('deleteConversationCache removes the conversation and all its messages', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c1'))
    await indexedDBManager.cacheConversation(makeConversation('c2'))
    await indexedDBManager.cacheMessages([
      makeMessage('m1', 'c1'),
      makeMessage('m2', 'c1'),
      makeMessage('m3', 'c2'),
    ])

    await indexedDBManager.deleteConversationCache('c1')

    expect(await indexedDBManager.getCachedConversation('c1')).toBeNull()
    expect(await indexedDBManager.getCachedConversation('c2')).not.toBeNull()
    expect(await indexedDBManager.getCachedMessages('c1')).toEqual([])
    const c2 = await indexedDBManager.getCachedMessages('c2')
    expect(c2.map(m => m.id)).toEqual(['m3'])
  })

  it('deleteMessageCache removes a single message', async () => {
    await indexedDBManager.cacheMessages([
      makeMessage('m1', 'c1'),
      makeMessage('m2', 'c1'),
    ])
    await indexedDBManager.deleteMessageCache('m1')
    const remaining = await indexedDBManager.getCachedMessages('c1')
    expect(remaining.map(m => m.id)).toEqual(['m2'])
  })

  it('getCacheSize sums conversation .size + JSON-encoded messages', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c1'))
    await indexedDBManager.cacheMessage(makeMessage('m1', 'c1'))
    const size = await indexedDBManager.getCacheSize()
    expect(size).toBeGreaterThan(0)
  })

  it('getCacheStats reports counts and totalSize', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c1'))
    await indexedDBManager.cacheConversation(makeConversation('c2'))
    await indexedDBManager.cacheMessages([
      makeMessage('m1', 'c1'),
      makeMessage('m2', 'c2'),
    ])
    const stats = await indexedDBManager.getCacheStats()
    expect(stats.conversations).toBe(2)
    expect(stats.messages).toBe(2)
    expect(stats.totalSize).toBeGreaterThan(0)
  })

  it('clearAll empties every store', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c1'))
    await indexedDBManager.cacheMessage(makeMessage('m1', 'c1'))
    await indexedDBManager.clearAll()
    const stats = await indexedDBManager.getCacheStats()
    expect(stats.conversations).toBe(0)
    expect(stats.messages).toBe(0)
  })

  it('exportCache + importCache round-trip preserves data', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c1', { title: 'Original' }))
    await indexedDBManager.cacheMessages([
      makeMessage('m1', 'c1', { content: 'first' }),
      makeMessage('m2', 'c1', { content: 'second' }),
    ])

    const blob = await indexedDBManager.exportCache()
    const text = await blob.text()
    const parsed = JSON.parse(text) as {
      version: number
      conversations: Conversation[]
      messages: Message[]
    }
    expect(parsed.version).toBe(1)
    expect(parsed.conversations.map(c => c.id)).toEqual(['c1'])
    expect(parsed.messages.map(m => m.id).sort()).toEqual(['m1', 'm2'])

    // Wipe and re-import
    await indexedDBManager.clearAll()
    await indexedDBManager.importCache({
      conversations: parsed.conversations,
      messages: parsed.messages,
    })

    const conv = await indexedDBManager.getCachedConversation('c1')
    expect(conv?.title).toBe('Original')
    const msgs = await indexedDBManager.getCachedMessages('c1')
    expect(msgs.map(m => m.content).sort()).toEqual(['first', 'second'])
  })

  it('initIndexedDB swallows init errors and logs them', async () => {
    // Force `indexedDB.open` to throw to exercise the catch in initIndexedDB.
    const original = globalThis.indexedDB
    const broken = {
      open: () => {
        throw new Error('open failed')
      },
    } as unknown as IDBFactory
    globalThis.indexedDB = broken
    indexedDBManager.close()
    // Should NOT throw — initIndexedDB swallows.
    await expect(initIndexedDB()).resolves.toBeUndefined()
    globalThis.indexedDB = original
    indexedDBManager.close()
  })

  it('syncToIndexedDB + loadFromIndexedDB persist conversations & messages', async () => {
    await syncToIndexedDB(
      [makeConversation('c1'), makeConversation('c2')],
      [
        makeMessage('m1', 'c1', { timestamp: 1 }),
        makeMessage('m2', 'c1', { timestamp: 2 }),
        makeMessage('m3', 'c2', { timestamp: 1 }),
      ]
    )
    const loaded = await loadFromIndexedDB()
    expect(loaded.conversations.map(c => c.id).sort()).toEqual(['c1', 'c2'])
    expect(loaded.messages.map(m => m.id).sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('cleanup is a no-op while cache is below the threshold', async () => {
    await indexedDBManager.cacheConversation(makeConversation('c1'))
    // 50 MB threshold * 0.8 ≫ a single small conversation, so cleanup should
    // bail out early without touching the store.
    await expect(indexedDBManager.cleanup()).resolves.toBeUndefined()
    expect(await indexedDBManager.getCachedConversation('c1')).not.toBeNull()
  })

  // Regression: close() must always clear `initPromise`, even when init()
  // failed and `db` was never set. Otherwise a single failed open() would
  // poison every subsequent init() call with the cached rejection.
  it('close() clears a cached rejected initPromise so future init() can succeed', async () => {
    const original = globalThis.indexedDB
    const broken = {
      open: () => {
        throw new Error('open failed')
      },
    } as unknown as IDBFactory
    globalThis.indexedDB = broken
    indexedDBManager.close()
    await initIndexedDB() // swallows; leaves a rejected initPromise behind
    // Restore a real factory and close — close must clear initPromise.
    globalThis.indexedDB = original
    indexedDBManager.close()
    // A subsequent operation should now succeed against the real factory.
    await indexedDBManager.cacheConversation(makeConversation('c-after'))
    expect(await indexedDBManager.getCachedConversation('c-after')).not.toBeNull()
  })

  it('loadFromIndexedDB returns empty arrays when init fails', async () => {
    const original = globalThis.indexedDB
    const broken = {
      open: () => {
        throw new Error('open failed')
      },
    } as unknown as IDBFactory
    globalThis.indexedDB = broken
    indexedDBManager.close()
    const result = await loadFromIndexedDB()
    expect(result).toEqual({ conversations: [], messages: [] })
    globalThis.indexedDB = original
    indexedDBManager.close()
  })
})
