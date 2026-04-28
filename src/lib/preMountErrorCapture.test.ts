/**
 * Tests for src/lib/preMountErrorCapture.ts
 *
 * The module uses module-level state variables (`installed`, `reactMounted`,
 * `fallbackShown`, `earlyErrors`).  Each test that needs fresh state
 * uses `vi.resetModules()` and a dynamic `import()` so it operates on a
 * newly-initialised module instance.
 *
 * Tests that don't need fresh state (e.g. pure behaviour tests) are grouped
 * below the isolation tests and share a single static import.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Append a `#root` div to body and return a teardown function. */
function withRoot(): () => void {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  return () => {
    if (root.parentNode) root.parentNode.removeChild(root)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// markReactMounted
// ─────────────────────────────────────────────────────────────────────────────
describe('markReactMounted', () => {
  beforeEach(() => vi.resetModules())

  it('does not throw', async () => {
    const { markReactMounted } = await import('./preMountErrorCapture')
    expect(() => markReactMounted()).not.toThrow()
  })

  it('can be called multiple times without throwing', async () => {
    const { markReactMounted } = await import('./preMountErrorCapture')
    expect(() => {
      markReactMounted()
      markReactMounted()
      markReactMounted()
    }).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// installPreMountErrorCapture
// ─────────────────────────────────────────────────────────────────────────────
describe('installPreMountErrorCapture', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers "error" and "unhandledrejection" listeners on the first call', async () => {
    vi.resetModules()
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')

    const spy = vi.spyOn(window, 'addEventListener')
    installPreMountErrorCapture()

    const errorCalls = spy.mock.calls.filter((c) => c[0] === 'error')
    const rejectionCalls = spy.mock.calls.filter((c) => c[0] === 'unhandledrejection')
    expect(errorCalls.length).toBeGreaterThanOrEqual(1)
    expect(rejectionCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('is idempotent — a second call does not add more listeners', async () => {
    vi.resetModules()
    const { installPreMountErrorCapture } = await import('./preMountErrorCapture')

    const spy = vi.spyOn(window, 'addEventListener')
    installPreMountErrorCapture()

    const countAfterFirst = spy.mock.calls.filter(
      (c) => c[0] === 'error' || c[0] === 'unhandledrejection'
    ).length

    installPreMountErrorCapture() // second call — must be a no-op

    const countAfterSecond = spy.mock.calls.filter(
      (c) => c[0] === 'error' || c[0] === 'unhandledrejection'
    ).length

    expect(countAfterSecond).toBe(countAfterFirst)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// scheduleSparkLoadCheck
// ─────────────────────────────────────────────────────────────────────────────
describe('scheduleSparkLoadCheck', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not throw when called', async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const { scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
    expect(() => scheduleSparkLoadCheck(1000)).not.toThrow()
  })

  it('uses setTimeout with the supplied timeout value', async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const { scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
    const spy = vi.spyOn(window, 'setTimeout')
    scheduleSparkLoadCheck(3000)
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 3000)
  })

  it('uses the default 10 000 ms when no argument is given', async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const { scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
    const spy = vi.spyOn(window, 'setTimeout')
    scheduleSparkLoadCheck()
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 10000)
  })

  it('does NOT render the fallback when spark is already present (test setup)', async () => {
    // The global test setup sets `globalThis.spark`, so `isSparkPresent()` → true.
    vi.resetModules()
    vi.useFakeTimers()
    const teardown = withRoot()
    try {
      const { scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
      scheduleSparkLoadCheck(100)
      vi.advanceTimersByTime(100)
      // The #root element should remain empty; the fallback was not rendered.
      const root = document.getElementById('root')
      expect(root?.innerHTML ?? '').toBe('')
    } finally {
      teardown()
    }
  })

  it('does NOT render the fallback when React is already mounted', async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const teardown = withRoot()
    try {
      const { markReactMounted, scheduleSparkLoadCheck } = await import('./preMountErrorCapture')
      // Mark React as mounted BEFORE the timeout fires.
      markReactMounted()
      // Remove spark so we don't bail out on the spark check first.
      const origSpark = (window as unknown as Record<string, unknown>).spark
      delete (window as unknown as Record<string, unknown>).spark
      try {
        scheduleSparkLoadCheck(100)
        vi.advanceTimersByTime(100)
        const root = document.getElementById('root')
        expect(root?.innerHTML ?? '').toBe('')
      } finally {
        ;(window as unknown as Record<string, unknown>).spark = origSpark
      }
    } finally {
      teardown()
    }
  })
})
describe('installPreMountErrorCapture + markReactMounted integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('installing then marking React as mounted does not throw', async () => {
    vi.resetModules()
    const { installPreMountErrorCapture, markReactMounted } = await import('./preMountErrorCapture')
    expect(() => {
      installPreMountErrorCapture()
      markReactMounted()
    }).not.toThrow()
  })

  it('scheduleSparkLoadCheck after markReactMounted is a no-op on the DOM', async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const teardown = withRoot()
    try {
      const { installPreMountErrorCapture, markReactMounted, scheduleSparkLoadCheck } =
        await import('./preMountErrorCapture')
      installPreMountErrorCapture()
      markReactMounted()

      // Remove spark so the check doesn't bail on the spark gate.
      const origSpark = (window as unknown as Record<string, unknown>).spark
      delete (window as unknown as Record<string, unknown>).spark
      try {
        scheduleSparkLoadCheck(100)
        vi.advanceTimersByTime(100)
        // root must remain empty because reactMounted=true prevents renderFallback
        const root = document.getElementById('root')
        expect(root?.innerHTML ?? '').toBe('')
      } finally {
        ;(window as unknown as Record<string, unknown>).spark = origSpark
      }
    } finally {
      vi.useRealTimers()
      teardown()
    }
  })
})
