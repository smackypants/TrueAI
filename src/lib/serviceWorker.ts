export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

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
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      )
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
  return !navigator.onLine
}

export function onOnlineStatusChange(callback: (isOnline: boolean) => void) {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
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
