import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowsClockwise, Download } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { skipWaiting } from '@/lib/serviceWorker'

export function ServiceWorkerUpdate() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const handleUpdate = (reg: ServiceWorkerRegistration) => {
      setRegistration(reg)
      setShowUpdate(true)
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleUpdate(reg)
              }
            })
          }
        })
        
        if (reg.waiting) {
          handleUpdate(reg)
        }
      })
    }
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      skipWaiting(registration)
      window.location.reload()
    }
  }

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <Card className="p-3 sm:p-4 shadow-lg border-2 border-primary bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20 text-primary">
                <Download weight="bold" size={20} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base">
                  Update available
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  A new version is ready to install
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpdate(false)}
                  className="text-xs"
                >
                  Later
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  className="gap-2 text-xs"
                >
                  <ArrowsClockwise weight="bold" size={16} />
                  Update
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
