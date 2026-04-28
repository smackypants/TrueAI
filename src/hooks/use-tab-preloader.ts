import { useEffect, useRef, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'

interface TabPreloadConfig {
  preloadOnHover: boolean
  preloadAdjacentTabs: boolean
  preloadFrequentTabs: boolean
  delayMs: number
}

interface TabMetrics {
  loadTime: number
  renderTime: number
  dataSize: number
  lastPreloaded: number
}

const DEFAULT_CONFIG: TabPreloadConfig = {
  preloadOnHover: true,
  preloadAdjacentTabs: true,
  preloadFrequentTabs: true,
  delayMs: 300
}

export function useTabPreloader(
  tabs: string[],
  currentTab: string,
  onPreload: (tabName: string) => Promise<void>
) {
  const [config] = useKV<TabPreloadConfig>('tab-preload-config', DEFAULT_CONFIG)
  const [metrics, setMetrics] = useKV<Record<string, TabMetrics>>('tab-metrics', {})
  const preloadQueue = useRef<Set<string>>(new Set())
  const isPreloading = useRef<boolean>(false)
  const hoverTimer = useRef<NodeJS.Timeout | null>(null)

  const recordMetric = useCallback((tabName: string, metric: Partial<TabMetrics>) => {
    setMetrics(current => {
      const base = current || {}
      return {
        ...base,
        [tabName]: {
          ...(base[tabName] || {}),
          ...metric,
          lastPreloaded: Date.now()
        }
      }
    })
  }, [setMetrics])

  // The `priority` parameter is preserved to keep the public hook API stable
  // for external callers (e.g., handleTabHover passes 'high'). Internally
  // every call now executes — concurrency is allowed so adjacent tabs can
  // preload in parallel — so the value itself is no longer consulted here.
  const preloadTab = useCallback(async (tabName: string, _priority: 'high' | 'low' = 'low') => {
    // Skip if this exact tab is already being preloaded; otherwise allow
    // concurrent dynamic imports so adjacent tabs (left + right) can be
    // prefetched in parallel. Previously this was gated on
    // `isPreloading.current`, which silently dropped the second adjacent tab
    // and left rapid back/forward navigation cold.
    if (preloadQueue.current?.has(tabName)) {
      return
    }

    preloadQueue.current?.add(tabName)
    isPreloading.current = true
    const startTime = performance.now()

    try {
      await onPreload(tabName)
      const loadTime = performance.now() - startTime
      recordMetric(tabName, { loadTime })
    } catch (error) {
      console.warn(`[TabPreloader] Failed to preload ${tabName}:`, error)
    } finally {
      preloadQueue.current?.delete(tabName)
      if (preloadQueue.current?.size === 0) {
        isPreloading.current = false
      }
    }
  }, [onPreload, recordMetric])

  const preloadAdjacentTabs = useCallback(() => {
    if (!config?.preloadAdjacentTabs) return

    const currentIndex = tabs.indexOf(currentTab)
    if (currentIndex === -1) return

    const adjacent = [
      tabs[currentIndex - 1],
      tabs[currentIndex + 1]
    ].filter(Boolean)

    adjacent.forEach(tab => {
      setTimeout(() => preloadTab(tab, 'low'), config?.delayMs)
    })
  }, [tabs, currentTab, config, preloadTab])

  const handleTabHover = useCallback((tabName: string) => {
    if (!config?.preloadOnHover || tabName === currentTab) return

    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
    }

    hoverTimer.current = setTimeout(() => {
      preloadTab(tabName, 'high')
    }, config?.delayMs)
  }, [config, currentTab, preloadTab])

  const handleTabLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }, [])

  useEffect(() => {
    preloadAdjacentTabs()
  }, [currentTab, preloadAdjacentTabs])

  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current)
      }
    }
  }, [])

  return {
    handleTabHover,
    handleTabLeave,
    preloadTab,
    metrics: metrics || {},
    isPreloading: isPreloading.current,
    queueSize: preloadQueue.current?.size
  }
}

export function useResourcePreloader() {
  const preloadedResources = useRef<Set<string>>(new Set())

  const preloadImage = useCallback((src: string): Promise<void> => {
    if (preloadedResources.current?.has(src)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        preloadedResources.current?.add(src)
        resolve()
      }
      img.onerror = reject
      img.src = src
    })
  }, [])

  const preloadImages = useCallback(async (sources: string[]): Promise<void> => {
    await Promise.allSettled(sources.map(src => preloadImage(src)))
  }, [preloadImage])

  const preloadScript = useCallback((src: string): Promise<void> => {
    if (preloadedResources.current?.has(src)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => {
        preloadedResources.current?.add(src)
        resolve()
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }, [])

  const preloadStyle = useCallback((href: string): Promise<void> => {
    if (preloadedResources.current?.has(href)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = () => {
        preloadedResources.current?.add(href)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }, [])

  const preloadFont = useCallback((fontFamily: string, url: string): Promise<void> => {
    const key = `font:${fontFamily}`
    if (preloadedResources.current?.has(key)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const fontFace = new FontFace(fontFamily, `url(${url})`)
      fontFace.load()
        .then(loadedFont => {
          document.fonts.add(loadedFont)
          preloadedResources.current?.add(key)
          resolve()
        })
        .catch(reject)
    })
  }, [])

  const isPreloaded = useCallback((resource: string): boolean => {
    return preloadedResources.current?.has(resource)
  }, [])

  return {
    preloadImage,
    preloadImages,
    preloadScript,
    preloadStyle,
    preloadFont,
    isPreloaded
  }
}
