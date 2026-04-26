import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useIndexedDBCache } from '@/hooks/use-indexeddb-cache'
import { Database, Trash, Download, Upload, Broom, CloudArrowDown, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

export function IndexedDBCacheManager() {
  const {
    isInitialized,
    isSyncing,
    lastSyncTime,
    syncToCache,
    getCacheStats,
    cleanupCache,
    clearCache,
    exportCache,
    importCache
  } = useIndexedDBCache()

  const [stats, setStats] = useState({
    conversations: 0,
    messages: 0,
    totalSize: 0,
    lastCleanup: undefined as number | undefined
  })
  const [isLoading, setIsLoading] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const cacheStats = await getCacheStats()
      setStats(cacheStats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isInitialized) {
      loadStats()
    }
  }, [isInitialized])

  const handleSync = async () => {
    try {
      await syncToCache()
      await loadStats()
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 2000)
      toast.success('Cache synced successfully')
    } catch (error) {
      toast.error('Failed to sync cache')
    }
  }

  const handleCleanup = async () => {
    try {
      await cleanupCache()
      await loadStats()
      toast.success('Cache cleaned up successfully')
    } catch (error) {
      toast.error('Failed to cleanup cache')
    }
  }

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all cached data? This cannot be undone.')) {
      return
    }

    try {
      await clearCache()
      await loadStats()
      toast.success('Cache cleared successfully')
    } catch (error) {
      toast.error('Failed to clear cache')
    }
  }

  const handleExport = async () => {
    try {
      await exportCache()
      toast.success('Cache exported successfully')
    } catch (error) {
      toast.error('Failed to export cache')
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          await importCache(file)
          await loadStats()
          toast.success('Cache imported successfully')
        } catch (error) {
          toast.error('Failed to import cache')
        }
      }
    }
    input.click()
  }

  const maxSize = 50 * 1024 * 1024
  const usagePercent = (stats.totalSize / maxSize) * 100

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">IndexedDB Cache</h3>
              <p className="text-sm text-muted-foreground">
                {isInitialized ? 'Active' : 'Initializing...'}
              </p>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            {isSyncing ? (
              <motion.div
                key="syncing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="secondary" className="gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <CloudArrowDown size={16} />
                  </motion.div>
                  Syncing...
                </Badge>
              </motion.div>
            ) : justSynced ? (
              <motion.div
                key="synced"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="default" className="gap-2 bg-green-500/10 text-green-500 border-green-500/20">
                  <Check size={16} weight="bold" />
                  Synced
                </Badge>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Badge variant="outline">Ready</Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Storage Usage</span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(stats.totalSize)} / {formatBytes(maxSize)}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            {usagePercent > 80 && (
              <p className="text-xs text-amber-500 mt-1">
                Cache is nearly full. Consider cleaning up old data.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Conversations</p>
              <p className="text-2xl font-bold">{stats.conversations}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Messages</p>
              <p className="text-2xl font-bold">{stats.messages}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Sync</p>
              <p className="text-sm font-medium">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>

          {stats.lastCleanup && (
            <div className="text-xs text-muted-foreground">
              Last cleanup: {formatDate(stats.lastCleanup)}
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || isLoading}
            className="gap-2"
          >
            <CloudArrowDown size={18} />
            Sync Now
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            disabled={isLoading}
            className="gap-2"
          >
            <Broom size={18} />
            Cleanup
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading}
            className="gap-2"
          >
            <Download size={18} />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isLoading}
            className="gap-2"
          >
            <Upload size={18} />
            Import
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={isLoading}
            className="gap-2"
          >
            <Database size={18} />
            Refresh
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            disabled={isLoading}
            className="gap-2"
          >
            <Trash size={18} />
            Clear All
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default IndexedDBCacheManager
