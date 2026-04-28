import { useState, useEffect, useCallback } from 'react'
import { offlineQueue, type OfflineAction, type SyncResult } from '@/lib/offline-queue'
import {
  getNetworkStatusSync,
  onNetworkStatusChange,
  onAppResume,
} from '@/lib/native'

export interface UseOfflineQueueReturn {
  queue: OfflineAction[]
  pendingCount: number
  failedCount: number
  isOnline: boolean
  isSyncing: boolean
  enqueue: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => Promise<string>
  sync: () => Promise<SyncResult>
  retryFailed: () => Promise<SyncResult>
  clearCompleted: () => Promise<void>
  clearFailed: () => Promise<void>
  clearAll: () => Promise<void>
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [queue, setQueue] = useState<OfflineAction[]>([])
  const [isOnline, setIsOnline] = useState(getNetworkStatusSync().connected)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    offlineQueue.initialize()

    const unsubscribe = offlineQueue.subscribe((newQueue) => {
      setQueue(newQueue)
    })

    setQueue(offlineQueue.getQueue())

    const unsubscribeNetwork = onNetworkStatusChange((status) => {
      setIsOnline(status.connected)
    })

    // Flush queue when the app returns from background — common when the
    // user grants WiFi permission, switches networks, or just leaves and
    // comes back to the app on Android.
    const unsubscribeResume = onAppResume(() => {
      void offlineQueue.sync().catch(() => {
        // sync errors are surfaced via the queue listener; swallow here.
      })
    })

    return () => {
      unsubscribe()
      unsubscribeNetwork()
      unsubscribeResume()
    }
  }, [])

  const enqueue = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => {
    return await offlineQueue.enqueue(action)
  }, [])

  const sync = useCallback(async () => {
    setIsSyncing(true)
    try {
      return await offlineQueue.sync()
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const retryFailed = useCallback(async () => {
    setIsSyncing(true)
    try {
      return await offlineQueue.retryFailed()
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const clearCompleted = useCallback(async () => {
    await offlineQueue.clearCompleted()
  }, [])

  const clearFailed = useCallback(async () => {
    await offlineQueue.clearFailed()
  }, [])

  const clearAll = useCallback(async () => {
    await offlineQueue.clearAll()
  }, [])

  const pendingCount = queue.filter(a => a.status === 'pending').length
  const failedCount = queue.filter(a => a.status === 'failed').length

  return {
    queue,
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    enqueue,
    sync,
    retryFailed,
    clearCompleted,
    clearFailed,
    clearAll
  }
}
