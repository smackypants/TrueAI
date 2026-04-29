/**
 * Smoke tests for `src/App-Enhanced.tsx`.
 *
 * `App-Enhanced` is an alternate, more "enterprise" entrypoint that is
 * compiled (it's listed in `tsconfig.json`) but not currently mounted
 * anywhere — `index.html` boots `src/main.tsx` which imports `src/App.tsx`.
 * We keep a smoke test so that any future regression that breaks the
 * component's render path (e.g. type drift in `@/lib/types`) is caught
 * before the file is wired back up.
 *
 * The test mocks every heavy lazy-loaded dependency for speed and to avoid
 * pulling in real Capacitor / charting code paths in jsdom.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock heavy children so the smoke test renders synchronously.
vi.mock('@/components/chat/MessageBubble', () => ({
  MessageBubble: () => null,
}))
vi.mock('@/components/chat/ChatInput', () => ({
  ChatInput: () => null,
}))
vi.mock('@/components/agent/AgentCard', () => ({
  AgentCard: () => null,
}))
vi.mock('@/components/agent/AgentStepView', () => ({
  AgentStepView: () => null,
}))
vi.mock('@/components/models/ModelConfigPanel', () => ({
  ModelConfigPanel: () => null,
}))
vi.mock('@/components/models/HuggingFaceModelBrowser', () => ({
  HuggingFaceModelBrowser: () => null,
}))
vi.mock('@/components/harness/HarnessUploadUI', () => ({
  HarnessUploadUI: () => null,
}))
vi.mock('@/components/notifications/NotificationCenter', () => ({
  NotificationCenter: () => null,
}))
vi.mock('@/components/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import App from './App-Enhanced'

describe('App-Enhanced (smoke)', () => {
  it('renders the header with the product name and tagline', () => {
    render(<App />)
    expect(screen.getByText('TrueAI LocalAI')).toBeInTheDocument()
    expect(screen.getByText(/Enterprise AI Assistant Platform/)).toBeInTheDocument()
  })

  it('renders all six top-level tab triggers', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /Chat/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Agents/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Models/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Harnesses/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Alerts/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Analytics/ })).toBeInTheDocument()
  })

  it('shows the empty-state copy when there are no conversations', () => {
    render(<App />)
    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
  })
})
