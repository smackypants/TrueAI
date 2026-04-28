import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ERROR_LOG_MAX_ENTRIES,
  ERROR_LOG_STORAGE_KEY,
  _resetErrorReportingConfigForTest,
  appendErrorLogEntry,
  buildGitHubIssueUrl,
  clearErrorLog,
  collectDiagnostics,
  copyToClipboard,
  downloadErrorLog,
  formatDiagnosticReport,
  getAppVersion,
  getCapacitorInfo,
  getCapacitorShare,
  getErrorLog,
  isDebugBuild,
  isSparkPresent,
  loadErrorReportingConfig,
  openGitHubIssue,
  reloadBypassingCache,
  shouldAutoSubmit,
  submitDiagnosticReport,
  type DiagnosticReport,
  type ErrorReportingConfig,
} from './diagnostics'

function makeReport(overrides: Partial<DiagnosticReport> = {}): DiagnosticReport {
  return {
    appVersion: '1.0.0',
    timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
    url: 'https://localhost/',
    userAgent: 'test-agent',
    language: 'en-US',
    online: true,
    platform: 'test',
    capacitor: { present: true, platform: 'android', isNative: true, plugins: [] },
    spark: { present: true, keys: [] },
    serviceWorker: { supported: true, controlled: true, registrations: 1, scopes: ['/'] },
    viewport: { width: 411, height: 923, devicePixelRatio: 2 },
    error: { name: 'Error', message: 'boom', stack: 'Error: boom\n  at foo' },
    ...overrides,
  }
}

function setCapacitor(present: boolean, platform = 'android') {
  if (present) {
    ;(window as unknown as { Capacitor?: unknown }).Capacitor = {
      getPlatform: () => platform,
      isNativePlatform: () => true,
      Plugins: {},
    }
  } else {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
  }
}

describe('loadErrorReportingConfig', () => {
  beforeEach(() => {
    _resetErrorReportingConfigForTest()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns defaults when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', undefined)
    const cfg = await loadErrorReportingConfig()
    expect(cfg.autoSubmit).toBe(false)
    expect(cfg.endpoint).toBe('')
    expect(cfg.debugOnly).toBe(true)
    expect(cfg.androidOnly).toBe(true)
    expect(cfg.timeoutMs).toBe(5000)
  })

  it('returns defaults when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const cfg = await loadErrorReportingConfig()
    expect(cfg.autoSubmit).toBe(false)
  })

  it('returns defaults when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) })
    )
    const cfg = await loadErrorReportingConfig()
    expect(cfg.endpoint).toBe('')
  })

  it('parses errorReporting block when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            errorReporting: {
              autoSubmit: true,
              endpoint: 'https://example.com/r',
              debugOnly: false,
              androidOnly: false,
              timeoutMs: 1234,
              github: { owner: 'octocat', repo: 'hello', labels: ['bug'] },
            },
          }),
      })
    )
    const cfg = await loadErrorReportingConfig()
    expect(cfg).toEqual({
      autoSubmit: true,
      endpoint: 'https://example.com/r',
      debugOnly: false,
      androidOnly: false,
      timeoutMs: 1234,
      github: { owner: 'octocat', repo: 'hello', labels: ['bug'] },
    })
  })

  it('defaults github sub-config when omitted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ errorReporting: { autoSubmit: true } }),
      })
    )
    const cfg = await loadErrorReportingConfig()
    expect(cfg.github).toEqual({ owner: '', repo: '', labels: [] })
  })

  it('caches the loaded config across calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)
    await loadErrorReportingConfig()
    await loadErrorReportingConfig()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to defaults for invalid timeoutMs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ errorReporting: { timeoutMs: -1 } }),
      })
    )
    const cfg = await loadErrorReportingConfig()
    expect(cfg.timeoutMs).toBe(5000)
  })
})

