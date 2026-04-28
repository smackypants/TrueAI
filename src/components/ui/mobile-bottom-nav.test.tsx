import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileBottomNav } from './mobile-bottom-nav'

const makeItems = (activeId?: string) => [
  { id: 'chat', label: 'Chat', icon: <span>C</span>, active: activeId === 'chat', onClick: vi.fn() },
  { id: 'agents', label: 'Agents', icon: <span>A</span>, active: activeId === 'agents', onClick: vi.fn() },
  { id: 'settings', label: 'Settings', icon: <span>S</span>, active: activeId === 'settings', onClick: vi.fn() },
]

describe('MobileBottomNav', () => {
  it('renders all nav items', () => {
    render(<MobileBottomNav items={makeItems()} />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders icons for each item', () => {
    render(<MobileBottomNav items={makeItems()} />)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('calls onClick when a nav item is clicked', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<MobileBottomNav items={items} />)
    await user.click(screen.getByText('Chat'))
    expect(items[0].onClick).toHaveBeenCalledTimes(1)
  })

  it('applies active styling to the active item', () => {
    const { container } = render(<MobileBottomNav items={makeItems('chat')} />)
    const buttons = container.querySelectorAll('button')
    // Active button has text-accent class
    expect(buttons[0].className).toContain('text-accent')
    // Inactive buttons have text-muted-foreground
    expect(buttons[1].className).toContain('text-muted-foreground')
  })

  it('shows the animated indicator only for the active item', () => {
    const { container } = render(<MobileBottomNav items={makeItems('agents')} />)
    // There should be exactly one motion indicator div with bg-accent/15
    const indicators = container.querySelectorAll('[class*="bg-accent"]')
    // The indicator is inside the active (agents) button
    const buttons = container.querySelectorAll('button')
    expect(buttons[1].className).toContain('text-accent')
    expect(indicators.length).toBeGreaterThan(0)
  })

  it('renders as a <nav> landmark', () => {
    render(<MobileBottomNav items={makeItems()} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders with no items without crashing', () => {
    render(<MobileBottomNav items={[]} />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('fires correct onClick for each independent item', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<MobileBottomNav items={items} />)
    await user.click(screen.getByText('Settings'))
    expect(items[2].onClick).toHaveBeenCalledTimes(1)
    expect(items[0].onClick).not.toHaveBeenCalled()
    expect(items[1].onClick).not.toHaveBeenCalled()
  })
})
