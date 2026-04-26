import { useEffect, useRef, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'

interface PrefetchStats {
  tabName: string
  accessCount: number
  lastAccessed: number
  avgTimeSpent: number
  prefetchPriority: number
}

interface PrefetchConfig {
  enabled: boolean
  minAccessCount: number
  prefetchThreshold: number
  maxPrefetchItems: number
}

const DEFAULT_CONFIG: PrefetchConfig = {
  enabled: true,
  minAccessCount: 2,
  prefetchThreshold: 0.3,
  maxPrefetchItems: 3
}

export function usePrefetch() {
  const [prefetchStats, setPrefetchStats] = useKV<Record<string, PrefetchStats>>('prefetch-stats', {})
  const [prefetchConfig] = useKV<PrefetchConfig>('prefetch-config', DEFAULT_CONFIG)
  const tabTimers = useRef<Record<string, number>>({})
  const prefetchedTabs = useRef<Set<string>>(new Set())

  const trackTabAccess = useCallback((tabName: string) => {
    const now = Date.now()
    
    if (tabTimers.current[tabName]) {
      const timeSpent = now - tabTimers.current[tabName]
      
      setPrefetchStats(current => {
        const existing = current[tabName] || {
          tabName,
          accessCount: 0,
          lastAccessed: 0,
          avgTimeSpent: 0,
          prefetchPriority: 0
        }

        const newAccessCount = existing.accessCount + 1
        const newAvgTimeSpent = existing.avgTimeSpent 
          ? (existing.avgTimeSpent * existing.accessCount + timeSpent) / newAccessCount
          : timeSpent

        const recency = 1 / (1 + (now - existing.lastAccessed) / (1000 * 60 * 60 * 24))
        const frequency = Math.min(newAccessCount / 10, 1)
        const engagement = Math.min(newAvgTimeSpent / (60 * 1000), 1)
        
        const priority = (frequency * 0.5) + (recency * 0.3) + (engagement * 0.2)

        return {
          ...current,
          [tabName]: {
            tabName,
            accessCount: newAccessCount,
            lastAccessed: now,
            avgTimeSpent: newAvgTimeSpent,
            prefetchPriority: priority
          }
        }
      })
    }
    
    tabTimers.current[tabName] = now
  }, [setPrefetchStats])

  const getTopPrefetchCandidates = useCallback((currentTab: string): string[] => {
    if (!prefetchConfig.enabled || !prefetchStats) return []

    const candidates = Object.values(prefetchStats)
      .filter(stat => 
        stat.tabName !== currentTab &&
        stat.accessCount >= prefetchConfig.minAccessCount &&
        stat.prefetchPriority >= prefetchConfig.prefetchThreshold
      )
      .sort((a, b) => b.prefetchPriority - a.prefetchPriority)
      .slice(0, prefetchConfig.maxPrefetchItems)
      .map(stat => stat.tabName)

    return candidates
  }, [prefetchStats, prefetchConfig])

  const markAsPrefetched = useCallback((tabName: string) => {
    prefetchedTabs.current.add(tabName)
  }, [])

  const isPrefetched = useCallback((tabName: string): boolean => {
    return prefetchedTabs.current.has(tabName)
  }, [])

  const clearPrefetchCache = useCallback(() => {
    prefetchedTabs.current.clear()
  }, [])

  const resetStats = useCallback(() => {
    setPrefetchStats({})
    clearPrefetchCache()
  }, [setPrefetchStats, clearPrefetchCache])

  return {
    trackTabAccess,
    getTopPrefetchCandidates,
    markAsPrefetched,
    isPrefetched,
    clearPrefetchCache,
    resetStats,
    stats: prefetchStats,
    config: prefetchConfig
  }
}

export function useComponentPrefetch<T>(
  componentName: string,
  loadFn: () => Promise<T>,
  shouldPrefetch: boolean
) {
  const cacheRef = useRef<Map<string, T>>(new Map())
  const loadingRef = useRef<Set<string>>(new Set())

  const prefetch = useCallback(async () => {
    if (!shouldPrefetch || cacheRef.current.has(componentName) || loadingRef.current.has(componentName)) {
      return
    }

    loadingRef.current.add(componentName)
    
    try {
      const result = await loadFn()
      cacheRef.current.set(componentName, result)
    } catch (error) {
      console.warn(`[Prefetch] Failed to prefetch ${componentName}:`, error)
    } finally {
      loadingRef.current.delete(componentName)
    }
  }, [componentName, loadFn, shouldPrefetch])

  const getCached = useCallback((): T | undefined => {
    return cacheRef.current.get(componentName)
  }, [componentName])

  const clearCache = useCallback(() => {
    cacheRef.current.delete(componentName)
  }, [componentName])

  useEffect(() => {
    if (shouldPrefetch) {
      const timeoutId = setTimeout(() => {
        prefetch()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [shouldPrefetch, prefetch])

  return {
    prefetch,
    getCached,
    clearCache,
    isCached: cacheRef.current.has(componentName),
    isLoading: loadingRef.current.has(componentName)
  }
}

export function useDataPrefetch<T>(
  dataKey: string,
  fetchFn: () => Promise<T>,
  options: {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
  } = {}
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    cacheTime = 10 * 60 * 1000
  } = options

  const [cache, setCache] = useKV<{
    data: T | null
    timestamp: number
    fetchedAt: number
  } | null>(`data-prefetch-${dataKey}`, null)

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return null

    const now = Date.now()
    
    if (!force && cache && cache.data && (now - cache.timestamp) < staleTime) {
      return cache.data
    }

    try {
      const data = await fetchFn()
      setCache({
        data,
        timestamp: now,
        fetchedAt: now
      })
      return data
    } catch (error) {
      console.error(`[DataPrefetch] Failed to fetch ${dataKey}:`, error)
      return cache?.data || null
    }
  }, [enabled, cache, staleTime, fetchFn, dataKey, setCache])

  const getCachedData = useCallback((): T | null => {
    if (!cache) return null
    
    const now = Date.now()
    if ((now - cache.timestamp) > cacheTime) {
      return null
    }
    
    return cache.data
  }, [cache, cacheTime])

  const invalidate = useCallback(() => {
    setCache(null)
  }, [setCache])

  const isStale = useCallback((): boolean => {
    if (!cache) return true
    const now = Date.now()
    return (now - cache.timestamp) > staleTime
  }, [cache, staleTime])

  useEffect(() => {
    if (enabled && (!cache || isStale())) {
      fetchData()
    }
  }, [enabled])

  return {
    data: cache?.data || null,
    fetchData,
    getCachedData,
    invalidate,
    isStale: isStale(),
    isCached: !!cache
  }
}
