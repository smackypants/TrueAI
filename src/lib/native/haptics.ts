/**
 * Haptic feedback. Maps a small vocabulary of "feedback intents" onto the
 * Capacitor Haptics plugin on native, falling back to the Web Vibration
 * API on browsers that support it. All operations are fire-and-forget and
 * never throw — a missing capability is simply a no-op so it's always
 * safe to sprinkle haptic calls into UI handlers.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from './platform'

function webVibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    // ignore
  }
}

/** Light tap, e.g. button press. */
export async function tap(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
      return
    } catch {
      // fall through
    }
  }
  webVibrate(10)
}

/** Medium impact, e.g. tab switch or significant action. */
export async function impact(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
      return
    } catch {
      // fall through
    }
  }
  webVibrate(20)
}

/** Selection change — e.g. swipe between tabs. */
export async function selection(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.selectionStart()
      await Haptics.selectionChanged()
      await Haptics.selectionEnd()
      return
    } catch {
      // fall through
    }
  }
  webVibrate(5)
}

/** Success notification (chat sent, action complete). */
export async function success(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.notification({ type: NotificationType.Success })
      return
    } catch {
      // fall through
    }
  }
  webVibrate([10, 30, 10])
}

/** Warning notification. */
export async function warning(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.notification({ type: NotificationType.Warning })
      return
    } catch {
      // fall through
    }
  }
  webVibrate([20, 40, 20])
}

/** Error notification. */
export async function error(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.notification({ type: NotificationType.Error })
      return
    } catch {
      // fall through
    }
  }
  webVibrate([50, 50, 50])
}

export const haptics = { tap, impact, selection, success, warning, error }
