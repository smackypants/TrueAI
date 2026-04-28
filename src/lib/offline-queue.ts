import { isOffline } from '@/lib/native/network'

export interface OfflineAction {
  id: string
  type: 'conversation' | 'message' | 'agent' | 'agent-run' | 'model' | 'dataset' | 'job' | 'harness' | 'code' | 'profile' | 'analytics'
  action: 'create' | 'update' | 'delete'
  data: unknown
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  error?: string
}

export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: Array<{ actionId: string; error: string }>
}

const QUEUE_KEY = 'offline-action-queue'
const MAX_RETRIES = 3
const SYNC_TAG = 'background-sync'

class OfflineQueue {
  private queue: OfflineAction[] = []
  private syncInProgress = false
  private listeners: Set<(queue: OfflineAction[]) => void> = new Set()

  async initialize() {
    await this.loadQueue()
    this.setupSyncRegistration()
    this.setupOnlineListener()
  }

  private async loadQueue() {
    try {
      const stored = await spark.kv.get<OfflineAction[]>(QUEUE_KEY)
      this.queue = stored || []
      this.notifyListeners()
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error)
      this.queue = []
    }
  }

  private async saveQueue() {
    try {
      await spark.kv.set(QUEUE_KEY, this.queue)
      this.notifyListeners()
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error)
    }
  }

  private setupSyncRegistration() {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((_registration) => {
        console.log('[OfflineQueue] Background Sync API available')
      })
    } else {
      console.warn('[OfflineQueue] Background Sync API not supported')
    }
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Device is back online, triggering sync')
      this.sync()
    })
  }

  async enqueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) {
    const newAction: OfflineAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    }

    this.queue.push(newAction)
    await this.saveQueue()

    if (!isOffline()) {
      this.sync()
    } else {
      this.registerBackgroundSync()
    }

    return newAction.id
  }

  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[OfflineQueue] Sync already in progress')
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] }
    }

    if (isOffline()) {
      console.log('[OfflineQueue] Device is offline, skipping sync')
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] }
    }

    this.syncInProgress = true
    let syncedCount = 0
    let failedCount = 0
    const errors: Array<{ actionId: string; error: string }> = []

    const pendingActions = this.queue.filter(a => a.status === 'pending' || a.status === 'failed')
    
    console.log(`[OfflineQueue] Starting sync of ${pendingActions.length} actions`)

    for (const action of pendingActions) {
      try {
        action.status = 'syncing'
        await this.saveQueue()

        await this.processAction(action)

        action.status = 'completed'
        syncedCount++
        
        this.queue = this.queue.filter(a => a.id !== action.id)
      } catch (error) {
        action.retryCount++
        
        if (action.retryCount >= MAX_RETRIES) {
          action.status = 'failed'
          action.error = String(error)
          failedCount++
          errors.push({ actionId: action.id, error: String(error) })
        } else {
          action.status = 'pending'
        }
        
        console.error(`[OfflineQueue] Failed to sync action ${action.id}:`, error)
      }
    }

    await this.saveQueue()
    this.syncInProgress = false

    const result = {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors
    }

    console.log(`[OfflineQueue] Sync completed:`, result)
    
    this.notifyListeners()
    return result
  }

  private async processAction(action: OfflineAction): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log(`[OfflineQueue] Processing action: ${action.type} ${action.action}`, action.data)
  }

  private async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await (registration as any).sync.register(SYNC_TAG) // eslint-disable-line @typescript-eslint/no-explicit-any
        console.log('[OfflineQueue] Background sync registered')
      } catch (error) {
        console.error('[OfflineQueue] Failed to register background sync:', error)
      }
    }
  }

  getQueue(): OfflineAction[] {
    return [...this.queue]
  }

  getPendingCount(): number {
    return this.queue.filter(a => a.status === 'pending').length
  }

  getFailedCount(): number {
    return this.queue.filter(a => a.status === 'failed').length
  }

  async clearCompleted() {
    this.queue = this.queue.filter(a => a.status !== 'completed')
    await this.saveQueue()
  }

  async clearFailed() {
    this.queue = this.queue.filter(a => a.status !== 'failed')
    await this.saveQueue()
  }

  async clearAll() {
    this.queue = []
    await this.saveQueue()
  }

  async retryFailed() {
    this.queue.forEach(action => {
      if (action.status === 'failed') {
        action.status = 'pending'
        action.retryCount = 0
        action.error = undefined
      }
    })
    await this.saveQueue()
    
    if (!isOffline()) {
      return this.sync()
    }
    
    return { success: false, syncedCount: 0, failedCount: 0, errors: [] }
  }

  subscribe(listener: (queue: OfflineAction[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.queue))
  }
}

export const offlineQueue = new OfflineQueue()
