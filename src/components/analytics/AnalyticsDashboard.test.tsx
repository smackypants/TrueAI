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
})
