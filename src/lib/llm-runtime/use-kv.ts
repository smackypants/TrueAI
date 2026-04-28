/**
 * `useKV` — drop-in replacement for the hook of the same name in
 * `@github/spark/hooks`. Keeps Spark's signature, async-hydration semantics,
 * functional-updater support, and `[value, setValue, deleteValue]` return
 * shape, but persists values in the local IndexedDB-backed KV store instead
 * of the Spark KV HTTP service.
 *
 * Original docstring (Spark):
 *   The value is automatically retrieved from the store on mount and
 *   updated on state change. While the initial value is being fetched,
 *   `initialValue` is used. Note that the current value may be undefined
 *   if no value has been set yet or if the value has been deleted.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { kvStore } from './kv-store'

type SetStateAction<T> = T | ((prev: T | undefined) => T)

export function useKV<T>(
  key: string,
  initialValue: T,
): [T | undefined, (newValue: SetStateAction<T>) => void, () => void] {
  // Start with the synchronously-available value (in-memory cache hit) when
  // possible; otherwise fall back to `initialValue` exactly like Spark's
  // hook does. This lets components that re-mount mid-session render the
  // stored value on the very first frame instead of flashing the default.
  const peeked = kvStore.peek<T>(key)
  const [value, setValue] = useState<T | undefined>(peeked ?? initialValue)
  // Pin the initial value across re-renders so the hydration effect is
  // stable even if the caller passes a new object literal each render.
  const initialRef = useRef(initialValue)

  useEffect(() => {
    let cancelled = false
    void kvStore.getOrSet(key, initialRef.current).then((stored) => {
      if (cancelled) return
      setValue(stored as T)
    })
    const unsubscribe = kvStore.subscribe(key, (next) => {
      setValue(next as T | undefined)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [key])

  const setStoredValue = useCallback(
    (newValue: SetStateAction<T>) => {
      setValue((current) => {
        const next =
          typeof newValue === 'function'
            ? (newValue as (prev: T | undefined) => T)(current)
            : newValue
        // Fire-and-forget the persistence write. Subscribers in the same tab
        // are notified synchronously via the in-memory cache so concurrent
        // renders see the new value immediately.
        void kvStore.set(key, next)
        return next
      })
    },
    [key],
  )

  const deleteStoredValue = useCallback(() => {
    setValue(undefined)
    void kvStore.delete(key)
  }, [key])

  return [value, setStoredValue, deleteStoredValue]
}
