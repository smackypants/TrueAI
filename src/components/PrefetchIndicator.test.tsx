import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrefetchStatusIndicator, PrefetchProgress } from './PrefetchIndicator'

describe('PrefetchStatusIndicator', () => {
  it('renders nothing when show=false', () => {
    const { container } = render(<PrefetchStatusIndicator isActive={true} tabsPreloading={[]} show={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when not active and no tabs', () => {
    const { container } = render(<PrefetchStatusIndicator isActive={false} tabsPreloading={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows Prefetching text when active', () => {
    render(<PrefetchStatusIndicator isActive={true} tabsPreloading={[]} />)
    expect(screen.getByText('Prefetching')).toBeInTheDocument()
  })

  it('shows tabs being preloaded', () => {
    render(<PrefetchStatusIndicator isActive={true} tabsPreloading={['chat', 'models']} />)
    expect(screen.getByText('chat, models')).toBeInTheDocument()
  })

  it('does not show tab list when empty', () => {
    render(<PrefetchStatusIndicator isActive={true} tabsPreloading={[]} />)
    expect(screen.queryByText(',')).not.toBeInTheDocument()
  })
})

describe('PrefetchProgress', () => {
  it('renders nothing when total is 0', () => {
    const { container } = render(<PrefetchProgress total={0} completed={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders progress bar when total > 0', () => {
    const { container } = render(<PrefetchProgress total={10} completed={5} />)
    expect(container.querySelector('.bg-accent')).toBeInTheDocument()
  })

  it('shows 100% width when completed equals total', () => {
    const { container } = render(<PrefetchProgress total={5} completed={5} />)
    expect(container.querySelector('.bg-accent')).toBeInTheDocument()
  })
})
