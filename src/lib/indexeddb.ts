import type { Conversation, Message } from './types'

const DB_NAME = 'trueai-cache'
const DB_VERSION = 1
const CONVERSATIONS_STORE = 'conversations'
const MESSAGES_STORE = 'messages'
const METADATA_STORE = 'metadata'

export interface ConversationCache {
  id: string
  data: Conversation
  timestamp: number
  size: number
}

export interface MessageCache {
  id: string
  conversationId: string
  data: Message
  timestamp: number
}

export interface CacheMetadata {
  key: string
  totalSize: number
  itemCount: number
  lastCleanup: number
  lastAccess: number
}

class IndexedDBManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024
  private readonly CLEANUP_THRESHOLD = 0.8
  private readonly MAX_AGE_DAYS = 30

  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const conversationsStore = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' })
          conversationsStore.createIndex('timestamp', 'timestamp', { unique: false })
          conversationsStore.createIndex('size', 'size', { unique: false })
        }

        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' })
          messagesStore.createIndex('conversationId', 'conversationId', { unique: false })
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
        }
      }
    })

    return this.initPromise
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }
    return this.db
  }

  private getObjectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }
    const transaction = this.db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  async cacheConversation(conversation: Conversation): Promise<void> {
    await this.ensureDB()

    const size = new Blob([JSON.stringify(conversation)]).size
    const cache: ConversationCache = {
      id: conversation.id,
      data: conversation,
      timestamp: Date.now(),
      size
    }

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(CONVERSATIONS_STORE, 'readwrite')
      const request = store.put(cache)

      request.onsuccess = () => {
        this.updateMetadata('conversations', size)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedConversation(id: string): Promise<Conversation | null> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(CONVERSATIONS_STORE, 'readonly')
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result as ConversationCache | undefined
        resolve(result ? result.data : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getAllCachedConversations(): Promise<Conversation[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(CONVERSATIONS_STORE, 'readonly')
      const request = store.getAll()

      request.onsuccess = () => {
        const caches = request.result as ConversationCache[]
        const conversations = caches
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(cache => cache.data)
        resolve(conversations)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async cacheMessage(message: Message): Promise<void> {
    await this.ensureDB()

    const cache: MessageCache = {
      id: message.id,
      conversationId: message.conversationId,
      data: message,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(MESSAGES_STORE, 'readwrite')
      const request = store.put(cache)

      request.onsuccess = () => {
        this.updateMetadata('messages', new Blob([JSON.stringify(message)]).size)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async cacheMessages(messages: Message[]): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(MESSAGES_STORE, 'readwrite')
      let completed = 0
      let totalSize = 0

      messages.forEach(message => {
        const cache: MessageCache = {
          id: message.id,
          conversationId: message.conversationId,
          data: message,
          timestamp: Date.now()
        }

        const request = store.put(cache)
        totalSize += new Blob([JSON.stringify(message)]).size

        request.onsuccess = () => {
          completed++
          if (completed === messages.length) {
            this.updateMetadata('messages', totalSize)
            resolve()
          }
        }

        request.onerror = () => reject(request.error)
      })

      if (messages.length === 0) {
        resolve()
      }
    })
  }

  async getCachedMessages(conversationId: string): Promise<Message[]> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(MESSAGES_STORE, 'readonly')
      const index = store.index('conversationId')
      const request = index.getAll(conversationId)

      request.onsuccess = () => {
        const caches = request.result as MessageCache[]
        const messages = caches
          .map(cache => cache.data)
          .sort((a, b) => a.timestamp - b.timestamp)
        resolve(messages)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteConversationCache(conversationId: string): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
      
      const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE)
      conversationsStore.delete(conversationId)

      const messagesStore = transaction.objectStore(MESSAGES_STORE)
      const index = messagesStore.index('conversationId')
      const request = index.openCursor(IDBKeyRange.only(conversationId))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async deleteMessageCache(messageId: string): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(MESSAGES_STORE, 'readwrite')
      const request = store.delete(messageId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCacheSize(): Promise<number> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readonly')
      let totalSize = 0

      const conversationsRequest = transaction.objectStore(CONVERSATIONS_STORE).getAll()
      conversationsRequest.onsuccess = () => {
        const conversations = conversationsRequest.result as ConversationCache[]
        totalSize += conversations.reduce((sum, c) => sum + c.size, 0)
      }

      const messagesRequest = transaction.objectStore(MESSAGES_STORE).getAll()
      messagesRequest.onsuccess = () => {
        const messages = messagesRequest.result as MessageCache[]
        messages.forEach(m => {
          totalSize += new Blob([JSON.stringify(m.data)]).size
        })
      }

      transaction.oncomplete = () => resolve(totalSize)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getCacheStats(): Promise<{
    conversations: number
    messages: number
    totalSize: number
    lastCleanup?: number
  }> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONVERSATIONS_STORE, MESSAGES_STORE, METADATA_STORE], 'readonly')
      const stats = {
        conversations: 0,
        messages: 0,
        totalSize: 0,
        lastCleanup: undefined as number | undefined
      }

      const conversationsRequest = transaction.objectStore(CONVERSATIONS_STORE).count()
      conversationsRequest.onsuccess = () => {
        stats.conversations = conversationsRequest.result
      }

      const messagesRequest = transaction.objectStore(MESSAGES_STORE).count()
      messagesRequest.onsuccess = () => {
        stats.messages = messagesRequest.result
      }

      const sizeRequest = transaction.objectStore(CONVERSATIONS_STORE).getAll()
      sizeRequest.onsuccess = () => {
        const caches = sizeRequest.result as ConversationCache[]
        stats.totalSize = caches.reduce((sum, c) => sum + c.size, 0)
      }

      const metadataRequest = transaction.objectStore(METADATA_STORE).get('cache')
      metadataRequest.onsuccess = () => {
        const metadata = metadataRequest.result as CacheMetadata | undefined
        if (metadata) {
          stats.lastCleanup = metadata.lastCleanup
        }
      }

      transaction.oncomplete = () => resolve(stats)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async cleanup(): Promise<void> {
    await this.ensureDB()

    const cacheSize = await this.getCacheSize()
    if (cacheSize < this.MAX_CACHE_SIZE * this.CLEANUP_THRESHOLD) {
      return
    }

    const cutoffDate = Date.now() - (this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')

      const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE)
      const conversationsIndex = conversationsStore.index('timestamp')
      const conversationsRequest = conversationsIndex.openCursor()

      conversationsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const cache = cursor.value as ConversationCache
          if (cache.timestamp < cutoffDate) {
            cursor.delete()
          }
          cursor.continue()
        }
      }

      const messagesStore = transaction.objectStore(MESSAGES_STORE)
      const messagesIndex = messagesStore.index('timestamp')
      const messagesRequest = messagesIndex.openCursor()

      messagesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const cache = cursor.value as MessageCache
          if (cache.timestamp < cutoffDate) {
            cursor.delete()
          }
          cursor.continue()
        }
      }

      transaction.oncomplete = () => {
        this.updateMetadata('cache', 0, true)
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async clearAll(): Promise<void> {
    await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONVERSATIONS_STORE, MESSAGES_STORE, METADATA_STORE], 'readwrite')

      transaction.objectStore(CONVERSATIONS_STORE).clear()
      transaction.objectStore(MESSAGES_STORE).clear()
      transaction.objectStore(METADATA_STORE).clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  private async updateMetadata(key: string, sizeIncrement: number, isCleanup = false): Promise<void> {
    try {
      const store = this.getObjectStore(METADATA_STORE, 'readwrite')
      const request = store.get(key)

      request.onsuccess = () => {
        const metadata = request.result as CacheMetadata | undefined
        const updated: CacheMetadata = metadata
          ? {
              ...metadata,
              totalSize: metadata.totalSize + sizeIncrement,
              itemCount: metadata.itemCount + 1,
              lastAccess: Date.now(),
              lastCleanup: isCleanup ? Date.now() : metadata.lastCleanup
            }
          : {
              key,
              totalSize: sizeIncrement,
              itemCount: 1,
              lastAccess: Date.now(),
              lastCleanup: isCleanup ? Date.now() : 0
            }

        store.put(updated)
      }
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  async exportCache(): Promise<Blob> {
    await this.ensureDB()

    const conversations = await this.getAllCachedConversations()
    const transaction = this.db!.transaction([MESSAGES_STORE], 'readonly')
    const messagesStore = transaction.objectStore(MESSAGES_STORE)
    const messagesRequest = messagesStore.getAll()

    return new Promise((resolve, reject) => {
      messagesRequest.onsuccess = () => {
        const messageCaches = messagesRequest.result as MessageCache[]
        const messages = messageCaches.map(cache => cache.data)

        const exportData = {
          version: 1,
          exportedAt: Date.now(),
          conversations,
          messages
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        })

        resolve(blob)
      }

      messagesRequest.onerror = () => reject(messagesRequest.error)
    })
  }

  async importCache(data: {
    conversations: Conversation[]
    messages: Message[]
  }): Promise<void> {
    await this.ensureDB()

    const transaction = this.db!.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE)
    const messagesStore = transaction.objectStore(MESSAGES_STORE)

    data.conversations.forEach(conversation => {
      const size = new Blob([JSON.stringify(conversation)]).size
      const cache: ConversationCache = {
        id: conversation.id,
        data: conversation,
        timestamp: Date.now(),
        size
      }
      conversationsStore.put(cache)
    })

    data.messages.forEach(message => {
      const cache: MessageCache = {
        id: message.id,
        conversationId: message.conversationId,
        data: message,
        timestamp: Date.now()
      }
      messagesStore.put(cache)
    })

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    // Always clear the cached init promise — if init() rejected, db was never
    // set, but a stale rejected promise here would poison every subsequent
    // call to init() (it short-circuits on `this.initPromise`).
    this.initPromise = null
  }
}

export const indexedDBManager = new IndexedDBManager()

export async function initIndexedDB(): Promise<void> {
  try {
    await indexedDBManager.init()
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error)
  }
}

export async function syncToIndexedDB(
  conversations: Conversation[],
  messages: Message[]
): Promise<void> {
  try {
    await Promise.all([
      ...conversations.map(conv => indexedDBManager.cacheConversation(conv)),
      indexedDBManager.cacheMessages(messages)
    ])
  } catch (error) {
    console.error('Failed to sync to IndexedDB:', error)
  }
}

export async function loadFromIndexedDB(): Promise<{
  conversations: Conversation[]
  messages: Message[]
}> {
  try {
    const conversations = await indexedDBManager.getAllCachedConversations()
    
    const messagePromises = conversations.map(conv =>
      indexedDBManager.getCachedMessages(conv.id)
    )
    const messageArrays = await Promise.all(messagePromises)
    const messages = messageArrays.flat()

    return { conversations, messages }
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error)
    return { conversations: [], messages: [] }
  }
}
