import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

/**
 * `useTheme` resolves a stored 'light' | 'dark' | 'system' setting onto
 * the documentElement classList and tracks `prefers-color-scheme` when
 * 'system' is selected.
 *
 * The repo aliases `@github/spark/hooks` → local shim at the Vite layer,
 * but the vitest config does not replicate that alias, so we mock the
 * module here with a thin in-memory replacement so the hook can be
 * exercised in isolation.
 */
vi.mock('@github/spark/hooks', () => ({
  useKV: <T,>(_key: string, initial: T) => useState<T>(initial),
}))

const { useTheme } = await import('./use-theme')

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const removeEventListener = vi.fn()
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_: string, l: (e: { matches: boolean }) => void) => {
      listeners.push(l)
    }),
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  })
  return { mql, listeners, removeEventListener }
}

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to dark and applies the dark class', async () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    // The hook applies the class effect after first render.
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('switches to light when setTheme("light") is called', async () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    await act(async () => {
      result.current.setTheme('light')
      await Promise.resolve()
    })
    expect(result.current.theme).toBe('light')
    expect(result.current.resolvedTheme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolves "system" using prefers-color-scheme: dark', async () => {
    mockMatchMedia(true) // system prefers dark
    const { result } = renderHook(() => useTheme())
    await act(async () => {
      result.current.setTheme('system')
      await Promise.resolve()
    })
    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('resolves "system" using prefers-color-scheme: light', async () => {
    mockMatchMedia(false) // system prefers light
    const { result } = renderHook(() => useTheme())
    await act(async () => {
      result.current.setTheme('system')
      await Promise.resolve()
    })
    expect(result.current.resolvedTheme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('reacts to media-query changes when in system mode', async () => {
    const { listeners } = mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    await act(async () => {
      result.current.setTheme('system')
      await Promise.resolve()
    })
    expect(result.current.resolvedTheme).toBe('light')

    // Simulate the OS flipping to dark mode.
    await act(async () => {
      listeners.forEach((l) => l({ matches: true }))
      await Promise.resolve()
    })
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes the media-query listener when leaving system mode', async () => {
    const { removeEventListener } = mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    await act(async () => {
      result.current.setTheme('system')
      await Promise.resolve()
    })
    await act(async () => {
      result.current.setTheme('dark')
      await Promise.resolve()
    })
    expect(removeEventListener).toHaveBeenCalled()
  })
})
