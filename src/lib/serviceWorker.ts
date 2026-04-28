export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

import { isOffline as nativeIsOffline, onNetworkStatusChange } from './native/network'

export async function register(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('[ServiceWorker] Registered successfully:', registration.scope)

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[ServiceWorker] New content available, reload to update')
                config?.onUpdate?.(registration)
              } else {
                console.log('[ServiceWorker] Content cached for offline use')
                config?.onSuccess?.(registration)
              }
            }
          })
        })

        if (registration.waiting) {
          config?.onUpdate?.(registration)
        }

        checkForUpdates(registration)

      } catch (error) {
        console.error('[ServiceWorker] Registration failed:', error)
        config?.onError?.(error as Error)
      }
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[ServiceWorker] Controller changed, reloading page')
      window.location.reload()
    })
  }
}

export async function unregister() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.unregister()
      console.log('[ServiceWorker] Unregistered successfully')
    } catch (error) {
      console.error('[ServiceWorker] Unregistration failed:', error)
    }
  }
}

export async function clearCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    
    return new Promise<void>((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'CACHE_CLEARED') {
          navigator.serviceWorker.removeEventListener('message', messageHandler)
          resolve()
        }
      }
      navigator.serviceWorker.addEventListener('message', messageHandler)
    })
  }
}

export async function getCacheSize(): Promise<number> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size)
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        )
      } else {
        resolve(0)
      }
    })
  }
  return 0
}

export function skipWaiting() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
  }
}

function checkForUpdates(registration: ServiceWorkerRegistration) {
  setInterval(() => {
    registration.update()
  }, 60000)
}

export function isOffline(): boolean {
  // Delegate to the native network module so this is correct on Android
  // (where the WebView's online/offline events are unreliable) as well as
  // on the web. Kept as a sync helper to preserve the existing API.
  return nativeIsOffline()
}

export function onOnlineStatusChange(callback: (isOnline: boolean) => void) {
  return onNetworkStatusChange((status) => callback(status.connected))
}

export async function preloadAssets(urls: string[]) {
  if ('serviceWorker' in navigator && 'caches' in window) {
    const cache = await caches.open('trueai-preload')
    
    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            await cache.put(url, response)
          }
        } catch (error) {
          console.warn(`[ServiceWorker] Failed to preload: ${url}`, error)
        }
      })
    )
  }
}

export async function registerBackgroundSync(tag: string = 'background-sync'): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    console.warn('[ServiceWorker] Background Sync API not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await (registration as any).sync.register(tag) // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log(`[ServiceWorker] Background sync registered: ${tag}`)
    return true
  } catch (error) {
    console.error('[ServiceWorker] Failed to register background sync:', error)
    return false
  }
}

export async function registerPeriodicSync(tag: string = 'periodic-sync', minInterval: number = 12 * 60 * 60 * 1000): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.warn('[ServiceWorker] Periodic Background Sync API not supported')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName
    })
    
    if (status.state === 'granted') {
      await (registration as ServiceWorkerRegistration & { periodicSync: { register(tag: string, options: { minInterval: number }): Promise<void> } }).periodicSync.register(tag, {
        minInterval
      })
      console.log(`[ServiceWorker] Periodic sync registered: ${tag}`)
      return true
    } else {
      console.warn('[ServiceWorker] Periodic sync permission not granted')
      return false
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to register periodic sync:', error)
    return false
  }
}

export function onBackgroundSync(callback: () => void) {
  if ('serviceWorker' in navigator) {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        callback()
      }
    }
    
    navigator.serviceWorker.addEventListener('message', handleMessage)
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }
  
  return () => {}
}

export function onPeriodicSync(callback: () => void) {
  if ('serviceWorker' in navigator) {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PERIODIC_SYNC') {
        callback()
      }
    }
    
    navigator.serviceWorker.addEventListener('message', handleMessage)
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }
  
  return () => {}
}