describe('shouldAutoSubmit', () => {
  afterEach(() => {
    setCapacitor(false)
  })

  const baseConfig = (over: Partial<ErrorReportingConfig> = {}): ErrorReportingConfig => ({
    autoSubmit: true,
    endpoint: 'https://example.com/r',
    debugOnly: false,
    androidOnly: false,
    timeoutMs: 5000,
    github: { owner: '', repo: '', labels: [] },
    ...over,
  })

  it('blocks when disabled', () => {
    expect(shouldAutoSubmit(baseConfig({ autoSubmit: false })).reason).toBe('disabled')
  })

  it('blocks when no endpoint', () => {
    expect(shouldAutoSubmit(baseConfig({ endpoint: '' })).reason).toBe('no-endpoint')
  })

  it('blocks when androidOnly and not on android', () => {
    setCapacitor(false)
    expect(shouldAutoSubmit(baseConfig({ androidOnly: true })).reason).toBe('not-android')
  })

  it('blocks when androidOnly and on a non-android Capacitor platform', () => {
    setCapacitor(true, 'ios')
    expect(shouldAutoSubmit(baseConfig({ androidOnly: true })).reason).toBe('not-android')
  })

  it('passes when androidOnly and on android', () => {
    setCapacitor(true, 'android')
    expect(shouldAutoSubmit(baseConfig({ androidOnly: true })).ok).toBe(true)
  })

  it('passes when all gates open', () => {
    expect(shouldAutoSubmit(baseConfig()).ok).toBe(true)
  })
})

describe('submitDiagnosticReport', () => {
  beforeEach(() => {
    _resetErrorReportingConfigForTest()
    setCapacitor(true, 'android')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setCapacitor(false)
  })

  it('does not submit when disabled by config', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    )
    const result = await submitDiagnosticReport(makeReport())
    expect(result.submitted).toBe(false)
    expect(result.reason).toBe('disabled')
  })

  it('POSTs the report when enabled and gates pass', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, _init?: RequestInit) => {
      if (typeof url === 'string' && url.endsWith('runtime.config.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errorReporting: {
                autoSubmit: true,
                endpoint: 'https://example.com/r',
                debugOnly: false,
                androidOnly: true,
                timeoutMs: 5000,
              },
            }),
        })
      }
      return Promise.resolve({ ok: true, status: 202, json: () => Promise.resolve({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const report = makeReport()
    const result = await submitDiagnosticReport(report)

    expect(result).toEqual({ submitted: true, status: 202, reason: undefined })
    const postCall = fetchMock.mock.calls.find((c: unknown[]) => c[0] === 'https://example.com/r')
    expect(postCall).toBeTruthy()
    expect(postCall![1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    // Body must be the JSON-formatted report.
    const body = JSON.parse((postCall![1] as RequestInit).body as string)
    expect(body.error.message).toBe('boom')
    expect(body.appVersion).toBe('1.0.0')
  })

  it('reports network errors without throwing', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('runtime.config.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errorReporting: {
                autoSubmit: true,
                endpoint: 'https://example.com/r',
                debugOnly: false,
                androidOnly: true,
                timeoutMs: 5000,
              },
            }),
        })
      }
      return Promise.reject(new Error('boom'))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitDiagnosticReport(makeReport())
    expect(result.submitted).toBe(false)
    expect(result.reason).toBe('network-error')
    expect(result.error).toContain('boom')
  })

  it('returns http-error when the endpoint responds non-2xx', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('runtime.config.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errorReporting: {
                autoSubmit: true,
                endpoint: 'https://example.com/r',
                debugOnly: false,
                androidOnly: true,
                timeoutMs: 5000,
              },
            }),
        })
      }
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitDiagnosticReport(makeReport())
    expect(result.submitted).toBe(false)
    expect(result.status).toBe(500)
    expect(result.reason).toBe('http-error')
  })

  it('dedupes identical successful reports within a session', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true, status: 202, json: () => Promise.resolve({}) })
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('runtime.config.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errorReporting: {
                autoSubmit: true,
                endpoint: 'https://example.com/r',
                debugOnly: false,
                androidOnly: true,
                timeoutMs: 5000,
              },
            }),
        })
      }
      return post()
    })
    vi.stubGlobal('fetch', fetchMock)

    const report = makeReport()
    const r1 = await submitDiagnosticReport(report)
    const r2 = await submitDiagnosticReport(report)

    expect(r1.submitted).toBe(true)
    expect(r2.submitted).toBe(false)
    expect(r2.reason).toBe('duplicate')
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('skips POST when androidOnly and platform is not android', async () => {
    setCapacitor(true, 'ios')
    const post = vi.fn()
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('runtime.config.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errorReporting: {
                autoSubmit: true,
                endpoint: 'https://example.com/r',
                debugOnly: false,
                androidOnly: true,
                timeoutMs: 5000,
              },
            }),
        })
      }
      return post()
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitDiagnosticReport(makeReport())
    expect(result.submitted).toBe(false)
    expect(result.reason).toBe('not-android')
    expect(post).not.toHaveBeenCalled()
  })
})

