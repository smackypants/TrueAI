import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

describe('useIsMobile hook', () => {
  let matchMediaMock: any

  beforeEach(() => {
    matchMediaMock = vi.fn()
    window.matchMedia = matchMediaMock
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return false for desktop width', () => {
    const listeners: Array<() => void> = []

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        listeners.push(handler)
      }),
      removeEventListener: vi.fn(),
    }))

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('should return true for mobile width', () => {
    const listeners: Array<() => void> = []

    matchMediaMock.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        listeners.push(handler)
      }),
      removeEventListener: vi.fn(),
    }))

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('should update when window is resized', async () => {
    const listeners: Array<() => void> = []

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        listeners.push(handler)
      }),
      removeEventListener: vi.fn(),
    }))

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    // Trigger the listener
    listeners.forEach(listener => listener())

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('should check against the correct breakpoint (768px)', () => {
    matchMediaMock.mockImplementation((query: string) => {
      expect(query).toBe('(max-width: 767px)')
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    })

    renderHook(() => useIsMobile())
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerMock = vi.fn()

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
    }))

    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(removeEventListenerMock).toHaveBeenCalled()
  })
})
