import { motion } from 'framer-motion'
import { ArrowClockwise } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean
  pullDistance: number
  progress: number
  className?: string
}

export function PullToRefreshIndicator({
  isRefreshing,
  pullDistance,
  progress,
  className
}: PullToRefreshIndicatorProps) {
  const shouldShow = pullDistance > 10 || isRefreshing

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: shouldShow ? 1 : 0,
        y: shouldShow ? 0 : -20
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center justify-center py-3 pointer-events-none',
        className
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : progress * 3.6
          }}
          transition={{
            duration: isRefreshing ? 1 : 0.1,
            repeat: isRefreshing ? Infinity : 0,
            ease: isRefreshing ? 'linear' : 'easeOut'
          }}
        >
          <ArrowClockwise 
            size={20} 
            weight="bold"
            className={cn(
              'transition-colors',
              progress >= 100 || isRefreshing ? 'text-accent' : 'text-muted-foreground'
            )}
          />
        </motion.div>
        <span className="font-medium">
          {isRefreshing 
            ? 'Refreshing...' 
            : progress >= 100 
              ? 'Release to refresh' 
              : 'Pull to refresh'
          }
        </span>
      </div>
    </motion.div>
  )
}