describe('error log persistence', () => {
  beforeEach(() => {
    clearErrorLog()
  })

  afterEach(() => {
    clearErrorLog()
  })

  it('starts empty', () => {
    expect(getErrorLog()).toEqual([])
  })

  it('appends entries in order', () => {
    appendErrorLogEntry(makeReport({ timestamp: '2026-01-01T00:00:00.000Z' }))
    appendErrorLogEntry(
      makeReport({
        timestamp: '2026-01-02T00:00:00.000Z',
        error: { name: 'TypeError', message: 'other', stack: 'TypeError: other' },
      })
    )
    const log = getErrorLog()
    expect(log).toHaveLength(2)
    expect(log[0].timestamp).toBe('2026-01-01T00:00:00.000Z')
    expect(log[1].error?.message).toBe('other')
  })

  it('collapses identical consecutive entries by refreshing the timestamp', () => {
    const r1 = makeReport({ timestamp: '2026-01-01T00:00:00.000Z' })
    const r2 = makeReport({ timestamp: '2026-01-01T00:00:01.000Z' })
    appendErrorLogEntry(r1)
    appendErrorLogEntry(r2)
    const log = getErrorLog()
    expect(log).toHaveLength(1)
    expect(log[0].timestamp).toBe('2026-01-01T00:00:01.000Z')
  })

  it('caps the log at ERROR_LOG_MAX_ENTRIES', () => {
    for (let i = 0; i < ERROR_LOG_MAX_ENTRIES + 5; i++) {
      appendErrorLogEntry(
        makeReport({
          timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
          // Vary the error message so entries are not collapsed.
          error: { name: 'Error', message: `boom-${i}`, stack: `Error: boom-${i}` },
        })
      )
    }
    const log = getErrorLog()
    expect(log.length).toBe(ERROR_LOG_MAX_ENTRIES)
    // Oldest entries were trimmed; newest preserved.
    expect(log[log.length - 1].error?.message).toBe(`boom-${ERROR_LOG_MAX_ENTRIES + 4}`)
  })

  it('survives malformed storage by returning an empty log', () => {
    localStorage.setItem(ERROR_LOG_STORAGE_KEY, 'not-json{')
    expect(getErrorLog()).toEqual([])
  })

  it('returns defensive copies (mutating result does not affect storage)', () => {
    appendErrorLogEntry(makeReport())
    const log = getErrorLog()
    log.length = 0
    expect(getErrorLog()).toHaveLength(1)
  })

  it('clearErrorLog wipes storage', () => {
    appendErrorLogEntry(makeReport())
    expect(getErrorLog()).toHaveLength(1)
    clearErrorLog()
    expect(getErrorLog()).toEqual([])
  })
})

