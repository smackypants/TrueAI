import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const { mockUseAnalytics } = vi.hoisted(() => ({
  mockUseAnalytics: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  useAnalytics: mockUseAnalytics,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

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

describe('AnalyticsDashboard', () => {
  it('renders without crashing when analytics is undefined', async () => {
    mockUseAnalytics.mockReturnValue(undefined)
    render(<AnalyticsDashboard />)
    // While loading, the spinner copy includes "Loading analytics..."
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument()
  })

  it('renders with empty analytics hook', async () => {
    mockUseAnalytics.mockReturnValue({
      getMetrics: vi.fn().mockResolvedValue(noopMetrics),
      events: [],
      sessions: [],
      clearData: vi.fn(),
    })
    render(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /analytics dashboard/i })
      ).toBeInTheDocument()
    })
  })

  it('renders tab navigation', async () => {
    mockUseAnalytics.mockReturnValue({
      getMetrics: vi.fn().mockResolvedValue(noopMetrics),
      events: [],
      sessions: [],
      clearData: vi.fn(),
    })
    render(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(document.querySelector('[role="tablist"]')).toBeTruthy()
    })
  })
})
