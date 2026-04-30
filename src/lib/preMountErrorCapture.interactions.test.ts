/**
 * Covers the remaining branches of `preMountErrorCapture.ts`:
 *   - Button click handlers in the rendered fallback UI (reload / retry /
 *     copy / share / github / log) — exercises each addEventListener arm.
 *   - submitDiagnosticReport feedback paths: `submitted=true` and
 *     `reason='network-error'` (the silent reasons are already covered by the
 *     existing `…fallback.test.ts`).
 *   - `renderFallback` early-return paths: missing `#root`, `fallbackShown`
 *     guard.
 *   - `toError` non-Error / non-string branch and the inner JSON.stringify
 *     catch arm.
 *   - The error-block branches: error with both `name` and `stack`, and
 *     error stringified via `String()` when `message` is empty.
 *   - The "Share" button (`hasShare = true`) addEventListener arm.
 *   - The GitHub button arm (config present + click), plus
 *     `openGitHubIssue` returning `false`.
 *   - The `downloadErrorLog` plural-vs-singular and zero-count branches.
 *   - `scheduleSparkLoadCheck` no-op when `isSparkPresent()` is true.
 *
 * Diagnostics is mocked by reference so individual tests can override
 * specific functions via `mockImplementationOnce` / `mockResolvedValueOnce`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Diagnostics stub ───────────────────────────────────────────────────────
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

// Helper: install a #root element and return a teardown.
function withRoot(): () => void {
  const div = document.createElement('div')
  div.id = 'root'
  document.body.appendChild(div)
  return () => {
    if (div.parentNode) div.parentNode.removeChild(div)
  }
}

// Dispatch a synthetic ErrorEvent to drive the install path → renderFallback,
// then wait for the async chain to settle.
async function fireErrorAndSettle(error: Error | null = new Error('boom')) {
  window.dispatchEvent(
    new ErrorEvent('error', { error, message: error?.message ?? 'err' }),
  )
  await new Promise((r) => setTimeout(r, 50))
}

describe('preMountErrorCapture — fallback UI button handlers', () => {
  let teardownRoot: () => void

  beforeEach(() => {
    vi.resetModules()
    teardownRoot = withRoot()
  })

  afterEach(() => {
    teardownRoot()
    vi.restoreAllMocks()
  })

  it('Reload button: invokes reloadBypassingCache and updates status', async () => {
    const diag = await import('./diagnostics')
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    const btn = document.querySelector<HTMLButtonElement>('#pmf-reload')
    expect(btn).toBeTruthy()
    btn!.click()
    await Promise.resolve()

    expect(diag.reloadBypassingCache).toHaveBeenCalledTimes(1)
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Clearing caches/i)
  })

  it('Retry button: calls window.location.reload() and swallows reload errors', async () => {
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    // Replace location.reload with a throwing spy to also cover the catch arm.
    const reloadSpy = vi.fn(() => {
      throw new Error('jsdom navigation not implemented')
    })
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    })

    const btn = document.querySelector<HTMLButtonElement>('#pmf-retry')
    expect(btn).toBeTruthy()
    expect(() => btn!.click()).not.toThrow()
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Reloading/i)
  })

  it('Copy button: success path sets the "copied" status', async () => {
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    const btn = document.querySelector<HTMLButtonElement>('#pmf-copy')
    btn!.click()
    await new Promise((r) => setTimeout(r, 0))

    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/copied/i)
  })

  it('Copy button: failure path sets the "Could not copy" status', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.copyToClipboard).mockResolvedValueOnce(false)
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    const btn = document.querySelector<HTMLButtonElement>('#pmf-copy')
    btn!.click()
    await new Promise((r) => setTimeout(r, 0))

    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Could not copy/i)
  })

  it('Download error log: zero entries shows "No saved errors" message', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.downloadErrorLog).mockReturnValueOnce(0)
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    document.querySelector<HTMLButtonElement>('#pmf-log')!.click()
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/No saved errors/i)
  })

  it('Download error log: singular "entry" branch when count === 1', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.downloadErrorLog).mockReturnValueOnce(1)
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    document.querySelector<HTMLButtonElement>('#pmf-log')!.click()
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/\(1 entry\)/)
  })

  it('Download error log: plural "entries" branch when count > 1', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.downloadErrorLog).mockReturnValueOnce(3)
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    document.querySelector<HTMLButtonElement>('#pmf-log')!.click()
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/\(3 entries\)/)
  })

  it('Share button: rendered when getCapacitorShare() is non-null and click invokes shareDiagnosticReport', async () => {
    const diag = await import('./diagnostics')
    // Make the next renderFallback see a Share-capable Capacitor shim.
    vi.mocked(diag.getCapacitorShare).mockReturnValueOnce({} as unknown as ReturnType<typeof diag.getCapacitorShare>)
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    const btn = document.querySelector<HTMLButtonElement>('#pmf-share')
    expect(btn).toBeTruthy()
    btn!.click()
    await new Promise((r) => setTimeout(r, 0))

    expect(diag.shareDiagnosticReport).toHaveBeenCalledTimes(1)
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Share dialog/i)
  })

  it('Share button: failure path sets the "Could not open share dialog" status', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.getCapacitorShare).mockReturnValueOnce({} as unknown as ReturnType<typeof diag.getCapacitorShare>)
    vi.mocked(diag.shareDiagnosticReport).mockResolvedValueOnce(false)
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()

    document.querySelector<HTMLButtonElement>('#pmf-share')!.click()
    await new Promise((r) => setTimeout(r, 0))
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Could not open share/i)
  })

  it('GitHub button: revealed when owner+repo configured and click invokes openGitHubIssue (failure path)', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.loadErrorReportingConfig).mockResolvedValueOnce({
      autoSubmit: false,
      endpoint: '',
      debugOnly: true,
      androidOnly: true,
      timeoutMs: 5000,
      github: { owner: 'octocat', repo: 'demo', labels: [] },
    })
    // openGitHubIssue → false drives the "Could not open GitHub" status arm.
    vi.mocked(diag.openGitHubIssue).mockReturnValueOnce(false)

    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()
    // Allow the configPromise.then() arm that flips `hidden = false` to run.
    await new Promise((r) => setTimeout(r, 20))

    const btn = document.querySelector<HTMLButtonElement>('#pmf-github')
    expect(btn).toBeTruthy()
    expect(btn!.hidden).toBe(false)

    btn!.click()
    expect(diag.openGitHubIssue).toHaveBeenCalledTimes(1)
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Could not open GitHub/i)
  })

  it('GitHub button: success path opens an issue draft', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.loadErrorReportingConfig).mockResolvedValueOnce({
      autoSubmit: false,
      endpoint: '',
      debugOnly: true,
      androidOnly: true,
      timeoutMs: 5000,
      github: { owner: 'octocat', repo: 'demo', labels: [] },
    })
    vi.mocked(diag.openGitHubIssue).mockReturnValueOnce(true)

    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()
    await new Promise((r) => setTimeout(r, 20))

    document.querySelector<HTMLButtonElement>('#pmf-github')!.click()
    expect(document.querySelector('#pmf-status')?.textContent).toMatch(/Opened GitHub issue draft/i)
  })

  it('GitHub button: stays hidden when owner is empty (early return inside configPromise.then)', async () => {
    // The default mock returns owner='' / repo='' → hidden remains true.
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()
    await new Promise((r) => setTimeout(r, 20))

    const btn = document.querySelector<HTMLButtonElement>('#pmf-github')
    expect(btn).toBeTruthy()
    expect(btn!.hidden).toBe(true)
  })
})

describe('preMountErrorCapture — submitDiagnosticReport feedback', () => {
  let teardownRoot: () => void
  beforeEach(() => {
    vi.resetModules()
    teardownRoot = withRoot()
  })
  afterEach(() => {
    teardownRoot()
    vi.restoreAllMocks()
  })

  it('reports HTTP success in the status line', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.submitDiagnosticReport).mockResolvedValueOnce({
      submitted: true,
      status: 202,
    })
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()
    // The submitDiagnosticReport.then() runs after renderFallback returns.
    await new Promise((r) => setTimeout(r, 20))

    expect(document.querySelector('#pmf-status')?.textContent).toMatch(
      /submitted automatically.*HTTP 202/i,
    )
  })

  it('reports a network-error reason in the status line', async () => {
    const diag = await import('./diagnostics')
    vi.mocked(diag.submitDiagnosticReport).mockResolvedValueOnce({
      submitted: false,
      reason: 'network-error',
    })
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()
    await new Promise((r) => setTimeout(r, 20))

    expect(document.querySelector('#pmf-status')?.textContent).toMatch(
      /Automatic report submission failed/i,
    )
  })

  it('stays silent on other reasons (e.g. "disabled")', async () => {
    // Default mock returns reason='disabled' → status stays empty.
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()
    await fireErrorAndSettle()
    await new Promise((r) => setTimeout(r, 20))

    expect(document.querySelector('#pmf-status')?.textContent ?? '').toBe('')
  })
})

describe('preMountErrorCapture — renderFallback guards', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is a silent no-op when there is no #root in the document', async () => {
    // Deliberately do NOT install #root.
    const diag = await import('./diagnostics')
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()

    await fireErrorAndSettle()
    // collectDiagnostics is called *before* the #root check in renderFallback,
    // so it does run; but no DOM was written and no buttons exist.
    expect(diag.collectDiagnostics).toHaveBeenCalled()
    expect(document.querySelector('#pmf-card')).toBeNull()
  })

  it('does not re-render when fallbackShown is already true (second error is ignored)', async () => {
    const teardown = withRoot()
    try {
      const diag = await import('./diagnostics')
      const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
      installPreMountErrorCapture()

      await fireErrorAndSettle(new Error('first'))
      const callsAfterFirst = vi.mocked(diag.collectDiagnostics).mock.calls.length
      const htmlAfterFirst = document.getElementById('root')!.innerHTML

      await fireErrorAndSettle(new Error('second'))

      // The early `if (fallbackShown) return` short-circuits before
      // collectDiagnostics is called again, and the DOM is unchanged.
      expect(vi.mocked(diag.collectDiagnostics).mock.calls.length).toBe(callsAfterFirst)
      expect(document.getElementById('root')!.innerHTML).toBe(htmlAfterFirst)
    } finally {
      teardown()
    }
  })
})

describe('preMountErrorCapture — toError edge cases via "error" event', () => {
  let teardown: () => void
  beforeEach(() => {
    vi.resetModules()
    teardown = withRoot()
  })
  afterEach(() => {
    teardown()
    vi.restoreAllMocks()
  })

  it('wraps a non-Error, non-string value (object) into Error via JSON.stringify', async () => {
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()

    // ErrorEvent.error = a plain object, message = '' to skip the string arm.
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: { code: 42 } as unknown as Error,
        message: '',
      }),
    )
    await new Promise((r) => setTimeout(r, 50))

    const root = document.getElementById('root')
    expect(root?.innerHTML).toContain('pmf-card')
    // The wrapped Error.message is the JSON serialization of the object.
    // jsdom's innerHTML reflects parsed HTML where &quot; becomes ".
    expect(root?.innerHTML).toContain('Error: {"code":42}')
  })

  it('falls back to String(value) when JSON.stringify throws (circular ref)', async () => {
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()

    const circular: Record<string, unknown> = {}
    circular.self = circular
    window.dispatchEvent(
      new ErrorEvent('error', {
        error: circular as unknown as Error,
        message: '',
      }),
    )
    await new Promise((r) => setTimeout(r, 50))

    const root = document.getElementById('root')
    // We don't assert the exact string — only that we *did* render the
    // fallback rather than throw out of toError.
    expect(root?.innerHTML).toContain('pmf-card')
  })
})

describe('preMountErrorCapture — error block branches', () => {
  let teardown: () => void
  beforeEach(() => {
    vi.resetModules()
    teardown = withRoot()
  })
  afterEach(() => {
    teardown()
    vi.restoreAllMocks()
  })

  it('renders error name, message, and stack when all are present', async () => {
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()

    const e = new Error('boom-with-stack')
    e.name = 'CustomError'
    e.stack = 'CustomError: boom-with-stack\n    at someFn (foo.js:1:1)'
    await fireErrorAndSettle(e)

    const html = document.getElementById('root')!.innerHTML
    expect(html).toContain('CustomError: boom-with-stack')
    expect(html).toContain('someFn (foo.js:1:1)')
  })

  it('uses String(error) when the Error has no message', async () => {
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')
    installPreMountErrorCapture()

    const e = new Error('')
    e.name = 'EmptyError'
    // Strip stack so the only surviving textual signal is `String(e)`.
    e.stack = undefined
    await fireErrorAndSettle(e)

    const html = document.getElementById('root')!.innerHTML
    // String(new Error('')) with .name='EmptyError' === 'EmptyError', so after
    // our `name + ': '` prefix the line begins "EmptyError: EmptyError".
    expect(html).toContain('EmptyError: EmptyError')
  })
})

describe('preMountErrorCapture — scheduleSparkLoadCheck no-op when spark is present', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does NOT render fallback when isSparkPresent() returns true', async () => {
    const teardown = withRoot()
    try {
      const diag = await import('./diagnostics')
      vi.mocked(diag.isSparkPresent).mockReturnValue(true)

      const { scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
      scheduleSparkLoadCheck(100)
      vi.advanceTimersByTime(200)
      await vi.runAllTimersAsync()

      expect(document.getElementById('root')!.innerHTML).toBe('')
    } finally {
      teardown()
    }
  })
})
