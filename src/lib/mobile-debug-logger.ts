/**
 * Mobile debug logger — structured event capture and bug-pattern analysis.
 *
 * Designed to complement the existing diagnostics system:
 * - `diagnostics.ts` captures full DiagnosticReport snapshots on errors.
 * - `mobile-debug-logger.ts` maintains a lightweight, categorised stream of
 *   mobile-specific events so recurring patterns can be reviewed and addressed
 *   automatically.
 *
 * Storage: localStorage ring buffer at {@link MOBILE_LOG_STORAGE_KEY}, capped
 * at {@link MOBILE_LOG_MAX_ENTRIES}. All reads/writes use the same safe()
 * pattern as diagnostics.ts — a storage failure never surfaces to the caller.
 *
 * Typical usage in main.tsx:
 *   import { installMobileDebugLogger } from './lib/mobile-debug-logger'
 *   installMobileDebugLogger()
 *
 * Programmatic review:
 *   import { analyzeMobileBugs, getMobileLog } from './lib/mobile-debug-logger'
 *   const matches = analyzeMobileBugs()
 *   // matches[].pattern.suggestedFix describes the fix for each bug cluster
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MobileLogCategory =
  | 'network'      // connectivity changes and network-level errors
  | 'plugin'       // Capacitor native plugin failures
  | 'performance'  // low FPS, high memory, slow renders
  | 'lifecycle'    // app pause / resume / back-navigation events
  | 'error'        // unhandled JS errors / promise rejections
  | 'webview'      // WebView-specific rendering or navigation errors

export type MobileLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface MobileLogEntry {
  /** Unique monotonic ID for deduplication. */
  id: string
  /** ISO 8601 timestamp. */
  timestamp: string
  category: MobileLogCategory
  level: MobileLogLevel
  message: string
  /** Optional structured context. Undefined values are omitted when serialised. */
  data?: Record<string, unknown>
  /** Capacitor platform string at log time ('web', 'android', 'ios'). */
  platform: string
  appVersion: string
}

export interface BugPattern {
  id: string
  category: MobileLogCategory
  /** Patterns tested against entry.message (case-insensitive, any match = hit). */
  messagePatterns: RegExp[]
  title: string
  description: string
  suggestedFix: string
}

export interface BugPatternMatch {
  pattern: BugPattern
  entries: MobileLogEntry[]
}

// ---------------------------------------------------------------------------
// Storage constants
// ---------------------------------------------------------------------------

export const MOBILE_LOG_STORAGE_KEY = 'trueai.mobileLog.v1'
export const MOBILE_LOG_MAX_ENTRIES = 100

