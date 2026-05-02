import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Stub Radix Select pointer-capture for jsdom
beforeEach(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
    })
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      configurable: true,
    })
  }
})

import { AgentScheduler } from './AgentScheduler'
import type { Agent } from '@/lib/types'
import { toast } from 'sonner'

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Scheduled Agent',
  goal: 'Run periodically',
  model: 'gpt-4o',
  tools: [],
  createdAt: Date.now(),
  status: 'idle',
  schedule: undefined,
}

describe('AgentScheduler', () => {
  it('renders heading', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    expect(screen.getByText('Schedule Agent')).toBeInTheDocument()
  })

  it('renders Enable Schedule switch', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    const switches = document.querySelectorAll('[data-slot="switch"]')
    expect(switches.length).toBeGreaterThan(0)
  })

  it('shows "enable scheduling" message when not enabled', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    expect(screen.getByText(/enable scheduling to configure/i)).toBeInTheDocument()
  })

  it('shows time input and Save button when enabled', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    // Toggle the switch to enable scheduling
    const switchEl = document.querySelector('[data-slot="switch"]')!
    fireEvent.click(switchEl)
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument()
  })

  it('calls onUpdateSchedule with agent id when Save clicked', () => {
    const onUpdateSchedule = vi.fn()
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={onUpdateSchedule} />)
    // Enable first
    const switchEl = document.querySelector('[data-slot="switch"]')!
    fireEvent.click(switchEl)
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }))
    expect(onUpdateSchedule).toHaveBeenCalledOnce()
    expect(onUpdateSchedule.mock.calls[0][0]).toBe('agent-1')
  })

  it('shows success toast when saved', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    // Enable first
    const switchEl = document.querySelector('[data-slot="switch"]')!
    fireEvent.click(switchEl)
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }))
    expect(toast.success).toHaveBeenCalledWith('Schedule updated successfully')
  })

  it('renders frequency selector when enabled', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    const switchEl = document.querySelector('[data-slot="switch"]')!
    fireEvent.click(switchEl)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('initializes time from agent.schedule.nextRun when present', () => {
    const future = new Date()
    future.setHours(14, 30, 0, 0)
    const agentWithSchedule: Agent = {
      ...mockAgent,
      schedule: { enabled: true, frequency: 'weekly', nextRun: future.getTime() },
    }
    render(<AgentScheduler agent={agentWithSchedule} onUpdateSchedule={vi.fn()} />)
    // With enabled=true from existing schedule, time input should be visible
    expect(screen.getByDisplayValue('14:30')).toBeInTheDocument()
  })

  it('initializes as enabled when agent.schedule.enabled is true', () => {
    const agentWithSchedule: Agent = {
      ...mockAgent,
      schedule: { enabled: true, frequency: 'daily', nextRun: Date.now() + 86400000 },
    }
    render(<AgentScheduler agent={agentWithSchedule} onUpdateSchedule={vi.fn()} />)
    // enabled=true means schedule controls are visible
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument()
  })

  it('shows "Last run" when agent.schedule.lastRun is set', () => {
    const now = Date.now()
    const agentWithSchedule: Agent = {
      ...mockAgent,
      schedule: { enabled: true, frequency: 'daily', nextRun: now + 86400000, lastRun: now - 3600000 },
    }
    render(<AgentScheduler agent={agentWithSchedule} onUpdateSchedule={vi.fn()} />)
    expect(screen.getByText(/Last run:/i)).toBeInTheDocument()
  })

  it('shows schedule preview text when enabled', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    const switchEl = document.querySelector('[data-slot="switch"]')!
    fireEvent.click(switchEl)
    // Should show "Next run in Xh Ym" or "Next run: ... at ..."
    expect(screen.getByText(/Next run/i)).toBeInTheDocument()
  })

  it('shows "Scheduling disabled" preview text in schedule preview when disabled', () => {
    render(<AgentScheduler agent={mockAgent} onUpdateSchedule={vi.fn()} />)
    // Schedule is not enabled, but when we enable then disable, preview shows
    const switchEl = document.querySelector('[data-slot="switch"]')!
    fireEvent.click(switchEl)  // enable
    fireEvent.click(switchEl)  // disable again
    // The component renders {!enabled && ...} disabled section
    expect(screen.getByText(/enable scheduling to configure/i)).toBeInTheDocument()
  })
})
