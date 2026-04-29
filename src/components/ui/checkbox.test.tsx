import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  beforeEach(() => {
    // Stub HTMLElement methods that Radix UI uses
    HTMLElement.prototype.hasPointerCapture = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  it('should render a checkbox element', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
  })

  it('should have the data-slot attribute', () => {
    render(<Checkbox data-testid="checkbox" />)
    const checkbox = screen.getByTestId('checkbox')
    expect(checkbox).toHaveAttribute('data-slot', 'checkbox')
  })

  it('should apply custom className', () => {
    render(<Checkbox className="custom-class" data-testid="checkbox" />)
    const checkbox = screen.getByTestId('checkbox')
    expect(checkbox).toHaveClass('custom-class')
  })

  it('should be unchecked by default', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('should handle checked state', () => {
    render(<Checkbox checked onChange={() => {}} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('should handle click events', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Checkbox onCheckedChange={handleCheckedChange} />)
    const checkbox = screen.getByRole('checkbox')

    await userEvent.click(checkbox)
    expect(checked).toBe(true)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Checkbox disabled />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('should not toggle when disabled', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Checkbox disabled onCheckedChange={handleCheckedChange} />)
    const checkbox = screen.getByRole('checkbox')

    await userEvent.click(checkbox)
    expect(checked).toBe(false)
  })

  it('should handle defaultChecked', () => {
    render(<Checkbox defaultChecked />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('should forward props to the checkbox element', () => {
    render(
      <Checkbox
        aria-label="Test checkbox"
        data-testid="checkbox"
      />
    )
    const checkbox = screen.getByTestId('checkbox')
    expect(checkbox).toHaveAttribute('aria-label', 'Test checkbox')
  })

  it('should support required attribute', () => {
    render(<Checkbox required data-testid="checkbox" />)
    const checkbox = screen.getByTestId('checkbox')
    expect(checkbox).toBeRequired()
  })

  it('should support indeterminate state', () => {
    render(<Checkbox checked="indeterminate" onChange={() => {}} data-testid="checkbox" />)
    const checkbox = screen.getByTestId('checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'indeterminate')
  })

  it('should render indicator when checked', () => {
    render(<Checkbox checked onChange={() => {}} data-testid="checkbox" />)
    const checkbox = screen.getByTestId('checkbox')
    const indicator = checkbox.querySelector('[data-slot="checkbox-indicator"]')
    expect(indicator).toBeInTheDocument()
  })

  it('should handle form submission', () => {
    const handleSubmit = vi.fn((e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      const checkboxValue = formData.get('test-checkbox')
      expect(checkboxValue).toBe('on')
    })

    render(
      <form onSubmit={handleSubmit}>
        <Checkbox name="test-checkbox" defaultChecked />
        <button type="submit">Submit</button>
      </form>
    )

    const button = screen.getByRole('button')
    userEvent.click(button)
  })
})
