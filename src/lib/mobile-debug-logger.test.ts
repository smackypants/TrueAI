import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  KNOWN_BUG_PATTERNS,
  MOBILE_LOG_MAX_ENTRIES,
  MOBILE_LOG_STORAGE_KEY,
  __resetMobileDebugLoggerForTests,
  analyzeMobileBugs,
  clearMobileLog,
  downloadMobileLog,
  getMobileLog,
  installMobileDebugLogger,
  logMobileEvent,
  type MobileLogEntry,
} from './mobile-debug-logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storedEntries(): MobileLogEntry[] {
  const raw = localStorage.getItem(MOBILE_LOG_STORAGE_KEY)
  if (!raw) return []
  const parsed = JSON.parse(raw) as { version: number; entries: MobileLogEntry[] }
  return parsed.entries
}

// ---------------------------------------------------------------------------
// getMobileLog / logMobileEvent
// ---------------------------------------------------------------------------

describe('getMobileLog', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())

  it('returns empty array when storage is empty', () => {
    expect(getMobileLog()).toEqual([])
  })

  it('returns defensive copy (mutations do not affect storage)', () => {
    logMobileEvent('error', 'error', 'test')
    const log1 = getMobileLog()
    log1.push({ id: 'fake', timestamp: '', category: 'error', level: 'error', message: 'fake', platform: 'web', appVersion: '0' })
    expect(getMobileLog()).toHaveLength(1)
  })
})

describe('logMobileEvent', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())
  afterEach(() => vi.unstubAllGlobals())

  it('stores an entry with the correct shape', () => {
    logMobileEvent('network', 'warn', 'Device went offline')
    const entries = getMobileLog()
    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.category).toBe('network')
    expect(e.level).toBe('warn')
    expect(e.message).toBe('Device went offline')
    expect(e.platform).toBe('web')
    expect(e.appVersion).toBe('0.0.0')
    expect(e.id).toMatch(/^mbl-/)
    expect(typeof e.timestamp).toBe('string')
    expect(e.data).toBeUndefined()
  })

  it('stores optional data field when provided', () => {
    logMobileEvent('error', 'error', 'boom', { stack: 'Error: boom\n  at x', lineno: 42 })
    const e = getMobileLog()[0]
    expect(e.data).toEqual({ stack: 'Error: boom\n  at x', lineno: 42 })
  })

  it('does not include data key when data is undefined', () => {
    logMobileEvent('lifecycle', 'debug', 'App resumed (visible)')
    const e = getMobileLog()[0]
    expect('data' in e).toBe(false)
  })

  it('respects MOBILE_LOG_MAX_ENTRIES ring buffer cap', () => {
    for (let i = 0; i < MOBILE_LOG_MAX_ENTRIES + 10; i++) {
      logMobileEvent('error', 'error', `error-${i}`)
    }
    const entries = getMobileLog()
    expect(entries.length).toBe(MOBILE_LOG_MAX_ENTRIES)
    // Oldest entries trimmed; newest should be the last ones logged
    expect(entries[entries.length - 1].message).toBe(`error-${MOBILE_LOG_MAX_ENTRIES + 9}`)
  })

  it('assigns unique IDs to consecutive entries', () => {
    logMobileEvent('error', 'error', 'a')
    logMobileEvent('error', 'error', 'b')
    const [a, b] = getMobileLog()
    expect(a.id).not.toBe(b.id)
  })

  it('is a no-op when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    // Should not throw
    expect(() => logMobileEvent('error', 'error', 'x')).not.toThrow()
  })

  it('reads Capacitor platform when present', () => {
    ;(window as unknown as { Capacitor?: unknown }).Capacitor = {
      getPlatform: () => 'android',
    }
    try {
      logMobileEvent('plugin', 'warn', 'plugin missing')
      expect(getMobileLog()[0].platform).toBe('android')
    } finally {
      delete (window as unknown as { Capacitor?: unknown }).Capacitor
    }
  })
})

// ---------------------------------------------------------------------------
// clearMobileLog
// ---------------------------------------------------------------------------

