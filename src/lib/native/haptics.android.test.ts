/**
 * Tests for the native (Capacitor Haptics) paths of the haptics module.
 * The existing haptics.test.ts only exercises the web-fallback (vibrate)
 * path because jsdom is not native. This file mocks `./platform` as native
 * and `@capacitor/haptics` with controllable mocks to exercise the
 * Capacitor API branches.
 *
 * Follows the same vi.mock + vi.resetModules + dynamic-import pattern as
 * installer.android.test.ts and secure-storage.android.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

const impactMock = vi.fn().mockResolvedValue(undefined)
const notificationMock = vi.fn().mockResolvedValue(undefined)
const selectionStartMock = vi.fn().mockResolvedValue(undefined)
const selectionChangedMock = vi.fn().mockResolvedValue(undefined)
const selectionEndMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: (...args: unknown[]) => impactMock(...args),
    notification: (...args: unknown[]) => notificationMock(...args),
    selectionStart: () => selectionStartMock(),
    selectionChanged: () => selectionChangedMock(),
    selectionEnd: () => selectionEndMock(),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}))

beforeEach(() => {
  impactMock.mockClear()
  notificationMock.mockClear()
  selectionStartMock.mockClear()
  selectionChangedMock.mockClear()
  selectionEndMock.mockClear()
  vi.resetModules()
})

describe('native/haptics (Android Capacitor paths)', () => {
  it('tap calls Haptics.impact with Light style', async () => {
    const { tap } = await import('./haptics')
    await tap()
    expect(impactMock).toHaveBeenCalledWith({ style: 'LIGHT' })
    expect(impactMock).toHaveBeenCalledOnce()
  })

  it('impact calls Haptics.impact with Medium style', async () => {
    const { impact } = await import('./haptics')
    await impact()
    expect(impactMock).toHaveBeenCalledWith({ style: 'MEDIUM' })
    expect(impactMock).toHaveBeenCalledOnce()
  })

  it('selection calls selectionStart / selectionChanged / selectionEnd in order', async () => {
    const { selection } = await import('./haptics')
    await selection()
    expect(selectionStartMock).toHaveBeenCalledOnce()
    expect(selectionChangedMock).toHaveBeenCalledOnce()
    expect(selectionEndMock).toHaveBeenCalledOnce()
  })

  it('success calls Haptics.notification with Success type', async () => {
    const { success } = await import('./haptics')
    await success()
    expect(notificationMock).toHaveBeenCalledWith({ type: 'SUCCESS' })
    expect(notificationMock).toHaveBeenCalledOnce()
  })

  it('warning calls Haptics.notification with Warning type', async () => {
    const { warning } = await import('./haptics')
    await warning()
    expect(notificationMock).toHaveBeenCalledWith({ type: 'WARNING' })
    expect(notificationMock).toHaveBeenCalledOnce()
  })

  it('error calls Haptics.notification with Error type', async () => {
    const { error } = await import('./haptics')
    await error()
    expect(notificationMock).toHaveBeenCalledWith({ type: 'ERROR' })
    expect(notificationMock).toHaveBeenCalledOnce()
  })

  it('falls back to web vibrate when Haptics.impact throws', async () => {
    impactMock.mockRejectedValueOnce(new Error('haptics unavailable'))
    const vibrateMock = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrateMock,
    })
    const { tap } = await import('./haptics')
    await tap()
    expect(vibrateMock).toHaveBeenCalledWith(10)
  })

  it('haptics object exposes all six functions on native', async () => {
    const { haptics } = await import('./haptics')
    expect(typeof haptics.tap).toBe('function')
    expect(typeof haptics.impact).toBe('function')
    expect(typeof haptics.selection).toBe('function')
    expect(typeof haptics.success).toBe('function')
    expect(typeof haptics.warning).toBe('function')
    expect(typeof haptics.error).toBe('function')
  })
})
