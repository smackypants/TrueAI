/**
 * Tests for the native (Android/iOS) path of `secureStorage` that the
 * existing `secure-storage.test.ts` cannot exercise — that file only runs
 * the web fallback because jsdom is not a "native" platform.
 *
 * We mock `./platform` to look native and `@capacitor/preferences` to
 * provide a controllable in-memory backing store, then re-import the
 * module under test with `vi.resetModules()` so the bound `nativeStore`
 * closure captures the mocked `Preferences`.
 *
 * This is the credential storage path on Android. A silent regression
 * here would leak the LLM API key, so it earns dedicated regression
 * coverage despite needing the mock dance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

const prefStore = new Map<string, string>()
const getMock = vi.fn(async ({ key }: { key: string }) => ({
  value: prefStore.has(key) ? (prefStore.get(key) as string) : null,
}))
const setMock = vi.fn(async ({ key, value }: { key: string; value: string }) => {
  prefStore.set(key, value)
})
const removeMock = vi.fn(async ({ key }: { key: string }) => {
  prefStore.delete(key)
})

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: (...args: unknown[]) => getMock(...(args as [{ key: string }])),
    set: (...args: unknown[]) => setMock(...(args as [{ key: string; value: string }])),
    remove: (...args: unknown[]) => removeMock(...(args as [{ key: string }])),
  },
}))

beforeEach(() => {
  prefStore.clear()
  getMock.mockClear()
  setMock.mockClear()
  removeMock.mockClear()
  vi.resetModules()
})

describe('native/secure-storage (Android paths)', () => {
  it('set persists via Capacitor Preferences (not via web kvStore)', async () => {
    const { secureStorage } = await import('./secure-storage')
    await secureStorage.set('api-key', 'sk-secret')
    expect(setMock).toHaveBeenCalledWith({ key: 'api-key', value: 'sk-secret' })
    expect(prefStore.get('api-key')).toBe('sk-secret')
  })

  it('get reads via Capacitor Preferences', async () => {
    prefStore.set('api-key', 'sk-from-prefs')
    const { secureStorage } = await import('./secure-storage')
    await expect(secureStorage.get('api-key')).resolves.toBe('sk-from-prefs')
    expect(getMock).toHaveBeenCalledWith({ key: 'api-key' })
  })

  it('get returns undefined (not null) for missing keys', async () => {
    // Capacitor Preferences resolves `{ value: null }` for missing keys —
    // secureStorage MUST translate that to `undefined` so callers can use
    // `?? defaultValue` and `if (value)` checks uniformly across platforms.
    const { secureStorage } = await import('./secure-storage')
    await expect(secureStorage.get('not-set')).resolves.toBeUndefined()
  })

  it('remove deletes the value via Capacitor Preferences', async () => {
    prefStore.set('disposable', 'value')
    const { secureStorage } = await import('./secure-storage')
    await secureStorage.remove('disposable')
    expect(removeMock).toHaveBeenCalledWith({ key: 'disposable' })
    expect(prefStore.has('disposable')).toBe(false)
  })

  it('round-trips a value end-to-end via the native path', async () => {
    const { secureStorage } = await import('./secure-storage')
    await secureStorage.set('token', 'abc123')
    await expect(secureStorage.get('token')).resolves.toBe('abc123')
    await secureStorage.remove('token')
    await expect(secureStorage.get('token')).resolves.toBeUndefined()
  })

  it('does not delegate to the web kvStore on the native path', async () => {
    // Regression guard: if a refactor ever made secureStorage.set delegate
    // to kvStore (web fallback) on native, the credential would land in
    // IndexedDB inside the Capacitor WebView origin — readable by any
    // JS in that origin and outside the per-app SharedPreferences sandbox.
    const { secureStorage } = await import('./secure-storage')
    const { kvStore } = await import('@/lib/llm-runtime/kv-store')
    await secureStorage.set('api-key', 'sk-native-only')
    expect(kvStore.peek('api-key')).toBeUndefined()
  })
})
