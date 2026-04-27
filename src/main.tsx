import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from 'sonner'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { PerformanceWrapper } from './components/PerformanceWrapper.tsx'
import { register } from './lib/serviceWorker'
import {
  installPreMountErrorCapture,
  markReactMounted,
  scheduleSparkLoadCheck,
} from './lib/preMountErrorCapture'

import "./main.css"

// 1) Install global error/unhandledrejection handlers BEFORE we import the
//    Spark runtime. If Spark or any other early code throws, the user sees a
//    diagnostic page instead of a blank screen.
installPreMountErrorCapture()

// 2) Schedule a Spark-load check so that if the runtime never initializes
//    (common cause of a blank Android APK), we surface a dedicated message.
scheduleSparkLoadCheck()

// 3) Dynamically import the Spark side-effect module so a load failure is
//    catchable by our handlers (a top-level static import would propagate as
//    an unrecoverable module-evaluation error).
import('@github/spark/spark')
  .catch((err) => {
    // Re-dispatch as an error event so installPreMountErrorCapture can render
    // the fallback UI consistently.
    try {
      window.dispatchEvent(new ErrorEvent('error', {
        error: err instanceof Error ? err : new Error(String(err)),
        message: err instanceof Error ? err.message : String(err),
      }))
    } catch {
      // ignore - the unhandledrejection handler will still fire
    }
  })
  .finally(() => {
    mountApp()
  })

function mountApp() {
  const container = document.getElementById('root')
  if (!container) return
  try {
    createRoot(container).render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <PerformanceWrapper>
          <App />
          <Toaster position="bottom-right" theme="dark" />
        </PerformanceWrapper>
       </ErrorBoundary>
    )
    markReactMounted()
  } catch (err) {
    // If React itself fails to mount, surface via our global handler.
    try {
      window.dispatchEvent(new ErrorEvent('error', {
        error: err instanceof Error ? err : new Error(String(err)),
        message: err instanceof Error ? err.message : String(err),
      }))
    } catch {
      // ignore
    }
  }
}

register({
  onSuccess: () => {
    console.log('[App] Service worker registered successfully')
  },
  onUpdate: () => {
    console.log('[App] New version available')
  },
  onError: (error) => {
    console.error('[App] Service worker registration failed:', error)
  }
})