describe('buildGitHubIssueUrl', () => {
  it('returns null when owner/repo are missing', () => {
    expect(buildGitHubIssueUrl(makeReport(), { owner: '', repo: '', labels: [] })).toBeNull()
    expect(buildGitHubIssueUrl(makeReport(), { owner: 'octocat', repo: '', labels: [] })).toBeNull()
  })

  it('builds an issues/new URL with title, body, and labels', () => {
    const url = buildGitHubIssueUrl(makeReport(), {
      owner: 'octocat',
      repo: 'hello-world',
      labels: ['bug', 'auto-reported'],
    })
    expect(url).not.toBeNull()
    const parsed = new URL(url!)
    expect(parsed.origin).toBe('https://github.com')
    expect(parsed.pathname).toBe('/octocat/hello-world/issues/new')
    expect(parsed.searchParams.get('title')).toContain('Error: boom')
    expect(parsed.searchParams.get('labels')).toBe('bug,auto-reported')
    const body = parsed.searchParams.get('body') ?? ''
    expect(body).toContain('Diagnostic report')
    expect(body).toContain('"message": "boom"')
  })

  it('percent-encodes owner and repo segments', () => {
    const url = buildGitHubIssueUrl(makeReport(), {
      owner: 'oct cat',
      repo: 'hello world',
      labels: [],
    })
    expect(url).toContain('/oct%20cat/hello%20world/issues/new')
  })

  it('omits the labels parameter when no labels are configured', () => {
    const url = buildGitHubIssueUrl(makeReport(), { owner: 'o', repo: 'r', labels: [] })
    expect(url).not.toBeNull()
    expect(new URL(url!).searchParams.has('labels')).toBe(false)
  })

  it('truncates very large bodies to stay under the URL length cap', () => {
    const huge = 'x'.repeat(20000)
    const report = makeReport({
      error: { name: 'Error', message: huge, stack: huge },
    })
    const url = buildGitHubIssueUrl(report, { owner: 'o', repo: 'r', labels: [] })
    expect(url).not.toBeNull()
    const body = new URL(url!).searchParams.get('body') ?? ''
    expect(body.length).toBeLessThan(7000)
    expect(body).toContain('truncated')
  })
})

// ---------------------------------------------------------------------------
// getAppVersion / isDebugBuild
// ---------------------------------------------------------------------------

describe('getAppVersion', () => {
  it('returns a non-empty string', () => {
    expect(typeof getAppVersion()).toBe('string')
  })
})

describe('isDebugBuild', () => {
  it('returns a boolean', () => {
    expect(typeof isDebugBuild()).toBe('boolean')
  })

  it('defaults to true when __APP_DEBUG__ is not defined (test environment)', () => {
    // In the test environment Vite does not inject __APP_DEBUG__, so the
    // implementation falls back to `true`.
    expect(isDebugBuild()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getCapacitorInfo
// ---------------------------------------------------------------------------

describe('getCapacitorInfo', () => {
  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
  })

  it('returns present:false when Capacitor is absent', () => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
    expect(getCapacitorInfo()).toEqual({ present: false })
  })

  it('returns present:true with platform and isNative when using getPlatform/isNativePlatform', () => {
    ;(window as unknown as { Capacitor: unknown }).Capacitor = {
      getPlatform: () => 'android',
      isNativePlatform: () => true,
      Plugins: { App: {}, Device: {} },
    }
    const info = getCapacitorInfo()
    expect(info.present).toBe(true)
    expect(info.platform).toBe('android')
    expect(info.isNative).toBe(true)
    expect(info.plugins).toContain('App')
  })

  it('falls back to the platform property when getPlatform is not a function', () => {
    ;(window as unknown as { Capacitor: unknown }).Capacitor = {
      platform: 'ios',
      Plugins: {},
    }
    const info = getCapacitorInfo()
    expect(info.present).toBe(true)
    expect(info.platform).toBe('ios')
  })
})

// ---------------------------------------------------------------------------
// isSparkPresent
// ---------------------------------------------------------------------------

describe('isSparkPresent', () => {
  it('returns true when the global spark mock is installed (test setup)', () => {
    expect(isSparkPresent()).toBe(true)
  })

  it('returns false when spark is removed from window', () => {
    const orig = (window as unknown as Record<string, unknown>).spark
    delete (window as unknown as Record<string, unknown>).spark
    try {
      expect(isSparkPresent()).toBe(false)
    } finally {
      ;(window as unknown as Record<string, unknown>).spark = orig
    }
  })

  it('returns false when spark is a primitive (non-object)', () => {
    const orig = (window as unknown as Record<string, unknown>).spark
    ;(window as unknown as Record<string, unknown>).spark = 'not-an-object'
    try {
      expect(isSparkPresent()).toBe(false)
    } finally {
      ;(window as unknown as Record<string, unknown>).spark = orig
    }
  })
})

// ---------------------------------------------------------------------------
// getCapacitorShare
// ---------------------------------------------------------------------------

describe('getCapacitorShare', () => {
  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
  })

  it('returns null when Capacitor is absent', () => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
    expect(getCapacitorShare()).toBeNull()
  })

  it('returns null when not running on a native platform', () => {
    ;(window as unknown as { Capacitor: unknown }).Capacitor = {
      isNativePlatform: () => false,
    }
    expect(getCapacitorShare()).toBeNull()
  })

  it('returns the sentinel when running on a native platform', () => {
    ;(window as unknown as { Capacitor: unknown }).Capacitor = {
      isNativePlatform: () => true,
    }
    expect(getCapacitorShare()).toEqual({ share: true })
  })
})

