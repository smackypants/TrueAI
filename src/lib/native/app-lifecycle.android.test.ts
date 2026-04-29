/**
 * Tests for the native (Android) paths of `initAppLifecycle`:
 *   - back-button listener: LIFO handler dispatch, canGoBack fallback,
 *     and minimizeApp/exitApp fallback chain
 *   - appStateChange listener: fires registered resume listeners when
 *     the app becomes active
 *
 * We mock `./platform` as native + Android and `@capacitor/app` with
 * controllable listeners, then use `vi.resetModules()` + dynamic import
 * per test (same pattern as installer.android.test.ts) so each test gets
 * a fresh module with its own `initialized` flag and listener stacks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

type Listener = (event: unknown) => void | Promise<void>

// Minimal in-process listener registry for the @capacitor/app mock
const listeners = new Map<string, Listener>()
const minimizeMock = vi.fn().mockResolvedValue(undefined)
const exitMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (event: string, listener: Listener) => {
      listeners.set(event, listener)
      return Promise.resolve({ remove: () => listeners.delete(event) })
    },
    minimizeApp: () => minimizeMock(),
    exitApp: () => exitMock(),
  },
}))

beforeEach(() => {
  listeners.clear()
  minimizeMock.mockClear()
  exitMock.mockClear()
  vi.resetModules()
})

/** Dispatch the registered backButton listener with a synthetic event. */
async function fireBackButton(canGoBack: boolean): Promise<void> {
  const l = listeners.get('backButton')
  if (l) await l({ canGoBack })
}

/** Dispatch the registered appStateChange listener. */
async function fireAppStateChange(isActive: boolean): Promise<void> {
  const l = listeners.get('appStateChange')
  if (l) await l({ isActive })
}

describe('native/app-lifecycle (Android paths)', () => {
  it('registers backButton and appStateChange listeners on initAppLifecycle', async () => {
    const { initAppLifecycle } = await import('./app-lifecycle')
    await initAppLifecycle()
    expect(listeners.has('backButton')).toBe(true)
    expect(listeners.has('appStateChange')).toBe(true)
  })

  it('initAppLifecycle is idempotent on native (only registers listeners once)', async () => {
    const { initAppLifecycle } = await import('./app-lifecycle')
    await initAppLifecycle()
    const first = listeners.size
    await initAppLifecycle()
    expect(listeners.size).toBe(first)
  })

  it('back handler that returns true consumes the event (no minimizeApp)', async () => {
    const { initAppLifecycle, pushBackHandler } = await import('./app-lifecycle')
    await initAppLifecycle()

    const handler = vi.fn().mockReturnValue(true)
    pushBackHandler(handler)

    await fireBackButton(false) // canGoBack=false → would minimizeApp without a handler
    expect(handler).toHaveBeenCalledOnce()
    expect(minimizeMock).not.toHaveBeenCalled()
  })

  it('back handler that returns false/void falls through to the next handler', async () => {
    const { initAppLifecycle, pushBackHandler } = await import('./app-lifecycle')
    await initAppLifecycle()

    const lower = vi.fn().mockReturnValue(true)
    const upper = vi.fn().mockReturnValue(false)
    pushBackHandler(lower)
    pushBackHandler(upper) // LIFO: upper runs first, falls through to lower

    await fireBackButton(false)
    expect(upper).toHaveBeenCalledOnce()
    expect(lower).toHaveBeenCalledOnce()
    expect(minimizeMock).not.toHaveBeenCalled()
  })

  it('pushBackHandler returns an unregister function that removes the handler', async () => {
    const { initAppLifecycle, pushBackHandler } = await import('./app-lifecycle')
    await initAppLifecycle()

    const handler = vi.fn().mockReturnValue(true)
    const off = pushBackHandler(handler)
    off()

    await fireBackButton(false)
    expect(handler).not.toHaveBeenCalled()
    // No handler → should attempt minimizeApp
    expect(minimizeMock).toHaveBeenCalledOnce()
  })

  it('calls window.history.back() when canGoBack=true and no handler consumes', async () => {
    const historySpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const { initAppLifecycle } = await import('./app-lifecycle')
    await initAppLifecycle()

    await fireBackButton(true)
    expect(historySpy).toHaveBeenCalledOnce()
    expect(minimizeMock).not.toHaveBeenCalled()
    historySpy.mockRestore()
  })

  it('calls App.minimizeApp() when no handler consumes and canGoBack=false', async () => {
    const { initAppLifecycle } = await import('./app-lifecycle')
    await initAppLifecycle()

    await fireBackButton(false)
    expect(minimizeMock).toHaveBeenCalledOnce()
    expect(exitMock).not.toHaveBeenCalled()
  })

  it('falls back to App.exitApp() when App.minimizeApp() throws', async () => {
    minimizeMock.mockRejectedValueOnce(new Error('device too old'))
    const { initAppLifecycle } = await import('./app-lifecycle')
    await initAppLifecycle()

    await fireBackButton(false)
    expect(minimizeMock).toHaveBeenCalledOnce()
    expect(exitMock).toHaveBeenCalledOnce()
  })

  it('appStateChange fires registered resume listeners when app becomes active', async () => {
    const { initAppLifecycle, onAppResume } = await import('./app-lifecycle')
    await initAppLifecycle()

    const listener = vi.fn()
    onAppResume(listener)

    await fireAppStateChange(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('appStateChange does NOT fire resume listeners when app goes to background', async () => {
    const { initAppLifecycle, onAppResume } = await import('./app-lifecycle')
    await initAppLifecycle()

    const listener = vi.fn()
    onAppResume(listener)

    await fireAppStateChange(false) // going to background
    expect(listener).not.toHaveBeenCalled()
  })

  it('onAppResume unregister function removes the listener', async () => {
    const { initAppLifecycle, onAppResume } = await import('./app-lifecycle')
    await initAppLifecycle()

    const listener = vi.fn()
    const off = onAppResume(listener)
    off()

    await fireAppStateChange(true)
    expect(listener).not.toHaveBeenCalled()
  })
})
