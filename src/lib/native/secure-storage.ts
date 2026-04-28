/**
 * Secure storage for sensitive credentials (e.g. LLM API keys).
 *
 * Threat model — what this DOES protect against:
 *   - Other apps on the same Android device reading the value (per-app
 *     SharedPreferences sandbox; requires root to bypass).
 *   - Casual inspection of browser DevTools' localStorage (we only ever
 *     write to IndexedDB on web, which is at least origin-partitioned and
 *     not surfaced in the simple "Local Storage" panel).
 *
 * What this does NOT protect against:
 *   - A rooted/compromised Android device. We do not encrypt with the
 *     Android Keystore; that would require a 3rd-party plugin and key
 *     migration on app upgrade. Storage is plain text on disk.
 *   - Any JavaScript running in the same web origin (XSS, malicious
 *     extension). Web IndexedDB is readable by any same-origin script.
 *   - Network-level interception (see the API key warning in the
 *     Settings panel for the HTTP-vs-HTTPS issue at request time).
 *
 * - **Native (Android/iOS)**: Capacitor Preferences (app-private
 *   SharedPreferences on Android, NSUserDefaults on iOS). Not OS-keystore-
 *   encrypted, but always strictly better than browser localStorage.
 * - **Web**: written ONLY to IndexedDB via the local `kvStore`. We
 *   deliberately skip the localStorage fallback path for sensitive
 *   values so a device without IDB simply forgets the key on reload
 *   rather than persisting it to the lower-trust localStorage origin
 *   partition. This mitigates the CodeQL
 *   `js/clear-text-storage-of-sensitive-data` alert.
 *
 * Callers should treat secure storage as best-effort: values may not
 * survive a reload on highly restricted browsers, and should be cheap to
 * re-enter (e.g. an API key the user pastes once into Settings).
 */

import { Preferences } from '@capacitor/preferences'
import { kvStore } from '@/lib/llm-runtime/kv-store'
import { isNative } from './platform'

export interface SecureStorage {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

const nativeStore: SecureStorage = {
  async get(key) {
    const { value } = await Preferences.get({ key })
    return value === null ? undefined : value
  },
  async set(key, value) {
    await Preferences.set({ key, value })
  },
  async remove(key) {
    await Preferences.remove({ key })
  },
}

const webStore: SecureStorage = {
  async get(key) {
    const v = await kvStore.get<string>(key)
    return typeof v === 'string' ? v : undefined
  },
  async set(key, value) {
    // setSecure persists ONLY to IndexedDB — never the localStorage
    // fallback — exactly the property we want for sensitive material.
    await kvStore.setSecure(key, value)
  },
  async remove(key) {
    await kvStore.delete(key)
  },
}

export const secureStorage: SecureStorage = {
  get: (key) => (isNative() ? nativeStore : webStore).get(key),
  set: (key, value) => (isNative() ? nativeStore : webStore).set(key, value),
  remove: (key) => (isNative() ? nativeStore : webStore).remove(key),
}