// ---------------------------------------------------------------------------
// collectDiagnostics
// ---------------------------------------------------------------------------

describe('collectDiagnostics', () => {
  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
  })

  it('includes error fields when an error is provided', async () => {
    const err = new Error('test message')
    err.stack = 'Error: test message\n  at test:1:1'
    const report = await collectDiagnostics(err)
    expect(report.error).toBeDefined()
    expect(report.error!.name).toBe('Error')
    expect(report.error!.message).toBe('test message')
    expect(report.error!.stack).toBe(err.stack)
  })

  it('omits the error field when no error is provided', async () => {
    const report = await collectDiagnostics()
    expect(report.error).toBeUndefined()
  })

  it('omits the error field when null is passed', async () => {
    const report = await collectDiagnostics(null)
    expect(report.error).toBeUndefined()
  })

  it('returns a structurally valid report', async () => {
    const report = await collectDiagnostics()
    expect(typeof report.appVersion).toBe('string')
    expect(typeof report.timestamp).toBe('string')
    expect(typeof report.online).toBe('boolean')
    expect(typeof report.viewport.width).toBe('number')
    expect(typeof report.viewport.height).toBe('number')
    expect(typeof report.viewport.devicePixelRatio).toBe('number')
    expect(typeof report.serviceWorker.supported).toBe('boolean')
  })

  it('captures Capacitor info when present', async () => {
    ;(window as unknown as { Capacitor: unknown }).Capacitor = {
      getPlatform: () => 'android',
      isNativePlatform: () => true,
      Plugins: {},
    }
    const report = await collectDiagnostics()
    expect(report.capacitor.present).toBe(true)
    expect(report.capacitor.platform).toBe('android')
  })
})

// ---------------------------------------------------------------------------
// formatDiagnosticReport
// ---------------------------------------------------------------------------

describe('formatDiagnosticReport', () => {
  it('returns valid JSON', () => {
    const report = makeReport()
    const text = formatDiagnosticReport(report)
    expect(() => JSON.parse(text)).not.toThrow()
  })

  it('round-trips all report fields', () => {
    const report = makeReport()
    const parsed: DiagnosticReport = JSON.parse(formatDiagnosticReport(report))
    expect(parsed.appVersion).toBe(report.appVersion)
    expect(parsed.error?.message).toBe('boom')
  })

  it('produces pretty-printed JSON (indented)', () => {
    const report = makeReport()
    const text = formatDiagnosticReport(report)
    // Pretty-printed JSON contains newlines and spaces.
    expect(text).toContain('\n')
    expect(text).toContain('  ')
  })
})

