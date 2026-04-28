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

/**
 * Whether this build is a debug build. Vite injects `__APP_DEBUG__` for any
 * non-production mode (including `vite dev` and `vite build --mode
 * development`). When the symbol is absent (e.g. in unit tests) we default to
 * `true` to match the dev-friendly path; production bundles always have it
 * defined as `false` by Vite.
 */
export function isDebugBuild(): boolean {
  return safe(() => (typeof __APP_DEBUG__ !== 'undefined' ? __APP_DEBUG__ : true), true)
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

// ---------------------------------------------------------------------------
// Automatic error-report submission (Android debug builds)
// ---------------------------------------------------------------------------

export interface ErrorReportingConfig {
  autoSubmit: boolean
  endpoint: string
  debugOnly: boolean
  androidOnly: boolean
  timeoutMs: number
  github: GitHubReportingConfig
}

export interface GitHubReportingConfig {
  owner: string
  repo: string
  labels: string[]
}

const defaultErrorReportingConfig: ErrorReportingConfig = {
  autoSubmit: false,
  endpoint: '',
  debugOnly: true,
  androidOnly: true,
  timeoutMs: 5000,
  github: { owner: '', repo: '', labels: [] },
}

let runtimeConfigPromise: Promise<ErrorReportingConfig> | null = null

/**
 * Lazily fetch and cache `runtime.config.json` from the app root. Returns
 * `defaultErrorReportingConfig` if the file is missing or malformed.
 *
 * Exported primarily for tests; production callers should use
 * `submitDiagnosticReport` which calls this internally.
 */
export function loadErrorReportingConfig(): Promise<ErrorReportingConfig> {
  if (runtimeConfigPromise) return runtimeConfigPromise
  runtimeConfigPromise = (async (): Promise<ErrorReportingConfig> => {
    try {
      if (typeof fetch !== 'function') return { ...defaultErrorReportingConfig }
      const res = await fetch('/runtime.config.json', { cache: 'no-store' })
      if (!res.ok) return { ...defaultErrorReportingConfig }
      const json = (await res.json()) as {
        errorReporting?: Partial<Omit<ErrorReportingConfig, 'github'>> & { github?: Partial<GitHubReportingConfig> }
      }
      const er = json.errorReporting ?? {}
      const gh: Partial<GitHubReportingConfig> = er.github ?? {}
      return {
        autoSubmit: typeof er.autoSubmit === 'boolean' ? er.autoSubmit : defaultErrorReportingConfig.autoSubmit,
        endpoint: typeof er.endpoint === 'string' ? er.endpoint : defaultErrorReportingConfig.endpoint,
        debugOnly: typeof er.debugOnly === 'boolean' ? er.debugOnly : defaultErrorReportingConfig.debugOnly,
        androidOnly: typeof er.androidOnly === 'boolean' ? er.androidOnly : defaultErrorReportingConfig.androidOnly,
        timeoutMs:
          typeof er.timeoutMs === 'number' && er.timeoutMs > 0
            ? er.timeoutMs
            : defaultErrorReportingConfig.timeoutMs,
        github: {
          owner: typeof gh.owner === 'string' ? gh.owner : defaultErrorReportingConfig.github.owner,
          repo: typeof gh.repo === 'string' ? gh.repo : defaultErrorReportingConfig.github.repo,
          labels: Array.isArray(gh.labels) ? gh.labels.filter((l): l is string => typeof l === 'string') : [],
        },
      }
    } catch {
      return { ...defaultErrorReportingConfig }
    }
  })()
  return runtimeConfigPromise
}

/** Reset the cached runtime-config promise. Test-only. */
export function _resetErrorReportingConfigForTest(): void {
  runtimeConfigPromise = null
  submittedReports.clear()
}

/**
 * Returns the criteria used to decide whether `submitDiagnosticReport` will
 * actually POST. Exposed for diagnostic UIs that want to surface why a
 * submission was (or was not) attempted.
 */
export function shouldAutoSubmit(config: ErrorReportingConfig): { ok: boolean; reason?: string } {
  if (!config.autoSubmit) return { ok: false, reason: 'disabled' }
  if (!config.endpoint) return { ok: false, reason: 'no-endpoint' }
  if (config.debugOnly && !isDebugBuild()) return { ok: false, reason: 'release-build' }
  if (config.androidOnly) {
    const cap = getCapacitorInfo()
    if (!cap.present || cap.platform !== 'android') return { ok: false, reason: 'not-android' }
  }
  return { ok: true }
}

export interface SubmitResult {
  submitted: boolean
  status?: number
  reason?: string
  error?: string
}

// Dedupe identical reports within a session: the same report (same
// error message + stack + timestamp) is only POSTed once. Prevents a
// looping error from spamming the reporting endpoint.
const submittedReports = new Set<string>()

function reportFingerprint(report: DiagnosticReport): string {
  const e = report.error
  if (!e) return `${report.timestamp}|noerr`
  return `${e.name ?? ''}|${e.message}|${e.stack ?? ''}`
}

/**
 * Best-effort POST of a diagnostic report to the configured endpoint. Always
 * resolves; never throws. Skips when the runtime configuration disables it,
 * when the build is not a debug build (and `debugOnly` is set), or when
 * the host is not Android (and `androidOnly` is set).
 *
 * The payload is the JSON-formatted report (see `formatDiagnosticReport`).
 * The request includes a `Content-Type: application/json` header and is
 * aborted after `timeoutMs`.
 */
export async function submitDiagnosticReport(report: DiagnosticReport): Promise<SubmitResult> {
  const config = await loadErrorReportingConfig()
  const gate = shouldAutoSubmit(config)
  if (!gate.ok) return { submitted: false, reason: gate.reason }

  const fp = reportFingerprint(report)
  if (submittedReports.has(fp)) {
    return { submitted: false, reason: 'duplicate' }
  }
  submittedReports.add(fp)

  if (typeof fetch !== 'function') {
    return { submitted: false, reason: 'no-fetch' }
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller
    ? setTimeout(() => {
        // abort() can throw "InvalidStateError" if the request already
        // completed and the controller was disposed; the abort is purely
        // best-effort here so swallowing the error is intentional.
        try { controller.abort() } catch { /* ignore */ }
      }, config.timeoutMs)
    : null

  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: formatDiagnosticReport(report),
      signal: controller?.signal,
      // Don't send credentials by default; the endpoint should accept
      // anonymous reports from the APK.
      credentials: 'omit',
      mode: 'cors',
    })
    return { submitted: res.ok, status: res.status, reason: res.ok ? undefined : 'http-error' }
  } catch (err) {
    // Allow retry on transient network errors by removing the dedupe entry.
    submittedReports.delete(fp)
    return {
      submitted: false,
      reason: 'network-error',
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Persistent error log (localStorage ring buffer)
// ---------------------------------------------------------------------------
//
// Every diagnostic report is appended to a capped ring buffer in localStorage
// so that errors can be reviewed later, exported as a JSON file, and shared
// with the maintainers / a coding agent for debugging — even when no
// network endpoint is configured for `submitDiagnosticReport`.
//
// Storage shape (key = ERROR_LOG_STORAGE_KEY):
//   {
//     "version": 1,
//     "entries": [DiagnosticReport, ...]   // newest last, capped at MAX
//   }

export const ERROR_LOG_STORAGE_KEY = 'trueai.errorLog.v1'
export const ERROR_LOG_MAX_ENTRIES = 50

interface StoredErrorLog {
  version: 1
  entries: DiagnosticReport[]
}

function getLocalStorage(): Storage | null {
  return safe(() => (typeof localStorage !== 'undefined' ? localStorage : null), null)
}

/** Returns the persisted diagnostic reports, oldest first. */
export function getErrorLog(): DiagnosticReport[] {
  const ls = getLocalStorage()
  if (!ls) return []
  return safe(() => {
    const raw = ls.getItem(ERROR_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredErrorLog>
    if (!parsed || !Array.isArray(parsed.entries)) return []
    // Defensive copy; consumers shouldn't be able to mutate the stored data
    // by mutating the returned array.
    return parsed.entries.slice()
  }, [])
}

/**
 * Append a report to the persistent log, trimming to the most recent
 * {@link ERROR_LOG_MAX_ENTRIES} entries. Returns `true` if the write
 * succeeded, `false` if storage is unavailable or full.
 *
 * Identical consecutive reports (same fingerprint as the previous entry) are
 * collapsed into the existing entry by stamping a fresh `timestamp`, so a
 * tight error loop doesn't immediately exhaust the buffer.
 */
export function appendErrorLogEntry(report: DiagnosticReport): boolean {
  const ls = getLocalStorage()
  if (!ls) return false

  return safe(() => {
    const current = getErrorLog()
    const last = current[current.length - 1]
    if (last && reportFingerprint(last) === reportFingerprint(report)) {
      // Same error as the previous entry — just refresh the timestamp.
      current[current.length - 1] = { ...last, timestamp: report.timestamp }
    } else {
      current.push(report)
    }
    while (current.length > ERROR_LOG_MAX_ENTRIES) current.shift()
    const payload: StoredErrorLog = { version: 1, entries: current }
    ls.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(payload))
    return true
  }, false)
}

/** Clear all persisted error reports. */
export function clearErrorLog(): void {
  const ls = getLocalStorage()
  if (!ls) return
  safe(() => {
    ls.removeItem(ERROR_LOG_STORAGE_KEY)
    return true
  }, false)
}

/**
 * Trigger a download of the persistent error log as a JSON file. Returns the
 * number of entries exported, or `0` if the log is empty / the environment
 * does not support file downloads.
 */
export function downloadErrorLog(filename = `trueai-errors-${Date.now()}.json`): number {
  const entries = getErrorLog()
  if (entries.length === 0) return 0
  return safe(() => {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof document === 'undefined') {
      return 0
    }
    const payload: StoredErrorLog = { version: 1, entries }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revoke on next tick so the browser has time to start the download.
    setTimeout(() => {
      // revokeObjectURL can throw on some older WebView implementations if
      // the URL has already been collected; the cleanup is best-effort so
      // we deliberately swallow the error.
      try { URL.revokeObjectURL(url) } catch { /* ignore */ }
    }, 0)
    return entries.length
  }, 0)
}

// ---------------------------------------------------------------------------
// GitHub integration
// ---------------------------------------------------------------------------
//
// Allows a user (and, by extension, a coding agent watching the repo) to file
// a fully populated GitHub issue from the in-app error UI without needing a
// GitHub API token. We construct an `https://github.com/<owner>/<repo>/issues/
// new` URL with title, labels, and a markdown body containing the diagnostic
// report. The user just has to click "Submit new issue" in the browser tab
// that opens.

// GitHub caps the new-issue URL length around 8 KB; Chrome's URL limit is
// roughly 32 KB but mobile browsers vary. Keep payloads well under that.
const GITHUB_ISSUE_MAX_BODY_BYTES = 6000

function truncateForGitHub(text: string, maxBytes: number): string {
  // Each char in the JSON payload is ASCII-or-near-ASCII, so byte length is
  // approximated by string length. Reserve 80 chars for the truncation note.
  if (text.length <= maxBytes) return text
  const head = text.slice(0, maxBytes - 80)
  return `${head}\n\n…[truncated; download the full log via the in-app button]`
}

/**
 * Build an `issues/new` URL for the configured GitHub repo, pre-populated
 * with a title derived from the error and a body containing the diagnostic
 * report. Returns `null` if `github.owner` / `github.repo` are not set.
 */
export function buildGitHubIssueUrl(report: DiagnosticReport, github: GitHubReportingConfig): string | null {
  if (!github.owner || !github.repo) return null

  const errName = report.error?.name ?? 'Error'
  const errMsg = report.error?.message ?? 'Unknown error'
  // GitHub issue titles are limited to 256 chars; leave room for the prefix.
  const title = `[auto] ${errName}: ${errMsg}`.slice(0, 240)

  const body = truncateForGitHub(
    [
      'Automatically generated from the in-app error UI.',
      '',
      `**App version:** \`${report.appVersion}\``,
      `**Timestamp:** \`${report.timestamp}\``,
      `**Platform:** \`${report.platform}\`` +
        (report.capacitor.present ? ` (Capacitor: \`${report.capacitor.platform ?? 'unknown'}\`)` : ''),
      '',
      '<details><summary>Diagnostic report</summary>',
      '',
      '```json',
      formatDiagnosticReport(report),
      '```',
      '',
      '</details>',
    ].join('\n'),
    GITHUB_ISSUE_MAX_BODY_BYTES
  )

  const params = new URLSearchParams()
  params.set('title', title)
  params.set('body', body)
  if (github.labels.length > 0) params.set('labels', github.labels.join(','))

  const owner = encodeURIComponent(github.owner)
  const repo = encodeURIComponent(github.repo)
  return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`
}

/**
 * Open a pre-filled GitHub issue creation page for the given report. Returns
 * `true` if the URL could be opened (or assigned to `window.location` as a
 * fallback), `false` if the GitHub repo is not configured or the environment
 * doesn't support navigation.
 */
export function openGitHubIssue(report: DiagnosticReport, github: GitHubReportingConfig): boolean {
  const url = buildGitHubIssueUrl(report, github)
  if (!url) return false
  return safe(() => {
    if (typeof window === 'undefined') return false
    const w = window.open(url, '_blank', 'noopener')
    if (w) return true
    try {
      window.location.href = url
      return true
    } catch {
      return false
    }
  }, false)
}


