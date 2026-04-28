import { describe, it, expect } from 'vitest'
import * as shim from './spark-hooks-shim'
import { useKV } from './use-kv'

describe('spark-hooks-shim', () => {
  it('re-exports useKV from the local use-kv module', () => {
    // The shim is the Vite-alias target for '@github/spark/hooks', so the
    // exported symbol must be referentially identical to the local hook.
    // If a future refactor replaces the re-export with a wrapper this test
    // is the early-warning signal.
    expect(shim.useKV).toBe(useKV)
  })

  it('exposes useKV as a function (preserves the hook contract)', () => {
    expect(typeof shim.useKV).toBe('function')
  })
})
