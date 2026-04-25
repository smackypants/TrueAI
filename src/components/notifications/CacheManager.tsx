import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { HardDrives, Trash, ArrowsClockwise, CheckCircle } from '@phosphor-icons/react'
import { clearCache, getCacheSize } from '@/lib/serviceWorker'
import { toast } from 'sonner'

export function CacheManager() {
  const [cacheSize, setCacheSize] = useState<number>(0)
  const [isClearing, setIsClearing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadCacheSize = async () => {
    setIsRefreshing(true)
    try {
      const size = await getCacheSize()
      setCacheSize(size)
    } catch (error) {
      console.error('Failed to get cache size:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadCacheSize()
  }, [])

  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      await clearCache()
      await loadCacheSize()
      toast.success('Cache cleared successfully')
    } catch (error) {
      toast.error('Failed to clear cache')
      console.error('Failed to clear cache:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const maxSize = 50 * 1024 * 1024
  const percentage = Math.min((cacheSize / maxSize) * 100, 100)

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <HardDrives weight="fill" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">Cache Storage</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage offline data and cached assets
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Cache size</span>
            <span className="font-mono font-semibold">{formatBytes(cacheSize)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Storage used</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {formatBytes(maxSize - cacheSize)} available
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Cached Content</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <CheckCircle weight="fill" size={16} className="text-accent" />
              <span>Static assets</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <CheckCircle weight="fill" size={16} className="text-accent" />
              <span>App data</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <CheckCircle weight="fill" size={16} className="text-accent" />
              <span>Images</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <CheckCircle weight="fill" size={16} className="text-accent" />
              <span>Fonts</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={loadCacheSize}
            disabled={isRefreshing}
          >
            <ArrowsClockwise 
              weight="bold" 
              size={18} 
              className={isRefreshing ? 'animate-spin' : ''}
            />
            Refresh
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            onClick={handleClearCache}
            disabled={isClearing || cacheSize === 0}
          >
            <Trash weight="bold" size={18} />
            Clear Cache
          </Button>
        </div>

        {cacheSize === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            No cached data. Browse the app to build cache.
          </p>
        )}
      </div>
    </Card>
  )
}
