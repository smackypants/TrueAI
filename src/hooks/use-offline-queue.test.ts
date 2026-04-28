import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the underlying offline-queue singleton and native helpers BEFORE
// importing the hook.
vi.mock('@/lib/offline-queue', () => {
  type Listener = (q: unknown[]) => void
  const listeners = new Set<Listener>()
  const state = {
    queue: [] as Array<{ id: string; status: string }>,
    syncResult: { success: true, syncedCount: 0, failedCount: 0, errors: [] },
  }
  const setQueue = (q: Array<{ id: string; status: string }>) => {
    state.queue = q
    listeners.forEach(l => l(q))
  }
  const offlineQueue = {
    initialize: vi.fn(async () => {}),
    subscribe: vi.fn((fn: Listener) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    }),
    getQueue: vi.fn(() => state.queue),
    enqueue: vi.fn(async () => 'new-id'),
    sync: vi.fn(async () => state.syncResult),
    retryFailed: vi.fn(async () => state.syncResult),
    clearCompleted: vi.fn(async () => {}),
    clearFailed: vi.fn(async () => {}),
    clearAll: vi.fn(async () => {}),
  }
  return {
    offlineQueue,
    // Test-only helpers
    __setQueue: setQueue,
    __listeners: listeners,
  }
})

vi.mock('@/lib/native', () => {
  const networkListeners = new Set<(s: { connected: boolean }) => void>()
  const resumeListeners = new Set<() => void>()
  return {
    getNetworkStatusSync: vi.fn(() => ({ connected: true })),
    onNetworkStatusChange: vi.fn((cb: (s: { connected: boolean }) => void) => {
      networkListeners.add(cb)
      return () => networkListeners.delete(cb)
    }),
    onAppResume: vi.fn((cb: () => void) => {
      resumeListeners.add(cb)
      return () => resumeListeners.delete(cb)
    }),
    __networkListeners: networkListeners,
    __resumeListeners: resumeListeners,
  }
})

import { useOfflineQueue } from './use-offline-queue'
import * as offlineQueueModule from '@/lib/offline-queue'
import * as nativeModule from '@/lib/native'

const oqMod = offlineQueueModule as unknown as {
  offlineQueue: {
    initialize: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    getQueue: ReturnType<typeof vi.fn>
    enqueue: ReturnType<typeof vi.fn>
    sync: ReturnType<typeof vi.fn>
    retryFailed: ReturnType<typeof vi.fn>
    clearCompleted: ReturnType<typeof vi.fn>
    clearFailed: ReturnType<typeof vi.fn>
    clearAll: ReturnType<typeof vi.fn>
  }
  __setQueue: (q: Array<{ id: string; status: string }>) => void
  __listeners: Set<(q: unknown[]) => void>
}

const nativeMod = nativeModule as unknown as {
  __networkListeners: Set<(s: { connected: boolean }) => void>
  __resumeListeners: Set<() => void>
}

describe('useOfflineQueue', () => {
  beforeEach(() => {
    oqMod.__setQueue([])
    oqMod.__listeners.clear()
    nativeMod.__networkListeners.clear()
    nativeMod.__resumeListeners.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    oqMod.__listeners.clear()
    nativeMod.__networkListeners.clear()
    nativeMod.__resumeListeners.clear()
  })

  it('initializes the queue, subscribes, and exposes counts', async () => {
    oqMod.__setQueue([
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'pending' },
      { id: 'c', status: 'failed' },
      { id: 'd', status: 'completed' },
    ])
    const { result } = renderHook(() => useOfflineQueue())
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(4)
    })
    expect(oqMod.offlineQueue.initialize).toHaveBeenCalledTimes(1)
    expect(oqMod.offlineQueue.subscribe).toHaveBeenCalledTimes(1)
    expect(result.current.pendingCount).toBe(2)
    expect(result.current.failedCount).toBe(1)
    expect(result.current.isOnline).toBe(true)
    expect(result.current.isSyncing).toBe(false)
  })

  it('updates state when the underlying queue notifies', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await waitFor(() => expect(result.current.queue).toHaveLength(0))
    act(() => {
      oqMod.__setQueue([{ id: 'x', status: 'pending' }])
    })
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(1)
      expect(result.current.pendingCount).toBe(1)
    })
  })

  it('updates isOnline when network listeners fire', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await waitFor(() => expect(result.current.isOnline).toBe(true))
    act(() => {
      nativeMod.__networkListeners.forEach(l => l({ connected: false }))
    })
    expect(result.current.isOnline).toBe(false)
  })

  it('toggles isSyncing around sync() / retryFailed()', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await waitFor(() => expect(result.current.isSyncing).toBe(false))
    let syncPromise: Promise<unknown> | undefined
    await act(async () => {
      syncPromise = result.current.sync()
    })
    await syncPromise
    expect(oqMod.offlineQueue.sync).toHaveBeenCalled()
    expect(result.current.isSyncing).toBe(false)

    await act(async () => {
      await result.current.retryFailed()
    })
    expect(oqMod.offlineQueue.retryFailed).toHaveBeenCalled()
  })

  it('resets isSyncing to false even when sync() throws', async () => {
    oqMod.offlineQueue.sync.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useOfflineQueue())
    await waitFor(() => expect(result.current.isSyncing).toBe(false))
    await act(async () => {
      await expect(result.current.sync()).rejects.toThrow('boom')
    })
    expect(result.current.isSyncing).toBe(false)
  })

  it('forwards enqueue / clearCompleted / clearFailed / clearAll to the queue', async () => {
    const { result } = renderHook(() => useOfflineQueue())
    await waitFor(() => expect(result.current.queue).toHaveLength(0))
    await act(async () => {
      await result.current.enqueue({
        type: 'message',
        action: 'create',
        data: { x: 1 },
      })
      await result.current.clearCompleted()
      await result.current.clearFailed()
      await result.current.clearAll()
    })
    expect(oqMod.offlineQueue.enqueue).toHaveBeenCalledWith({
      type: 'message',
      action: 'create',
      data: { x: 1 },
    })
    expect(oqMod.offlineQueue.clearCompleted).toHaveBeenCalled()
    expect(oqMod.offlineQueue.clearFailed).toHaveBeenCalled()
    expect(oqMod.offlineQueue.clearAll).toHaveBeenCalled()
  })

  it('triggers offlineQueue.sync() when the app resumes, swallowing errors', async () => {
    oqMod.offlineQueue.sync.mockRejectedValueOnce(new Error('resume sync failed'))
    renderHook(() => useOfflineQueue())
    await waitFor(() => expect(nativeMod.__resumeListeners.size).toBeGreaterThan(0))
    await act(async () => {
      nativeMod.__resumeListeners.forEach(l => l())
      // let the rejection settle
      await new Promise(r => setTimeout(r, 0))
    })
    expect(oqMod.offlineQueue.sync).toHaveBeenCalled()
  })

  it('unsubscribes from queue, network, and app-resume on unmount', async () => {
    const { unmount } = renderHook(() => useOfflineQueue())
    await waitFor(() => {
      expect(oqMod.__listeners.size).toBe(1)
      expect(nativeMod.__networkListeners.size).toBe(1)
      expect(nativeMod.__resumeListeners.size).toBe(1)
    })
    unmount()
    expect(oqMod.__listeners.size).toBe(0)
    expect(nativeMod.__networkListeners.size).toBe(0)
    expect(nativeMod.__resumeListeners.size).toBe(0)
  })
})
