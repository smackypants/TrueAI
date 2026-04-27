import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiX as WifiSlash, WifiHigh as Wifi, ArrowsClockwise } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { onOnlineStatusChange, isOffline } from '@/lib/serviceWorker'

export function OfflineIndicator() {
  const [offline, setOffline] = useState(isOffline())
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setOffline(isOffline())
    
    const cleanup = onOnlineStatusChange((isOnline) => {
      setOffline(!isOnline)
      setShowBanner(true)
      
      if (isOnline) {
        setTimeout(() => {
          setShowBanner(false)
        }, 3000)
      }
    })

    return cleanup
  }, [])

  return (
    <AnimatePresence>
      {(offline || showBanner) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <Card className={`p-3 sm:p-4 shadow-lg border-2 ${
            offline 
              ? 'bg-destructive/10 border-destructive' 
              : 'bg-accent/10 border-accent'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                offline 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-accent/20 text-accent'
              }`}>
                {offline ? (
                  <WifiSlash weight="bold" size={20} />
                ) : (
                  <Wifi weight="bold" size={20} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base">
                  {offline ? 'You are offline' : 'Back online!'}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {offline 
                    ? 'Working from cache. Some features may be limited.' 
                    : 'Connection restored. All features available.'}
                </p>
              </div>

              {offline && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="shrink-0"
                >
                  <ArrowsClockwise weight="bold" size={18} />
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
