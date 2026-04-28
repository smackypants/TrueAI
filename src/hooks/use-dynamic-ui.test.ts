import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@github/spark/hooks', () => ({
  useKV: <T,>(_key: string, initial: T) => useState<T>(initial),
}))

const { useDynamicUI } = await import('./use-dynamic-ui')

function setInnerWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: w,
  })
}

describe('useDynamicUI', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns default preferences', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    expect(result.current.preferences?.layoutDensity).toBe('comfortable')
    expect(result.current.preferences?.fontSize).toBe('medium')
    expect(result.current.preferences?.cardStyle).toBe('elevated')
    expect(result.current.preferences?.autoAdaptLayout).toBe(true)
  })

  it('updatePreference patches a single key', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    act(() => result.current.updatePreference('fontSize', 'large'))
    expect(result.current.preferences?.fontSize).toBe('large')
  })

  it('trackTabUsage increments mostUsedTabs', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    act(() => result.current.trackTabUsage('chat'))
    act(() => result.current.trackTabUsage('chat'))
    act(() => result.current.trackTabUsage('agents'))
    expect(result.current.usage?.mostUsedTabs.chat).toBe(2)
    expect(result.current.usage?.mostUsedTabs.agents).toBe(1)
  })

  it('adapts to phone widths (< 640)', () => {
    setInnerWidth(360)
    const { result } = renderHook(() => useDynamicUI())
    expect(result.current.adaptiveLayout.columnCount).toBe(1)
    expect(result.current.adaptiveLayout.cardSize).toBe('small')
    expect(result.current.adaptiveLayout.showSidebar).toBe(false)
    expect(result.current.adaptiveLayout.compactMode).toBe(true)
  })

  it('adapts to tablet widths (640-1024)', () => {
    setInnerWidth(800)
    const { result } = renderHook(() => useDynamicUI())
    expect(result.current.adaptiveLayout.columnCount).toBe(2)
    expect(result.current.adaptiveLayout.showSidebar).toBe(false)
  })

  it('adapts to large desktop widths (>= 1536)', () => {
    setInnerWidth(1920)
    const { result } = renderHook(() => useDynamicUI())
    expect(result.current.adaptiveLayout.columnCount).toBe(4)
    expect(result.current.adaptiveLayout.cardSize).toBe('large')
  })

  it('skips adaptation when autoAdaptLayout is disabled', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    // Default initial layout is { 3, medium, true, false }.
    act(() => result.current.updatePreference('autoAdaptLayout', false))
    setInnerWidth(360)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    // Because autoAdaptLayout=false we keep whatever we last computed
    // (3 columns from the original 1280 width).
    expect(result.current.adaptiveLayout.columnCount).toBe(3)
  })

  it('getSpacingClass / getPaddingClass / getFontSizeClass respond to layoutDensity & fontSize', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    expect(result.current.getSpacingClass()).toBe('gap-4')
    expect(result.current.getPaddingClass()).toBe('p-4')
    expect(result.current.getFontSizeClass()).toBe('text-base')

    act(() => result.current.updatePreference('layoutDensity', 'compact'))
    expect(result.current.getSpacingClass()).toBe('gap-2')
    expect(result.current.getPaddingClass()).toBe('p-2')

    act(() => result.current.updatePreference('layoutDensity', 'spacious'))
    expect(result.current.getSpacingClass()).toBe('gap-6')
    expect(result.current.getPaddingClass()).toBe('p-6')

    act(() => result.current.updatePreference('fontSize', 'small'))
    expect(result.current.getFontSizeClass()).toBe('text-sm')
    act(() => result.current.updatePreference('fontSize', 'large'))
    expect(result.current.getFontSizeClass()).toBe('text-lg')
    act(() => result.current.updatePreference('fontSize', 'xlarge'))
    expect(result.current.getFontSizeClass()).toBe('text-xl')
  })

  it('getCardStyleClasses returns distinct strings for each style', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    const flat = (() => {
      act(() => result.current.updatePreference('cardStyle', 'flat'))
      return result.current.getCardStyleClasses()
    })()
    const elevated = (() => {
      act(() => result.current.updatePreference('cardStyle', 'elevated'))
      return result.current.getCardStyleClasses()
    })()
    const bordered = (() => {
      act(() => result.current.updatePreference('cardStyle', 'bordered'))
      return result.current.getCardStyleClasses()
    })()
    const glass = (() => {
      act(() => result.current.updatePreference('cardStyle', 'glass'))
      return result.current.getCardStyleClasses()
    })()
    expect(new Set([flat, elevated, bordered, glass]).size).toBe(4)
    expect(flat).toContain('shadow-none')
    expect(elevated).toContain('shadow-lg')
  })

  it('getAnimationClasses scales with animationIntensity', () => {
    setInnerWidth(1280)
    const { result } = renderHook(() => useDynamicUI())
    act(() => result.current.updatePreference('animationIntensity', 'none'))
    expect(result.current.getAnimationClasses()).toBe('')
    act(() => result.current.updatePreference('animationIntensity', 'subtle'))
    expect(result.current.getAnimationClasses()).toContain('duration-150')
    act(() => result.current.updatePreference('animationIntensity', 'enhanced'))
    expect(result.current.getAnimationClasses()).toContain('hover:scale')
  })
})
