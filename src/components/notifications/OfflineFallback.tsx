import { WifiSlash, ArrowsClockwise, House } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function OfflineFallback() {
  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <WifiSlash size={64} weight="fill" className="text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You're offline</h1>
          <p className="text-muted-foreground">
            This page is not available offline. Please check your internet connection and try again.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full gap-2">
            <ArrowsClockwise weight="bold" size={20} />
            Try Again
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="w-full gap-2">
            <House weight="bold" size={20} />
            Go to Home
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Cached pages and previously loaded content may still be available.
          </p>
        </div>
      </Card>
    </div>
  )
}
