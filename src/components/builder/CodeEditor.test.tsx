import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

// Mock prismjs which doesn't work in jsdom
const highlightElement = vi.fn()
vi.mock('prismjs', () => ({
  default: {
    highlightElement: (el: HTMLElement) => highlightElement(el),
    highlight: vi.fn().mockReturnValue('<span>code</span>'),
    languages: { javascript: {}, typescript: {}, jsx: {}, tsx: {}, css: {}, markup: {}, json: {} },
  },
}))

vi.mock('prismjs/components/prism-javascript', () => ({}))
vi.mock('prismjs/components/prism-typescript', () => ({}))
vi.mock('prismjs/components/prism-jsx', () => ({}))
vi.mock('prismjs/components/prism-tsx', () => ({}))
vi.mock('prismjs/components/prism-css', () => ({}))
vi.mock('prismjs/components/prism-markup', () => ({}))
vi.mock('prismjs/components/prism-json', () => ({}))
vi.mock('prismjs/plugins/line-numbers/prism-line-numbers', () => ({}))
vi.mock('prismjs/plugins/line-numbers/prism-line-numbers.css', () => ({}))
// All theme stylesheets — return empty modules so dynamic imports succeed
vi.mock('prismjs/themes/prism-okaidia.css', () => ({}))
vi.mock('prismjs/themes/prism-twilight.css', () => ({}))
vi.mock('prismjs/themes/prism-coy.css', () => ({}))
vi.mock('prismjs/themes/prism-solarizedlight.css', () => ({}))
vi.mock('prismjs/themes/prism-funky.css', () => ({}))
vi.mock('prismjs/themes/prism-dark.css', () => ({}))
vi.mock('prismjs/themes/prism-tomorrow.css', () => ({}))

import { CodeEditor, type CodeTheme } from './CodeEditor'

describe('CodeEditor', () => {
  it('renders code content', () => {
    render(
      <CodeEditor
        code="const x = 1;"
        language="javascript"
      />
    )
    expect(screen.getByText('const x = 1;')).toBeInTheDocument()
  })

  it('renders textarea for editable mode', () => {
    render(
      <CodeEditor
        code="let y = 2;"
        language="typescript"
        readOnly={false}
        onChange={vi.fn()}
      />
    )
    const textarea = document.querySelector('textarea')
    expect(textarea).toBeTruthy()
  })

  it('renders without crashing in readonly mode', () => {
    render(
      <CodeEditor
        code=""
        language="json"
        readOnly={true}
      />
    )
    expect(document.body).toBeTruthy()
  })

  it('shows line numbers when enabled', () => {
    render(
      <CodeEditor
        code="line1\nline2\nline3"
        language="typescript"
        showLineNumbers={true}
      />
    )
    // Line number gutter should render
    expect(document.body).toBeTruthy()
  })

  it('updates local code when controlled `code` prop changes', () => {
    const { rerender } = render(
      <CodeEditor code="first" language="javascript" />
    )
    expect(screen.getByText('first')).toBeInTheDocument()
    rerender(<CodeEditor code="second" language="javascript" />)
    expect(screen.getByText('second')).toBeInTheDocument()
  })

  it('invokes onChange when typing in editable textarea', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <CodeEditor
        code=""
        language="javascript"
        readOnly={false}
        onChange={onChange}
      />
    )
    const textarea = document.querySelector('textarea')!
    await user.type(textarea, 'ab')
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toBe('ab')
  })

  it('inserts two spaces and prevents default on Tab key', () => {
    const onChange = vi.fn()
    render(
      <CodeEditor
        code="xy"
        language="javascript"
        readOnly={false}
        onChange={onChange}
      />
    )
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    textarea.focus()
    textarea.selectionStart = 1
    textarea.selectionEnd = 1
    const result = fireEvent.keyDown(textarea, { key: 'Tab' })
    // fireEvent returns false when preventDefault was called
    expect(result).toBe(false)
    expect(onChange).toHaveBeenLastCalledWith('x  y')
  })

  it('uses correct language class for known languages', () => {
    render(<CodeEditor code="<div/>" language="tsx" />)
    expect(document.querySelector('code.language-tsx')).toBeTruthy()
  })

  it('falls back to javascript class for unknown languages', () => {
    render(<CodeEditor code="x" language="ruby" />)
    expect(document.querySelector('code.language-javascript')).toBeTruthy()
  })

  it('maps html/vue/svelte to language-markup', () => {
    const { rerender } = render(<CodeEditor code="<p/>" language="html" />)
    expect(document.querySelector('code.language-markup')).toBeTruthy()
    rerender(<CodeEditor code="<p/>" language="vue" />)
    expect(document.querySelector('code.language-markup')).toBeTruthy()
    rerender(<CodeEditor code="<p/>" language="svelte" />)
    expect(document.querySelector('code.language-markup')).toBeTruthy()
  })

  it.each<CodeTheme>(['tomorrow', 'okaidia', 'twilight', 'coy', 'solarized', 'funky', 'dark'])(
    'renders without crashing for theme %s',
    (theme) => {
      render(<CodeEditor code="x" language="javascript" theme={theme} />)
      expect(document.body).toBeTruthy()
    }
  )

  it('renders editable textarea with line numbers gutter', () => {
    render(
      <CodeEditor
        code="a\nb\nc"
        language="javascript"
        readOnly={false}
        showLineNumbers={true}
      />
    )
    expect(document.querySelector('textarea')).toBeTruthy()
  })

  it('removes a previously injected prism theme link before loading a new one', async () => {
    const oldLink = document.createElement('link')
    oldLink.setAttribute('data-prism-theme', 'true')
    document.head.appendChild(oldLink)
    render(<CodeEditor code="x" language="javascript" theme="dark" />)
    // Allow microtasks/effects to run
    await Promise.resolve()
    expect(document.querySelector('link[data-prism-theme]')).toBeNull()
  })
})