interface StoredMobileLog {
  version: 1
  entries: MobileLogEntry[]
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function getLocalStorage(): Storage | null {
  return safe(() => (typeof localStorage !== 'undefined' ? localStorage : null), null)
}

let _nextId = 0

function generateId(): string {
  return `mbl-${Date.now()}-${++_nextId}`
}

function getCurrentPlatform(): string {
  return safe(() => {
    const cap = (window as unknown as {
      Capacitor?: { getPlatform?: () => string; platform?: string }
    }).Capacitor
    if (!cap) return 'web'
    return typeof cap.getPlatform === 'function' ? cap.getPlatform() : (cap.platform ?? 'web')
  }, 'web')
}

function getCurrentAppVersion(): string {
  return safe(
    () => (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'),
    '0.0.0',
  )
}

// ---------------------------------------------------------------------------
// Public log API
// ---------------------------------------------------------------------------

/** Returns all persisted log entries, oldest first. */
export function getMobileLog(): MobileLogEntry[] {
  const ls = getLocalStorage()
  if (!ls) return []
  return safe(() => {
    const raw = ls.getItem(MOBILE_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredMobileLog>
    if (!parsed || !Array.isArray(parsed.entries)) return []
    return parsed.entries.slice()
  }, [])
}

/** Append a structured event to the persistent mobile log. */
export function logMobileEvent(
  category: MobileLogCategory,
  level: MobileLogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  const ls = getLocalStorage()
  if (!ls) return
  safe(() => {
    const entry: MobileLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      platform: getCurrentPlatform(),
      appVersion: getCurrentAppVersion(),
      ...(data !== undefined ? { data } : {}),
    }
    const current = getMobileLog()
    current.push(entry)
    while (current.length > MOBILE_LOG_MAX_ENTRIES) current.shift()
    const payload: StoredMobileLog = { version: 1, entries: current }
    ls.setItem(MOBILE_LOG_STORAGE_KEY, JSON.stringify(payload))
    return true
  }, false)
}

/** Remove all entries from the mobile log. */
export function clearMobileLog(): void {
  const ls = getLocalStorage()
  if (!ls) return
  safe(() => {
    ls.removeItem(MOBILE_LOG_STORAGE_KEY)
    return true
  }, false)
}

/**
 * Download the mobile log as a JSON file.
 * @returns Number of entries exported, or 0 if the log is empty or the
 *   environment does not support file downloads.
 */
export function downloadMobileLog(filename = `trueai-mobile-log-${Date.now()}.json`): number {
  const entries = getMobileLog()
  if (entries.length === 0) return 0
  return safe(() => {
    if (
      typeof Blob === 'undefined' ||
      typeof URL === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return 0
    }
    const payload: StoredMobileLog = { version: 1, entries }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        // ignore — best-effort cleanup
      }
    }, 0)
    return entries.length
  }, 0)
}

// ---------------------------------------------------------------------------
// Known bug patterns
// ---------------------------------------------------------------------------

/**
 * Catalogue of known mobile bug patterns with descriptions and suggested fixes.
 * Consumed by {@link analyzeMobileBugs} to automatically cluster log entries.
 */
