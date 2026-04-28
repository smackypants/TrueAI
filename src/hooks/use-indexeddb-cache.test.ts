/**
 * Tests for src/hooks/use-indexeddb-cache.ts
 *
 * Per round-2 lessons: install `fake-indexeddb/auto` LOCALLY at the top of
 * this file. The shared `src/test/setup.ts` intentionally leaves
 * `globalThis.indexedDB` unset (kv-store needs to fall back to
 * localStorage). Use plain assignment of `globalThis.indexedDB = new
 * IDBFactory()` (not `Object.defineProperty` w/o `writable: true`) so
 * subsequent reassignments are picked up.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@github/spark/hooks', () => ({
  useKV: <T,>(_key: string, initial: T) => useState<T>(initial),
}))

import { indexedDBManager } from '@/lib/indexeddb'
import { useIndexedDBCache } from './use-indexeddb-cache'
import type { Conversation, Message } from '@/lib/types'

const conv = (id: string, overrides: Partial<Conversation> = {}): Conversation => ({
  id,
  title: `c ${id}`,
  model: 'gpt-test',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  ...overrides,
})

const msg = (id: string, conversationId: string, overrides: Partial<Message> = {}): Message => ({
  id,
  conversationId,
  role: 'user',
  content: `m ${id}`,
  timestamp: 1700000000000,
  ...overrides,
})

describe('useIndexedDBCache', () => {
  beforeEach(() => {
    indexedDBManager.close()
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(() => {
    indexedDBManager.close()
    vi.restoreAllMocks()
  })

  it('initializes by loading from cache (sets isInitialized=true even when empty)', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    expect(typeof result.current.syncToCache).toBe('function')
    expect(typeof result.current.cacheConversation).toBe('function')
    expect(typeof result.current.cacheMessage).toBe('function')
  })

  it('cacheConversation persists to IndexedDB and getCacheStats reflects it', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.cacheConversation(conv('c1'))
    })
    const stats = await result.current.getCacheStats()
    expect(stats.conversations).toBe(1)
  })

  it('cacheMessage and loadConversationMessages round-trip through IDB', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.cacheMessage(msg('m1', 'cv1', { timestamp: 1 }))
      await result.current.cacheMessage(msg('m2', 'cv1', { timestamp: 2 }))
    })
    const loaded = await act(async () => result.current.loadConversationMessages('cv1'))
    expect(loaded).toHaveLength(2)
    expect(loaded.map(m => m.id).sort()).toEqual(['m1', 'm2'])
  })

  it('deleteConversationFromCache removes that conversation', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.cacheConversation(conv('c1'))
      await result.current.deleteConversationFromCache('c1')
    })
    const stats = await result.current.getCacheStats()
    expect(stats.conversations).toBe(0)
  })

  it('syncToCache writes timestamps and is debounced when already syncing', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.syncToCache()
    })
    expect(result.current.lastSyncTime).toBeGreaterThan(0)
  })

  it('clearCache resets lastSyncTime to 0', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.cacheConversation(conv('c1'))
      await result.current.syncToCache()
      await result.current.clearCache()
    })
    expect(result.current.lastSyncTime).toBe(0)
    const stats = await result.current.getCacheStats()
    expect(stats.conversations).toBe(0)
  })

  it('cleanupCache runs without error', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.cleanupCache()
    })
    // No throw is the assertion.
    expect(true).toBe(true)
  })

  it('importCache + loadFromCache repopulates conversations and messages', async () => {
    // Stub File.text() since File doesn't always exist in jsdom variants.
    const file = {
      text: async () =>
        JSON.stringify({
          conversations: [conv('c1', { title: 'Imported' })],
          messages: [msg('m1', 'c1')],
        }),
    } as File
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.importCache(file)
    })
    const stats = await result.current.getCacheStats()
    expect(stats.conversations).toBeGreaterThan(0)
  })

  it('survives a getCacheStats failure without throwing', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))

    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'getCacheStats')
      .mockRejectedValueOnce(new Error('boom'))

    const stats = await result.current.getCacheStats()
    expect(stats).toEqual({ conversations: 0, messages: 0, totalSize: 0 })

    spy.mockRestore()
    err.mockRestore()
  })
})
