import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input', () => {
  it('should render an input element', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('should have the data-slot attribute', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('data-slot', 'input')
  })

  it('should apply custom className', () => {
    render(<Input className="custom-class" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('custom-class')
  })

  it('should handle different input types', () => {
    const { rerender } = render(<Input type="text" data-testid="input" />)
    let input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'text')

    rerender(<Input type="email" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'email')

    rerender(<Input type="password" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'password')

    rerender(<Input type="number" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('should handle user input', async () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input') as HTMLInputElement

    await userEvent.type(input, 'test value')
    expect(input.value).toBe('test value')
  })

  it('should handle placeholder text', () => {
    render(<Input placeholder="Enter text here" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('placeholder', 'Enter text here')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toBeDisabled()
  })

  it('should not accept input when disabled', async () => {
    render(<Input disabled data-testid="input" />)
    const input = screen.getByTestId('input') as HTMLInputElement

    await userEvent.type(input, 'test')
    expect(input.value).toBe('')
  })

  it('should handle defaultValue', () => {
    render(<Input defaultValue="default text" data-testid="input" />)
    const input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('default text')
  })

  it('should handle controlled value', () => {
    const { rerender } = render(<Input value="initial" onChange={() => {}} data-testid="input" />)
    let input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('initial')

    rerender(<Input value="updated" onChange={() => {}} data-testid="input" />)
    input = screen.getByTestId('input') as HTMLInputElement
    expect(input.value).toBe('updated')
  })

  it('should handle onChange events', async () => {
    let value = ''
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      value = e.target.value
    }

    render(<Input onChange={handleChange} data-testid="input" />)
    const input = screen.getByTestId('input')

    await userEvent.type(input, 'test')
    expect(value).toBe('test')
  })

  it('should handle onFocus events', async () => {
    let focused = false
    const handleFocus = () => { focused = true }

    render(<Input onFocus={handleFocus} data-testid="input" />)
    const input = screen.getByTestId('input')

    await userEvent.click(input)
    expect(focused).toBe(true)
  })

  it('should handle onBlur events', async () => {
    let blurred = false
    const handleBlur = () => { blurred = true }

    render(
      <div>
        <Input onBlur={handleBlur} data-testid="input" />
        <button>Other element</button>
      </div>
    )
    const input = screen.getByTestId('input')
    const button = screen.getByRole('button')

    await userEvent.click(input)
    await userEvent.click(button)
    expect(blurred).toBe(true)
  })

  it('should forward all props to the input element', () => {
    render(
      <Input
        name="test-input"
        id="test-id"
        aria-label="Test input"
        data-testid="input"
        maxLength={10}
        minLength={5}
        required
      />
    )
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('name', 'test-input')
    expect(input).toHaveAttribute('id', 'test-id')
    expect(input).toHaveAttribute('aria-label', 'Test input')
    expect(input).toHaveAttribute('maxLength', '10')
    expect(input).toHaveAttribute('minLength', '5')
    expect(input).toBeRequired()
  })

  it('should handle aria-invalid attribute', () => {
    render(<Input aria-invalid="true" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('should handle readonly attribute', () => {
    render(<Input readOnly value="readonly text" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('readonly')
  })

  it('should not allow typing when readonly', async () => {
    render(<Input readOnly defaultValue="initial" data-testid="input" />)
    const input = screen.getByTestId('input') as HTMLInputElement

    await userEvent.type(input, 'new text')
    expect(input.value).toBe('initial')
  })

  it('should handle autoComplete attribute', () => {
    render(<Input autoComplete="email" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('autoComplete', 'email')
  })

  it('should handle autoFocus attribute', () => {
    render(<Input autoFocus data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveFocus()
  })

  it('should handle pattern attribute for validation', () => {
    render(<Input pattern="[0-9]{3}" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('pattern', '[0-9]{3}')
  })

  it('should handle step attribute for number inputs', () => {
    render(<Input type="number" step="0.01" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('step', '0.01')
  })

  it('should handle min and max attributes for number inputs', () => {
    render(<Input type="number" min="0" max="100" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
  })
})
