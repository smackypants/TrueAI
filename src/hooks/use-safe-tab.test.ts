import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSafeTab } from './use-safe-tab'

describe('useSafeTab hook', () => {
  it('should initialize correctly when tab is active', () => {
    const { result } = renderHook(() => useSafeTab('tab1', 'tab1'))

    // isMounted and isActive are snapshot values from render time (false initially)
    // but isSafe() function checks the current ref values (updated in useEffect)
    expect(result.current.isSafe()).toBe(true)
  })

  it('should initialize correctly when tab is inactive', () => {
    const { result } = renderHook(() => useSafeTab('tab1', 'tab2'))

    // isSafe() function checks the current ref values
    expect(result.current.isSafe()).toBe(false)
  })

  it('should update when active tab changes', () => {
    const { result, rerender } = renderHook(
      ({ tabName, activeTab }) => useSafeTab(tabName, activeTab),
      {
        initialProps: { tabName: 'tab1', activeTab: 'tab1' }
      }
    )

    expect(result.current.isSafe()).toBe(true)

    rerender({ tabName: 'tab1', activeTab: 'tab2' })

    expect(result.current.isSafe()).toBe(false)
  })

  it('should handle tab becoming active', () => {
    const { result, rerender } = renderHook(
      ({ tabName, activeTab }) => useSafeTab(tabName, activeTab),
      {
        initialProps: { tabName: 'tab1', activeTab: 'tab2' }
      }
    )

    expect(result.current.isSafe()).toBe(false)

    rerender({ tabName: 'tab1', activeTab: 'tab1' })

    expect(result.current.isSafe()).toBe(true)
  })

  it('should handle multiple tabs with different names', () => {
    const { result: result1 } = renderHook(() => useSafeTab('home', 'home'))
    const { result: result2 } = renderHook(() => useSafeTab('settings', 'home'))
    const { result: result3 } = renderHook(() => useSafeTab('profile', 'home'))

    expect(result1.current.isSafe()).toBe(true)
    expect(result2.current.isSafe()).toBe(false)
    expect(result3.current.isSafe()).toBe(false)
  })

  it('should be unsafe after unmount', () => {
    const { result, unmount } = renderHook(() => useSafeTab('tab1', 'tab1'))

    expect(result.current.isSafe()).toBe(true)

    unmount()

    // After unmount, isSafe should return false because refs are cleaned up
    expect(result.current.isSafe()).toBe(false)
  })

  it('should maintain isSafe function behavior across renders', () => {
    const { result, rerender } = renderHook(
      ({ tabName, activeTab }) => useSafeTab(tabName, activeTab),
      {
        initialProps: { tabName: 'tab1', activeTab: 'tab1' }
      }
    )

    expect(result.current.isSafe()).toBe(true)

    rerender({ tabName: 'tab1', activeTab: 'tab2' })

    // Function works correctly after rerender
    expect(result.current.isSafe()).toBe(false)
  })

  it('should handle rapid tab switches', () => {
    const { result, rerender } = renderHook(
      ({ tabName, activeTab }) => useSafeTab(tabName, activeTab),
      {
        initialProps: { tabName: 'tab1', activeTab: 'tab1' }
      }
    )

    expect(result.current.isSafe()).toBe(true)

    rerender({ tabName: 'tab1', activeTab: 'tab2' })
    expect(result.current.isSafe()).toBe(false)

    rerender({ tabName: 'tab1', activeTab: 'tab3' })
    expect(result.current.isSafe()).toBe(false)

    rerender({ tabName: 'tab1', activeTab: 'tab1' })
    expect(result.current.isSafe()).toBe(true)
  })

  it('should handle empty strings', () => {
    const { result } = renderHook(() => useSafeTab('', ''))

    expect(result.current.isSafe()).toBe(true)
  })

  it('should handle different tab name and active tab types', () => {
    const { result: result1 } = renderHook(() => useSafeTab('tab1', 'tab1'))
    const { result: result2 } = renderHook(() => useSafeTab('tab-1', 'tab-1'))
    const { result: result3 } = renderHook(() => useSafeTab('Tab1', 'Tab1'))

    expect(result1.current.isSafe()).toBe(true)
    expect(result2.current.isSafe()).toBe(true)
    expect(result3.current.isSafe()).toBe(true)
  })

  it('should be case-sensitive', () => {
    const { result } = renderHook(() => useSafeTab('Tab1', 'tab1'))

    expect(result.current.isActive).toBe(false)
    expect(result.current.isSafe()).toBe(false)
  })
})
