import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from 'sonner'
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { register } from './lib/serviceWorker'
import { toast } from 'sonner'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
    <Toaster position="bottom-right" theme="dark" />
   </ErrorBoundary>
)

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
