import { beforeEach, describe, expect, it } from 'vitest'
import { __resetKvStoreForTests, kvStore } from './kv-store'

describe('kvStore', () => {
  beforeEach(() => {
    __resetKvStoreForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  })

  it('returns undefined for unknown keys', async () => {
    expect(await kvStore.get('missing')).toBeUndefined()
  })

  it('persists and retrieves values', async () => {
    await kvStore.set('greeting', 'hello')
    __resetKvStoreForTests() // wipe in-memory cache so we hit storage
    const stored = await kvStore.get<string>('greeting')
    expect(stored).toBe('hello')
  })

  it('round-trips structured objects via JSON', async () => {
    const value = { id: 1, items: ['a', 'b'], nested: { ok: true } }
    await kvStore.set('payload', value)
    __resetKvStoreForTests()
    const stored = await kvStore.get('payload')
    expect(stored).toEqual(value)
  })

  it('deletes values', async () => {
    await kvStore.set('temp', 42)
    await kvStore.delete('temp')
    __resetKvStoreForTests()
    expect(await kvStore.get('temp')).toBeUndefined()
  })

  it('getOrSet writes the initial value when missing and preserves it on re-read', async () => {
    const first = await kvStore.getOrSet('counter', 7)
    expect(first).toBe(7)
    const second = await kvStore.getOrSet('counter', 99)
    expect(second).toBe(7)
  })

  it('peek returns the cached value once hydrated', async () => {
    await kvStore.set('hot', 'cached')
    expect(kvStore.peek<string>('hot')).toBe('cached')
  })

  it('notifies subscribers on set and delete', async () => {
    const observed: unknown[] = []
    const unsub = kvStore.subscribe('topic', (v) => observed.push(v))
    await kvStore.set('topic', 'one')
    await kvStore.set('topic', 'two')
    await kvStore.delete('topic')
    unsub()
    await kvStore.set('topic', 'after-unsub')
    expect(observed).toEqual(['one', 'two', undefined])
  })

  it('setSecure does not write to localStorage even on IDB transaction failure', async () => {
    // Force the IDB write to throw — secure values must NEVER fall through
    // to localStorage. This is a regression test for the prior bug where
    // setSecure delegated to idbSet (which has a localStorage fallback).
    const realIDB = window.indexedDB
    const fakeRequest = {
      result: {
        transaction: () => {
          throw new Error('simulated idb failure')
        },
      },
      onsuccess: null as null | (() => void),
      onerror: null,
      onupgradeneeded: null,
    }
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      writable: true,
      value: {
        open: () => {
          // Synchronously fire onsuccess so openDb resolves quickly.
          setTimeout(() => fakeRequest.onsuccess?.(), 0)
          return fakeRequest
        },
      },
    })
    try {
      __resetKvStoreForTests()
      window.localStorage.clear()
      await kvStore.setSecure('api-key', 'super-secret-value')
      // Scan every localStorage entry for the secret.
      let leaked = false
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        const v = k ? window.localStorage.getItem(k) : null
        if (v && v.includes('super-secret-value')) leaked = true
      }
      expect(leaked).toBe(false)
    } finally {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        writable: true,
        value: realIDB,
      })
    }
  })
})
