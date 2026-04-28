import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ERROR_LOG_MAX_ENTRIES,
  ERROR_LOG_STORAGE_KEY,
  _resetErrorReportingConfigForTest,
  appendErrorLogEntry,
  buildGitHubIssueUrl,
  clearErrorLog,
  getErrorLog,
  loadErrorReportingConfig,
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
