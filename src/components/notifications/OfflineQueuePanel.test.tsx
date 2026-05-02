import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUseOfflineQueue } = vi.hoisted(() => ({
  mockUseOfflineQueue: vi.fn(),
}))

vi.mock('@/hooks/use-offline-queue', () => ({
  useOfflineQueue: mockUseOfflineQueue,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { OfflineQueuePanel } from './OfflineQueuePanel'
import { toast } from 'sonner'

const defaultQueue = [
  {
    id: 'q1',
    action: 'create',
    type: 'conversation',
    status: 'pending',
    timestamp: Date.now(),
    retryCount: 0,
  },
  {
    id: 'q2',
    action: 'update',
    type: 'message',
    status: 'completed',
    timestamp: Date.now(),
    retryCount: 0,
  },
]

const makeHook = (overrides = {}) => ({
  queue: [],
  pendingCount: 0,
  failedCount: 0,
  isOnline: true,
  isSyncing: false,
  sync: vi.fn().mockResolvedValue({ success: true, syncedCount: 2, failedCount: 0 }),
  retryFailed: vi.fn().mockResolvedValue({ success: true, syncedCount: 1, failedCount: 0 }),
  clearCompleted: vi.fn().mockResolvedValue(undefined),
  clearFailed: vi.fn().mockResolvedValue(undefined),
  clearAll: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('OfflineQueuePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOfflineQueue.mockReturnValue(makeHook())
  })

  it('renders heading', () => {
    render(<OfflineQueuePanel />)
    expect(screen.getByText('Offline Queue')).toBeInTheDocument()
  })

  it('shows "Connected" message when online', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ isOnline: true }))
    render(<OfflineQueuePanel />)
    expect(screen.getByText(/connected/i)).toBeInTheDocument()
  })

  it('shows "Offline" badge when offline', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ isOnline: false }))
    render(<OfflineQueuePanel />)
    expect(screen.getByText(/offline - actions queued/i)).toBeInTheDocument()
  })

  it('renders pending and failed counters', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ pendingCount: 3, failedCount: 1, queue: defaultQueue }))
    render(<OfflineQueuePanel />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows empty queue message when no items', () => {
    render(<OfflineQueuePanel />)
    expect(screen.getByText('No actions in queue')).toBeInTheDocument()
  })

  it('calls sync and shows success toast', async () => {
    const syncMock = vi.fn().mockResolvedValue({ success: true, syncedCount: 5, failedCount: 0 })
    mockUseOfflineQueue.mockReturnValue(makeHook({ isOnline: true, pendingCount: 5, sync: syncMock }))
    render(<OfflineQueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
    await waitFor(() => expect(syncMock).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Synced 5 actions successfully')
    )
  })

  it('shows error toast when sync fails', async () => {
    const syncMock = vi.fn().mockResolvedValue({ success: false, syncedCount: 0, failedCount: 3 })
    const hook = makeHook({ isOnline: true, pendingCount: 3 })
    hook.sync = syncMock
    mockUseOfflineQueue.mockReturnValue(hook)
    render(<OfflineQueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Sync completed with 3 failures')
    )
  })

  it('shows Retry Failed button only when failedCount > 0', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ failedCount: 2 }))
    render(<OfflineQueuePanel />)
    expect(screen.getByRole('button', { name: /retry failed/i })).toBeInTheDocument()
  })

  it('does not show Retry Failed button when failedCount is 0', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ failedCount: 0 }))
    render(<OfflineQueuePanel />)
    expect(screen.queryByRole('button', { name: /retry failed/i })).not.toBeInTheDocument()
  })

  it('calls retryFailed and shows success toast', async () => {
    const retryMock = vi.fn().mockResolvedValue({ success: true, syncedCount: 2, failedCount: 0 })
    const hook = makeHook({ isOnline: true, failedCount: 2 })
    hook.retryFailed = retryMock
    mockUseOfflineQueue.mockReturnValue(hook)
    render(<OfflineQueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: /retry failed/i }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Retried and synced 2 actions')
    )
  })

  it('shows Clear All button when queue has items', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ queue: defaultQueue }))
    render(<OfflineQueuePanel />)
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })

  it('calls clearAll and shows success toast', async () => {
    const clearAllMock = vi.fn().mockResolvedValue(undefined)
    const hook = makeHook({ queue: defaultQueue })
    hook.clearAll = clearAllMock
    mockUseOfflineQueue.mockReturnValue(hook)
    render(<OfflineQueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    await waitFor(() => expect(clearAllMock).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Cleared all actions')
    )
  })

  it('renders queue items with action and type', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ queue: defaultQueue }))
    render(<OfflineQueuePanel />)
    // "create conversation" and "update message" should appear
    expect(screen.getByText(/create conversation/i)).toBeInTheDocument()
    expect(screen.getByText(/update message/i)).toBeInTheDocument()
  })

  it('disables Sync Now button when offline', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ isOnline: false, pendingCount: 2 }))
    render(<OfflineQueuePanel />)
    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled()
  })

  it('disables Sync Now button when pendingCount is 0', () => {
    mockUseOfflineQueue.mockReturnValue(makeHook({ isOnline: true, pendingCount: 0 }))
    render(<OfflineQueuePanel />)
    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled()
  })

  // Phase 6 — branch coverage additions

  it('shows error toast when retryFailed fails', async () => {
    const retryMock = vi.fn().mockResolvedValue({ success: false, syncedCount: 0, failedCount: 4 })
    const hook = makeHook({ isOnline: true, failedCount: 4 })
    hook.retryFailed = retryMock
    mockUseOfflineQueue.mockReturnValue(hook)
    render(<OfflineQueuePanel />)
    fireEvent.click(screen.getByRole('button', { name: /retry failed/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Retry failed for 4 actions')
    )
  })

  it('renders failed and syncing status badges for queue items', () => {
    const queue = [
      {
        id: 'qf',
        action: 'create',
        type: 'message',
        status: 'failed',
        timestamp: Date.now(),
        retryCount: 2,
        error: 'Network timeout',
      },
      {
        id: 'qs',
        action: 'update',
        type: 'conversation',
        status: 'syncing',
        timestamp: Date.now(),
        retryCount: 0,
      },
    ]
    mockUseOfflineQueue.mockReturnValue(makeHook({ queue, failedCount: 1 }))
    render(<OfflineQueuePanel />)
    // Status badges are rendered via getStatusBadge with capitalize class.
    // "failed" also appears as the "Failed" counter card label, so use getAllByText.
    const failedHits = screen.getAllByText(/^failed$/i)
    expect(failedHits.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/^syncing$/i)).toBeInTheDocument()
    // retryCount and error rendering paths
    expect(screen.getByText(/Retry attempt:\s*2\/3/)).toBeInTheDocument()
    expect(screen.getByText(/Error:\s*Network timeout/)).toBeInTheDocument()
  })

  it('falls back to outline badge variant for unknown status values', () => {
    const queue = [
      {
        id: 'qu',
        action: 'noop',
        type: 'unknown-type',
        status: 'mystery',
        timestamp: Date.now(),
        retryCount: 0,
      },
    ]
    mockUseOfflineQueue.mockReturnValue(makeHook({ queue }))
    render(<OfflineQueuePanel />)
    // The status text still renders inside the badge, exercising the
    // `variants[status] || 'outline'` fallback branch in getStatusBadge.
    expect(screen.getByText(/^mystery$/i)).toBeInTheDocument()
  })
})
