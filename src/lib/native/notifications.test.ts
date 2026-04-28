import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetNotificationsForTests, notify } from './notifications'

/**
 * Tests for the web fallback path of `native/notifications`. The native
 * (Capacitor) branch is exercised by the `isNative()` check; under jsdom
 * `isNative()` returns false so we exclusively cover the web `Notification`
 * API path here, including the lazy permission state machine.
 */

const originalNotification = (globalThis as { Notification?: unknown }).Notification

function installNotification(opts: {
  permission: NotificationPermission
  request?: () => Promise<NotificationPermission>
  ctor?: ReturnType<typeof vi.fn>
}) {
  const ctor =
    opts.ctor ??
    vi.fn().mockImplementation(function (this: unknown) {
      // No-op constructor — jsdom doesn't render an actual notification.
      return this
    })
  // Attach static `permission` and `requestPermission` to the constructor
  // mirroring the real browser API surface used by the module.
  Object.assign(ctor, {
    permission: opts.permission,
    requestPermission:
      opts.request ?? (async () => opts.permission),
  })
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: ctor,
  })
  return ctor
}

function uninstallNotification() {
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: undefined,
  })
}

describe('native/notifications (web fallback)', () => {
  beforeEach(() => {
    __resetNotificationsForTests()
  })

  afterEach(() => {
    // Restore the original Notification (likely undefined in jsdom).
    if (originalNotification === undefined) {
      uninstallNotification()
    } else {
      Object.defineProperty(globalThis, 'Notification', {
        configurable: true,
        writable: true,
        value: originalNotification,
      })
    }
    vi.restoreAllMocks()
  })

  it('returns false when the Notification API is unavailable', async () => {
    uninstallNotification()
    const ok = await notify({ title: 'Hi', body: 'There' })
    expect(ok).toBe(false)
  })

  it('caches a denied permission and never re-prompts', async () => {
    const requestPermission = vi
      .fn<() => Promise<NotificationPermission>>()
      .mockResolvedValue('denied')
    installNotification({ permission: 'default', request: requestPermission })

    const first = await notify({ title: 'a', body: 'b' })
    const second = await notify({ title: 'a', body: 'b' })

    expect(first).toBe(false)
    expect(second).toBe(false)
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('returns false immediately when permission is already denied', async () => {
    const requestPermission = vi.fn()
    installNotification({ permission: 'denied', request: requestPermission as never })
    const ok = await notify({ title: 'x', body: 'y' })
    expect(ok).toBe(false)
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('skips the permission prompt when already granted and constructs a Notification', async () => {
    const ctor = vi.fn()
    installNotification({ permission: 'granted', ctor })
    const ok = await notify({ title: 'Done', body: 'Build finished', tag: 'build' })
    expect(ok).toBe(true)
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(ctor).toHaveBeenCalledWith('Done', { body: 'Build finished', tag: 'build' })
  })

  it('requests permission once when default, then fires the notification on grant', async () => {
    const requestPermission = vi
      .fn<() => Promise<NotificationPermission>>()
      .mockResolvedValue('granted')
    const ctor = vi.fn()
    installNotification({ permission: 'default', request: requestPermission, ctor })

    const ok = await notify({ title: 'A', body: 'B' })
    expect(ok).toBe(true)
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(ctor).toHaveBeenCalledWith('A', { body: 'B', tag: undefined })

    // A second call must reuse the cached granted state.
    await notify({ title: 'C', body: 'D' })
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(ctor).toHaveBeenCalledTimes(2)
  })

  it('treats a thrown requestPermission as denied (gracefully)', async () => {
    installNotification({
      permission: 'default',
      request: vi.fn().mockRejectedValue(new Error('blocked')),
    })
    const ok = await notify({ title: 'x', body: 'y' })
    expect(ok).toBe(false)
  })

  it('returns false if the Notification constructor throws', async () => {
    const ctor = vi.fn(function () {
      throw new Error('blocked by browser')
    })
    installNotification({ permission: 'granted', ctor })
    const ok = await notify({ title: 'fail', body: '!' })
    expect(ok).toBe(false)
  })
})
