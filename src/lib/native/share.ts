/**
 * Cross-platform share sheet: Capacitor Share on native, the Web Share API
 * on the web (where supported), and a clipboard-copy fallback on browsers
 * without it. Returns `true` when the user successfully shared (or when we
 * gracefully copied to the clipboard as a fallback), `false` if they
 * cancelled or the operation failed.
 */

import { Share } from '@capacitor/share'
import { isNative } from './platform'
import { copyText } from './clipboard'

export interface ShareOptions {
  title?: string
  text?: string
  url?: string
  /** Title of the OS share sheet (Android only). */
  dialogTitle?: string
}

interface NavigatorWithShare {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
  canShare?: (data: unknown) => boolean
}

export async function share(options: ShareOptions): Promise<boolean> {
  if (isNative()) {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle,
      })
      return true
    } catch (err) {
      // Capacitor throws on user cancel — treat as "not shared" but not an error.
      console.debug('[native/share] cancelled or failed:', err)
      return false
    }
  }

  // Web Share API path (Chrome on Android web, Safari on iOS web, etc.)
  const nav = (typeof navigator !== 'undefined' ? navigator : null) as NavigatorWithShare | null
  if (nav?.share) {
    try {
      await nav.share({ title: options.title, text: options.text, url: options.url })
      return true
    } catch {
      return false
    }
  }

  // Last-resort: copy the payload to the clipboard so the user can paste
  // wherever they want. Better than silently doing nothing.
  const payload = [options.title, options.text, options.url].filter(Boolean).join('\n')
  if (payload.length === 0) return false
  return copyText(payload)
}

/** True when *some* form of sharing is available (native, Web Share, or clipboard). */
export function canShare(): boolean {
  if (isNative()) return true
  const nav = (typeof navigator !== 'undefined' ? navigator : null) as NavigatorWithShare | null
  if (nav?.share) return true
  return typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText
}
