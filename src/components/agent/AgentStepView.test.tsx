import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentStepView } from './AgentStepView'
import type { AgentStep } from '@/lib/types'

const baseStep: AgentStep = {
  id: 'step-1',
  type: 'planning',
  content: 'Analyzing the task requirements',
  timestamp: 1700000000000,
}

describe('AgentStepView', () => {
  it('renders step content', () => {
    render(<AgentStepView step={baseStep} index={0} />)
    expect(screen.getByText('Analyzing the task requirements')).toBeInTheDocument()
  })

  it('renders step type badge for planning', () => {
    render(<AgentStepView step={baseStep} index={0} />)
    expect(screen.getByText('planning')).toBeInTheDocument()
  })

  it('renders step type badge for tool call', () => {
    const step: AgentStep = { ...baseStep, type: 'tool_call' }
    render(<AgentStepView step={step} index={0} />)
    expect(screen.getByText('tool call')).toBeInTheDocument()
  })

  it('renders step type badge for observation', () => {
    const step: AgentStep = { ...baseStep, type: 'observation' }
    render(<AgentStepView step={step} index={0} />)
    expect(screen.getByText('observation')).toBeInTheDocument()
  })

  it('renders step type badge for decision', () => {
    const step: AgentStep = { ...baseStep, type: 'decision' }
    render(<AgentStepView step={step} index={0} />)
    expect(screen.getByText('decision')).toBeInTheDocument()
  })

  it('renders step number as index + 1', () => {
    render(<AgentStepView step={baseStep} index={2} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders step number 1 for index 0', () => {
    render(<AgentStepView step={baseStep} index={0} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders timestamp', () => {
    render(<AgentStepView step={baseStep} index={0} />)
    const timeStr = new Date(baseStep.timestamp).toLocaleTimeString()
    expect(screen.getByText(timeStr)).toBeInTheDocument()
  })

  it('renders tool name when step.toolName is set', () => {
    const step: AgentStep = { ...baseStep, type: 'tool_call', toolName: 'web_search' }
    render(<AgentStepView step={step} index={0} />)
    expect(screen.getByText('web_search')).toBeInTheDocument()
  })

  it('renders tool input when step.toolInput is set', () => {
    const step: AgentStep = { ...baseStep, type: 'tool_call', toolName: 'web_search', toolInput: 'query: hello' }
    render(<AgentStepView step={step} index={0} />)
    expect(screen.getByText(/query: hello/)).toBeInTheDocument()
  })

  it('renders tool output when step.toolOutput is set', () => {
    const step: AgentStep = { ...baseStep, type: 'tool_call', toolName: 'web_search', toolOutput: 'result: world' }
    render(<AgentStepView step={step} index={0} />)
    expect(screen.getByText(/result: world/)).toBeInTheDocument()
  })

  it('does not render tool section when toolName is not set', () => {
    render(<AgentStepView step={baseStep} index={0} />)
    expect(screen.queryByText(/Tool:/)).not.toBeInTheDocument()
  })

  it('planning type renders Brain icon (svg element present)', () => {
    const { container } = render(<AgentStepView step={baseStep} index={0} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('index 0 does not show connector line above the step', () => {
    const { container } = render(<AgentStepView step={baseStep} index={0} />)
    // The connector line is only rendered when index > 0
    // It's a div with class containing "absolute left-3 top-0 w-0.5 h-2"
    const lines = container.querySelectorAll('.absolute.left-3')
    expect(lines.length).toBe(0)
  })

  it('index > 0 shows connector line', () => {
    const { container } = render(<AgentStepView step={baseStep} index={1} />)
    const lines = container.querySelectorAll('.absolute.left-3')
    expect(lines.length).toBeGreaterThan(0)
  })
})
