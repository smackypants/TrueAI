/**
 * Detect the installer source of the running app — used to surface
 * channel-appropriate hints (e.g. "Update via F-Droid" vs. "Download
 * the latest APK from GitHub Releases") and to render an "Installed
 * via F-Droid" badge in About.
 *
 * Implementation notes:
 *  - On web we always return `'web'`.
 *  - On Android we read the installer package via the `App` Capacitor
 *    plugin's app info, falling back to `'unknown'` when the runtime
 *    doesn't expose it (e.g. tests, older Capacitor).
 *  - We deliberately do NOT depend on a fresh Capacitor plugin so the
 *    F-Droid build recipe stays unchanged.
 */

import { isNative, isAndroid } from './platform'

export type InstallerSource =
  | 'web'
  | 'fdroid'
  | 'play'
  | 'github'
  | 'amazon'
  | 'samsung'
  | 'sideload'
  | 'unknown'

/** Known installer package ids. Kept narrow on purpose. */
const INSTALLER_PACKAGE_TO_SOURCE: Record<string, InstallerSource> = {
  'org.fdroid.fdroid': 'fdroid',
  'org.fdroid.fdroid.privileged': 'fdroid',
  'com.android.vending': 'play',
  'com.google.android.feedback': 'play',
  'com.android.packageinstaller': 'sideload',
  'com.google.android.packageinstaller': 'sideload',
  'com.amazon.venezia': 'amazon',
  'com.sec.android.app.samsungapps': 'samsung',
}

/**
 * Classify a raw Android installer package id. Exported for unit tests
 * and reuse by code that already has a package id in hand (e.g. from a
 * future native plugin).
 */
export function classifyInstallerPackage(
  pkg: string | null | undefined,
): InstallerSource {
  if (!pkg) return 'sideload'
  if (pkg in INSTALLER_PACKAGE_TO_SOURCE) {
    return INSTALLER_PACKAGE_TO_SOURCE[pkg]
  }
  // GitHub Releases (downloaded APK opened from the browser/Files)
  // typically reports the system package installer; that's covered
  // above. Anything else we don't recognise is treated as sideload.
  return 'sideload'
}

/**
 * Resolve the installer source. Async because the Capacitor App plugin
 * exposes app info through a Promise-returning API.
 */
export async function getInstallerSource(): Promise<InstallerSource> {
  if (!isNative()) return 'web'
  if (!isAndroid()) return 'unknown'
  try {
    // Lazy import so this module is web-safe and doesn't drag the
    // `@capacitor/app` plugin into web bundles that don't already
    // depend on it.
    const mod = await import('@capacitor/app')
    const App = mod.App
    if (!App || typeof App.getInfo !== 'function') return 'unknown'
    const info = (await App.getInfo()) as { installerPackageName?: string | null }
    return classifyInstallerPackage(info?.installerPackageName ?? null)
  } catch {
    return 'unknown'
  }
}

/** Convenience: true when the running app was installed by the F-Droid client. */
export async function isInstalledFromFDroid(): Promise<boolean> {
  return (await getInstallerSource()) === 'fdroid'
}
