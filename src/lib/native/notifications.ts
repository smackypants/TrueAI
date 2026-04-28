/**
 * Local notifications wrapper. Used by long-running flows (agent runs,
 * fine-tuning jobs, model downloads) so the user can leave the app and be
 * pinged when work completes.
 *
 * Permissions are requested lazily on first call — we never prompt at
 * startup. On the web we fall back to the standard `Notification` API
 * where supported, and silently no-op otherwise (the in-app sonner toast
 * still fires, so the user isn't left without feedback).
 */

import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './platform'

export interface NotifyOptions {
  title: string
  body: string
  /** Optional unique-per-session id; auto-assigned if omitted. */
  id?: number
  /** Tag for analytics / cancellation. */
  tag?: string
}

let permissionState: 'unknown' | 'granted' | 'denied' = 'unknown'
let nextId = 1000

async function ensurePermission(): Promise<boolean> {
  if (permissionState === 'granted') return true
  if (permissionState === 'denied') return false

  if (isNative()) {
    try {
      const status = await LocalNotifications.checkPermissions()
      if (status.display === 'granted') {
        permissionState = 'granted'
        return true
      }
      const requested = await LocalNotifications.requestPermissions()
      permissionState = requested.display === 'granted' ? 'granted' : 'denied'
      return permissionState === 'granted'
    } catch (err) {
      console.error('[native/notifications] permission request failed:', err)
      permissionState = 'denied'
      return false
    }
  }

  if (typeof Notification === 'undefined') {
    permissionState = 'denied'
    return false
  }
  if (Notification.permission === 'granted') {
    permissionState = 'granted'
    return true
  }
  if (Notification.permission === 'denied') {
    permissionState = 'denied'
    return false
  }
  try {
    const result = await Notification.requestPermission()
    permissionState = result === 'granted' ? 'granted' : 'denied'
    return permissionState === 'granted'
  } catch {
    permissionState = 'denied'
    return false
  }
}

export async function notify(opts: NotifyOptions): Promise<boolean> {
  const ok = await ensurePermission()
  if (!ok) return false

  const id = opts.id ?? nextId++
  if (isNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: opts.title,
            body: opts.body,
            // Fire (almost) immediately.
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      })
      return true
    } catch (err) {
      console.error('[native/notifications] schedule failed:', err)
      return false
    }
  }

  try {
    new Notification(opts.title, { body: opts.body, tag: opts.tag })
    return true
  } catch {
    return false
  }
}

/** Test-only helper. */
export function __resetNotificationsForTests(): void {
  permissionState = 'unknown'
  nextId = 1000
}
