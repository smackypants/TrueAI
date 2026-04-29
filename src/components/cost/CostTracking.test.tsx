import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CostTracking } from './CostTracking'
import type { CostEntry, Budget } from '@/lib/workflow-types'

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn((key, defaultVal) => [defaultVal, vi.fn()])
}))

const costEntry: CostEntry = {
  id: 'c1',
  timestamp: Date.now(),
  model: 'gpt-4o',
  tokensIn: 100,
  tokensOut: 50,
  cost: 0.005,
  resource: 'conversation',
  resourceId: 'conv-1',
  resourceName: 'Test Conversation'
}

const budget: Budget = {
  id: 'b1',
  name: 'Monthly Budget',
  amount: 100,
  period: 'monthly',
  spent: 50,
  alertThreshold: 80,
  enabled: true,
  createdAt: Date.now()
}

const warningBudget: Budget = {
  id: 'b2',
  name: 'Warning Budget',
  amount: 100,
  period: 'monthly',
  spent: 85,
  alertThreshold: 80,
  enabled: true,
  createdAt: Date.now()
}

const exceededBudget: Budget = {
  id: 'b3',
  name: 'Exceeded Budget',
  amount: 100,
  period: 'monthly',
  spent: 105,
  alertThreshold: 80,
  enabled: true,
  createdAt: Date.now()
}

const defaultProps = {
  costEntries: [],
  budgets: [],
  onCreateBudget: vi.fn(),
  onDeleteBudget: vi.fn()
}

describe('CostTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Cost Tracking & Budgets" heading', () => {
    render(<CostTracking {...defaultProps} />)
    expect(screen.getByText('Cost Tracking & Budgets')).toBeInTheDocument()
  })

  it('shows zero cost when no entries', () => {
    render(<CostTracking {...defaultProps} />)
    // Multiple $0.0000 cards exist (Total Cost + Avg per Call), use getAllByText
    const elements = screen.getAllByText('$0.0000')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('shows total cost from entries', () => {
    render(<CostTracking {...defaultProps} costEntries={[costEntry]} />)
    // Multiple elements show $0.0050 (Total Cost card + Cost by Model + Cost by Resource)
    const elements = screen.getAllByText('$0.0050')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('shows "No budgets set" when budgets array is empty', () => {
    render(<CostTracking {...defaultProps} />)
    expect(screen.getByText(/No budgets set/)).toBeInTheDocument()
  })

  it('renders budget name when budgets provided', () => {
    render(<CostTracking {...defaultProps} budgets={[budget]} />)
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument()
  })

  it('shows budget status badge "safe"', () => {
    render(<CostTracking {...defaultProps} budgets={[budget]} />)
    expect(screen.getByText('safe')).toBeInTheDocument()
  })

  it('shows budget status badge "warning"', () => {
    render(<CostTracking {...defaultProps} budgets={[warningBudget]} />)
    expect(screen.getByText('warning')).toBeInTheDocument()
  })

  it('shows budget status badge "exceeded"', () => {
    render(<CostTracking {...defaultProps} budgets={[exceededBudget]} />)
    expect(screen.getByText('exceeded')).toBeInTheDocument()
  })

  it('calls onDeleteBudget when "Delete Budget" clicked', () => {
    const onDeleteBudget = vi.fn()
    render(<CostTracking {...defaultProps} budgets={[budget]} onDeleteBudget={onDeleteBudget} />)
    fireEvent.click(screen.getByText('Delete Budget'))
    expect(onDeleteBudget).toHaveBeenCalledWith('b1')
  })

  it('"Create Budget" button opens dialog when clicked', () => {
    render(<CostTracking {...defaultProps} />)
    // Click the "Create Budget" button (inside the no-budgets card)
    fireEvent.click(screen.getByText('Create Budget'))
    expect(screen.getByText('Set spending limits and get alerts when approaching your budget')).toBeInTheDocument()
  })

  it('calls onCreateBudget when form submitted with valid data', () => {
    const onCreateBudget = vi.fn()
    render(<CostTracking {...defaultProps} onCreateBudget={onCreateBudget} />)

    // Open dialog via "New Budget" button
    fireEvent.click(screen.getByText('New Budget'))

    // Fill in form
    fireEvent.change(screen.getByPlaceholderText('e.g., Monthly AI Spending'), {
      target: { value: 'Test Budget' }
    })
    fireEvent.change(screen.getByPlaceholderText('100.00'), {
      target: { value: '50' }
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Budget' }))
    expect(onCreateBudget).toHaveBeenCalled()
  })

  it('shows model breakdown when cost entries exist', () => {
    render(<CostTracking {...defaultProps} costEntries={[costEntry]} />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })
})
