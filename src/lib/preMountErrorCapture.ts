/**
 * Pre-mount error capture and vanilla-DOM fallback UI.
 *
 * This module is loaded synchronously by `main.tsx` BEFORE the Spark runtime
 * import or React render so that:
 *   - early `error` / `unhandledrejection` events are captured,
 *   - if React never mounts (e.g. Spark runtime fails to load in the Android
 *     APK), the user sees a usable diagnostic page instead of a blank screen.
 *
 * It is intentionally framework-free and self-contained.
 */

import {
  appendErrorLogEntry,
  collectDiagnostics,
  copyToClipboard,
  downloadErrorLog,
  formatDiagnosticReport,
  getCapacitorShare,
  isSparkPresent,
  loadErrorReportingConfig,
  openGitHubIssue,
  reloadBypassingCache,
  shareDiagnosticReport,
  submitDiagnosticReport,
} from './diagnostics'

let installed = false
let reactMounted = false
let fallbackShown = false
const earlyErrors: Error[] = []

export function markReactMounted(): void {
  reactMounted = true
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  try {
    return new Error(typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface FallbackOptions {
  title: string
  description: string
  error?: Error | null
}

async function renderFallback(opts: FallbackOptions): Promise<void> {
  if (fallbackShown) return
  const root = document.getElementById('root')
  if (!root) return
  fallbackShown = true

  const report = await collectDiagnostics(opts.error ?? null)
  const reportText = formatDiagnosticReport(report)
  const hasShare = !!getCapacitorShare()
  // Persist every error to the local log so it can be reviewed later via the
  // "Download error log" button (or programmatically by a coding agent).
  appendErrorLogEntry(report)
  // GitHub config drives the optional "Report on GitHub" button below; load
  // it in parallel with the rest of the UI build so we don't block render.
  const configPromise = loadErrorReportingConfig()

  const styles = `
    .pmf-wrap{min-height:100vh;background:#1a1d24;color:#e6e9ef;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:flex-start;justify-content:center;padding:24px;box-sizing:border-box;}
    .pmf-card{width:100%;max-width:640px;background:#23272f;border:1px solid #3a3f4b;border-radius:12px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,.3);}
    .pmf-title{margin:0 0 8px;font-size:18px;font-weight:600;color:#ff6b6b;display:flex;align-items:center;gap:8px;}
    .pmf-desc{margin:0 0 16px;font-size:14px;line-height:1.5;color:#c8cdd8;}
    .pmf-section{margin-top:16px;}
    .pmf-section h3{margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#8a93a6;}
    .pmf-pre{background:#15171c;border:1px solid #2c303a;border-radius:8px;padding:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.45;color:#d3d8e2;overflow:auto;max-height:200px;white-space:pre-wrap;word-break:break-word;}
    .pmf-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}
    .pmf-btn{appearance:none;border:1px solid #3a3f4b;background:#2a2f3a;color:#e6e9ef;padding:10px 14px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;min-height:44px;}
    .pmf-btn:hover{background:#323845;}
    .pmf-btn-primary{background:#3b82f6;border-color:#3b82f6;color:#fff;}
    .pmf-btn-primary:hover{background:#2563eb;}
    .pmf-status{margin-top:8px;font-size:12px;color:#8a93a6;min-height:1em;}
  `

  const errBlock = opts.error
    ? `<div class="pmf-section"><h3>Error</h3><pre class="pmf-pre">${escapeHtml(
        (opts.error.name ? opts.error.name + ': ' : '') +
          (opts.error.message || String(opts.error)) +
          (opts.error.stack ? '\n\n' + opts.error.stack : '')
      )}</pre></div>`
    : ''

  root.innerHTML = `
    <style>${styles}</style>
    <div class="pmf-wrap" role="alert" aria-live="assertive">
      <div class="pmf-card">
        <h1 class="pmf-title">⚠ ${escapeHtml(opts.title)}</h1>
        <p class="pmf-desc">${escapeHtml(opts.description)}</p>
        ${errBlock}
        <div class="pmf-section">
          <h3>Diagnostics</h3>
          <pre class="pmf-pre" id="pmf-report">${escapeHtml(reportText)}</pre>
        </div>
        <div class="pmf-actions">
          <button class="pmf-btn pmf-btn-primary" id="pmf-reload" type="button">Reload app</button>
          <button class="pmf-btn" id="pmf-copy" type="button">Copy diagnostic report</button>
          ${hasShare ? '<button class="pmf-btn" id="pmf-share" type="button">Share</button>' : ''}
          <button class="pmf-btn" id="pmf-github" type="button" hidden>Report on GitHub</button>
          <button class="pmf-btn" id="pmf-log" type="button">Download error log</button>
          <button class="pmf-btn" id="pmf-retry" type="button">Try again</button>
        </div>
        <div class="pmf-status" id="pmf-status"></div>
      </div>
    </div>
  `

  const status = root.querySelector<HTMLDivElement>('#pmf-status')
  const setStatus = (msg: string) => {
    if (status) status.textContent = msg
  }

  // Best-effort automatic submission. Gated by runtime config: by default
  // only Android debug builds with a configured endpoint actually POST.
  void submitDiagnosticReport(report).then((result) => {
    if (result.submitted) {
      setStatus(`Diagnostic report submitted automatically (HTTP ${result.status}).`)
    } else if (result.reason === 'network-error') {
      setStatus('Automatic report submission failed — please use Copy or Share.')
    }
    // Other reasons (disabled / no endpoint / not android / release build /
    // duplicate) are silent so the fallback UI stays uncluttered.
  })

  root.querySelector<HTMLButtonElement>('#pmf-reload')?.addEventListener('click', () => {
    setStatus('Clearing caches and reloading…')
    void reloadBypassingCache()
  })
  root.querySelector<HTMLButtonElement>('#pmf-retry')?.addEventListener('click', () => {
    setStatus('Reloading…')
    try {
      window.location.reload()
    } catch {
      // ignore
    }
  })
  root.querySelector<HTMLButtonElement>('#pmf-copy')?.addEventListener('click', async () => {
    const ok = await copyToClipboard(reportText)
    setStatus(ok ? 'Diagnostic report copied to clipboard.' : 'Could not copy to clipboard.')
  })
  if (hasShare) {
    root.querySelector<HTMLButtonElement>('#pmf-share')?.addEventListener('click', async () => {
      const ok = await shareDiagnosticReport(report)
      setStatus(ok ? 'Share dialog opened.' : 'Could not open share dialog.')
    })
  }
  root.querySelector<HTMLButtonElement>('#pmf-log')?.addEventListener('click', () => {
    const count = downloadErrorLog()
    setStatus(
      count > 0
        ? `Downloaded error log (${count} ${count === 1 ? 'entry' : 'entries'}).`
        : 'No saved errors to download yet.'
    )
  })
  // Reveal the GitHub button only once we know the repo is configured.
  void configPromise.then((cfg) => {
    if (!cfg.github.owner || !cfg.github.repo) return
    const btn = root.querySelector<HTMLButtonElement>('#pmf-github')
    if (!btn) return
    btn.hidden = false
    btn.addEventListener('click', () => {
      const ok = openGitHubIssue(report, cfg.github)
      setStatus(
        ok
          ? 'Opened GitHub issue draft in a new tab.'
          : 'Could not open GitHub — repository not configured.'
      )
    })
  })
}

/**
 * Install global error handlers as early as possible. Errors that occur before
 * React mounts will trigger the vanilla-DOM fallback UI; errors after React
 * has mounted are left to the React error boundary.
 */
export function installPreMountErrorCapture(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (event: ErrorEvent) => {
    const err = toError(event.error ?? event.message)
    earlyErrors.push(err)
    if (reactMounted) return
    void renderFallback({
      title: 'The app failed to start',
      description:
        'An error occurred before the application finished loading. The diagnostic report below can help identify the cause.',
      error: err,
    })
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const err = toError(event.reason)
    earlyErrors.push(err)
    if (reactMounted) return
    void renderFallback({
      title: 'The app failed to start',
      description:
        'An unhandled promise rejection occurred before the application finished loading. The diagnostic report below can help identify the cause.',
      error: err,
    })
  })
}

/**
 * Schedule a check that the Spark runtime has loaded. If `window.spark` is
 * still missing after `timeoutMs` AND React has not mounted, render a
 * Spark-specific fallback that explains common causes and offers a
 * cache-bypassing reload.
 */
export function scheduleSparkLoadCheck(timeoutMs = 10000): void {
  if (typeof window === 'undefined') return
  window.setTimeout(() => {
    if (reactMounted || isSparkPresent() || fallbackShown) return
    void renderFallback({
      title: 'Spark runtime did not load',
      description:
        'The Spark runtime required by this app did not initialize. Common causes: offline on first launch, blocked CDN, or a stale service-worker cache. Try "Reload app" to clear caches and retry.',
      error: earlyErrors[earlyErrors.length - 1] ?? null,
    })
  }, timeoutMs)
}
