import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptimizedTabs } from './use-optimized-tabs'

const TABS = ['home', 'chat', 'agents', 'settings']

describe('useOptimizedTabs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with the default tab active and only the default loaded', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'home' })
    )
    expect(result.current.activeTab).toBe('home')
    expect(result.current.tabStates.home.isActive).toBe(true)
    expect(result.current.tabStates.home.hasLoaded).toBe(true)
    expect(result.current.tabStates.chat.isActive).toBe(false)
    expect(result.current.tabStates.chat.hasLoaded).toBe(false)
  })

  it('marks adjacent tabs as shouldPreload (within distance 1)', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'chat' })
    )
    expect(result.current.tabStates.home.shouldPreload).toBe(true) // index 0, distance 1
    expect(result.current.tabStates.chat.shouldPreload).toBe(true) // self, distance 0
    expect(result.current.tabStates.agents.shouldPreload).toBe(true) // distance 1
    expect(result.current.tabStates.settings.shouldPreload).toBe(false) // distance 2
  })

  it('does not mark any tab as shouldPreload when preloadAdjacent is false', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'chat', preloadAdjacent: false })
    )
    Object.values(result.current.tabStates).forEach(s => {
      expect(s.shouldPreload).toBe(false)
    })
  })

  it('changeTab activates the new tab, marks it as loaded, and updates preload neighbours', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'home' })
    )
    act(() => {
      result.current.changeTab('agents')
    })
    expect(result.current.activeTab).toBe('agents')
    expect(result.current.tabStates.home.isActive).toBe(false)
    expect(result.current.tabStates.agents.isActive).toBe(true)
    expect(result.current.tabStates.agents.hasLoaded).toBe(true)
    // Preload neighbours of "agents" (index 2) are chat (1) and settings (3).
    expect(result.current.tabStates.chat.shouldPreload).toBe(true)
    expect(result.current.tabStates.settings.shouldPreload).toBe(true)
    expect(result.current.tabStates.home.shouldPreload).toBe(false)
  })

  it('ignores changeTab to the currently active tab and locks during 300ms transition', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'home' })
    )
    // First change starts the lock
    act(() => {
      result.current.changeTab('chat')
    })
    expect(result.current.activeTab).toBe('chat')

    // Second change while locked is ignored
    act(() => {
      result.current.changeTab('agents')
    })
    expect(result.current.activeTab).toBe('chat')

    // After 300 ms the lock releases
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.changeTab('agents')
    })
    expect(result.current.activeTab).toBe('agents')

    // No-op when changing to the same tab
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.changeTab('agents')
    })
    expect(result.current.activeTab).toBe('agents')
  })

  it('shouldRenderTab returns true for active and loaded tabs (cacheContent=true)', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'home' })
    )
    expect(result.current.shouldRenderTab('home')).toBe(true)
    expect(result.current.shouldRenderTab('chat')).toBe(false)

    act(() => {
      result.current.changeTab('chat')
    })
    expect(result.current.shouldRenderTab('chat')).toBe(true)
    // home is no longer active but was loaded → still renders when cached
    expect(result.current.shouldRenderTab('home')).toBe(true)
  })

  it('shouldRenderTab returns false for inactive tabs when cacheContent=false', () => {
    const { result } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'home', cacheContent: false })
    )
    act(() => {
      result.current.changeTab('chat')
    })
    expect(result.current.shouldRenderTab('chat')).toBe(true)
    expect(result.current.shouldRenderTab('home')).toBe(false)
  })

  it('clears the pending transition timeout on unmount (no leaked timers)', () => {
    const { result, unmount } = renderHook(() =>
      useOptimizedTabs({ tabs: TABS, defaultTab: 'home' })
    )
    act(() => {
      result.current.changeTab('chat')
    })
    // Pending transition timeout exists before unmount
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
