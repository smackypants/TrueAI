import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tap, impact, selection, success, warning, error, haptics } from './haptics'

describe('native/haptics (web fallback)', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    })
  })

  it('tap calls navigator.vibrate with a short pattern', async () => {
    await tap()
    expect(navigator.vibrate).toHaveBeenCalledWith(10)
  })

  it('impact uses a longer pulse', async () => {
    await impact()
    expect(navigator.vibrate).toHaveBeenCalledWith(20)
  })

  it('selection uses a brief tick', async () => {
    await selection()
    expect(navigator.vibrate).toHaveBeenCalledWith(5)
  })

  it('success / warning / error use distinct patterns', async () => {
    const v = navigator.vibrate as unknown as ReturnType<typeof vi.fn>
    await success()
    expect(v).toHaveBeenLastCalledWith([10, 30, 10])
    await warning()
    expect(v).toHaveBeenLastCalledWith([20, 40, 20])
    await error()
    expect(v).toHaveBeenLastCalledWith([50, 50, 50])
  })

  it('haptics object exposes the same callable surface', () => {
    expect(typeof haptics.tap).toBe('function')
    expect(typeof haptics.impact).toBe('function')
    expect(typeof haptics.selection).toBe('function')
    expect(typeof haptics.success).toBe('function')
    expect(typeof haptics.warning).toBe('function')
    expect(typeof haptics.error).toBe('function')
  })

  it('does not throw when navigator.vibrate is missing', async () => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    await expect(tap()).resolves.toBeUndefined()
    await expect(success()).resolves.toBeUndefined()
  })
})
