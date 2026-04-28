/**
 * Clipboard helper: native Capacitor Clipboard on Android/iOS, falling
 * back to `navigator.clipboard.writeText` (and a hidden-textarea +
 * `document.execCommand` last-resort) on the web. Always returns a boolean
 * so callers can show success/failure toasts uniformly.
 */

import { Clipboard } from '@capacitor/clipboard'
import { isNative } from './platform'

async function copyViaWeb(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy path
    }
  }
  if (typeof document === 'undefined') return false
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      await Clipboard.write({ string: text })
      return true
    } catch (err) {
      console.error('[native/clipboard] native write failed, falling back:', err)
      return copyViaWeb(text)
    }
  }
  return copyViaWeb(text)
}

export async function readText(): Promise<string | undefined> {
  if (isNative()) {
    try {
      const { value } = await Clipboard.read()
      return value
    } catch {
      return undefined
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return undefined
    }
  }
  return undefined
}
