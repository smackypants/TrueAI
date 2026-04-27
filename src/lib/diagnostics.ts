/**
 * Runtime diagnostics utilities used by error reporting UIs (ErrorFallback,
 * pre-mount fallback, Spark-load timeout fallback).
 *
 * These helpers are intentionally dependency-free and resilient: every property
 * read is wrapped in try/catch so collecting a diagnostic report can never
 * itself throw and break the error UI.
 */

export interface DiagnosticReport {
  appVersion: string
  timestamp: string
  url: string
  userAgent: string
  language: string
  online: boolean
  platform: string
  capacitor: {
    present: boolean
    platform?: string
    isNative?: boolean
    plugins?: string[]
  }
  spark: {
    present: boolean
    keys?: string[]
  }
  serviceWorker: {
    supported: boolean
    controlled: boolean
    registrations: number
    scopes: string[]
  }
  viewport: {
    width: number
    height: number
    devicePixelRatio: number
  }
  error?: {
    name?: string
    message: string
    stack?: string
  }
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export function getAppVersion(): string {
  return safe(() => (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'), '0.0.0')
}

interface CapacitorGlobal {
  getPlatform?: () => string
  isNativePlatform?: () => boolean
  Plugins?: Record<string, unknown>
  platform?: string
}

export function getCapacitorInfo(): DiagnosticReport['capacitor'] {
  return safe(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
    if (!cap) return { present: false }
    return {
      present: true,
      platform: typeof cap.getPlatform === 'function' ? cap.getPlatform() : cap.platform,
      isNative: typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : undefined,
      plugins: cap.Plugins ? Object.keys(cap.Plugins) : [],
    }
  }, { present: false })
}

export function isSparkPresent(): boolean {
  return safe(() => {
    const s = (window as unknown as { spark?: unknown }).spark
    return !!s && typeof s === 'object'
  }, false)
}

function getSparkInfo(): DiagnosticReport['spark'] {
  return safe(() => {
    const s = (window as unknown as { spark?: Record<string, unknown> }).spark
    if (!s || typeof s !== 'object') return { present: false }
    return { present: true, keys: Object.keys(s) }
  }, { present: false })
}

async function getServiceWorkerInfo(): Promise<DiagnosticReport['serviceWorker']> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { supported: false, controlled: false, registrations: 0, scopes: [] }
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    return {
      supported: true,
      controlled: !!navigator.serviceWorker.controller,
      registrations: regs.length,
      scopes: regs.map((r) => r.scope),
    }
  } catch {
    return {
      supported: true,
      controlled: !!navigator.serviceWorker.controller,
      registrations: 0,
      scopes: [],
    }
  }
}

export async function collectDiagnostics(error?: Error | null): Promise<DiagnosticReport> {
  const report: DiagnosticReport = {
    appVersion: getAppVersion(),
    timestamp: new Date().toISOString(),
    url: safe(() => window.location.href, ''),
    userAgent: safe(() => navigator.userAgent, ''),
    language: safe(() => navigator.language, ''),
    online: safe(() => navigator.onLine, true),
    platform: safe(() => navigator.platform, ''),
    capacitor: getCapacitorInfo(),
    spark: getSparkInfo(),
    serviceWorker: await getServiceWorkerInfo(),
    viewport: safe(
      () => ({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      }),
      { width: 0, height: 0, devicePixelRatio: 1 }
    ),
  }

  if (error) {
    report.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return report
}

export function formatDiagnosticReport(report: DiagnosticReport): string {
  return JSON.stringify(report, null, 2)
}

/**
 * Best-effort copy to clipboard. Falls back to a hidden textarea + execCommand
 * for older WebView builds (Android System WebView pre-Clipboard-API).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

interface CapacitorShareLike {
  share: (opts: { title?: string; text?: string; dialogTitle?: string }) => Promise<unknown>
}

/**
 * Returns the Capacitor Share plugin if it has been registered at runtime.
 * We do not import @capacitor/share (it is not a dependency); we only use it
 * if the host APK already provides it.
 */
export function getCapacitorShare(): CapacitorShareLike | null {
  return safe(() => {
    const cap = (window as unknown as {
      Capacitor?: { Plugins?: Record<string, unknown> }
    }).Capacitor
    const share = cap?.Plugins?.Share as CapacitorShareLike | undefined
    return share && typeof share.share === 'function' ? share : null
  }, null)
}

export async function shareDiagnosticReport(report: DiagnosticReport): Promise<boolean> {
  const share = getCapacitorShare()
  if (!share) return false
  try {
    await share.share({
      title: 'TrueAI LocalAI diagnostic report',
      text: formatDiagnosticReport(report),
      dialogTitle: 'Share diagnostic report',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Reload the app while bypassing the service-worker cache. Useful when a stale
 * SW cache prevents the Spark runtime or app bundle from loading on Android.
 */
export async function reloadBypassingCache(): Promise<void> {
  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
    }
  } catch {
    // ignore
  }
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
    }
  } catch {
    // ignore
  }
  try {
    window.location.reload()
  } catch {
    // ignore
  }
}
