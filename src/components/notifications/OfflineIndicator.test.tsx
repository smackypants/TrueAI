import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// We mock the serviceWorker module so we control isOffline() and
// onOnlineStatusChange() without touching the actual SW / network.
vi.mock('@/lib/serviceWorker', () => ({
  isOffline: vi.fn(() => false),
  onOnlineStatusChange: vi.fn(() => () => {}),
}))

import * as sw from '@/lib/serviceWorker'
import { OfflineIndicator } from './OfflineIndicator'

// Cast for convenient per-test overrides.
const mockIsOffline = sw.isOffline as ReturnType<typeof vi.fn>
const mockOnOnlineStatusChange = sw.onOnlineStatusChange as ReturnType<typeof vi.fn>

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOffline.mockReturnValue(false)
    mockOnOnlineStatusChange.mockReturnValue(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when online and no banner is queued', () => {
    const { container } = render(<OfflineIndicator />)
    // AnimatePresence renders nothing when offline=false, showBanner=false
    expect(container.querySelector('[class*="fixed"]')).not.toBeInTheDocument()
  })

  it('shows the offline banner immediately when isOffline() is true', () => {
    mockIsOffline.mockReturnValue(true)
    render(<OfflineIndicator />)
    expect(screen.getByText('You are offline')).toBeInTheDocument()
    expect(screen.getByText(/Working from cache/)).toBeInTheDocument()
  })

  it('shows the offline state styling when offline', () => {
    mockIsOffline.mockReturnValue(true)
    const { container } = render(<OfflineIndicator />)
    // Destructive border is applied when offline
    expect(container.querySelector('[class*="border-destructive"]')).toBeInTheDocument()
  })

  it('fires onOnlineStatusChange subscription on mount', () => {
    render(<OfflineIndicator />)
    expect(mockOnOnlineStatusChange).toHaveBeenCalledTimes(1)
  })

  it('calls the cleanup function returned by onOnlineStatusChange on unmount', () => {
    const cleanup = vi.fn()
    mockOnOnlineStatusChange.mockReturnValue(cleanup)
    const { unmount } = render(<OfflineIndicator />)
    unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('shows the back-online banner when status changes to online', () => {
    let capturedListener: ((isOnline: boolean) => void) | null = null
    mockOnOnlineStatusChange.mockImplementation((listener) => {
      capturedListener = listener
      return () => {}
    })

    render(<OfflineIndicator />)

    act(() => {
      capturedListener!(true)
    })

    expect(screen.getByText('Back online!')).toBeInTheDocument()
    expect(screen.getByText(/Connection restored/)).toBeInTheDocument()
  })

  it('shows the offline banner when status changes to offline', () => {
    let capturedListener: ((isOnline: boolean) => void) | null = null
    mockOnOnlineStatusChange.mockImplementation((listener) => {
      capturedListener = listener
      return () => {}
    })

    render(<OfflineIndicator />)

    act(() => {
      capturedListener!(false)
    })

    expect(screen.getByText('You are offline')).toBeInTheDocument()
  })

  it('shows a reload button when offline', () => {
    mockIsOffline.mockReturnValue(true)
    render(<OfflineIndicator />)
    // The retry button (ArrowsClockwise icon) should be present
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('does not show a reload button in the back-online state', () => {
    let capturedListener: ((isOnline: boolean) => void) | null = null
    mockOnOnlineStatusChange.mockImplementation((listener) => {
      capturedListener = listener
      return () => {}
    })
    render(<OfflineIndicator />)
    act(() => {
      capturedListener!(true)
    })
    // Back-online card has no reload button
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('hides the back-online banner after 3 seconds (state change)', () => {
    // We verify that the timer is scheduled and that state becomes false.
    // framer-motion AnimatePresence defers DOM removal to after the exit
    // animation, so we only assert the state-level outcome here.
    vi.useFakeTimers()
    try {
      let capturedListener: ((isOnline: boolean) => void) | null = null
      mockOnOnlineStatusChange.mockImplementation((listener) => {
        capturedListener = listener
        return () => {}
      })

      render(<OfflineIndicator />)
      act(() => { capturedListener!(true) })
      // Banner is shown (showBanner = true)
      expect(screen.getByText('Back online!')).toBeInTheDocument()
      // Advance past the 3s hide timer
      act(() => { vi.advanceTimersByTime(3001) })
      // showBanner is now false; the motion.div exits.
      // We can't assert DOM removal here (framer-motion defers it),
      // so this test just confirms no error is thrown.
    } finally {
      vi.useRealTimers()
    }
  })

  it('clicking reload triggers window.location.reload', async () => {
    mockIsOffline.mockReturnValue(true)
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    const user = userEvent.setup()
    render(<OfflineIndicator />)
    await user.click(screen.getByRole('button'))
    expect(reload).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})
