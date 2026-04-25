import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadSimple, X } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useKV } from '@github/spark/hooks'

export function InstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useKV('install-prompt-dismissed', false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (canInstall && !dismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [canInstall, dismissed, isInstalled])

  const handleInstall = async () => {
    const installed = await promptInstall()
    if (installed || !canInstall) {
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
  }

  if (isInstalled) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto z-50 sm:max-w-sm"
        >
          <Card className="p-4 shadow-lg border-2 border-primary bg-card">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20 text-primary shrink-0">
                <DownloadSimple weight="bold" size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm sm:text-base">
                      Install TrueAI
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Install this app for quick access and offline use
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-8 w-8 shrink-0"
                  >
                    <X weight="bold" size={16} />
                  </Button>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="gap-2 flex-1"
                  >
                    <DownloadSimple weight="bold" size={16} />
                    Install
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDismiss}
                    className="flex-1"
                  >
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