export const KNOWN_BUG_PATTERNS: BugPattern[] = [
  {
    id: 'spark-not-loaded',
    category: 'error',
    messagePatterns: [/spark runtime did not load/i, /spark.*not.*load/i, /window\.spark/i],
    title: 'Spark runtime failed to initialise',
    description:
      'The Spark runtime required by the app did not load. Common on Android when the device is offline on first launch or a stale service-worker cache is serving old assets.',
    suggestedFix:
      'Clear the service-worker cache via the in-app "Reload app" button. If the issue recurs, verify that /runtime.config.json is present in the APK assets (run `cap sync` after every build).',
  },
  {
    id: 'network-offline',
    category: 'network',
    messagePatterns: [
      /offline/i,
      /net::err_/i,
      /failed to fetch/i,
      /network.*error/i,
      /networkerror/i,
    ],
    title: 'Network unavailable',
    description:
      'The device lost network connectivity or a request failed because the device is offline.',
    suggestedFix:
      'Verify the offline queue (src/lib/offline-queue.ts) is draining correctly on reconnect. Ensure the service worker caches all critical app assets for offline use.',
  },
  {
    id: 'capacitor-plugin-failure',
    category: 'plugin',
    messagePatterns: [
      /capacitor/i,
      /plugin.*not.*available/i,
      /native.*plugin/i,
      /isPluginAvailable/i,
    ],
    title: 'Capacitor native plugin unavailable',
    description:
      'A required Capacitor plugin failed to load or is not available on the current platform.',
    suggestedFix:
      "Verify the plugin is listed in capacitor.config.ts and that `cap sync` was run after installing it. Check the plugin's native module is in the correct Gradle dependency list in android/app/build.gradle.",
  },
  {
    id: 'service-worker-stale',
    category: 'error',
    messagePatterns: [
      /serviceworker/i,
      /sw.*cache/i,
      /stale.*cache/i,
      /cache.*stale/i,
      /updatefound/i,
    ],
    title: 'Stale service-worker cache',
    description: 'The service worker may be serving a stale version of the app assets.',
    suggestedFix:
      'Increment the service-worker cache version or call reloadBypassingCache() (diagnostics.ts) to unregister the current SW and force a fresh asset fetch.',
  },
  {
    id: 'memory-pressure',
    category: 'performance',
    messagePatterns: [
      /out of memory/i,
      /\boom\b/i,
      /memory.*exceed/i,
      /heap.*limit/i,
      /quota.*exceeded/i,
    ],
    title: 'Memory pressure / storage quota exceeded',
    description:
      'The app is consuming too much memory or has exceeded the browser/WebView storage quota.',
    suggestedFix:
      "Reduce IndexedDB cache sizes (indexeddb.ts) on low-memory devices (tier='low'). Call clearErrorLog() / clearMobileLog() to free localStorage space. Ensure large blobs are cleaned up promptly after use.",
  },
  {
    id: 'slow-page-load',
    category: 'performance',
    messagePatterns: [/slow page load/i, /load.*\d+ms/i],
    title: 'Slow app startup / page load',
    description:
      'The app took more than 3 seconds to reach the load event, indicating a slow initial paint on mobile.',
    suggestedFix:
      'Profile the bundle with `npm run build:dev` and Vite bundle visualiser. Consider lazy-loading heavy vendor libraries (three, recharts, framer-motion) and pre-caching critical assets in the service worker.',
  },
  {
    id: 'webview-navigation-error',
    category: 'webview',
    messagePatterns: [
      /webview/i,
      /err_unknown_url_scheme/i,
      /err_name_not_resolved/i,
      /chromeclient/i,
    ],
    title: 'WebView navigation or URL-scheme error',
    description:
      'A WebView navigation failed due to an unknown URL scheme, DNS failure, or a WebClient error.',
    suggestedFix:
      "Ensure Capacitor's allowNavigation / hostname config in capacitor.config.ts includes all required origins. Verify deep-link intent filters in AndroidManifest.xml are correct.",
  },
  {
    id: 'back-navigation-leak',
    category: 'lifecycle',
    messagePatterns: [/back.*handler/i, /backbutton/i, /cangoback/i],
    title: 'Android back-button handler stack leak',
    description:
      'A back-button handler was registered but never deregistered, causing back-navigation to be silently consumed.',
    suggestedFix:
      'Ensure every pushBackHandler() call stores the returned unregister function and calls it in the component cleanup (e.g. useEffect return). See src/lib/native/app-lifecycle.ts.',
  },
]

// ---------------------------------------------------------------------------
// Bug analysis
// ---------------------------------------------------------------------------

/**
 * Scan the current mobile log against {@link KNOWN_BUG_PATTERNS} and return
 * matches sorted by number of matching entries (most frequent first).
 */
export function analyzeMobileBugs(): BugPatternMatch[] {
  const entries = getMobileLog()
  const results: BugPatternMatch[] = []

  for (const pattern of KNOWN_BUG_PATTERNS) {
    const matches = entries.filter(
      (e) =>
        e.category === pattern.category &&
        pattern.messagePatterns.some((re) => re.test(e.message)),
    )
    if (matches.length > 0) {
      results.push({ pattern, entries: matches })
    }
  }

  return results.sort((a, b) => b.entries.length - a.entries.length)
}

// ---------------------------------------------------------------------------
// Auto-instrumentation
// ---------------------------------------------------------------------------

let _installed = false

/**
 * Derive the log category most appropriate for a given error message string.
 * Falls back to 'error' for unrecognised messages.
 */
function categorizeErrorMessage(message: string): MobileLogCategory {
  if (/fetch|network|offline|net::/i.test(message)) return 'network'
  if (/capacitor|plugin|native/i.test(message)) return 'plugin'
  if (/webview|chromeclient|url.scheme/i.test(message)) return 'webview'
  return 'error'
}

/**
 * Install global event listeners that automatically capture mobile-specific
 * events into the debug log. Should be called as early as possible in
 * main.tsx — after `installPreMountErrorCapture()` but before the React tree
 * mounts.
 *
 * Returns a cleanup function that removes all installed listeners. On
 * platforms that don't support the required APIs (e.g. SSR) this is a no-op.
 */
