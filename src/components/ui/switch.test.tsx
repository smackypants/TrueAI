import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './switch'

describe('Switch', () => {
  beforeEach(() => {
    // Stub HTMLElement methods that Radix UI uses
    HTMLElement.prototype.hasPointerCapture = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  it('should render a switch element', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeInTheDocument()
  })

  it('should have the data-slot attribute', () => {
    render(<Switch data-testid="switch" />)
    const switchElement = screen.getByTestId('switch')
    expect(switchElement).toHaveAttribute('data-slot', 'switch')
  })

  it('should apply custom className', () => {
    render(<Switch className="custom-class" data-testid="switch" />)
    const switchElement = screen.getByTestId('switch')
    expect(switchElement).toHaveClass('custom-class')
  })

  it('should be unchecked by default', () => {
    render(<Switch />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-state', 'unchecked')
  })

  it('should handle checked state', () => {
    render(<Switch checked onChange={() => {}} />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })

  it('should handle click events', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Switch onCheckedChange={handleCheckedChange} />)
    const switchElement = screen.getByRole('switch')

    await userEvent.click(switchElement)
    expect(checked).toBe(true)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toBeDisabled()
  })

  it('should not toggle when disabled', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Switch disabled onCheckedChange={handleCheckedChange} />)
    const switchElement = screen.getByRole('switch')

    await userEvent.click(switchElement)
    expect(checked).toBe(false)
  })

  it('should handle defaultChecked', () => {
    render(<Switch defaultChecked />)
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })

  it('should forward props to the switch element', () => {
    render(
      <Switch
        aria-label="Test switch"
        data-testid="switch"
      />
    )
    const switchElement = screen.getByTestId('switch')
    expect(switchElement).toHaveAttribute('aria-label', 'Test switch')
  })

  it('should support required attribute', () => {
    render(<Switch required data-testid="switch" />)
    const switchElement = screen.getByTestId('switch')
    expect(switchElement).toHaveAttribute('aria-required', 'true')
  })

  it('should render thumb element', () => {
    render(<Switch data-testid="switch" />)
    const switchElement = screen.getByTestId('switch')
    const thumb = switchElement.querySelector('[data-slot="switch-thumb"]')
    expect(thumb).toBeInTheDocument()
  })

  it('should toggle between checked and unchecked states', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Switch onCheckedChange={handleCheckedChange} />)
    const switchElement = screen.getByRole('switch')

    // Initially unchecked
    expect(switchElement).toHaveAttribute('data-state', 'unchecked')

    // Click to check
    await userEvent.click(switchElement)
    expect(checked).toBe(true)

    // Click again to uncheck
    await userEvent.click(switchElement)
    expect(checked).toBe(false)
  })

  it('should handle keyboard navigation with Space key', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Switch onCheckedChange={handleCheckedChange} />)
    const switchElement = screen.getByRole('switch')

    switchElement.focus()
    await userEvent.keyboard(' ')
    expect(checked).toBe(true)
  })

  it('should handle keyboard navigation with Enter key', async () => {
    let checked = false
    const handleCheckedChange = (value: boolean) => { checked = value }

    render(<Switch onCheckedChange={handleCheckedChange} />)
    const switchElement = screen.getByRole('switch')

    switchElement.focus()
    await userEvent.keyboard('{Enter}')
    expect(checked).toBe(true)
  })

  it('should be focusable', () => {
    render(<Switch data-testid="switch" />)
    const switchElement = screen.getByTestId('switch')

    switchElement.focus()
    expect(switchElement).toHaveFocus()
  })

  it('should not be focusable when disabled', () => {
    render(<Switch disabled data-testid="switch" />)
    const switchElement = screen.getByTestId('switch')

    switchElement.focus()
    expect(switchElement).not.toHaveFocus()
  })
})
