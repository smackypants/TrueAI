import { describe, it, expect, beforeEach } from 'vitest'
import {
  pushBackHandler,
  onAppResume,
  initAppLifecycle,
  __resetAppLifecycleForTests,
} from './app-lifecycle'

describe('native/app-lifecycle (web fallback)', () => {
  beforeEach(() => {
    __resetAppLifecycleForTests()
  })

  it('pushBackHandler returns an unregister function', () => {
    const off = pushBackHandler(() => true)
    expect(typeof off).toBe('function')
    off()
  })

  it('onAppResume returns an unregister function', () => {
    const off = onAppResume(() => undefined)
    expect(typeof off).toBe('function')
    off()
  })

  it('visibilitychange fires resume listeners on web', async () => {
    await initAppLifecycle()
    let fired = 0
    const off = onAppResume(() => {
      fired++
    })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 0))
    expect(fired).toBeGreaterThanOrEqual(1)
    off()
  })

  it('initAppLifecycle is idempotent', async () => {
    await initAppLifecycle()
    // Should not throw or re-register.
    await initAppLifecycle()
  })
})
