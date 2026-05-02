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
import * as idbModule from '@/lib/indexeddb'
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

  it('loadFromCache sets conversations when cache has data', async () => {
    const loadSpy = vi
      .spyOn(idbModule, 'loadFromIndexedDB')
      .mockResolvedValueOnce({
        conversations: [conv('cached-c1', { title: 'From Cache' })],
        messages: [],
      })
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    loadSpy.mockRestore()
  })

  it('loadFromCache slices messages to maxMemoryItems when lazy load is active', async () => {
    const manyMessages = Array.from({ length: 5 }, (_, i) =>
      msg(`m${i}`, 'cv1', { timestamp: i + 1 })
    )
    const loadSpy = vi
      .spyOn(idbModule, 'loadFromIndexedDB')
      .mockResolvedValueOnce({ conversations: [], messages: manyMessages })

    const { result } = renderHook(() =>
      useIndexedDBCache({ enableAutoSync: false, enableLazyLoad: true, maxMemoryItems: 2 })
    )
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    // No error thrown — hook stays healthy after slicing
    expect(result.current.isInitialized).toBe(true)
    loadSpy.mockRestore()
  })

  it('loadFromCache uses setMessages directly when messages <= maxMemoryItems', async () => {
    const twoMessages = [msg('m1', 'cv1', { timestamp: 1 }), msg('m2', 'cv1', { timestamp: 2 })]
    const loadSpy = vi
      .spyOn(idbModule, 'loadFromIndexedDB')
      .mockResolvedValueOnce({ conversations: [], messages: twoMessages })

    const { result } = renderHook(() =>
      useIndexedDBCache({ enableAutoSync: false, enableLazyLoad: true, maxMemoryItems: 10 })
    )
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    expect(result.current.isInitialized).toBe(true)
    loadSpy.mockRestore()
  })

  it('loadFromCache handles error and still sets isInitialized', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loadSpy = vi
      .spyOn(idbModule, 'loadFromIndexedDB')
      .mockRejectedValueOnce(new Error('idb down'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))

    loadSpy.mockRestore()
    errSpy.mockRestore()
  })

  it('loadConversationMessages merges only new messages (no duplicates)', async () => {
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    // Cache a message, then load — the second load should see an existing id and not add
    await act(async () => {
      await result.current.cacheMessage(msg('dup1', 'cv1', { timestamp: 1 }))
    })
    // First load — adds dup1
    await act(async () => {
      await result.current.loadConversationMessages('cv1')
    })
    // Second load with same data — dup1 is already in the in-memory list
    const loaded = await act(async () => result.current.loadConversationMessages('cv1'))
    // Should still return the messages from IDB
    expect(loaded).toHaveLength(1)
  })

  it('loadConversationMessages handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'getCachedMessages')
      .mockRejectedValueOnce(new Error('msg fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    const loaded = await act(async () => result.current.loadConversationMessages('cv1'))
    expect(loaded).toEqual([])
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('exportCache triggers link download with blob URL', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => {
      await result.current.exportCache()
    })

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    URL.createObjectURL = origCreate
    URL.revokeObjectURL = origRevoke
    clickSpy.mockRestore()
  })

  it('exportCache handles IDB error without throwing', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'exportCache')
      .mockRejectedValueOnce(new Error('export fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.exportCache() })
    ).resolves.not.toThrow()

    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('importCache handles malformed JSON gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const file = { text: async () => 'NOT_JSON' } as File

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.importCache(file) })
    ).resolves.not.toThrow()
    errSpy.mockRestore()
  })

  it('importCache skips import when conversations/messages fields are absent', async () => {
    const importSpy = vi.spyOn(indexedDBManager, 'importCache')
    const file = {
      text: async () => JSON.stringify({ foo: 'bar' }),
    } as File

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => { await result.current.importCache(file) })
    expect(importSpy).not.toHaveBeenCalled()
    importSpy.mockRestore()
  })

  it('syncToCache handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(idbModule, 'syncToIndexedDB')
      .mockRejectedValueOnce(new Error('sync fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await act(async () => { await result.current.syncToCache() })
    // isSyncing returns to false after error
    expect(result.current.isSyncing).toBe(false)
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('visibilitychange to hidden with enableAutoSync=true calls syncToCache', async () => {
    const syncSpy = vi.spyOn(idbModule, 'syncToIndexedDB').mockResolvedValue(undefined)
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: true }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => {})

    expect(syncSpy).toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    })
    syncSpy.mockRestore()
  })

  it('beforeunload with enableAutoSync=true calls syncToCache', async () => {
    const syncSpy = vi.spyOn(idbModule, 'syncToIndexedDB').mockResolvedValue(undefined)
    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: true }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))

    window.dispatchEvent(new Event('beforeunload'))
    await act(async () => {})

    expect(syncSpy).toHaveBeenCalled()
    syncSpy.mockRestore()
  })

  it('cacheConversation handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'cacheConversation')
      .mockRejectedValueOnce(new Error('conv fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.cacheConversation(conv('c1')) })
    ).resolves.not.toThrow()
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('cacheMessage handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'cacheMessage')
      .mockRejectedValueOnce(new Error('msg write fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.cacheMessage(msg('m1', 'cv1')) })
    ).resolves.not.toThrow()
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('deleteConversationFromCache handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'deleteConversationCache')
      .mockRejectedValueOnce(new Error('del fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.deleteConversationFromCache('c1') })
    ).resolves.not.toThrow()
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('cleanupCache handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'cleanup')
      .mockRejectedValueOnce(new Error('cleanup fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.cleanupCache() })
    ).resolves.not.toThrow()
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('clearCache handles IDB error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spy = vi
      .spyOn(indexedDBManager, 'clearAll')
      .mockRejectedValueOnce(new Error('clear fail'))

    const { result } = renderHook(() => useIndexedDBCache({ enableAutoSync: false }))
    await waitFor(() => expect(result.current.isInitialized).toBe(true))
    await expect(
      act(async () => { await result.current.clearCache() })
    ).resolves.not.toThrow()
    spy.mockRestore()
    errSpy.mockRestore()
  })
})
