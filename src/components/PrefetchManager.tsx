import { useEffect, lazy, Suspense } from 'react'
import { usePrefetch } from '@/hooks/use-prefetch'

const PREFETCH_COMPONENTS: Record<string, () => Promise<any>> = {
  'agents': () => import('@/components/agent/AgentCard'),
  'models': () => import('@/components/models/ModelConfigPanel'),
  'analytics': () => import('@/components/analytics/AnalyticsDashboard'),
  'workflows': () => import('@/components/workflow/WorkflowBuilder'),
  'builder': () => import('@/components/builder/AppBuilder')
}

interface PrefetchManagerProps {
  currentTab: string
}

export function PrefetchManager({ currentTab }: PrefetchManagerProps) {
  const prefetch = usePrefetch()

  useEffect(() => {
    prefetch.trackTabAccess(currentTab)
  }, [currentTab, prefetch])

  useEffect(() => {
    const candidates = prefetch.getTopPrefetchCandidates(currentTab)
    
    candidates.forEach(tabName => {
      if (!prefetch.isPrefetched(tabName) && PREFETCH_COMPONENTS[tabName]) {
        const componentLoader = PREFETCH_COMPONENTS[tabName]
        
        const timer = setTimeout(() => {
          componentLoader()
            .then(() => {
              prefetch.markAsPrefetched(tabName)
            })
            .catch(err => {
              console.warn(`[PrefetchManager] Failed to prefetch ${tabName}:`, err)
            })
        }, 500)

        return () => clearTimeout(timer)
      }
    })
  }, [currentTab, prefetch])

  return null
}

export function PrefetchIndicator({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        <span>Prefetching...</span>
      </div>
    </div>
  )
}
