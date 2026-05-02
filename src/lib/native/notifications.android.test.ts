/**
 * Tests for the native (Capacitor LocalNotifications) paths of
 * `native/notifications`. The existing `notifications.test.ts` only covers
 * the web `Notification` fallback because jsdom is not native; this file
 * mocks `./platform` as native and `@capacitor/local-notifications` to
 * exercise the lazy permission state machine and the schedule/error
 * branches of `notify()`.
 *
 * Follows the same vi.mock + vi.resetModules + dynamic-import pattern as
 * installer.android.test.ts / haptics.android.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

const checkPermissionsMock = vi.fn()
const requestPermissionsMock = vi.fn()
const scheduleMock = vi.fn()

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: (...args: unknown[]) => checkPermissionsMock(...args),
    requestPermissions: (...args: unknown[]) => requestPermissionsMock(...args),
    schedule: (...args: unknown[]) => scheduleMock(...args),
  },
}))

beforeEach(() => {
  checkPermissionsMock.mockReset()
  requestPermissionsMock.mockReset()
  scheduleMock.mockReset()
  vi.resetModules()
})

describe('native/notifications (Android Capacitor paths)', () => {
  it('uses an existing granted permission and schedules a notification', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'granted' })
    scheduleMock.mockResolvedValue({ notifications: [] })

    const { notify } = await import('./notifications')
    const ok = await notify({ title: 'Hello', body: 'World' })

    expect(ok).toBe(true)
    expect(checkPermissionsMock).toHaveBeenCalledTimes(1)
    expect(requestPermissionsMock).not.toHaveBeenCalled()
    expect(scheduleMock).toHaveBeenCalledTimes(1)
    const arg = scheduleMock.mock.calls[0][0] as {
      notifications: Array<{ id: number; title: string; body: string; schedule: { at: Date } }>
    }
    expect(arg.notifications).toHaveLength(1)
    expect(arg.notifications[0].title).toBe('Hello')
    expect(arg.notifications[0].body).toBe('World')
    expect(arg.notifications[0].schedule.at).toBeInstanceOf(Date)
  })

  it('requests permission when not yet granted, then schedules on grant', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'prompt' })
    requestPermissionsMock.mockResolvedValue({ display: 'granted' })
    scheduleMock.mockResolvedValue({ notifications: [] })

    const { notify } = await import('./notifications')
    const ok = await notify({ title: 'a', body: 'b' })
    expect(ok).toBe(true)
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1)
    expect(scheduleMock).toHaveBeenCalledTimes(1)
  })

  it('caches granted permission across calls (no re-prompt)', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'prompt' })
    requestPermissionsMock.mockResolvedValue({ display: 'granted' })
    scheduleMock.mockResolvedValue({ notifications: [] })

    const { notify } = await import('./notifications')
    await notify({ title: 'a', body: 'b' })
    await notify({ title: 'c', body: 'd' })
    expect(checkPermissionsMock).toHaveBeenCalledTimes(1)
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1)
    expect(scheduleMock).toHaveBeenCalledTimes(2)
  })

  it('returns false (and caches denied) when the user denies permission', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'prompt' })
    requestPermissionsMock.mockResolvedValue({ display: 'denied' })

    const { notify } = await import('./notifications')
    const first = await notify({ title: 'a', body: 'b' })
    const second = await notify({ title: 'a', body: 'b' })
    expect(first).toBe(false)
    expect(second).toBe(false)
    expect(scheduleMock).not.toHaveBeenCalled()
    // No re-prompt on the second call — denied state is cached.
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1)
  })

  it('returns false when the permission request throws (caches denied)', async () => {
    checkPermissionsMock.mockRejectedValue(new Error('plugin missing'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { notify } = await import('./notifications')
    const ok = await notify({ title: 'a', body: 'b' })
    expect(ok).toBe(false)
    expect(scheduleMock).not.toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('returns false when LocalNotifications.schedule throws', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'granted' })
    scheduleMock.mockRejectedValue(new Error('disk full'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { notify } = await import('./notifications')
    const ok = await notify({ title: 'a', body: 'b' })
    expect(ok).toBe(false)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('honours an explicit notification id when provided', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'granted' })
    scheduleMock.mockResolvedValue({ notifications: [] })

    const { notify } = await import('./notifications')
    await notify({ title: 'a', body: 'b', id: 42 })
    const arg = scheduleMock.mock.calls[0][0] as {
      notifications: Array<{ id: number }>
    }
    expect(arg.notifications[0].id).toBe(42)
  })
})
