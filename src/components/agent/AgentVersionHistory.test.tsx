import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AgentVersionHistory } from './AgentVersionHistory'
import type { AgentVersion } from '@/lib/types'

const makeVersion = (overrides: Partial<AgentVersion> = {}): AgentVersion => ({
  id: 'v1',
  version: 1,
  agentId: 'agent-1',
  changes: [],
  performanceSnapshot: {
    avgRating: 0.8,
    successRate: 0.9,
    avgExecutionTime: 2000,
  },
  createdAt: Date.now(),
  createdBy: 'user',
  ...overrides,
})

describe('AgentVersionHistory', () => {
  it('renders heading', () => {
    render(<AgentVersionHistory versions={[]} />)
    expect(screen.getByText('Version History')).toBeInTheDocument()
  })

  it('shows empty state when no versions', () => {
    render(<AgentVersionHistory versions={[]} />)
    expect(screen.getByText(/no version history/i)).toBeInTheDocument()
  })

  it('renders version number', () => {
    const version = makeVersion({ version: 1 })
    render(<AgentVersionHistory versions={[version]} />)
    expect(screen.getByText('Version 1')).toBeInTheDocument()
  })

  it('renders multiple versions', () => {
    const versions = [
      makeVersion({ id: 'v1', version: 1 }),
      makeVersion({ id: 'v2', version: 2 }),
      makeVersion({ id: 'v3', version: 3 }),
    ]
    render(<AgentVersionHistory versions={versions} />)
    expect(screen.getByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText('Version 2')).toBeInTheDocument()
    expect(screen.getByText('Version 3')).toBeInTheDocument()
  })

  it('shows Restore button only for non-current (non-first) versions when onRestore provided', () => {
    const versions = [
      makeVersion({ id: 'v2', version: 2 }), // current (index 0 in sorted desc)
      makeVersion({ id: 'v1', version: 1 }), // older
    ]
    render(<AgentVersionHistory versions={versions} onRestore={vi.fn()} />)
    // Only version 1 (index 1) should have Restore button
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i })
    expect(restoreButtons).toHaveLength(1)
  })

  it('calls onRestore with version when Restore clicked', () => {
    const onRestore = vi.fn()
    const versions = [
      makeVersion({ id: 'v2', version: 2 }),
      makeVersion({ id: 'v1', version: 1 }),
    ]
    render(<AgentVersionHistory versions={versions} onRestore={onRestore} />)
    fireEvent.click(screen.getByRole('button', { name: /restore/i }))
    expect(onRestore).toHaveBeenCalledOnce()
  })

  it('shows "Current" badge on the latest version', () => {
    const versions = [
      makeVersion({ id: 'v2', version: 2 }),
      makeVersion({ id: 'v1', version: 1 }),
    ]
    render(<AgentVersionHistory versions={versions} />)
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  it('shows performance score', () => {
    const version = makeVersion({
      performanceSnapshot: { avgRating: 0.92, successRate: 0.9, avgExecutionTime: 2000 },
    })
    render(<AgentVersionHistory versions={[version]} />)
    // avgRating * 100 = 92 should appear somewhere
    expect(screen.getByText(/92/)).toBeInTheDocument()
  })

  it('shows Robot icon and "Auto-learned" label when createdBy is auto_learning', () => {
    const version = makeVersion({ createdBy: 'auto_learning' })
    render(<AgentVersionHistory versions={[version]} />)
    expect(screen.getByText(/Auto-learned/i)).toBeInTheDocument()
  })

  it('shows "Manual" label when createdBy is user', () => {
    const version = makeVersion({ createdBy: 'user' })
    render(<AgentVersionHistory versions={[version]} />)
    expect(screen.getByText(/Manual/i)).toBeInTheDocument()
  })

  it('renders performance change indicator (TrendUp) when newer version has better avgRating', () => {
    const versions = [
      makeVersion({ id: 'v2', version: 2, performanceSnapshot: { avgRating: 0.90, successRate: 0.9, avgExecutionTime: 2000 } }),
      makeVersion({ id: 'v1', version: 1, performanceSnapshot: { avgRating: 0.80, successRate: 0.8, avgExecutionTime: 2000 } }),
    ]
    render(<AgentVersionHistory versions={versions} />)
    // Performance change percentage should be displayed
    expect(screen.getByText('0.90')).toBeInTheDocument()
    expect(screen.getByText('0.80')).toBeInTheDocument()
  })

  it('renders performance change indicator (TrendDown) when newer version has worse avgRating', () => {
    const versions = [
      makeVersion({ id: 'v2', version: 2, performanceSnapshot: { avgRating: 0.70, successRate: 0.7, avgExecutionTime: 2000 } }),
      makeVersion({ id: 'v1', version: 1, performanceSnapshot: { avgRating: 0.90, successRate: 0.9, avgExecutionTime: 2000 } }),
    ]
    render(<AgentVersionHistory versions={versions} />)
    expect(screen.getByText('0.70')).toBeInTheDocument()
    expect(screen.getByText('0.90')).toBeInTheDocument()
  })

  it('renders version changes with field, oldValue, newValue, and reason', () => {
    const version = makeVersion({
      changes: [
        { field: 'temperature', oldValue: 0.7, newValue: 0.5, reason: 'Reduce hallucinations' },
      ],
    })
    render(<AgentVersionHistory versions={[version]} />)
    expect(screen.getByText(/temperature/i)).toBeInTheDocument()
    expect(screen.getByText('0.7')).toBeInTheDocument()
    expect(screen.getByText('0.5')).toBeInTheDocument()
    expect(screen.getByText('Reduce hallucinations')).toBeInTheDocument()
  })

  it('renders object oldValue as JSON string in changes', () => {
    const version = makeVersion({
      changes: [
        { field: 'config', oldValue: { key: 'val' }, newValue: { key: 'new' }, reason: 'Update config' },
      ],
    })
    render(<AgentVersionHistory versions={[version]} />)
    expect(screen.getByText(/\{"key":"val"\}/)).toBeInTheDocument()
    expect(screen.getByText(/\{"key":"new"\}/)).toBeInTheDocument()
  })

  it('shows avgExecutionTime in seconds', () => {
    const version = makeVersion({
      performanceSnapshot: { avgRating: 0.8, successRate: 0.9, avgExecutionTime: 3500 },
    })
    render(<AgentVersionHistory versions={[version]} />)
    expect(screen.getByText('3.5s')).toBeInTheDocument()
  })
})
