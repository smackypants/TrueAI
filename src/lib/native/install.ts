/**
 * One-stop bootstrap for native mobile capabilities. Imported as a side
 * effect from `src/main.tsx` before the React tree mounts so the splash
 * screen, status bar, and lifecycle listeners are configured as early as
 * possible.
 *
 * Every step is wrapped in try/catch — failure to initialise any single
 * native plugin must never block app startup.
 */

import type { StatusBarPlugin } from '@capacitor/status-bar'
import type { SplashScreenPlugin } from '@capacitor/splash-screen'
import type { KeyboardPlugin } from '@capacitor/keyboard'
import { isNative } from './platform'
import { initAppLifecycle } from './app-lifecycle'

let StatusBar: StatusBarPlugin | null = null
let Style: typeof import('@capacitor/status-bar').Style | null = null
let SplashScreen: SplashScreenPlugin | null = null
let Keyboard: KeyboardPlugin | null = null
let KeyboardResize: typeof import('@capacitor/keyboard').KeyboardResize | null = null

try {
  const statusBarModule = await import('@capacitor/status-bar')
  StatusBar = statusBarModule.StatusBar
  Style = statusBarModule.Style
} catch {
  console.debug('[native/install] @capacitor/status-bar not available')
}

try {
  const splashScreenModule = await import('@capacitor/splash-screen')
  SplashScreen = splashScreenModule.SplashScreen
} catch {
  console.debug('[native/install] @capacitor/splash-screen not available')
}

try {
  const keyboardModule = await import('@capacitor/keyboard')
  Keyboard = keyboardModule.Keyboard
  KeyboardResize = keyboardModule.KeyboardResize
} catch {
  console.debug('[native/install] @capacitor/keyboard not available')
}

async function configureStatusBar(): Promise<void> {
  if (!StatusBar || !Style) return
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
  if (!Keyboard || !KeyboardResize) return
  try {
    // Resize the WebView so chat inputs aren't covered by the keyboard.
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
    await Keyboard.setScroll({ isDisabled: false })
  } catch (err) {
    console.debug('[native/install] keyboard setup skipped:', err)
  }
}

async function hideSplash(): Promise<void> {
  if (!SplashScreen) return
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
