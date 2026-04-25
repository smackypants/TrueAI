import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowsClockwise, Warning } from '@phosphor-icons/react'

interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
  componentName?: string
}

export function ErrorFallback({ error, resetErrorBoundary, componentName = 'Component' }: ErrorFallbackProps) {
  return (
    <Card className="p-6 sm:p-8 m-4">
      <div className="text-center max-w-md mx-auto">
        <Warning size={48} className="mx-auto mb-4 text-destructive" weight="fill" />
        <h3 className="text-lg font-semibold mb-2">{componentName} Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Something went wrong loading this content. Please try again.
        </p>
        {error && (
          <details className="text-left mb-4 p-3 bg-muted rounded-lg">
            <summary className="text-xs font-medium cursor-pointer mb-2">Error Details</summary>
            <pre className="text-xs overflow-auto whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}
        {resetErrorBoundary && (
          <Button onClick={resetErrorBoundary} className="gap-2">
            <ArrowsClockwise size={18} weight="bold" />
            Try Again
          </Button>
        )}
      </div>
    </Card>
  )
}
