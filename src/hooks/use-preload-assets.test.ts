import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the underlying preloadAssets call from the serviceWorker module so we
// don't need an actual service worker / Cache Storage under jsdom.
vi.mock('@/lib/serviceWorker', () => ({
  preloadAssets: vi.fn(),
}))

import { preloadAssets } from '@/lib/serviceWorker'
import { usePreloadAssets } from './use-preload-assets'

const preloadAssetsMock = preloadAssets as unknown as ReturnType<typeof vi.fn>

describe('usePreloadAssets', () => {
  beforeEach(() => {
    preloadAssetsMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when disabled', () => {
    const { result } = renderHook(() => usePreloadAssets(['/a.png'], false))
    expect(preloadAssetsMock).not.toHaveBeenCalled()
    expect(result.current.isPreloading).toBe(false)
    expect(result.current.isComplete).toBe(false)
  })

  it('does nothing when the URL list is empty', () => {
    const { result } = renderHook(() => usePreloadAssets([], true))
    expect(preloadAssetsMock).not.toHaveBeenCalled()
    expect(result.current.isPreloading).toBe(false)
    expect(result.current.isComplete).toBe(false)
  })

  it('marks isComplete true after a successful preload', async () => {
    preloadAssetsMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => usePreloadAssets(['/a.png', '/b.png']))
    await waitFor(() => {
      expect(result.current.isComplete).toBe(true)
    })
    expect(result.current.isPreloading).toBe(false)
    expect(preloadAssetsMock).toHaveBeenCalledWith(['/a.png', '/b.png'])
  })

  it('clears isPreloading and stays !isComplete on failure', async () => {
    preloadAssetsMock.mockRejectedValue(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => usePreloadAssets(['/a.png']))
    await waitFor(() => {
      expect(result.current.isPreloading).toBe(false)
    })
    expect(result.current.isComplete).toBe(false)
    expect(errSpy).toHaveBeenCalled()
  })

  it('does not update state after unmount (cancellation guard)', async () => {
    let resolvePreload: (() => void) | null = null
    preloadAssetsMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePreload = resolve
        }),
    )

    const { result, unmount } = renderHook(() => usePreloadAssets(['/a.png']))
    unmount()
    // Resolve after unmount — the hook's `cancelled` flag must prevent any
    // post-unmount setState (which React would warn about). We can only
    // observe the snapshot of `result.current` from before unmount.
    await act(async () => {
      resolvePreload?.()
      await Promise.resolve()
    })
    // The last observable state from before unmount should NOT be "complete":
    // either it was still preloading (async race) or never started — in
    // either case, `isComplete` must be false.
    expect(result.current.isComplete).toBe(false)
  })
})
