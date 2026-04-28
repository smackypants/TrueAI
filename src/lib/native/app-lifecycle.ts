/**
 * App lifecycle wiring for the native shell:
 *
 * - **Android back button**: replaces the default "exit app" behaviour with
 *   a registered stack of handlers. Open dialogs / sheets / nested views
 *   register a handler; the most-recently-registered one runs first and
 *   can `return true` to consume the event. If the stack is empty we fall
 *   back to native back navigation (or `App.minimizeApp()` /
 *   `App.exitApp()` on the home view, mirroring standard Android
 *   behaviour).
 * - **Resume**: fires a hook callback when the OS brings the app back to
 *   the foreground — useful for flushing the offline queue, refreshing
 *   network state, etc.
 *
 * On the web both APIs are no-ops (back button is the browser's job, and
 * "resume" maps reasonably to the `visibilitychange` event).
 */

import { App } from '@capacitor/app'
import { isNative } from './platform'

type BackHandler = () => boolean | void | Promise<boolean | void>
type ResumeHandler = () => void | Promise<void>

const backStack: BackHandler[] = []
const resumeListeners = new Set<ResumeHandler>()

let initialized = false

export async function initAppLifecycle(): Promise<void> {
  if (initialized) return
  initialized = true

  if (isNative()) {
    try {
      await App.addListener('backButton', async (event) => {
        // Walk the stack from the top; first handler that returns truthy
        // consumes the event.
        for (let i = backStack.length - 1; i >= 0; i--) {
          try {
            const handled = await backStack[i]()
            if (handled === true) return
          } catch (err) {
            console.error('[native/app] back handler threw:', err)
          }
        }
        // No handler consumed the event. If the WebView has history, go
        // back; otherwise minimise to background (Android default).
        if (event.canGoBack) {
          window.history.back()
        } else {
          try {
            await App.minimizeApp()
          } catch {
            // Older devices or permission denied — fall back to exit.
            try {
              await App.exitApp()
            } catch {
              // give up silently
            }
          }
        }
      })
      await App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          for (const l of resumeListeners) {
            try {
              void l()
            } catch (err) {
              console.error('[native/app] resume listener threw:', err)
            }
          }
        }
      })
    } catch (err) {
      console.error('[native/app] failed to register lifecycle listeners:', err)
    }
  } else if (typeof document !== 'undefined') {
    // Web fallback: visibilitychange → resume
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        for (const l of resumeListeners) {
          try {
            void l()
          } catch {
            // ignore
          }
        }
      }
    })
  }
}

/**
 * Register a back-button handler (LIFO). Returns an unregister function.
 * The handler should return `true` to consume the event, anything else to
 * defer to the next handler down the stack.
 */
export function pushBackHandler(handler: BackHandler): () => void {
  backStack.push(handler)
  return () => {
    const idx = backStack.lastIndexOf(handler)
    if (idx !== -1) backStack.splice(idx, 1)
  }
}

/** Register a resume listener. Returns an unregister function. */
export function onAppResume(listener: ResumeHandler): () => void {
  resumeListeners.add(listener)
  return () => {
    resumeListeners.delete(listener)
  }
}

/** Test-only helper. */
export function __resetAppLifecycleForTests(): void {
  initialized = false
  backStack.length = 0
  resumeListeners.clear()
}
