import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from './label'

describe('Label', () => {
  it('should render a label element', () => {
    render(<Label>Label text</Label>)
    const label = screen.getByText('Label text')
    expect(label).toBeInTheDocument()
  })

  it('should have the data-slot attribute', () => {
    render(<Label data-testid="label">Text</Label>)
    const label = screen.getByTestId('label')
    expect(label).toHaveAttribute('data-slot', 'label')
  })

  it('should apply custom className', () => {
    render(<Label className="custom-class" data-testid="label">Text</Label>)
    const label = screen.getByTestId('label')
    expect(label).toHaveClass('custom-class')
  })

  it('should forward htmlFor attribute', () => {
    render(<Label htmlFor="input-id" data-testid="label">Input Label</Label>)
    const label = screen.getByTestId('label')
    expect(label).toHaveAttribute('for', 'input-id')
  })

  it('should work with associated input', () => {
    render(
      <div>
        <Label htmlFor="test-input">Username</Label>
        <input id="test-input" type="text" />
      </div>
    )

    const label = screen.getByText('Username')
    const input = screen.getByRole('textbox')

    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
    expect(label).toHaveAttribute('for', 'test-input')
  })

  it('should forward all props to the label element', () => {
    render(
      <Label
        id="test-id"
        title="Test title"
        aria-label="Test label"
        data-testid="label"
      >
        Text
      </Label>
    )
    const label = screen.getByTestId('label')
    expect(label).toHaveAttribute('id', 'test-id')
    expect(label).toHaveAttribute('title', 'Test title')
    expect(label).toHaveAttribute('aria-label', 'Test label')
  })

  it('should render children content', () => {
    render(
      <Label>
        <span>Required</span>
        <span>*</span>
      </Label>
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should handle click events to focus associated input', async () => {
    render(
      <div>
        <Label htmlFor="clickable-input">Click me</Label>
        <input id="clickable-input" type="text" data-testid="input" />
      </div>
    )

    const label = screen.getByText('Click me')
    const input = screen.getByTestId('input')

    const userEvent = (await import('@testing-library/user-event')).default
    await userEvent.click(label)

    expect(input).toHaveFocus()
  })

  it('should support nested input', async () => {
    render(
      <Label>
        Checkbox Label
        <input type="checkbox" data-testid="checkbox" />
      </Label>
    )

    const checkbox = screen.getByTestId('checkbox')
    const label = screen.getByText('Checkbox Label')

    const userEvent = (await import('@testing-library/user-event')).default
    await userEvent.click(label)

    expect(checkbox).toBeChecked()
  })

  it('should render with required indicator', () => {
    render(
      <Label>
        Email
        <span aria-label="required">*</span>
      </Label>
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('required')).toBeInTheDocument()
  })

  it('should be styleable with inline styles', () => {
    render(
      <Label style={{ color: 'rgb(255, 0, 0)' }} data-testid="label">
        Styled
      </Label>
    )
    const label = screen.getByTestId('label')
    expect(label).toHaveStyle('color: rgb(255, 0, 0)')
  })

  it('should handle disabled styling via peer classes', () => {
    render(
      <div>
        <input type="text" disabled id="disabled-input" data-testid="input" />
        <Label htmlFor="disabled-input" data-testid="label" className="peer-disabled:opacity-50">
          Disabled Label
        </Label>
      </div>
    )
    const label = screen.getByTestId('label')
    expect(label).toHaveClass('peer-disabled:opacity-50')
  })
})
