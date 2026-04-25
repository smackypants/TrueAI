import { useCallback, useEffect, useState, useRef } from 'react'

interface UseOptimizedTabsOptions {
  tabs: string[]
  defaultTab: string
  preloadAdjacent?: boolean
  cacheContent?: boolean
}

interface TabState {
  isActive: boolean
  hasLoaded: boolean
  shouldPreload: boolean
}

export function useOptimizedTabs({
  tabs,
  defaultTab,
  preloadAdjacent = true,
  cacheContent = true
}: UseOptimizedTabsOptions) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [tabStates, setTabStates] = useState<Record<string, TabState>>(() => {
    const initialState: Record<string, TabState> = {}
    tabs.forEach(tab => {
      initialState[tab] = {
        isActive: tab === defaultTab,
        hasLoaded: tab === defaultTab,
        shouldPreload: false
      }
    })
    return initialState
  })

  const isTransitioning = useRef(false)
  const transitionTimeout = useRef<NodeJS.Timeout>()

  const updatePreloadStates = useCallback((currentTab: string) => {
    if (!preloadAdjacent) return

    const currentIndex = tabs.indexOf(currentTab)
    setTabStates(prev => {
      const newStates = { ...prev }
      tabs.forEach((tab, index) => {
        const distance = Math.abs(index - currentIndex)
        newStates[tab] = {
          ...newStates[tab],
          shouldPreload: distance <= 1
        }
      })
      return newStates
    })
  }, [tabs, preloadAdjacent])

  const changeTab = useCallback((newTab: string) => {
    if (isTransitioning.current || newTab === activeTab) return

    isTransitioning.current = true

    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current)
    }

    setTabStates(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], isActive: false },
      [newTab]: { ...prev[newTab], isActive: true, hasLoaded: true }
    }))

    setActiveTab(newTab)
    updatePreloadStates(newTab)

    transitionTimeout.current = setTimeout(() => {
      isTransitioning.current = false
    }, 300)
  }, [activeTab, updatePreloadStates])

  useEffect(() => {
    updatePreloadStates(activeTab)
  }, [activeTab, updatePreloadStates])

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current)
      }
    }
  }, [])

  const shouldRenderTab = useCallback((tab: string) => {
    const state = tabStates[tab]
    if (state.isActive) return true
    if (!cacheContent) return false
    return state.hasLoaded
  }, [tabStates, cacheContent])

  return {
    activeTab,
    changeTab,
    tabStates,
    shouldRenderTab,
    isTransitioning: isTransitioning.current
  }
}
