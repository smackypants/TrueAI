import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('should render a textarea element', () => {
    render(<Textarea />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('should have the data-slot attribute', () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('data-slot', 'textarea')
  })

  it('should apply custom className', () => {
    render(<Textarea className="custom-class" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveClass('custom-class')
  })

  it('should handle user input', async () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement

    await userEvent.type(textarea, 'test value')
    expect(textarea.value).toBe('test value')
  })

  it('should handle multiline text', async () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement

    await userEvent.type(textarea, 'line 1{Enter}line 2{Enter}line 3')
    expect(textarea.value).toBe('line 1\nline 2\nline 3')
  })

  it('should handle placeholder text', () => {
    render(<Textarea placeholder="Enter text here" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('placeholder', 'Enter text here')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Textarea disabled data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toBeDisabled()
  })

  it('should not accept input when disabled', async () => {
    render(<Textarea disabled data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement

    await userEvent.type(textarea, 'test')
    expect(textarea.value).toBe('')
  })

  it('should handle defaultValue', () => {
    render(<Textarea defaultValue="default text" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('default text')
  })

  it('should handle controlled value', () => {
    const { rerender } = render(<Textarea value="initial" onChange={() => {}} data-testid="textarea" />)
    let textarea = screen.getByTestId('textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('initial')

    rerender(<Textarea value="updated" onChange={() => {}} data-testid="textarea" />)
    textarea = screen.getByTestId('textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('updated')
  })

  it('should handle onChange events', async () => {
    let value = ''
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      value = e.target.value
    }

    render(<Textarea onChange={handleChange} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')

    await userEvent.type(textarea, 'test')
    expect(value).toBe('test')
  })

  it('should handle onFocus events', async () => {
    let focused = false
    const handleFocus = () => { focused = true }

    render(<Textarea onFocus={handleFocus} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')

    await userEvent.click(textarea)
    expect(focused).toBe(true)
  })

  it('should handle onBlur events', async () => {
    let blurred = false
    const handleBlur = () => { blurred = true }

    render(
      <div>
        <Textarea onBlur={handleBlur} data-testid="textarea" />
        <button>Other element</button>
      </div>
    )
    const textarea = screen.getByTestId('textarea')
    const button = screen.getByRole('button')

    await userEvent.click(textarea)
    await userEvent.click(button)
    expect(blurred).toBe(true)
  })

  it('should forward all props to the textarea element', () => {
    render(
      <Textarea
        name="test-textarea"
        id="test-id"
        aria-label="Test textarea"
        data-testid="textarea"
        maxLength={100}
        required
        rows={5}
        cols={30}
      />
    )
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('name', 'test-textarea')
    expect(textarea).toHaveAttribute('id', 'test-id')
    expect(textarea).toHaveAttribute('aria-label', 'Test textarea')
    expect(textarea).toHaveAttribute('maxLength', '100')
    expect(textarea).toBeRequired()
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveAttribute('cols', '30')
  })

  it('should handle aria-invalid attribute', () => {
    render(<Textarea aria-invalid="true" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('should handle readonly attribute', () => {
    render(<Textarea readOnly value="readonly text" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('readonly')
  })

  it('should not allow typing when readonly', async () => {
    render(<Textarea readOnly defaultValue="initial" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement

    await userEvent.type(textarea, 'new text')
    expect(textarea.value).toBe('initial')
  })

  it('should handle autoFocus attribute', () => {
    render(<Textarea autoFocus data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveFocus()
  })

  it('should handle wrap attribute', () => {
    render(<Textarea wrap="soft" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('wrap', 'soft')
  })

  it('should handle spellCheck attribute', () => {
    render(<Textarea spellCheck={false} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('spellCheck', 'false')
  })
})
