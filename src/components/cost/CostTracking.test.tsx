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

  // Phase 6 — branch coverage additions

  it('does not call onCreateBudget when budget name is empty', () => {
    const onCreateBudget = vi.fn()
    render(<CostTracking {...defaultProps} onCreateBudget={onCreateBudget} />)
    fireEvent.click(screen.getByText('New Budget'))
    // Leave name empty, set amount > 0
    fireEvent.change(screen.getByPlaceholderText('100.00'), {
      target: { value: '50' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Budget' }))
    expect(onCreateBudget).not.toHaveBeenCalled()
  })

  it('does not call onCreateBudget when amount is zero or invalid', () => {
    const onCreateBudget = vi.fn()
    render(<CostTracking {...defaultProps} onCreateBudget={onCreateBudget} />)
    fireEvent.click(screen.getByText('New Budget'))
    fireEvent.change(screen.getByPlaceholderText('e.g., Monthly AI Spending'), {
      target: { value: 'My Budget' },
    })
    // Leave amount as default 0
    fireEvent.click(screen.getByRole('button', { name: 'Create Budget' }))
    expect(onCreateBudget).not.toHaveBeenCalled()
  })

  it('updates alertThreshold when threshold input changes', () => {
    const onCreateBudget = vi.fn()
    render(<CostTracking {...defaultProps} onCreateBudget={onCreateBudget} />)
    fireEvent.click(screen.getByText('New Budget'))
    fireEvent.change(screen.getByPlaceholderText('e.g., Monthly AI Spending'), {
      target: { value: 'Threshold Budget' },
    })
    fireEvent.change(screen.getByPlaceholderText('100.00'), {
      target: { value: '200' },
    })
    fireEvent.change(screen.getByPlaceholderText('80'), {
      target: { value: '90' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Budget' }))
    expect(onCreateBudget).toHaveBeenCalledWith(
      expect.objectContaining({ alertThreshold: 90, name: 'Threshold Budget', amount: 200 })
    )
  })

  it('falls back alertThreshold to 80 when input parses as NaN', () => {
    const onCreateBudget = vi.fn()
    render(<CostTracking {...defaultProps} onCreateBudget={onCreateBudget} />)
    fireEvent.click(screen.getByText('New Budget'))
    fireEvent.change(screen.getByPlaceholderText('e.g., Monthly AI Spending'), {
      target: { value: 'NaN Budget' },
    })
    fireEvent.change(screen.getByPlaceholderText('100.00'), {
      target: { value: '200' },
    })
    fireEvent.change(screen.getByPlaceholderText('80'), {
      target: { value: 'abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Budget' }))
    expect(onCreateBudget).toHaveBeenCalledWith(
      expect.objectContaining({ alertThreshold: 80 })
    )
  })

  it('closes the dialog when Cancel is clicked in the new-budget dialog', () => {
    render(<CostTracking {...defaultProps} />)
    fireEvent.click(screen.getByText('New Budget'))
    expect(
      screen.getByText('Set spending limits and get alerts when approaching your budget')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(
      screen.queryByText('Set spending limits and get alerts when approaching your budget')
    ).not.toBeInTheDocument()
  })

  it('exportData triggers a JSON blob download via an anchor click', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL

    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    try {
      render(<CostTracking {...defaultProps} costEntries={[costEntry]} />)
      // The Export button uses an icon-only label containing "Export"
      fireEvent.click(screen.getByRole('button', { name: /export/i }))
      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(anchorClick).toHaveBeenCalledOnce()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      anchorClick.mockRestore()
    }
  })
})
