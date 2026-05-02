import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'

const { mockSearchModels, mockGetPopular, mockDownloadModel, mockFormatBytes } = vi.hoisted(() => ({
  mockSearchModels: vi.fn(),
  mockGetPopular: vi.fn(),
  mockDownloadModel: vi.fn(),
  mockFormatBytes: vi.fn((bytes: number) => `${bytes} B`),
}))

vi.mock('@/lib/huggingface', () => ({
  searchHuggingFaceModels: mockSearchModels,
  downloadModel: mockDownloadModel,
  formatBytes: mockFormatBytes,
  getPopularGGUFModels: mockGetPopular,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { HuggingFaceModelBrowser } from './HuggingFaceModelBrowser'

const MODEL_A = {
  id: 'bartowski/Llama-3-GGUF',
  name: 'Llama-3',
  author: 'bartowski',
  downloads: 50000,
  likes: 100,
  size: 4.2,
  quantization: 'Q4_K_M',
  contextLength: 8192,
  tags: ['llama', 'chat', 'gguf'],
  description: 'A great Llama-3 model',
  downloadUrl: 'https://example.com/llama-3.gguf',
}

const MODEL_B = {
  id: 'TheBloke/Mistral-GGUF',
  name: 'Mistral',
  author: 'TheBloke',
  downloads: 25000,
  likes: 50,
  size: 3.5,
  quantization: 'Q5_K_M',
  contextLength: 4096,
  tags: ['mistral', 'gguf'],
  downloadUrl: 'https://example.com/mistral.gguf',
}

let createObjectUrlSpy: ReturnType<typeof vi.fn>
let revokeObjectUrlSpy: ReturnType<typeof vi.fn>
let anchorClickSpy: ReturnType<typeof vi.fn>
let originalCreateObjectURL: typeof URL.createObjectURL
let originalRevokeObjectURL: typeof URL.revokeObjectURL

beforeEach(() => {
  vi.clearAllMocks()
  mockGetPopular.mockReturnValue(['bartowski/Llama-3-GGUF', 'TheBloke/Mistral-GGUF'])
  mockSearchModels.mockResolvedValue([MODEL_A, MODEL_B])
  mockDownloadModel.mockResolvedValue(new Blob(['x'], { type: 'application/octet-stream' }))

  // jsdom doesn't implement URL.createObjectURL/revokeObjectURL.
  originalCreateObjectURL = URL.createObjectURL
  originalRevokeObjectURL = URL.revokeObjectURL
  createObjectUrlSpy = vi.fn(() => 'blob:mock-url')
  revokeObjectUrlSpy = vi.fn()
  // @ts-expect-error - assigning to read-only-on-window URL static methods
  URL.createObjectURL = createObjectUrlSpy
  // @ts-expect-error - same as above
  URL.revokeObjectURL = revokeObjectUrlSpy
  anchorClickSpy = vi.fn()
  HTMLAnchorElement.prototype.click = anchorClickSpy
})

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})

async function renderAndWaitForAutoSearch() {
  await act(async () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
  })
  await waitFor(() => expect(mockSearchModels).toHaveBeenCalled())
}

