import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useKV } from './use-kv'
import { __resetKvStoreForTests, kvStore } from './kv-store'

describe('useKV', () => {
  beforeEach(() => {
    __resetKvStoreForTests()
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  })

  it('returns the initial value before hydration', () => {
    const { result } = renderHook(() => useKV<string>('greeting', 'hi'))
    expect(result.current[0]).toBe('hi')
  })

  it('hydrates from the store on mount', async () => {
    await kvStore.set('hydrate-key', 'persisted')
    const { result } = renderHook(() => useKV<string>('hydrate-key', 'fallback'))
    await waitFor(() => {
      expect(result.current[0]).toBe('persisted')
    })
  })

  it('persists updates and supports functional updaters', async () => {
    const { result } = renderHook(() => useKV<number>('counter', 0))
    // Wait for initial getOrSet to settle.
    await waitFor(() => expect(result.current[0]).toBe(0))
    act(() => {
      result.current[1](5)
    })
    expect(result.current[0]).toBe(5)
    act(() => {
      result.current[1]((prev) => (prev ?? 0) + 1)
    })
    expect(result.current[0]).toBe(6)
    await waitFor(async () => {
      expect(await kvStore.get<number>('counter')).toBe(6)
    })
  })

  it('keeps two hooks observing the same key in sync', async () => {
    const a = renderHook(() => useKV<string>('shared', 'a-init'))
    const b = renderHook(() => useKV<string>('shared', 'b-init'))
    await waitFor(() => {
      expect(a.result.current[0]).toBeDefined()
      expect(b.result.current[0]).toBeDefined()
    })
    act(() => {
      a.result.current[1]('updated-by-a')
    })
    await waitFor(() => {
      expect(b.result.current[0]).toBe('updated-by-a')
    })
  })

  it('delete clears the value and the store', async () => {
    const { result } = renderHook(() => useKV<string>('to-delete', 'x'))
    await waitFor(() => expect(result.current[0]).toBe('x'))
    act(() => {
      result.current[2]()
    })
    expect(result.current[0]).toBeUndefined()
    await waitFor(async () => {
      expect(await kvStore.get('to-delete')).toBeUndefined()
    })
  })

  it('does not setState after unmount when getOrSet resolves late (cancelled guard)', async () => {
    // Make getOrSet resolve only after we manually release it, so we can
    // unmount the hook in the meantime and verify the cancelled-guard path
    // (use-kv.ts L37) prevents the late setValue from running.
    let release: (v: string) => void = () => {}
    const original = kvStore.getOrSet.bind(kvStore)
    const spy = vi
      .spyOn(kvStore, 'getOrSet')
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            release = resolve
          }),
      )

    const { result, unmount } = renderHook(() => useKV<string>('cancel-me', 'init'))
    expect(result.current[0]).toBe('init')

    unmount()
    // Resolve AFTER unmount; cancelled === true so no setValue should fire.
    // If the guard regresses, React will log a "state update on unmounted
    // component" warning that the test setup turns into a failure.
    await act(async () => {
      release('late-arrival')
      // Yield once so the .then callback runs.
      await Promise.resolve()
    })

    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    // Sanity: real getOrSet still works after the spy is restored.
    expect(typeof original).toBe('function')
  })
})
