/**
 * Tests for `src/main.tsx`.
 *
 * `main.tsx` is the entrypoint and self-executes a number of side effects on
 * import: installs error capture, mounts React, registers the service worker,
 * schedules an APK update check. We mock every collaborator and use
 * `vi.resetModules()` + dynamic `import()` so each test gets a fresh
 * evaluation, mirroring the pattern used in `src/lib/native/install.test.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    createRoot: vi.fn(() => ({ render: vi.fn() })),
    register: vi.fn(),
    installPreMountErrorCapture: vi.fn(),
    markReactMounted: vi.fn(),
    scheduleSparkLoadCheck: vi.fn(),
    installMobileDebugLogger: vi.fn(),
    nativeInstallSpy: vi.fn(),
    reloadBypassingCache: vi.fn(),
    getCapacitorInfo: vi.fn(() => ({ present: false })),
    checkForApkUpdate: vi.fn(async () => null),
    sparkSpark: vi.fn(),
  },
}))

vi.mock('react-dom/client', () => ({
  createRoot: mocks.createRoot,
}))

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('./App.tsx', () => ({
  default: () => null,
}))

vi.mock('./ErrorFallback.tsx', () => ({
  ErrorFallback: () => null,
}))

vi.mock('./components/PerformanceWrapper.tsx', () => ({
  PerformanceWrapper: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('./lib/serviceWorker', () => ({
  register: mocks.register,
}))

vi.mock('./lib/preMountErrorCapture', () => ({
  installPreMountErrorCapture: mocks.installPreMountErrorCapture,
  markReactMounted: mocks.markReactMounted,
  scheduleSparkLoadCheck: mocks.scheduleSparkLoadCheck,
}))

vi.mock('./lib/diagnostics', () => ({
  reloadBypassingCache: mocks.reloadBypassingCache,
  getCapacitorInfo: mocks.getCapacitorInfo,
}))

vi.mock('./lib/mobile-debug-logger', () => ({
  installMobileDebugLogger: mocks.installMobileDebugLogger,
}))

vi.mock('./lib/apkUpdateCheck', () => ({
  checkForApkUpdate: mocks.checkForApkUpdate,
}))

// Side-effect import in main.tsx — track that it runs by spying on the mock.
vi.mock('./lib/native/install', () => {
  mocks.nativeInstallSpy()
  return {}
})

vi.mock('@github/spark/spark', () => {
  mocks.sparkSpark()
  return {}
})

vi.mock('./main.css', () => ({}))

describe('main.tsx bootstrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.values(mocks).forEach((m) => {
      if (typeof m === 'function' && 'mockReset' in m) {
        ;(m as ReturnType<typeof vi.fn>).mockReset()
      }
    })
    mocks.createRoot.mockReturnValue({ render: vi.fn() })
    mocks.getCapacitorInfo.mockReturnValue({ present: false })
    mocks.checkForApkUpdate.mockResolvedValue(null)

    // Provide the #root element that mountApp looks for.
    document.body.innerHTML = '<div id="root"></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('installs error capture, mobile debug logger, and Spark load check on import', async () => {
    vi.resetModules()
    await import('./main')
    // Yield microtasks for the dynamic Spark import + .finally to run mountApp.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.installPreMountErrorCapture).toHaveBeenCalledTimes(1)
    expect(mocks.installMobileDebugLogger).toHaveBeenCalledTimes(1)
    expect(mocks.scheduleSparkLoadCheck).toHaveBeenCalledTimes(1)
  })

  it('imports the native install side-effect module without throwing', async () => {
    // The `import './lib/native/install'` line is a side-effect import. We
    // can't count the mock factory invocations because vi.mock caches the
    // factory across vi.resetModules. Instead we verify that the import
    // chain resolves cleanly — failure would surface as an unhandled
    // rejection or thrown error from `await import('./main')`.
    vi.resetModules()
    await expect(import('./main')).resolves.toBeDefined()
  })

  it('mounts React via createRoot(...).render after Spark load resolves', async () => {
    const renderSpy = vi.fn()
    mocks.createRoot.mockReturnValue({ render: renderSpy })

    vi.resetModules()
    await import('./main')
    // Wait for the dynamic spark import + .finally chain.
    for (let i = 0; i < 10; i++) await Promise.resolve()

    expect(mocks.createRoot).toHaveBeenCalledTimes(1)
    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(mocks.markReactMounted).toHaveBeenCalledTimes(1)
  })

  it('registers a service worker with success/update/error handlers', async () => {
    vi.resetModules()
    await import('./main')
    expect(mocks.register).toHaveBeenCalledTimes(1)
    const opts = mocks.register.mock.calls[0][0] as {
      onSuccess: () => void
      onUpdate: () => void
      onError: (e: unknown) => void
    }
    expect(typeof opts.onSuccess).toBe('function')
    expect(typeof opts.onUpdate).toBe('function')
    expect(typeof opts.onError).toBe('function')

    // Exercise the handlers — they all swallow exceptions.
    expect(() => opts.onSuccess()).not.toThrow()
    expect(() => opts.onUpdate()).not.toThrow()
    expect(() => opts.onError(new Error('sw failed'))).not.toThrow()
  })

  it('skips the APK update check when not running inside Capacitor', async () => {
    mocks.getCapacitorInfo.mockReturnValue({ present: false })
    vi.resetModules()
    await import('./main')
    vi.advanceTimersByTime(6000)
    await Promise.resolve()
    expect(mocks.checkForApkUpdate).not.toHaveBeenCalled()
  })

  it('schedules the APK update check when running inside Capacitor', async () => {
    mocks.getCapacitorInfo.mockReturnValue({ present: true })
    mocks.checkForApkUpdate.mockResolvedValue(null)
    vi.resetModules()
    await import('./main')
    vi.advanceTimersByTime(6000)
    await Promise.resolve()
    expect(mocks.checkForApkUpdate).toHaveBeenCalledTimes(1)
  })
})
