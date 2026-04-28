import { describe, it, expect, beforeEach } from 'vitest'
import { secureStorage } from './secure-storage'
import { __resetKvStoreForTests, kvStore } from '@/lib/llm-runtime/kv-store'

describe('native/secure-storage (web fallback)', () => {
  beforeEach(() => {
    __resetKvStoreForTests()
  })

  it('round-trips a value via the secure path', async () => {
    await secureStorage.set('test-key', 'sk-secret')
    expect(await secureStorage.get('test-key')).toBe('sk-secret')
  })

  it('returns undefined for missing keys', async () => {
    expect(await secureStorage.get('not-set')).toBeUndefined()
  })

  it('remove deletes the value', async () => {
    await secureStorage.set('disposable', 'value')
    await secureStorage.remove('disposable')
    expect(await secureStorage.get('disposable')).toBeUndefined()
  })

  it('uses kvStore.setSecure (no localStorage write) on web', async () => {
    // After setting via secureStorage, the value MUST be in the kvStore
    // memory cache, which is the kvStore.setSecure observable behaviour.
    await secureStorage.set('api-key', 'secret-value')
    expect(kvStore.peek<string>('api-key')).toBe('secret-value')
  })

  it('returns undefined for non-string stored values', async () => {
    // Defensive: if some legacy code stuffed a non-string into the same
    // key, secureStorage should refuse to return it as a credential.
    await kvStore.set('bad-shape', { not: 'a string' })
    expect(await secureStorage.get('bad-shape')).toBeUndefined()
  })
})
