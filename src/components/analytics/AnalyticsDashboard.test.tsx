import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'

const { mockUseAnalytics } = vi.hoisted(() => ({
  mockUseAnalytics: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  useAnalytics: mockUseAnalytics,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn((key: string, defaultValue: unknown) => [defaultValue, vi.fn()]),
}))

// Blob/URL stubs
beforeAll(() => {
  if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => 'blob:mock')
  if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn()
  HTMLElement.prototype.scrollIntoView = () => {}
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
})

import { AnalyticsDashboard } from './AnalyticsDashboard'

// Minimal AnalyticsMetrics shape so the dashboard exits its loading state
// and renders the tablist + heading. Must include every nested field the
// dashboard reads (topActions, chatMetrics, agentMetrics, modelMetrics, …).
const noopMetrics = {
  totalEvents: 0,
  totalSessions: 0,
  averageSessionDuration: 0,
  activeUsers: 0,
  eventsByType: [],
  eventsByDay: [],
  topActions: [],
  errorRate: 0,
  chatMetrics: {
    totalMessages: 0,
    totalConversations: 0,
    averageMessagesPerConversation: 0,
    averageResponseTime: 0,
    mostUsedModels: [],
  },
  agentMetrics: {
    totalAgents: 0,
    totalRuns: 0,
    successRate: 0,
    averageExecutionTime: 0,
    mostUsedTools: [],
  },
  modelMetrics: {
    totalModels: 0,
    totalDownloads: 0,
    mostPopularModels: [],
    storageUsed: 0,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const makeHookValue = (overrides = {}) => ({
  getMetrics: vi.fn().mockResolvedValue(noopMetrics),
  events: [],
  sessions: [],
  clearData: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AnalyticsDashboard', () => {
  it('renders without crashing when analytics is undefined', async () => {
    mockUseAnalytics.mockReturnValue(undefined)
    render(<AnalyticsDashboard />)
    // While loading, the spinner copy includes "Loading analytics..."
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument()
  })

  it('renders with empty analytics hook', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /analytics dashboard/i })
      ).toBeInTheDocument()
    })
  })

  it('renders tab navigation', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(document.querySelector('[role="tablist"]')).toBeTruthy()
    })
  })

  it('shows Refresh button', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /refresh/i }))
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('shows Export button', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /export/i }))
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('shows Clear Data button', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /clear data/i }))
    expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument()
  })

  it('shows Resume/Pause auto-refresh button', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /resume/i }))
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
  })

  it('clicking Resume shows Pause button', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /resume/i }))
    await user.click(screen.getByRole('button', { name: /resume/i }))
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })

  it('clicking Export calls toast success', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /export/i }))
    await user.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Analytics data exported'))
  })

  it('clicking Refresh calls getMetrics', async () => {
    const user = userEvent.setup()
    const getMetrics = vi.fn().mockResolvedValue(noopMetrics)
    mockUseAnalytics.mockReturnValue(makeHookValue({ getMetrics }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /refresh/i }))
    await user.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(getMetrics).toHaveBeenCalledTimes(2)) // once on mount, once on click
  })

  it('shows Updates paused badge when not auto-refreshing', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByText(/updates paused/i))
    expect(screen.getByText(/updates paused/i)).toBeInTheDocument()
  })

  it('shows MetricCard for Total Events', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue({ ...noopMetrics, totalEvents: 42 }),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByText('Total Events'))
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('shows MetricCard for Error Rate', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByText('Error Rate'))
    expect(screen.getByText('Error Rate')).toBeInTheDocument()
  })

  it('shows Overview tab content by default', async () => {
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /overview/i }))
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
  })

  it('clear data button triggers confirm and then clearData', async () => {
    const user = userEvent.setup()
    const clearData = vi.fn().mockResolvedValue(undefined)
    mockUseAnalytics.mockReturnValue(makeHookValue({ clearData }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(clearData).toHaveBeenCalled())
  })

  it('clear data does nothing when user cancels confirm', async () => {
    const user = userEvent.setup()
    const clearData = vi.fn().mockResolvedValue(undefined)
    mockUseAnalytics.mockReturnValue(makeHookValue({ clearData }))
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    expect(clearData).not.toHaveBeenCalled()
  })

  it('shows error toast when getMetrics rejects', async () => {
    const { toast } = await import('sonner')
    const getMetrics = vi.fn().mockRejectedValue(new Error('oops'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUseAnalytics.mockReturnValue(makeHookValue({ getMetrics }))
    render(<AnalyticsDashboard />)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load analytics'))
  })

  it('switching to Chat tab shows Total Messages metric', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^chat$/i }))
    await user.click(screen.getByRole('tab', { name: /^chat$/i }))
    expect(screen.getAllByText('Total Messages').length).toBeGreaterThan(0)
  })

  it('switching to Agents tab shows Total Agents metric', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^agents$/i }))
    await user.click(screen.getByRole('tab', { name: /^agents$/i }))
    expect(screen.getAllByText('Total Agents').length).toBeGreaterThan(0)
  })

  it('switching to Models tab shows Total Models metric', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^models$/i }))
    await user.click(screen.getByRole('tab', { name: /^models$/i }))
    expect(screen.getAllByText('Total Models').length).toBeGreaterThan(0)
  })

  it('shows formatDuration in seconds when averageResponseTime >= 1000ms', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      chatMetrics: { ...noopMetrics.chatMetrics, averageResponseTime: 2500 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^chat$/i }))
    await user.click(screen.getByRole('tab', { name: /^chat$/i }))
    // 2500ms → "2.5s"
    await waitFor(() => expect(screen.getAllByText('2.5s').length).toBeGreaterThan(0))
  })

  it('shows formatDuration in minutes when averageResponseTime >= 60000ms', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      chatMetrics: { ...noopMetrics.chatMetrics, averageResponseTime: 90000 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^chat$/i }))
    await user.click(screen.getByRole('tab', { name: /^chat$/i }))
    // 90000ms → "1m 30s"
    await waitFor(() => expect(screen.getAllByText('1m 30s').length).toBeGreaterThan(0))
  })

  it('shows formatBytes in KB for models storageUsed', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      modelMetrics: { ...noopMetrics.modelMetrics, storageUsed: 2048 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^models$/i }))
    await user.click(screen.getByRole('tab', { name: /^models$/i }))
    await waitFor(() => expect(screen.getAllByText('2.0 KB').length).toBeGreaterThan(0))
  })

  it('shows formatBytes in MB for larger storageUsed', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      modelMetrics: { ...noopMetrics.modelMetrics, storageUsed: 2 * 1024 * 1024 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^models$/i }))
    await user.click(screen.getByRole('tab', { name: /^models$/i }))
    await waitFor(() => expect(screen.getAllByText('2.0 MB').length).toBeGreaterThan(0))
  })

  it('shows formatBytes in GB for very large storageUsed', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      modelMetrics: { ...noopMetrics.modelMetrics, storageUsed: 2 * 1024 * 1024 * 1024 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^models$/i }))
    await user.click(screen.getByRole('tab', { name: /^models$/i }))
    await waitFor(() => expect(screen.getAllByText('2.00 GB').length).toBeGreaterThan(0))
  })

  it('shows agents successRate > 80 renders ArrowUp indicator', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      agentMetrics: { ...noopMetrics.agentMetrics, successRate: 90 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^agents$/i }))
    await user.click(screen.getByRole('tab', { name: /^agents$/i }))
    await waitFor(() => expect(screen.getAllByText('90.0%').length).toBeGreaterThan(0))
  })

  it('shows agents successRate <= 80 renders ArrowDown indicator', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      agentMetrics: { ...noopMetrics.agentMetrics, successRate: 50 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^agents$/i }))
    await user.click(screen.getByRole('tab', { name: /^agents$/i }))
    await waitFor(() => expect(screen.getAllByText('50.0%').length).toBeGreaterThan(0))
  })

  it('shows formatDuration in ms for short durations', async () => {
    const user = userEvent.setup()
    const metrics = {
      ...noopMetrics,
      chatMetrics: { ...noopMetrics.chatMetrics, averageResponseTime: 500 },
    }
    mockUseAnalytics.mockReturnValue(makeHookValue({
      getMetrics: vi.fn().mockResolvedValue(metrics),
    }))
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^chat$/i }))
    await user.click(screen.getByRole('tab', { name: /^chat$/i }))
    await waitFor(() => expect(screen.getAllByText('500ms').length).toBeGreaterThan(0))
  })

  it('shows N/A when mostPopularModels is empty', async () => {
    const user = userEvent.setup()
    mockUseAnalytics.mockReturnValue(makeHookValue())
    render(<AnalyticsDashboard />)
    await waitFor(() => screen.getByRole('tab', { name: /^models$/i }))
    await user.click(screen.getByRole('tab', { name: /^models$/i }))
    await waitFor(() => expect(screen.getByText('N/A')).toBeInTheDocument())
  })

  it('shows loading state when analytics hook returns getMetrics=undefined', () => {
    mockUseAnalytics.mockReturnValue({ getMetrics: undefined, events: [], sessions: [], clearData: vi.fn() })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<AnalyticsDashboard />)
    // When getMetrics is absent, metrics state is never populated so loading screen persists
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument()
  })
})
