/**
 * One-stop bootstrap for native mobile capabilities. Imported as a side
 * effect from `src/main.tsx` before the React tree mounts so the splash
 * screen, status bar, and lifecycle listeners are configured as early as
 * possible.
 *
 * Every step is wrapped in try/catch — failure to initialise any single
 * native plugin must never block app startup.
 */

import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { isNative } from './platform'
import { initAppLifecycle } from './app-lifecycle'

async function configureStatusBar(): Promise<void> {
  try {
    // Match the dark theme background defined in capacitor.config.ts.
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1a1d24' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch (err) {
    console.debug('[native/install] status bar setup skipped:', err)
  }
}

async function configureKeyboard(): Promise<void> {
  try {
    // Resize the WebView so chat inputs aren't covered by the keyboard.
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
    await Keyboard.setScroll({ isDisabled: false })
  } catch (err) {
    console.debug('[native/install] keyboard setup skipped:', err)
  }
}

async function hideSplash(): Promise<void> {
  try {
    // Give the React tree one frame to paint before fading the splash.
    await new Promise((r) => setTimeout(r, 50))
    await SplashScreen.hide({ fadeOutDuration: 250 })
  } catch (err) {
    console.debug('[native/install] splash hide skipped:', err)
  }
}

let installed = false

export async function installNativeIntegrations(): Promise<void> {
  if (installed) return
  installed = true

  // Lifecycle listeners are useful on web too (visibility), so always run.
  try {
    await initAppLifecycle()
  } catch (err) {
    console.error('[native/install] lifecycle init failed:', err)
  }

  if (!isNative()) return

  // Native-only setup. Run in parallel — none depend on each other.
  await Promise.all([configureStatusBar(), configureKeyboard()])
  await hideSplash()
}

// Self-install when imported. Safe to import multiple times.
void installNativeIntegrations()
