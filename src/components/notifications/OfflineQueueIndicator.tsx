import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CloudArrowUp, WifiSlash, CheckCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

export function OfflineQueueIndicator() {
  const { pendingCount, failedCount, isOnline, isSyncing, sync } = useOfflineQueue()
  const totalCount = pendingCount + failedCount

  if (totalCount === 0 && isOnline) {
    return null
  }

  const handleSync = async () => {
    await sync()
  }

  return (
    <AnimatePresence>
      {(totalCount > 0 || !isOnline) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={!isOnline ? 'destructive' : failedCount > 0 ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="gap-2 h-9 px-3 relative"
              >
                {isSyncing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <CloudArrowUp size={18} />
                  </motion.div>
                ) : !isOnline ? (
                  <WifiSlash size={18} />
                ) : failedCount > 0 ? (
                  <CloudArrowUp size={18} />
                ) : (
                  <CheckCircle size={18} />
                )}
                
                {totalCount > 0 && (
                  <Badge
                    variant={failedCount > 0 ? 'destructive' : 'secondary'}
                    className="h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {totalCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!isOnline ? (
                <p>Offline - {totalCount} actions queued</p>
              ) : isSyncing ? (
                <p>Syncing...</p>
              ) : failedCount > 0 ? (
                <p>{failedCount} failed, {pendingCount} pending</p>
              ) : (
                <p>{pendingCount} pending actions</p>
              )}
            </TooltipContent>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
