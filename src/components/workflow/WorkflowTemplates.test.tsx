import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkflowTemplates } from './WorkflowTemplates'

describe('WorkflowTemplates', () => {
  beforeAll(() => {
    HTMLElement.prototype.hasPointerCapture = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('renders the template library with metadata and featured badges', () => {
    render(<WorkflowTemplates onUseTemplate={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /workflow templates/i })).toBeInTheDocument()
    expect(screen.getByText('Content Research & Writing')).toBeInTheDocument()
    expect(screen.getByText('Data ETL Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Code Review Automation')).toBeInTheDocument()
    expect(screen.getByText('Market Research Report')).toBeInTheDocument()
    expect(screen.getByText('Email Campaign Automation')).toBeInTheDocument()
    expect(screen.getByText('Customer Support Triage')).toBeInTheDocument()
    expect(screen.getAllByText('Featured')).toHaveLength(3)
    expect(screen.getAllByText('TrueAI Team')).toHaveLength(6)
  })

  it('filters templates by name, description, and tag search text', async () => {
    const user = userEvent.setup()
    render(<WorkflowTemplates onUseTemplate={vi.fn()} />)

    const search = screen.getByPlaceholderText(/search templates/i)

    await user.type(search, 'etl')
    expect(screen.getByText('Data ETL Pipeline')).toBeInTheDocument()
    expect(screen.queryByText('Content Research & Writing')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'competitors')
    expect(screen.getByText('Market Research Report')).toBeInTheDocument()
    expect(screen.queryByText('Data ETL Pipeline')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'support')
    expect(screen.getByText('Customer Support Triage')).toBeInTheDocument()
    expect(screen.queryByText('Market Research Report')).not.toBeInTheDocument()
  })

  it('filters templates by category selection', async () => {
    const user = userEvent.setup()
    render(<WorkflowTemplates onUseTemplate={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Development'))

    expect(screen.getByText('Code Review Automation')).toBeInTheDocument()
    expect(screen.queryByText('Content Research & Writing')).not.toBeInTheDocument()
    expect(screen.queryByText('Customer Support Triage')).not.toBeInTheDocument()
  })

  it('shows an empty state when no templates match search and category filters', async () => {
    const user = userEvent.setup()
    render(<WorkflowTemplates onUseTemplate={vi.fn()} />)

    await user.type(screen.getByPlaceholderText(/search templates/i), 'no matching workflow')

    expect(screen.getByText('No templates match your search')).toBeInTheDocument()
    expect(screen.queryByText('Content Research & Writing')).not.toBeInTheDocument()
  })

  it('passes the selected template to onUseTemplate', async () => {
    const user = userEvent.setup()
    const onUseTemplate = vi.fn()
    render(<WorkflowTemplates onUseTemplate={onUseTemplate} />)

    const useButtons = screen.getAllByRole('button', { name: /use template/i })
    await user.click(useButtons[2])

    expect(onUseTemplate).toHaveBeenCalledTimes(1)
    expect(onUseTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'template-3',
        name: 'Code Review Automation',
        category: 'development',
        workflow: expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({ type: 'parallel' }),
            expect.objectContaining({ type: 'merge' }),
          ]),
        }),
      })
    )
  })
})
