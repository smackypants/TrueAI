import { useEffect, useState } from 'react'
import { preloadAssets } from '@/lib/serviceWorker'

export function usePreloadAssets(urls: string[], enabled: boolean = true) {
  const [isPreloading, setIsPreloading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!enabled || urls.length === 0) return

    let cancelled = false

    const preload = async () => {
      setIsPreloading(true)
      
      try {
        await preloadAssets(urls)
        
        if (!cancelled) {
          setIsComplete(true)
          setIsPreloading(false)
        }
      } catch (error) {
        console.error('Failed to preload assets:', error)
        if (!cancelled) {
          setIsPreloading(false)
        }
      }
    }

    preload()

    return () => {
      cancelled = true
    }
  }, [urls, enabled])

  return { isPreloading, isComplete }
}
