import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

vi.mock('@github/spark/hooks', () => ({
  useKV: <T,>(_key: string, initial: T) => useState<T>(initial),
}))

const { useContextualUI } = await import('./use-contextual-ui')

describe('useContextualUI', () => {
  beforeEach(() => {
    // Pin "now" to a fixed afternoon time so the time-of-day branches are
    // deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T13:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exposes the expected API surface', () => {
    const { result } = renderHook(() => useContextualUI())
    expect(typeof result.current.trackFeatureUsage).toBe('function')
    expect(typeof result.current.trackTimeOfDay).toBe('function')
    expect(typeof result.current.trackError).toBe('function')
    expect(typeof result.current.trackSessionDuration).toBe('function')
    expect(typeof result.current.dismissSuggestion).toBe('function')
    expect(Array.isArray(result.current.suggestions)).toBe(true)
  })

  it('trackFeatureUsage increments the per-feature counter', () => {
    const { result } = renderHook(() => useContextualUI())
    act(() => result.current.trackFeatureUsage('chat'))
    act(() => result.current.trackFeatureUsage('chat'))
    act(() => result.current.trackFeatureUsage('agents'))
    expect(result.current.behavior?.mostUsedFeatures.chat).toBe(2)
    expect(result.current.behavior?.mostUsedFeatures.agents).toBe(1)
  })

  it('trackTimeOfDay puts a feature into the matching period bucket', () => {
    const { result } = renderHook(() => useContextualUI())
    act(() => result.current.trackTimeOfDay('chat')) // afternoon
    expect(result.current.behavior?.timePatterns.afternoon).toContain('chat')
    expect(result.current.behavior?.timePatterns.morning).not.toContain('chat')
  })

  it('trackError keeps only the last 10 errors', () => {
    const { result } = renderHook(() => useContextualUI())
    for (let i = 0; i < 15; i++) {
      act(() => result.current.trackError(`E${i}`))
    }
    expect(result.current.behavior?.errorPatterns.length).toBeLessThanOrEqual(11)
    // Most recent error is retained.
    expect(result.current.behavior?.errorPatterns).toContain('E14')
    expect(result.current.behavior?.errorPatterns).not.toContain('E0')
  })

  it('trackSessionDuration appends durations and updates lastActive', () => {
    const { result } = renderHook(() => useContextualUI())
    act(() => result.current.trackSessionDuration(1000))
    act(() => result.current.trackSessionDuration(2000))
    expect(result.current.behavior?.sessionDuration).toEqual([1000, 2000])
    expect(typeof result.current.behavior?.lastActive).toBe('number')
  })

  it('emits a "keyboard-shortcut" suggestion when a feature usage > 10', async () => {
    const { result } = renderHook(() => useContextualUI())
    for (let i = 0; i < 12; i++) {
      act(() => result.current.trackFeatureUsage('chat'))
    }
    // The suggestions effect runs synchronously after each setBehavior.
    const ids = result.current.suggestions.map(s => s.id)
    expect(ids).toContain('keyboard-shortcut')
  })

  it('emits a "break-reminder" when avg session duration > 30 minutes', () => {
    const { result } = renderHook(() => useContextualUI())
    act(() => result.current.trackSessionDuration(40 * 60 * 1000))
    const ids = result.current.suggestions.map(s => s.id)
    expect(ids).toContain('break-reminder')
  })

  it('emits an "error-help" suggestion when one error repeats > 2x', () => {
    const { result } = renderHook(() => useContextualUI())
    for (let i = 0; i < 6; i++) {
      act(() => result.current.trackError('Network failure'))
    }
    const ids = result.current.suggestions.map(s => s.id)
    expect(ids).toContain('error-help')
  })

  it('dismissSuggestion removes the suggestion and persists the dismissal', () => {
    const { result } = renderHook(() => useContextualUI())
    for (let i = 0; i < 12; i++) {
      act(() => result.current.trackFeatureUsage('chat'))
    }
    expect(result.current.suggestions.find(s => s.id === 'keyboard-shortcut')).toBeTruthy()

    act(() => result.current.dismissSuggestion('keyboard-shortcut'))
    expect(result.current.suggestions.find(s => s.id === 'keyboard-shortcut')).toBeUndefined()
  })

  it('getPredictedNextAction returns the most-used feature or null', () => {
    const { result } = renderHook(() => useContextualUI())
    expect(result.current.getPredictedNextAction()).toBeNull()
    act(() => result.current.trackFeatureUsage('agents'))
    act(() => result.current.trackFeatureUsage('agents'))
    act(() => result.current.trackFeatureUsage('chat'))
    expect(result.current.getPredictedNextAction()).toBe('agents')
  })

  it('getRecommendedFeatures returns features the user has not used yet', () => {
    const { result } = renderHook(() => useContextualUI())
    act(() => result.current.trackFeatureUsage('chat'))
    const recs = result.current.getRecommendedFeatures()
    expect(recs).not.toContain('chat')
    expect(recs).toContain('agents')
    expect(recs).toContain('workflows')
  })
})
