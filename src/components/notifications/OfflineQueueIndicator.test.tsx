import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/use-offline-queue', () => ({
  useOfflineQueue: vi.fn(),
}))

import * as useOfflineQueueModule from '@/hooks/use-offline-queue'
import { OfflineQueueIndicator } from './OfflineQueueIndicator'

const mockUseOfflineQueue = useOfflineQueueModule.useOfflineQueue as ReturnType<typeof vi.fn>

function makeQueue(overrides: Partial<ReturnType<typeof useOfflineQueueModule.useOfflineQueue>> = {}) {
  return {
    queue: [],
    pendingCount: 0,
    failedCount: 0,
    isOnline: true,
    isSyncing: false,
    sync: vi.fn().mockResolvedValue({ synced: 0, failed: 0 }),
    enqueue: vi.fn(),
    retryFailed: vi.fn(),
    clearCompleted: vi.fn(),
    clearFailed: vi.fn(),
    clearAll: vi.fn(),
    ...overrides,
  }
}

describe('OfflineQueueIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when online with no pending/failed items', () => {
    mockUseOfflineQueue.mockReturnValue(makeQueue({ isOnline: true, pendingCount: 0, failedCount: 0 }))
    const { container } = render(<OfflineQueueIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the indicator when offline', () => {
    mockUseOfflineQueue.mockReturnValue(makeQueue({ isOnline: false, pendingCount: 0, failedCount: 0 }))
    render(<OfflineQueueIndicator />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders when there are pending items', () => {
    mockUseOfflineQueue.mockReturnValue(makeQueue({ isOnline: true, pendingCount: 3, failedCount: 0 }))
    render(<OfflineQueueIndicator />)
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders when there are failed items', () => {
    mockUseOfflineQueue.mockReturnValue(makeQueue({ isOnline: true, pendingCount: 0, failedCount: 2 }))
    render(<OfflineQueueIndicator />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows total count (pending + failed)', () => {
    mockUseOfflineQueue.mockReturnValue(makeQueue({ isOnline: true, pendingCount: 3, failedCount: 2 }))
    render(<OfflineQueueIndicator />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('uses destructive variant when there are failed items', () => {
    mockUseOfflineQueue.mockReturnValue(makeQueue({ isOnline: true, pendingCount: 0, failedCount: 1 }))
    const { container } = render(<OfflineQueueIndicator />)
    // The button itself uses destructive variant when failedCount > 0
    const button = container.querySelector('[class*="destructive"]')
    expect(button).toBeInTheDocument()
  })

  it('is disabled while syncing', () => {
    mockUseOfflineQueue.mockReturnValue(
      makeQueue({ isOnline: true, pendingCount: 1, failedCount: 0, isSyncing: true })
    )
    render(<OfflineQueueIndicator />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when offline', () => {
    mockUseOfflineQueue.mockReturnValue(
      makeQueue({ isOnline: false, pendingCount: 1, failedCount: 0, isSyncing: false })
    )
    render(<OfflineQueueIndicator />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls sync when the button is clicked', async () => {
    const sync = vi.fn().mockResolvedValue({ synced: 1, failed: 0 })
    mockUseOfflineQueue.mockReturnValue(
      makeQueue({ isOnline: true, pendingCount: 2, failedCount: 0, isSyncing: false, sync })
    )
    const user = userEvent.setup()
    render(<OfflineQueueIndicator />)
    await user.click(screen.getByRole('button'))
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('does not render a badge when totalCount is 0 but offline', () => {
    mockUseOfflineQueue.mockReturnValue(
      makeQueue({ isOnline: false, pendingCount: 0, failedCount: 0 })
    )
    render(<OfflineQueueIndicator />)
    // Button present but no badge number
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
