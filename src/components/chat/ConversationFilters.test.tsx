import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationFilters } from './ConversationFilters'
import type { ConversationSortOption, ConversationFilterOption } from './ConversationFilters'

describe('ConversationFilters', () => {
  const onSortChange = vi.fn()
  const onFilterChange = vi.fn()

  const defaultProps = {
    sortBy: 'recent' as ConversationSortOption,
    filterBy: 'all' as ConversationFilterOption,
    onSortChange,
    onFilterChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Filters button', () => {
    render(<ConversationFilters {...defaultProps} />)
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
  })

  it('opens the popover when Filters button is clicked', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    expect(screen.getByText('Sort By')).toBeInTheDocument()
    expect(screen.getByText('Filter')).toBeInTheDocument()
  })

  it('shows all sort options in the popover', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    expect(screen.getByText('Most Recent')).toBeInTheDocument()
    expect(screen.getByText('Oldest First')).toBeInTheDocument()
    expect(screen.getByText('Alphabetical')).toBeInTheDocument()
    expect(screen.getByText('Message Count')).toBeInTheDocument()
  })

  it('shows all filter options in the popover', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    expect(screen.getByText('All Conversations')).toBeInTheDocument()
    expect(screen.getByText('Pinned Only')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('This Month')).toBeInTheDocument()
  })

  it('calls onSortChange with "oldest" when Oldest First is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('Oldest First'))
    expect(onSortChange).toHaveBeenCalledWith('oldest')
  })

  it('calls onSortChange with "alphabetical" when Alphabetical is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('Alphabetical'))
    expect(onSortChange).toHaveBeenCalledWith('alphabetical')
  })

  it('calls onSortChange with "messages" when Message Count is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('Message Count'))
    expect(onSortChange).toHaveBeenCalledWith('messages')
  })

  it('calls onFilterChange with "pinned" when Pinned Only is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('Pinned Only'))
    expect(onFilterChange).toHaveBeenCalledWith('pinned')
  })

  it('calls onFilterChange with "archived" when Archived is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('Archived'))
    expect(onFilterChange).toHaveBeenCalledWith('archived')
  })

  it('calls onFilterChange with "today" when Today is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('Today'))
    expect(onFilterChange).toHaveBeenCalledWith('today')
  })

  it('calls onFilterChange with "week" when This Week is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('This Week'))
    expect(onFilterChange).toHaveBeenCalledWith('week')
  })

  it('calls onFilterChange with "month" when This Month is selected', async () => {
    const user = userEvent.setup()
    render(<ConversationFilters {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByText('This Month'))
    expect(onFilterChange).toHaveBeenCalledWith('month')
  })
})
