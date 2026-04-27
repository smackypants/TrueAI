import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from './use-install-prompt'

describe('useInstallPrompt hook', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>
  let eventListeners: Map<string, Set<EventListener>>

  beforeEach(() => {
    eventListeners = new Map()

    matchMediaMock = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    // @ts-expect-error - matchMedia is a test mock
    window.matchMedia = matchMediaMock

    // Mock addEventListener/removeEventListener
    window.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set())
      }
      eventListeners.get(event)!.add(handler)
    })

    window.removeEventListener = vi.fn((event: string, handler: EventListener) => {
      eventListeners.get(event)?.delete(handler)
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    eventListeners.clear()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.canInstall).toBe(false)
    expect(result.current.isInstalled).toBe(false)
    expect(typeof result.current.promptInstall).toBe('function')
  })

  it('should detect if app is already installed', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.isInstalled).toBe(true)
  })

  it('should capture beforeinstallprompt event', () => {
    const { result } = renderHook(() => useInstallPrompt())

    const mockPrompt = vi.fn()
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })

    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt: mockPrompt,
      userChoice: mockUserChoice
    })

    act(() => {
      const listeners = eventListeners.get('beforeinstallprompt')
      listeners?.forEach(listener => listener(event))
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('should successfully prompt for install when user accepts', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    const mockPrompt = vi.fn()
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })

    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt: mockPrompt,
      userChoice: mockUserChoice
    })

    act(() => {
      const listeners = eventListeners.get('beforeinstallprompt')
      listeners?.forEach(listener => listener(event))
    })

    expect(result.current.canInstall).toBe(true)

    let installResult: boolean | undefined
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(mockPrompt).toHaveBeenCalled()
    expect(installResult).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('should return false when user dismisses install prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    const mockPrompt = vi.fn()
    const mockUserChoice = Promise.resolve({ outcome: 'dismissed' as const })

    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt: mockPrompt,
      userChoice: mockUserChoice
    })

    act(() => {
      const listeners = eventListeners.get('beforeinstallprompt')
      listeners?.forEach(listener => listener(event))
    })

    let installResult: boolean | undefined
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(installResult).toBe(false)
  })

  it('should return false when promptInstall is called without prompt event', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    let installResult: boolean | undefined
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(installResult).toBe(false)
  })

  it('should handle appinstalled event', () => {
    const { result } = renderHook(() => useInstallPrompt())

    // First set up install prompt
    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const })
    })

    act(() => {
      const listeners = eventListeners.get('beforeinstallprompt')
      listeners?.forEach(listener => listener(event))
    })

    expect(result.current.canInstall).toBe(true)

    // Trigger appinstalled
    act(() => {
      const installedEvent = new Event('appinstalled')
      const listeners = eventListeners.get('appinstalled')
      listeners?.forEach(listener => listener(installedEvent))
    })

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('should handle prompt errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useInstallPrompt())

    const mockPrompt = vi.fn().mockRejectedValue(new Error('Prompt failed'))

    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const })
    })

    act(() => {
      const listeners = eventListeners.get('beforeinstallprompt')
      listeners?.forEach(listener => listener(event))
    })

    let installResult: boolean | undefined
    await act(async () => {
      installResult = await result.current.promptInstall()
    })

    expect(installResult).toBe(false)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Install prompt failed:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useInstallPrompt())

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(window.removeEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })
})
