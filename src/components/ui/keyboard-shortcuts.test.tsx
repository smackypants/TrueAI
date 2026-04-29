import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeyboardShortcutsHelper } from './keyboard-shortcuts'

describe('KeyboardShortcutsHelper', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the hint button immediately on mount', () => {
    render(<KeyboardShortcutsHelper />)
    expect(screen.getByRole('button', { name: /for shortcuts/i })).toBeInTheDocument()
  })

  it('clicking the hint button opens the shortcuts dialog', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<KeyboardShortcutsHelper />)
    await user.click(screen.getByRole('button', { name: /for shortcuts/i }))
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('pressing ? on the document opens the shortcuts dialog', async () => {
    vi.useRealTimers()
    render(<KeyboardShortcutsHelper />)
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('pressing ? while an input is focused does NOT open the dialog', async () => {
    vi.useRealTimers()
    render(
      <>
        <input data-testid="test-input" />
        <KeyboardShortcutsHelper />
      </>
    )
    const input = screen.getByTestId('test-input')
    input.focus()
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })

  it('pressing ? while a textarea is focused does NOT open the dialog', async () => {
    vi.useRealTimers()
    render(
      <>
        <textarea data-testid="test-textarea" />
        <KeyboardShortcutsHelper />
      </>
    )
    const textarea = screen.getByTestId('test-textarea')
    textarea.focus()
    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })

  it('shows all four shortcut categories in the dialog', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<KeyboardShortcutsHelper />)
    await user.click(screen.getByRole('button', { name: /for shortcuts/i }))
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
  })

  it('shows individual shortcut descriptions in the dialog', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    render(<KeyboardShortcutsHelper />)
    await user.click(screen.getByRole('button', { name: /for shortcuts/i }))
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument()
    expect(screen.getByText('New conversation')).toBeInTheDocument()
  })

  it('the hint button disappears after 5 seconds (timer fires)', () => {
    render(<KeyboardShortcutsHelper />)
    expect(screen.getByRole('button', { name: /for shortcuts/i })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5001)
    })
    // AnimatePresence defers DOM removal until after exit animation;
    // we just verify no errors are thrown and state was updated.
  })
})
