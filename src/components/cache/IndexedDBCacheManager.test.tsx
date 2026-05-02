import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockUseIndexedDBCache } = vi.hoisted(() => ({
  mockUseIndexedDBCache: vi.fn(),
}))

vi.mock('@/hooks/use-indexeddb-cache', () => ({
  useIndexedDBCache: mockUseIndexedDBCache,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { IndexedDBCacheManager } from './IndexedDBCacheManager'
import { toast } from 'sonner'

const makeHook = (overrides = {}) => ({
  isInitialized: true,
  isSyncing: false,
  lastSyncTime: null,
  syncToCache: vi.fn().mockResolvedValue(undefined),
  getCacheStats: vi.fn().mockResolvedValue({
    conversations: 5,
    messages: 42,
    totalSize: 1024 * 512,
    lastCleanup: undefined,
  }),
  cleanupCache: vi.fn().mockResolvedValue(undefined),
  clearCache: vi.fn().mockResolvedValue(undefined),
  exportCache: vi.fn().mockResolvedValue(undefined),
  importCache: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('IndexedDBCacheManager', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    confirmSpy.mockRestore()
  })

  it('renders heading', async () => {
    mockUseIndexedDBCache.mockReturnValue(makeHook())
    // Component fires a getCacheStats() useEffect on mount; wrap in act so
    // the async state updates (setIsLoading, setStats) settle before assert.
    await act(async () => {
      render(<IndexedDBCacheManager />)
    })
    expect(screen.getByText('IndexedDB Cache')).toBeInTheDocument()
  })

  it('shows "Active" status when initialized', async () => {
    mockUseIndexedDBCache.mockReturnValue(makeHook({ isInitialized: true }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument())
  })

  it('shows "Initializing..." when not initialized', () => {
    mockUseIndexedDBCache.mockReturnValue(
      makeHook({ isInitialized: false, getCacheStats: vi.fn() })
    )
    render(<IndexedDBCacheManager />)
    expect(screen.getByText('Initializing...')).toBeInTheDocument()
  })

  it('loads stats on mount when initialized', async () => {
    const getCacheStats = vi.fn().mockResolvedValue({
      conversations: 3,
      messages: 10,
      totalSize: 0,
      lastCleanup: undefined,
    })
    mockUseIndexedDBCache.mockReturnValue(makeHook({ getCacheStats }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(getCacheStats).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument())
  })

  it('calls syncToCache on Sync Now click and shows success toast', async () => {
    const syncToCache = vi.fn().mockResolvedValue(undefined)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ syncToCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sync now/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
    await waitFor(() => expect(syncToCache).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Cache synced successfully')
    )
  })

  it('shows error toast when sync fails', async () => {
    const syncToCache = vi.fn().mockRejectedValue(new Error('fail'))
    mockUseIndexedDBCache.mockReturnValue(makeHook({ syncToCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sync now/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to sync cache')
    )
  })

  it('calls cleanupCache on Cleanup click and shows success toast', async () => {
    const cleanupCache = vi.fn().mockResolvedValue(undefined)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ cleanupCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /cleanup/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /cleanup/i }))
    await waitFor(() => expect(cleanupCache).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Cache cleaned up successfully')
    )
  })

  it('calls clearCache on Clear All click after confirm', async () => {
    const clearCache = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ clearCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /clear all/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    await waitFor(() => expect(clearCache).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Cache cleared successfully')
    )
  })

  it('does not call clearCache if user cancels confirm', async () => {
    const clearCache = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ clearCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /clear all/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(clearCache).not.toHaveBeenCalled()
  })

  it('calls exportCache on Export click and shows success toast', async () => {
    const exportCache = vi.fn().mockResolvedValue(undefined)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ exportCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() => expect(exportCache).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Cache exported successfully')
    )
  })

  it('shows "Syncing..." badge when isSyncing is true', async () => {
    mockUseIndexedDBCache.mockReturnValue(makeHook({ isSyncing: true }))
    // getCacheStats fires async on mount; wrap so state updates are in act.
    await act(async () => {
      render(<IndexedDBCacheManager />)
    })
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('shows "Ready" badge when not syncing and not justSynced', async () => {
    mockUseIndexedDBCache.mockReturnValue(makeHook({ isSyncing: false }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByText('Ready')).toBeInTheDocument())
  })

  it('displays last sync time when provided', async () => {
    const lastSyncTime = Date.now()
    mockUseIndexedDBCache.mockReturnValue(makeHook({ lastSyncTime }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => {
      // The time string from toLocaleTimeString will appear in the "Last Sync" row
      expect(screen.queryByText('Never')).not.toBeInTheDocument()
    })
  })

  it('shows "Never" for last sync when lastSyncTime is null', async () => {
    mockUseIndexedDBCache.mockReturnValue(makeHook({ lastSyncTime: null }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByText('Never')).toBeInTheDocument())
  })

  it('shows "Synced" badge briefly after sync', async () => {
    const syncToCache = vi.fn().mockResolvedValue(undefined)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ syncToCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sync now/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }))
    await waitFor(() => expect(syncToCache).toHaveBeenCalledOnce())
    // After sync the "Synced" badge should appear briefly
    await waitFor(() => expect(screen.getByText('Synced')).toBeInTheDocument(), { timeout: 3000 })
  })

  // Phase 6 — branch coverage additions

  it('renders "Last cleanup:" line when lastCleanup timestamp is provided', async () => {
    const lastCleanup = new Date('2024-06-15T12:00:00Z').getTime()
    const getCacheStats = vi.fn().mockResolvedValue({
      conversations: 1,
      messages: 1,
      totalSize: 100,
      lastCleanup,
    })
    mockUseIndexedDBCache.mockReturnValue(makeHook({ getCacheStats }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByText(/Last cleanup:/i)).toBeInTheDocument())
  })

  it('shows error toast when cleanup fails', async () => {
    const cleanupCache = vi.fn().mockRejectedValue(new Error('boom'))
    mockUseIndexedDBCache.mockReturnValue(makeHook({ cleanupCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /cleanup/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /cleanup/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to cleanup cache')
    )
  })

  it('shows error toast when clearCache fails', async () => {
    const clearCache = vi.fn().mockRejectedValue(new Error('boom'))
    mockUseIndexedDBCache.mockReturnValue(makeHook({ clearCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /clear all/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to clear cache')
    )
  })

  it('shows error toast when exportCache fails', async () => {
    const exportCache = vi.fn().mockRejectedValue(new Error('boom'))
    mockUseIndexedDBCache.mockReturnValue(makeHook({ exportCache }))
    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /export/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to export cache')
    )
  })

  it('logs error and clears loading flag when getCacheStats rejects on mount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const getCacheStats = vi.fn().mockRejectedValue(new Error('idb fail'))
    mockUseIndexedDBCache.mockReturnValue(makeHook({ getCacheStats }))
    await act(async () => {
      render(<IndexedDBCacheManager />)
    })
    await waitFor(() => expect(getCacheStats).toHaveBeenCalled())
    expect(errorSpy).toHaveBeenCalledWith('Failed to load cache stats:', expect.any(Error))
    // After error the buttons should be re-enabled (isLoading=false)
    expect(screen.getByRole('button', { name: /sync now/i })).not.toBeDisabled()
    errorSpy.mockRestore()
  })

  it('imports cache from a selected file and shows success toast', async () => {
    const importCache = vi.fn().mockResolvedValue(undefined)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ importCache }))

    // Capture the dynamically created <input type="file">
    let fileInput: HTMLInputElement | null = null
    const realCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement
      if (tag === 'input') {
        fileInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el as HTMLElement & HTMLInputElement
    })

    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /import/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    expect(fileInput).not.toBeNull()
    const file = new File(['{}'], 'cache.json', { type: 'application/json' })
    // Drive onchange directly — change events on detached inputs don't fire handlers
    await act(async () => {
      await (fileInput!.onchange as (e: unknown) => Promise<void>)({
        target: { files: [file] },
      })
    })

    expect(importCache).toHaveBeenCalledWith(file)
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Cache imported successfully')
    )
    createSpy.mockRestore()
  })

  it('shows error toast when import fails', async () => {
    const importCache = vi.fn().mockRejectedValue(new Error('boom'))
    mockUseIndexedDBCache.mockReturnValue(makeHook({ importCache }))

    let fileInput: HTMLInputElement | null = null
    const realCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement
      if (tag === 'input') {
        fileInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el as HTMLElement & HTMLInputElement
    })

    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /import/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    const file = new File(['{}'], 'cache.json', { type: 'application/json' })
    await act(async () => {
      await (fileInput!.onchange as (e: unknown) => Promise<void>)({
        target: { files: [file] },
      })
    })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to import cache')
    )
    createSpy.mockRestore()
  })

  it('does nothing when import is invoked with no file selected', async () => {
    const importCache = vi.fn().mockResolvedValue(undefined)
    mockUseIndexedDBCache.mockReturnValue(makeHook({ importCache }))

    let fileInput: HTMLInputElement | null = null
    const realCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement
      if (tag === 'input') {
        fileInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el as HTMLElement & HTMLInputElement
    })

    render(<IndexedDBCacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /import/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /import/i }))

    await act(async () => {
      await (fileInput!.onchange as (e: unknown) => Promise<void>)({
        target: { files: [] },
      })
    })

    expect(importCache).not.toHaveBeenCalled()
    createSpy.mockRestore()
  })
})