describe('clearMobileLog', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())

  it('removes all entries', () => {
    logMobileEvent('error', 'error', 'x')
    logMobileEvent('network', 'info', 'y')
    clearMobileLog()
    expect(getMobileLog()).toHaveLength(0)
    expect(localStorage.getItem(MOBILE_LOG_STORAGE_KEY)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// downloadMobileLog
// ---------------------------------------------------------------------------

describe('downloadMobileLog', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())

  it('returns 0 when log is empty', () => {
    expect(downloadMobileLog()).toBe(0)
  })

  it('returns the number of entries and triggers a download', () => {
    logMobileEvent('network', 'info', 'online')
    logMobileEvent('lifecycle', 'debug', 'resumed')

    const clickSpy = vi.fn()
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body)
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body)
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    // Intercept anchor click by mocking createElement
    const origCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const a = origCreate('a')
        a.click = clickSpy
        return a
      }
      return origCreate(tag)
    })

    const count = downloadMobileLog('test.json')
    expect(count).toBe(2)
    expect(clickSpy).toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
    createSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// installMobileDebugLogger — event capture
// ---------------------------------------------------------------------------

describe('installMobileDebugLogger', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())

  it('returns a cleanup function', () => {
    const cleanup = installMobileDebugLogger()
    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  it('is a no-op on second call before cleanup (already installed guard)', () => {
    const cleanup1 = installMobileDebugLogger()
    const cleanup2 = installMobileDebugLogger()
    // Second install returns a no-op cleanup; we can call both without issues
    cleanup2()
    cleanup1()
  })

  it('allows reinstall after cleanup', () => {
    const c1 = installMobileDebugLogger()
    c1()
    // Should not throw and should install fresh listeners
    const c2 = installMobileDebugLogger()
    c2()
  })

  it('captures window error events', () => {
    const cleanup = installMobileDebugLogger()
    try {
      const err = new Error('test-error')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }))
      const entries = getMobileLog()
      expect(entries.some((e) => e.message === 'test-error' && e.level === 'error')).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('captures unhandledrejection events', () => {
    const cleanup = installMobileDebugLogger()
    try {
      const reason = new Error('rejected')
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(reason).catch(() => {}),
        reason,
      })
      window.dispatchEvent(event)
      const entries = getMobileLog()
      expect(entries.some((e) => e.message === 'rejected' && e.level === 'error')).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('captures online event as network/info', () => {
    const cleanup = installMobileDebugLogger()
    try {
      window.dispatchEvent(new Event('online'))
      const entries = getMobileLog()
      expect(
        entries.some((e) => e.category === 'network' && e.level === 'info' && /online/i.test(e.message)),
      ).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('captures offline event as network/warn', () => {
    const cleanup = installMobileDebugLogger()
    try {
      window.dispatchEvent(new Event('offline'))
      const entries = getMobileLog()
      expect(
        entries.some((e) => e.category === 'network' && e.level === 'warn' && /offline/i.test(e.message)),
      ).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('captures visibilitychange as lifecycle/debug', () => {
    const cleanup = installMobileDebugLogger()
    try {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })
      document.dispatchEvent(new Event('visibilitychange'))
      const entries = getMobileLog()
      expect(
        entries.some((e) => e.category === 'lifecycle' && e.level === 'debug'),
      ).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('cleanup removes listeners so no more entries are added after cleanup', () => {
    const cleanup = installMobileDebugLogger()
    cleanup()
    window.dispatchEvent(new Event('online'))
    expect(getMobileLog()).toHaveLength(0)
  })

  it('categorises network-related errors correctly', () => {
    const cleanup = installMobileDebugLogger()
    try {
      const err = new Error('Failed to fetch resource')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }))
      const entries = getMobileLog()
      expect(entries.some((e) => e.category === 'network')).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('categorises plugin-related errors correctly', () => {
    const cleanup = installMobileDebugLogger()
    try {
      const err = new Error('Capacitor plugin FileSystem not available')
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }))
      const entries = getMobileLog()
      expect(entries.some((e) => e.category === 'plugin')).toBe(true)
    } finally {
      cleanup()
    }
  })
})

// ---------------------------------------------------------------------------
// analyzeMobileBugs
// ---------------------------------------------------------------------------

describe('analyzeMobileBugs', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())

  it('returns empty array when log is empty', () => {
    expect(analyzeMobileBugs()).toEqual([])
  })

  it('returns matches for logged network-offline events', () => {
    logMobileEvent('network', 'warn', 'Device went offline')
    logMobileEvent('network', 'error', 'Failed to fetch data')
    const results = analyzeMobileBugs()
    const match = results.find((r) => r.pattern.id === 'network-offline')
    expect(match).toBeDefined()
    expect(match!.entries.length).toBe(2)
  })

  it('returns matches for Capacitor plugin errors', () => {
    logMobileEvent('plugin', 'error', 'Capacitor plugin Camera not available')
    const results = analyzeMobileBugs()
    const match = results.find((r) => r.pattern.id === 'capacitor-plugin-failure')
    expect(match).toBeDefined()
  })

  it('does not match entry if category does not align with pattern', () => {
    // Log "Failed to fetch" under 'lifecycle' — should NOT match 'network-offline'
    logMobileEvent('lifecycle', 'warn', 'Failed to fetch')
    const results = analyzeMobileBugs()
    const match = results.find((r) => r.pattern.id === 'network-offline')
    expect(match).toBeUndefined()
  })

  it('sorts results by number of matching entries descending', () => {
    // 3 network entries
    logMobileEvent('network', 'warn', 'Device went offline')
    logMobileEvent('network', 'warn', 'Device went offline')
    logMobileEvent('network', 'warn', 'Device went offline')
    // 1 plugin entry
    logMobileEvent('plugin', 'error', 'Capacitor plugin not available')

    const results = analyzeMobileBugs()
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results[0].entries.length).toBeGreaterThanOrEqual(results[1].entries.length)
  })

  it('includes suggestedFix in each matched pattern', () => {
    logMobileEvent('network', 'warn', 'net::ERR_INTERNET_DISCONNECTED')
    const results = analyzeMobileBugs()
    for (const r of results) {
      expect(typeof r.pattern.suggestedFix).toBe('string')
      expect(r.pattern.suggestedFix.length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// KNOWN_BUG_PATTERNS catalogue sanity
// ---------------------------------------------------------------------------

describe('KNOWN_BUG_PATTERNS', () => {
  it('every pattern has required fields', () => {
    for (const p of KNOWN_BUG_PATTERNS) {
      expect(typeof p.id).toBe('string')
      expect(p.messagePatterns.length).toBeGreaterThan(0)
      expect(typeof p.title).toBe('string')
      expect(typeof p.description).toBe('string')
      expect(typeof p.suggestedFix).toBe('string')
    }
  })

  it('pattern IDs are unique', () => {
    const ids = KNOWN_BUG_PATTERNS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ---------------------------------------------------------------------------
// Storage integrity
// ---------------------------------------------------------------------------

describe('storage integrity', () => {
  beforeEach(() => __resetMobileDebugLoggerForTests())

  it('getMobileLog returns empty array when stored JSON is malformed', () => {
    localStorage.setItem(MOBILE_LOG_STORAGE_KEY, 'not-json{')
    expect(getMobileLog()).toEqual([])
  })

  it('getMobileLog returns empty array when stored entries is not an array', () => {
    localStorage.setItem(MOBILE_LOG_STORAGE_KEY, JSON.stringify({ version: 1, entries: 'bad' }))
    expect(getMobileLog()).toEqual([])
  })

  it('entries persist across multiple logMobileEvent calls', () => {
    logMobileEvent('network', 'info', 'a')
    logMobileEvent('lifecycle', 'debug', 'b')
    logMobileEvent('error', 'error', 'c')
    expect(storedEntries()).toHaveLength(3)
    expect(getMobileLog()).toHaveLength(3)
  })
})
