import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'

interface PrefetchIndicatorProps {
  isActive: boolean
  tabsPreloading: string[]
  show?: boolean
}

export function PrefetchStatusIndicator({ 
  isActive, 
  tabsPreloading,
  show = true 
}: PrefetchIndicatorProps) {
  if (!show || (!isActive && tabsPreloading.length === 0)) {
    return null
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-4 z-40 lg:bottom-6"
        >
          <Card className="p-3 bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <ArrowsClockwise size={18} className="text-accent" weight="bold" />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  Prefetching
                </span>
                {tabsPreloading.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {tabsPreloading.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function PrefetchProgress({ 
  total, 
  completed 
}: { 
  total: number
  completed: number 
}) {
  if (total === 0) return null

  const percentage = (completed / total) * 100

  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
      <motion.div
        className="h-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}