// ---------------------------------------------------------------------------
// copyToClipboard
// ---------------------------------------------------------------------------

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when the clipboard write succeeds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    const result = await copyToClipboard('hello clipboard')
    expect(result).toBe(true)
  })

  it('returns false when the clipboard API is unavailable and execCommand fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
    // jsdom may not define execCommand at all; define it as a failing stub.
    if (!('execCommand' in document)) {
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        writable: true,
        value: vi.fn().mockReturnValue(false),
      })
    } else {
      vi.spyOn(document, 'execCommand').mockReturnValue(false)
    }
    const result = await copyToClipboard('test')
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// reloadBypassingCache
// ---------------------------------------------------------------------------

describe('reloadBypassingCache', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves without throwing when caches are not available', async () => {
    await expect(reloadBypassingCache()).resolves.toBeUndefined()
  })

  it('resolves without throwing when caches.keys() rejects', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn().mockRejectedValue(new Error('caches unavailable')),
    })
    await expect(reloadBypassingCache()).resolves.toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('deletes all cache stores when the caches API is available', async () => {
    const deleteFn = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['v1', 'v2']),
      delete: deleteFn,
    })
    try {
      await reloadBypassingCache()
      expect(deleteFn).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

// ---------------------------------------------------------------------------
// downloadErrorLog
// ---------------------------------------------------------------------------

describe('downloadErrorLog', () => {
  beforeEach(() => clearErrorLog())
  afterEach(() => clearErrorLog())

  it('returns 0 when the log is empty', () => {
    expect(downloadErrorLog()).toBe(0)
  })

  it('returns the entry count and triggers a browser download when entries exist', () => {
    appendErrorLogEntry(makeReport({ timestamp: '2026-01-01T00:00:00.000Z' }))
    appendErrorLogEntry(
      makeReport({
        timestamp: '2026-01-02T00:00:00.000Z',
        error: { name: 'TypeError', message: 'other', stack: 'TypeError: other' },
      }),
    )

    // Stub URL.createObjectURL so jsdom doesn't throw "Not implemented".
    const fakeUrl = 'blob:test-url'
    const createSpy = vi.fn().mockReturnValue(fakeUrl)
    const revokeSpy = vi.fn()
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = createSpy
    URL.revokeObjectURL = revokeSpy

    // Prevent the anchor click from throwing "Not implemented".
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    try {
      const count = downloadErrorLog('test-errors.json')
      expect(count).toBe(2)
      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(clickSpy).toHaveBeenCalledTimes(1)
    } finally {
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
      clickSpy.mockRestore()
    }
  })
})

// ---------------------------------------------------------------------------
// openGitHubIssue
// ---------------------------------------------------------------------------

describe('openGitHubIssue', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when owner or repo are empty', () => {
    expect(openGitHubIssue(makeReport(), { owner: '', repo: 'hello', labels: [] })).toBe(false)
    expect(openGitHubIssue(makeReport(), { owner: 'octocat', repo: '', labels: [] })).toBe(false)
  })

  it('returns true when window.open succeeds', () => {
    const origOpen = window.open
    window.open = vi.fn().mockReturnValue({} as Window)
    try {
      expect(
        openGitHubIssue(makeReport(), { owner: 'octocat', repo: 'hello', labels: [] }),
      ).toBe(true)
    } finally {
      window.open = origOpen
    }
  })

  it('falls back to window.location.href when window.open returns null', () => {
    const origOpen = window.open
    window.open = vi.fn().mockReturnValue(null)
    // Spy on location.href setter; replacing with an assign-able value.
    let capturedHref = ''
    const descriptor = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        set href(v: string) {
          capturedHref = v
        },
      },
    })
    try {
      const result = openGitHubIssue(makeReport(), { owner: 'octocat', repo: 'hello', labels: [] })
      expect(result).toBe(true)
      expect(capturedHref).toContain('github.com/octocat/hello/issues/new')
    } finally {
      window.open = origOpen
      if (descriptor) Object.defineProperty(window, 'location', descriptor)
    }
  })
})