describe('HuggingFaceModelBrowser', () => {
  it('renders heading and search input', async () => {
    mockGetPopular.mockReturnValueOnce([])
    await act(async () => {
      render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    })
    const title = document.querySelector('[data-slot="card-title"]')
    expect(title?.textContent).toMatch(/huggingface/i)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('shows shortcut buttons + prompt when no popular models for auto-search', async () => {
    // First mock call (JSX render of shortcut buttons) returns a populated
    // list so the buttons render. Subsequent calls (useEffect's auto-search
    // guard) return [] so the auto-search is skipped.
    mockGetPopular.mockReset()
    mockGetPopular
      .mockReturnValueOnce(['bartowski/Llama-3-GGUF']) // JSX render
      .mockReturnValue([]) // useEffect + any future calls
    await act(async () => {
      render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    })
    expect(screen.getByText(/search for gguf models/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Llama-3' })).toBeInTheDocument()
    expect(mockSearchModels).not.toHaveBeenCalled()
  })

  it('clicking a popular shortcut button performs a search for that model', async () => {
    mockGetPopular.mockReset()
    mockGetPopular
      .mockReturnValueOnce(['bartowski/Llama-3-GGUF']) // first JSX render
      .mockReturnValue([]) // useEffect (skip auto-search) + later JSX renders
    await act(async () => {
      render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Llama-3' }))
    })
    expect(mockSearchModels).toHaveBeenCalledWith('bartowski/Llama-3-GGUF', 20)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Found 2 models'))
  })

  it('auto-searches on mount with the first popular model and renders results', async () => {
    await renderAndWaitForAutoSearch()
    expect(mockSearchModels).toHaveBeenCalledWith('bartowski/Llama-3-GGUF', 20)
    // Both models render
    expect(screen.getByText('Llama-3')).toBeInTheDocument()
    expect(screen.getByText('Mistral')).toBeInTheDocument()
    // "by bartowski" subtitle
    expect(screen.getByText('by bartowski')).toBeInTheDocument()
    // Per-model Download button
    expect(screen.getAllByRole('button', { name: /download/i }).length).toBeGreaterThan(0)
  })

  it('search-results "No models found" toasts info and renders empty state', async () => {
    mockSearchModels.mockResolvedValueOnce([])
    await renderAndWaitForAutoSearch()
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No GGUF models found. Try a different search term.'))
    expect(screen.getByText(/no models found/i)).toBeInTheDocument()
  })

  it('search error path: rejected → searchError banner + toast.error + console.error', async () => {
    mockSearchModels.mockRejectedValueOnce(new Error('network down'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => { render(<HuggingFaceModelBrowser onDownload={vi.fn()} />) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('network down'))
    expect(screen.getByText('network down')).toBeInTheDocument()
    errSpy.mockRestore()
  })

  it('search button is disabled when query is empty (after a search has been attempted)', async () => {
    await renderAndWaitForAutoSearch()
    const searchBtn = screen.getByRole('button', { name: /^search$/i })
    expect(searchBtn).toBeDisabled() // searchQuery is still ''
  })

  it('typing in the search input + Enter triggers a manual search', async () => {
    await renderAndWaitForAutoSearch()
    mockSearchModels.mockClear()
    const input = screen.getByPlaceholderText(/search/i)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Phi-3' } })
    })
    await act(async () => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    })
    expect(mockSearchModels).toHaveBeenCalledWith('Phi-3', 20)
  })

  it('clicking Search with whitespace-only query toasts an error and does not call the API', async () => {
    await renderAndWaitForAutoSearch()
    mockSearchModels.mockClear()
    const input = screen.getByPlaceholderText(/search/i)
    await act(async () => { fireEvent.change(input, { target: { value: '   ' } }) })
    // Disabled-button branch: clicking does nothing, but pressing Enter calls performSearch
    await act(async () => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    })
    expect(mockSearchModels).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Please enter a search term')
  })

  it('successful download: progress callback updates UI, completes, calls onDownload + creates/revokes blob URL', async () => {
    const onDownload = vi.fn()
    let progressCb: ((p: number, d: number, t: number) => void) | undefined
    mockDownloadModel.mockImplementation(
      (_url: string, cb: (p: number, d: number, t: number) => void) => {
        progressCb = cb
        return Promise.resolve(new Blob(['xx'], { type: 'application/octet-stream' }))
      },
    )
    await act(async () => {
      render(<HuggingFaceModelBrowser onDownload={onDownload} />)
    })
    await waitFor(() => expect(screen.getByText('Llama-3')).toBeInTheDocument())

    const downloadBtns = screen.getAllByRole('button', { name: /download$/i })
    await act(async () => { fireEvent.click(downloadBtns[0]) })

    // Fire a progress callback synchronously so the progress UI renders.
    if (progressCb) {
      await act(async () => { progressCb!(50, 50, 100) })
    }

    await waitFor(() => expect(onDownload).toHaveBeenCalledWith(MODEL_A))
    expect(createObjectUrlSpy).toHaveBeenCalled()
    expect(anchorClickSpy).toHaveBeenCalled()
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url')
    expect(toast.success).toHaveBeenCalledWith('Downloaded: Llama-3')
  })

  it('failed download: error path sets error status + toast.error', async () => {
    mockDownloadModel.mockRejectedValueOnce(new Error('disk full'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () => {
      render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    })
    await waitFor(() => expect(screen.getByText('Llama-3')).toBeInTheDocument())
    const downloadBtns = screen.getAllByRole('button', { name: /download$/i })
    await act(async () => { fireEvent.click(downloadBtns[0]) })
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Download failed: disk full'))
    errSpy.mockRestore()
  })

  it('clicking download twice on the same model is a no-op the second time (button disabled while in-progress)', async () => {
    let resolveDl!: (v: Blob) => void
    mockDownloadModel.mockImplementation(() => new Promise<Blob>((r) => { resolveDl = r }))
    await act(async () => {
      render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    })
    await waitFor(() => expect(screen.getByText('Llama-3')).toBeInTheDocument())
    const downloadBtns = screen.getAllByRole('button', { name: /download$/i })
    await act(async () => { fireEvent.click(downloadBtns[0]) })
    // The button is now disabled (isDownloading=true). A second click does
    // not trigger another network call.
    await act(async () => { fireEvent.click(downloadBtns[0]) })
    expect(mockDownloadModel).toHaveBeenCalledTimes(1)
    // Cleanup: resolve to avoid hanging promises.
    await act(async () => {
      resolveDl(new Blob(['x']))
    })
  })
})
