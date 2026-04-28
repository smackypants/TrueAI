/**
 * Tests that exercise the internal `renderFallback` path in
 * preMountErrorCapture.ts. These tests live in their own file so that the
 * top-level `vi.mock('./diagnostics', …)` is hoisted before any module import,
 * ensuring that all fresh instances of `preMountErrorCapture` receive the fast
 * synchronous stub rather than the real diagnostics module.
 *
 * Each test uses `vi.resetModules()` + dynamic `import()` to obtain a fresh
 * module instance with zeroed-out `installed`, `reactMounted`, and
 * `fallbackShown` flags.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Diagnostics stub ────────────────────────────────────────────────────────
// vi.mock is hoisted by Vitest to run before any import statement.
vi.mock('./diagnostics', () => ({
  collectDiagnostics: vi.fn(async () => ({
    appVersion: '0.0.0',
    timestamp: '2026-01-01T00:00:00.000Z',
    url: '',
    userAgent: '',
    language: '',
    online: true,
    platform: '',
    capacitor: { present: false },
    spark: { present: false },
    serviceWorker: { supported: false, controlled: false, registrations: 0, scopes: [] },
    viewport: { width: 0, height: 0, devicePixelRatio: 1 },
  })),
  formatDiagnosticReport: vi.fn(() => '{"stub":true}'),
  appendErrorLogEntry: vi.fn(),
  loadErrorReportingConfig: vi.fn(async () => ({
    autoSubmit: false,
    endpoint: '',
    debugOnly: true,
    androidOnly: true,
    timeoutMs: 5000,
    github: { owner: '', repo: '', labels: [] },
  })),
  submitDiagnosticReport: vi.fn(async () => ({ submitted: false, reason: 'disabled' })),
  getCapacitorShare: vi.fn(() => null),
  isSparkPresent: vi.fn(() => false),
  copyToClipboard: vi.fn(async () => true),
  downloadErrorLog: vi.fn(() => 0),
  reloadBypassingCache: vi.fn(async () => {}),
  openGitHubIssue: vi.fn(() => false),
  shareDiagnosticReport: vi.fn(async () => true),
}))

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function withRoot(): () => void {
  const div = document.createElement('div')
  div.id = 'root'
  document.body.appendChild(div)
  return () => {
    if (div.parentNode) div.parentNode.removeChild(div)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// renderFallback via "error" event
// ─────────────────────────────────────────────────────────────────────────────

describe('renderFallback via "error" event (before React mounts)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('populates #root with the fallback UI when an error fires before React mounts', async () => {
    vi.resetModules()
    const teardown = withRoot()
    try {
      const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
      installPreMountErrorCapture()

      window.dispatchEvent(
        new ErrorEvent('error', {
          error: new Error('crash before react'),
          message: 'crash before react',
        }),
      )

      // Allow the async renderFallback micro-task chain to settle.
      await new Promise((resolve) => setTimeout(resolve, 50))

      const root = document.getElementById('root')
      expect(root?.innerHTML).toContain('pmf-card')
      expect(root?.innerHTML).toContain('The app failed to start')
    } finally {
      teardown()
    }
  })

  it('does NOT populate #root when an error fires after React has mounted', async () => {
    vi.resetModules()
    const teardown = withRoot()
    try {
      const { installPreMountErrorCapture, markReactMounted } = await import(
        './preMountErrorCapture'
      )
      installPreMountErrorCapture()
      markReactMounted() // React is up — fallback must be suppressed.

      window.dispatchEvent(
        new ErrorEvent('error', {
          error: new Error('post-mount error'),
          message: 'post-mount error',
        }),
      )

      await new Promise((resolve) => setTimeout(resolve, 50))

      const root = document.getElementById('root')
      expect(root?.innerHTML ?? '').toBe('')
    } finally {
      teardown()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// renderFallback via "unhandledrejection" event
// ─────────────────────────────────────────────────────────────────────────────

describe('renderFallback via "unhandledrejection" event (before React mounts)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('populates #root when an unhandled rejection fires before React mounts', async () => {
    vi.resetModules()
    const teardown = withRoot()
    try {
      const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
      installPreMountErrorCapture()

      // Suppress the native unhandled-rejection noise; the test only cares
      // about the PromiseRejectionEvent dispatch side effect.
      const reason = new Error('rejected')
      const p = Promise.reject(reason)
      p.catch(() => {})
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', { promise: p, reason }),
      )

      await new Promise((resolve) => setTimeout(resolve, 50))

      const root = document.getElementById('root')
      expect(root?.innerHTML).toContain('pmf-card')
    } finally {
      teardown()
    }
  })

  it('does NOT populate #root when an unhandled rejection fires after React mounts', async () => {
    vi.resetModules()
    const teardown = withRoot()
    try {
      const { installPreMountErrorCapture, markReactMounted } = await import(
        './preMountErrorCapture'
      )
      installPreMountErrorCapture()
      markReactMounted()

      const reason = new Error('post-mount rejection')
      const p = Promise.reject(reason)
      p.catch(() => {})
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', { promise: p, reason }),
      )

      await new Promise((resolve) => setTimeout(resolve, 50))

      const root = document.getElementById('root')
      expect(root?.innerHTML ?? '').toBe('')
    } finally {
      teardown()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// scheduleSparkLoadCheck — renders the fallback when spark is absent
// ─────────────────────────────────────────────────────────────────────────────

describe('scheduleSparkLoadCheck renders fallback when spark is absent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('writes the fallback into #root when spark is absent and React has not mounted', async () => {
    vi.resetModules()

    // Remove spark from window so isSparkPresent() returns false in the real
    // module too (belt-and-suspenders — the vi.mock above already stubs it).
    const origSpark = (window as unknown as Record<string, unknown>).spark
    delete (window as unknown as Record<string, unknown>).spark

    const teardown = withRoot()
    try {
      const { scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
      scheduleSparkLoadCheck(500)

      // Advance fake clock past the timeout.
      vi.advanceTimersByTime(600)

      // Flush all remaining async work (the micro-tasks inside renderFallback).
      await vi.runAllTimersAsync()

      const root = document.getElementById('root')
      expect(root?.innerHTML).toContain('pmf-card')
      expect(root?.innerHTML).toContain('Spark runtime did not load')
    } finally {
      ;(window as unknown as Record<string, unknown>).spark = origSpark
      teardown()
    }
  })

  it('does NOT render the fallback when React has already mounted', async () => {
    vi.resetModules()

    const origSpark = (window as unknown as Record<string, unknown>).spark
    delete (window as unknown as Record<string, unknown>).spark

    const teardown = withRoot()
    try {
      const { installPreMountErrorCapture, markReactMounted, scheduleSparkLoadCheck } =
        await import('./preMountErrorCapture')
      installPreMountErrorCapture()
      markReactMounted() // React mounted before the timer fires.

      scheduleSparkLoadCheck(100)
      vi.advanceTimersByTime(200)
      await vi.runAllTimersAsync()

      const root = document.getElementById('root')
      expect(root?.innerHTML ?? '').toBe('')
    } finally {
      ;(window as unknown as Record<string, unknown>).spark = origSpark
      teardown()
    }
  })
})