export function installMobileDebugLogger(): () => void {
  if (_installed || typeof window === 'undefined') return () => {}
  _installed = true

  const windowHandlers: Array<[string, EventListener]> = []
  const documentHandlers: Array<[string, EventListener]> = []
  let perfObserver: PerformanceObserver | null = null

  function onWindow(type: string, handler: EventListener): void {
    window.addEventListener(type, handler)
    windowHandlers.push([type, handler])
  }

  function onDocument(type: string, handler: EventListener): void {
    if (typeof document !== 'undefined') {
      document.addEventListener(type, handler)
      documentHandlers.push([type, handler])
    }
  }

  // Unhandled JS errors
  onWindow('error', (event: Event) => {
    const e = event as ErrorEvent
    const message =
      (e.error instanceof Error ? e.error.message : null) ?? e.message ?? 'Unknown error'
    const stack = e.error instanceof Error ? e.error.stack : undefined
    logMobileEvent(categorizeErrorMessage(message), 'error', message, {
      ...(stack !== undefined ? { stack } : {}),
      ...(e.filename ? { filename: e.filename } : {}),
      ...(e.lineno ? { lineno: e.lineno } : {}),
      ...(e.colno ? { colno: e.colno } : {}),
    })
  })

  // Unhandled promise rejections
  onWindow('unhandledrejection', (event: Event) => {
    const e = event as PromiseRejectionEvent
    const message =
      e.reason instanceof Error
        ? e.reason.message
        : typeof e.reason === 'string'
          ? e.reason
          : 'Unhandled promise rejection'
    const stack = e.reason instanceof Error ? e.reason.stack : undefined
    logMobileEvent(
      categorizeErrorMessage(message),
      'error',
      message,
      stack !== undefined ? { stack } : undefined,
    )
  })

  // Network connectivity changes
  onWindow('online', () => {
    logMobileEvent('network', 'info', 'Device came online')
  })
  onWindow('offline', () => {
    logMobileEvent('network', 'warn', 'Device went offline')
  })

  // App lifecycle — web fallback via visibilitychange (native uses Capacitor App plugin)
  onDocument('visibilitychange', () => {
    const visible =
      typeof document !== 'undefined' && document.visibilityState === 'visible'
    logMobileEvent(
      'lifecycle',
      'debug',
      visible ? 'App resumed (visible)' : 'App paused (hidden)',
    )
  })

  // Performance: log slow page loads (> 3 s is a common mobile slow-start signal)
  if (typeof PerformanceObserver !== 'undefined') {
    safe(() => {
      perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming
            const loadTime = nav.loadEventEnd - nav.startTime
            if (loadTime > 3000) {
              logMobileEvent(
                'performance',
                'warn',
                `Slow page load: ${Math.round(loadTime)}ms`,
                {
                  domInteractive: Math.round(nav.domInteractive),
                  domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
                  loadEventEnd: Math.round(nav.loadEventEnd),
                },
              )
            }
          }
        }
      })
      perfObserver!.observe({ type: 'navigation', buffered: true })
      return true
    }, false)
  }

  return function cleanup(): void {
    _installed = false
    for (const [type, handler] of windowHandlers) {
      window.removeEventListener(type, handler)
    }
    for (const [type, handler] of documentHandlers) {
      if (typeof document !== 'undefined') {
        document.removeEventListener(type, handler)
      }
    }
    if (perfObserver !== null) {
      try {
        perfObserver.disconnect()
      } catch {
        // ignore
      }
      perfObserver = null
    }
    windowHandlers.length = 0
    documentHandlers.length = 0
  }
}

/** Test-only: reset module-level state so tests are independent. */
export function __resetMobileDebugLoggerForTests(): void {
  _installed = false
  _nextId = 0
  clearMobileLog()
}
