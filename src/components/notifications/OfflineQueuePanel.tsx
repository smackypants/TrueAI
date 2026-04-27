import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { CloudArrowUp, ArrowsClockwise, Trash, CheckCircle, Warning, Clock, WifiSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export function OfflineQueuePanel() {
  const { 
    queue, 
    pendingCount, 
    failedCount, 
    isOnline, 
    isSyncing,
    sync, 
    retryFailed, 
    clearCompleted,
    clearFailed,
    clearAll 
  } = useOfflineQueue()

  const handleSync = async () => {
    const result = await sync()
    if (result.success) {
      toast.success(`Synced ${result.syncedCount} actions successfully`)
    } else {
      toast.error(`Sync completed with ${result.failedCount} failures`)
    }
  }

  const handleRetryFailed = async () => {
    const result = await retryFailed()
    if (result.success) {
      toast.success(`Retried and synced ${result.syncedCount} actions`)
    } else {
      toast.error(`Retry failed for ${result.failedCount} actions`)
    }
  }

  const _handleClearCompleted = async () => {
    await clearCompleted()
    toast.success('Cleared completed actions')
  }

  const _handleClearFailed = async () => {
    await clearFailed()
    toast.success('Cleared failed actions')
  }

  const handleClearAll = async () => {
    await clearAll()
    toast.success('Cleared all actions')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle weight="fill" className="text-green-500" size={18} />
      case 'failed':
        return <Warning weight="fill" className="text-destructive" size={18} />
      case 'syncing':
        return <ArrowsClockwise weight="fill" className="text-primary animate-spin" size={18} />
      default:
        return <Clock weight="fill" className="text-muted-foreground" size={18} />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      syncing: 'secondary',
      pending: 'outline'
    }
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CloudArrowUp weight="fill" size={24} className="text-primary" />
              Offline Queue
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isOnline ? (
                'Connected - Actions will sync automatically'
              ) : (
                <span className="flex items-center gap-1 text-destructive">
                  <WifiSlash size={16} />
                  Offline - Actions queued for sync
                </span>
              )}
            </p>
          </div>
          
          {!isOnline && (
            <Badge variant="destructive" className="gap-1">
              <WifiSlash size={14} />
              Offline
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Card className="p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Pending</div>
            <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
          </Card>
          <Card className="p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Failed</div>
            <div className="text-2xl font-bold text-destructive">{failedCount}</div>
          </Card>
          <Card className="p-3 bg-muted/30 col-span-2 sm:col-span-1">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-2xl font-bold">{queue.length}</div>
          </Card>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing || !isOnline || pendingCount === 0}
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <CloudArrowUp size={18} className="mr-2" />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {failedCount > 0 && (
            <Button
              onClick={handleRetryFailed}
              disabled={isSyncing || !isOnline}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <ArrowsClockwise size={18} className="mr-2" />
              Retry Failed
            </Button>
          )}

          {queue.length > 0 && (
            <Button
              onClick={handleClearAll}
              disabled={isSyncing}
              variant="destructive"
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <Trash size={18} className="mr-2" />
              Clear All
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Queue Details</h4>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CloudArrowUp size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No actions in queue</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <AnimatePresence mode="popLayout">
                {queue.map((action) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-3 mb-2 bg-muted/20">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getStatusIcon(action.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="font-medium text-sm truncate capitalize">
                              {action.action} {action.type.replace(/-/g, ' ')}
                            </div>
                            {getStatusBadge(action.status)}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              {new Date(action.timestamp).toLocaleString()}
                            </div>
                            {action.retryCount > 0 && (
                              <div className="text-amber-500">
                                Retry attempt: {action.retryCount}/3
                              </div>
                            )}
                            {action.error && (
                              <div className="text-destructive">
                                Error: {action.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>
          )}
        </div>
      </div>
    </Card>
  )
}

export default OfflineQueuePanel
