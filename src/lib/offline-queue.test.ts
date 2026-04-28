import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/native/network', () => ({
  isOffline: vi.fn(() => false),
}))

import { offlineQueue, type OfflineAction } from './offline-queue'
import * as network from '@/lib/native/network'

const sparkGlobal = globalThis as unknown as {
  spark: {
    kv: {
      get: ReturnType<typeof vi.fn>
      set: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
    }
  }
}

describe('offlineQueue', () => {
  let storedQueue: OfflineAction[] = []

  beforeEach(async () => {
    storedQueue = []
    sparkGlobal.spark.kv.get.mockImplementation(async (_key: string) => storedQueue)
    sparkGlobal.spark.kv.set.mockImplementation(async (_key: string, value: OfflineAction[]) => {
      storedQueue = value
    })
    sparkGlobal.spark.kv.delete.mockResolvedValue(undefined)
    vi.mocked(network.isOffline).mockReturnValue(false)
    await offlineQueue.clearAll()
    // Wait long enough for any in-flight sync from a prior test to resolve
    // (processAction sleeps 100 ms internally before completing).
    await new Promise(resolve => setTimeout(resolve, 150))
    await offlineQueue.clearAll()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueue', () => {
    it('adds an action with generated id, timestamp, retryCount=0, status=pending and persists it', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      const id = await offlineQueue.enqueue({
        type: 'message',
        action: 'create',
        data: { hello: 'world' },
      })
      const queue = offlineQueue.getQueue()
      expect(queue).toHaveLength(1)
      const item = queue[0]
      expect(item.id).toBe(id)
      expect(item.type).toBe('message')
      expect(item.action).toBe('create')
      expect(item.retryCount).toBe(0)
      expect(item.status).toBe('pending')
      expect(item.timestamp).toBeGreaterThan(0)
      // Persistence to spark.kv was triggered
      expect(sparkGlobal.spark.kv.set).toHaveBeenCalled()
    })

    it('triggers an immediate sync when device is online', async () => {
      const syncSpy = vi.spyOn(offlineQueue, 'sync')
      vi.mocked(network.isOffline).mockReturnValue(false)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: {} })
      expect(syncSpy).toHaveBeenCalled()
      syncSpy.mockRestore()
    })
  })

  describe('sync', () => {
    it('processes pending actions and removes them from the queue', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'conversation', action: 'create', data: { a: 1 } })
      await offlineQueue.enqueue({ type: 'conversation', action: 'update', data: { b: 2 } })
      expect(offlineQueue.getQueue()).toHaveLength(2)

      vi.mocked(network.isOffline).mockReturnValue(false)
      const result = await offlineQueue.sync()
      expect(result.success).toBe(true)
      expect(result.syncedCount).toBe(2)
      expect(result.failedCount).toBe(0)
      expect(offlineQueue.getQueue()).toHaveLength(0)
    })

    it('does nothing when offline', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: {} })
      const result = await offlineQueue.sync()
      expect(result.success).toBe(false)
      expect(result.syncedCount).toBe(0)
      expect(offlineQueue.getQueue()).toHaveLength(1)
    })
  })

  describe('getPendingCount / getFailedCount', () => {
    it('counts pending and failed items independently', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: { i: 1 } })
      await offlineQueue.enqueue({ type: 'agent', action: 'update', data: { i: 2 } })

      // Mark one as failed via internal queue mutation through the public retryFailed/clear API.
      const queue = offlineQueue.getQueue()
      expect(queue).toHaveLength(2)
      queue[0].status = 'failed'
      // Re-inject via clearAll + manual save isn't exposed, so mutate in place is fine
      // because getQueue returns a shallow copy of the references.
      // Verify counters:
      // Note: getQueue is a shallow array copy, items themselves are shared.
      expect(offlineQueue.getPendingCount()).toBe(1)
      expect(offlineQueue.getFailedCount()).toBe(1)
    })
  })

  describe('clearCompleted / clearFailed / clearAll', () => {
    it('clearAll empties the queue', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: {} })
      await offlineQueue.enqueue({ type: 'agent', action: 'update', data: {} })
      await offlineQueue.clearAll()
      expect(offlineQueue.getQueue()).toHaveLength(0)
    })

    it('clearFailed removes only failed actions', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: { keep: true } })
      await offlineQueue.enqueue({ type: 'agent', action: 'update', data: { remove: true } })
      const all = offlineQueue.getQueue()
      all[1].status = 'failed'
      await offlineQueue.clearFailed()
      const remaining = offlineQueue.getQueue()
      expect(remaining).toHaveLength(1)
      expect((remaining[0].data as { keep: boolean }).keep).toBe(true)
    })

    it('clearCompleted removes completed entries', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: {} })
      const items = offlineQueue.getQueue()
      items[0].status = 'completed'
      await offlineQueue.clearCompleted()
      expect(offlineQueue.getQueue()).toHaveLength(0)
    })
  })

  describe('retryFailed', () => {
    it('resets failed actions to pending and zeros retryCount', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: {} })
      const items = offlineQueue.getQueue()
      items[0].status = 'failed'
      items[0].retryCount = 3
      items[0].error = 'boom'

      // Stay offline to avoid implicit sync; verify reset behaviour only.
      const result = await offlineQueue.retryFailed()
      expect(result.success).toBe(false) // offline guard short-circuits
      const after = offlineQueue.getQueue()
      expect(after[0].status).toBe('pending')
      expect(after[0].retryCount).toBe(0)
      expect(after[0].error).toBeUndefined()
    })
  })

  describe('subscribe', () => {
    it('notifies listeners on enqueue and returns an unsubscribe function', async () => {
      vi.mocked(network.isOffline).mockReturnValue(true)
      const listener = vi.fn()
      const unsubscribe = offlineQueue.subscribe(listener)

      await offlineQueue.enqueue({ type: 'agent', action: 'create', data: {} })
      expect(listener).toHaveBeenCalled()

      listener.mockClear()
      unsubscribe()
      await offlineQueue.enqueue({ type: 'agent', action: 'update', data: {} })
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
