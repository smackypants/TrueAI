/**
 * Runtime platform detection. Centralised so feature modules don't import
 * `@capacitor/core` directly — we want a single chokepoint to swap, mock,
 * or feature-flag platform behaviour.
 */

import { Capacitor } from '@capacitor/core'

export type Platform = 'web' | 'android' | 'ios'

export function getPlatform(): Platform {
  try {
    return Capacitor.getPlatform() as Platform
  } catch {
    return 'web'
  }
}

/** True when running inside a Capacitor-wrapped native shell (Android / iOS). */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** True only on Android. */
export function isAndroid(): boolean {
  return getPlatform() === 'android'
}

/** True only on iOS. */
export function isIOS(): boolean {
  return getPlatform() === 'ios'
}

/**
 * Cheap reachability test for a Capacitor plugin id. Capacitor exposes an
 * `isPluginAvailable` check that returns false for plugins not installed
 * in the host APK, even if the JS shim is bundled.
 */
export function isPluginAvailable(name: string): boolean {
  try {
    return Capacitor.isPluginAvailable(name)
  } catch {
    return false
  }
}
