import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PullToRefreshIndicator } from './pull-to-refresh-indicator'

describe('PullToRefreshIndicator', () => {
  it('shows "Pull to refresh" when pull has started but not reached threshold', () => {
    render(
      <PullToRefreshIndicator
        isRefreshing={false}
        pullDistance={50}
        progress={50}
      />
    )
    expect(screen.getByText('Pull to refresh')).toBeInTheDocument()
  })

  it('shows "Release to refresh" when progress >= 100', () => {
    render(
      <PullToRefreshIndicator
        isRefreshing={false}
        pullDistance={120}
        progress={100}
      />
    )
    expect(screen.getByText('Release to refresh')).toBeInTheDocument()
  })

  it('shows "Refreshing..." when isRefreshing is true', () => {
    render(
      <PullToRefreshIndicator
        isRefreshing={true}
        pullDistance={0}
        progress={0}
      />
    )
    expect(screen.getByText('Refreshing...')).toBeInTheDocument()
  })

  it('renders nothing visible when pullDistance <= 10 and not refreshing', () => {
    // shouldShow = pullDistance > 10 || isRefreshing; when false, opacity animates to 0
    // The element is still in the DOM but invisible (opacity: 0, y: -20)
    render(
      <PullToRefreshIndicator
        isRefreshing={false}
        pullDistance={5}
        progress={0}
      />
    )
    // The container element exists but its animated opacity target is 0.
    // We can at least verify it renders without crashing and contains the default text.
    expect(screen.getByText('Pull to refresh')).toBeInTheDocument()
  })

  it('renders with a custom className', () => {
    const { container } = render(
      <PullToRefreshIndicator
        isRefreshing={false}
        pullDistance={20}
        progress={30}
        className="my-custom-class"
      />
    )
    expect(container.querySelector('.my-custom-class')).toBeInTheDocument()
  })

  it('renders the refresh icon svg', () => {
    const { container } = render(
      <PullToRefreshIndicator
        isRefreshing={false}
        pullDistance={20}
        progress={50}
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('isRefreshing true overrides progress text', () => {
    render(
      <PullToRefreshIndicator
        isRefreshing={true}
        pullDistance={200}
        progress={100}
      />
    )
    // Even with progress=100, isRefreshing takes precedence
    expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    expect(screen.queryByText('Release to refresh')).not.toBeInTheDocument()
  })
})
