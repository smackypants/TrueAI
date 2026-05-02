import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetCacheSize, mockClearCache } = vi.hoisted(() => ({
  mockGetCacheSize: vi.fn(),
  mockClearCache: vi.fn(),
}))

vi.mock('@/lib/serviceWorker', () => ({
  getCacheSize: mockGetCacheSize,
  clearCache: mockClearCache,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { CacheManager } from './CacheManager'
import { toast } from 'sonner'

describe('CacheManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCacheSize.mockResolvedValue(0)
    mockClearCache.mockResolvedValue(undefined)
  })

  it('renders heading and description', async () => {
    // getCacheSize fires async in useEffect on mount; wrap so the resulting
    // state updates (setCacheSize) are captured inside act.
    await act(async () => {
      render(<CacheManager />)
    })
    expect(screen.getByText('Cache Storage')).toBeInTheDocument()
    expect(screen.getByText(/manage offline data/i)).toBeInTheDocument()
  })

  it('loads cache size on mount', async () => {
    mockGetCacheSize.mockResolvedValue(1024)
    render(<CacheManager />)
    await waitFor(() => expect(mockGetCacheSize).toHaveBeenCalledOnce())
  })

  it('displays formatted cache size', async () => {
    mockGetCacheSize.mockResolvedValue(1024)
    render(<CacheManager />)
    await waitFor(() => expect(screen.getByText('1 KB')).toBeInTheDocument())
  })

  it('shows 0 Bytes when cache is empty', async () => {
    mockGetCacheSize.mockResolvedValue(0)
    render(<CacheManager />)
    await waitFor(() => expect(screen.getByText('0 Bytes')).toBeInTheDocument())
  })

  it('disables Clear Cache button when cache is empty', async () => {
    mockGetCacheSize.mockResolvedValue(0)
    render(<CacheManager />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /clear cache/i })
      expect(btn).toBeDisabled()
    })
  })

  it('enables Clear Cache button when cache has data', async () => {
    mockGetCacheSize.mockResolvedValue(1024 * 1024)
    render(<CacheManager />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /clear cache/i })
      expect(btn).not.toBeDisabled()
    })
  })

  it('calls clearCache and shows success toast on clear', async () => {
    mockGetCacheSize.mockResolvedValue(1024 * 1024)
    mockClearCache.mockResolvedValue(undefined)
    render(<CacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /clear cache/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /clear cache/i }))
    await waitFor(() => expect(mockClearCache).toHaveBeenCalledOnce())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Cache cleared successfully'))
  })

  it('shows error toast when clearCache fails', async () => {
    mockGetCacheSize.mockResolvedValue(1024 * 1024)
    mockClearCache.mockRejectedValue(new Error('fail'))
    render(<CacheManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: /clear cache/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /clear cache/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to clear cache'))
  })

  it('calls getCacheSize again when Refresh is clicked', async () => {
    mockGetCacheSize.mockResolvedValue(0)
    render(<CacheManager />)
    await waitFor(() => expect(mockGetCacheSize).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(mockGetCacheSize).toHaveBeenCalledTimes(2))
  })

  it('shows "No cached data" message when size is 0', async () => {
    mockGetCacheSize.mockResolvedValue(0)
    render(<CacheManager />)
    await waitFor(() =>
      expect(screen.getByText(/no cached data/i)).toBeInTheDocument()
    )
  })

  it('renders static assets, app data, images, fonts content list', async () => {
    render(<CacheManager />)
    await waitFor(() => expect(screen.getByText('Static assets')).toBeInTheDocument())
    expect(screen.getByText('App data')).toBeInTheDocument()
    expect(screen.getByText('Images')).toBeInTheDocument()
    expect(screen.getByText('Fonts')).toBeInTheDocument()
  })
})
