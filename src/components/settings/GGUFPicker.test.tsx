import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GGUFPicker } from './GGUFPicker'

// Inline shadcn/Radix Dialog primitives can rely on PointerEvent /
// pointer-capture APIs that jsdom doesn't implement. The dialog itself
// renders fine without them, but interaction tests can hit them. We
// stub the missing surfaces only where actually exercised below.

const SEARCH_URL_RE = /\/api\/models\?search=([^&]+)&filter=gguf&limit=20$/

interface MockResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): MockResponse {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  }
}

describe('GGUFPicker', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let onSelect: ReturnType<typeof vi.fn>
  let onOpenChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    onSelect = vi.fn()
    onOpenChange = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('does not render when open=false', () => {
    render(<GGUFPicker open={false} onOpenChange={onOpenChange} onSelect={onSelect} />)
    expect(screen.queryByText(/Pick a GGUF model/i)).not.toBeInTheDocument()
  })

  it('renders the search field and explanatory copy when open', () => {
    render(<GGUFPicker open onOpenChange={onOpenChange} onSelect={onSelect} />)
    expect(screen.getByText(/Pick a GGUF model from Hugging Face/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    // Search button is disabled until the user types something.
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled()
  })

  it('searches HF for gguf models when the user submits a query', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { id: 'TheBloke/Llama-3.2-1B-GGUF', downloads: 1234, likes: 56 },
        { id: 'Mozilla/Llama-3.2-1B-Instruct-llamafile', downloads: 999, likes: 12 },
      ]),
    )

    const user = userEvent.setup()
    render(<GGUFPicker open onOpenChange={onOpenChange} onSelect={onSelect} />)

    await user.type(screen.getByLabelText('Search'), 'llama-3.2-1b')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toMatch(SEARCH_URL_RE)
    expect(url).toContain('search=llama-3.2-1b')

    expect(await screen.findByText('TheBloke/Llama-3.2-1B-GGUF')).toBeInTheDocument()
    expect(screen.getByText('Mozilla/Llama-3.2-1B-Instruct-llamafile')).toBeInTheDocument()
    expect(screen.getByText(/1,234 downloads/)).toBeInTheDocument()
  })

  it('surfaces a search error when the HF API responds non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 503 }))
    const user = userEvent.setup()
    render(<GGUFPicker open onOpenChange={onOpenChange} onSelect={onSelect} />)
    await user.type(screen.getByLabelText('Search'), 'qwen')
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/HTTP 503/)
  })

  it('lists .gguf files (sorted by size, smallest first) after picking a repo', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: 'TheBloke/Llama-3.2-1B-GGUF', downloads: 1, likes: 1 }]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          { type: 'file', path: 'README.md', size: 1234 },
          { type: 'file', path: 'model.Q8_0.gguf', size: 8_000_000_000 },
          { type: 'file', path: 'model.Q4_K_M.gguf', size: 800_000_000 },
          { type: 'directory', path: 'subdir' },
        ]),
      )

    const user = userEvent.setup()
    render(<GGUFPicker open onOpenChange={onOpenChange} onSelect={onSelect} />)
    await user.type(screen.getByLabelText('Search'), 'llama')
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    const repo = await screen.findByRole('button', { name: /Open repository TheBloke\/Llama-3.2-1B-GGUF/ })
    await user.click(repo)

    const list = await screen.findByLabelText('GGUF files in TheBloke/Llama-3.2-1B-GGUF')
    const items = within(list).getAllByRole('radio') as HTMLInputElement[]
    // README is filtered out, only the two .gguf files remain.
    expect(items).toHaveLength(2)
    // Smallest-first sort: Q4_K_M (800 MB) before Q8_0 (8 GB).
    expect(items[0].value).toBe('model.Q4_K_M.gguf')
    expect(items[1].value).toBe('model.Q8_0.gguf')
  })

  it('emits the hf:<owner>/<repo>:<file> shortcut and closes on confirm', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: 'Mozilla/Llama-3.2-1B-Instruct-llamafile' }]))
      .mockResolvedValueOnce(
        jsonResponse([
          { type: 'file', path: 'Llama-3.2-1B-Instruct.Q4_K_M.gguf', size: 800_000_000 },
        ]),
      )

    const user = userEvent.setup()
    render(<GGUFPicker open onOpenChange={onOpenChange} onSelect={onSelect} />)
    await user.type(screen.getByLabelText('Search'), 'llama')
    await user.click(screen.getByRole('button', { name: /^search$/i }))
    await user.click(
      await screen.findByRole('button', {
        name: /Open repository Mozilla\/Llama-3.2-1B-Instruct-llamafile/,
      }),
    )
    // Single-file repos auto-select that file.
    await screen.findByRole('radio', { name: /Llama-3.2-1B-Instruct\.Q4_K_M\.gguf/ })
    await user.click(screen.getByRole('button', { name: /use this model/i }))
    expect(onSelect).toHaveBeenCalledWith(
      'hf:Mozilla/Llama-3.2-1B-Instruct-llamafile:Llama-3.2-1B-Instruct.Q4_K_M.gguf',
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps "Use this model" disabled until both a repo and a file are picked', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    render(<GGUFPicker open onOpenChange={onOpenChange} onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: /use this model/i })).toBeDisabled()
  })
})
