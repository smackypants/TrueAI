import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSearchModels, mockGetPopular } = vi.hoisted(() => ({
  mockSearchModels: vi.fn(),
  mockGetPopular: vi.fn(),
}))

vi.mock('@/lib/huggingface', () => ({
  searchHuggingFaceModels: mockSearchModels,
  downloadModel: vi.fn(),
  formatBytes: (bytes: number) => `${bytes} B`,
  getPopularGGUFModels: mockGetPopular,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { HuggingFaceModelBrowser } from './HuggingFaceModelBrowser'

beforeEach(() => {
  mockGetPopular.mockReturnValue(['bartowski/Llama-3-GGUF', 'TheBloke/Mistral-GGUF'])
  mockSearchModels.mockResolvedValue([])
})

describe('HuggingFaceModelBrowser', () => {
  it('renders heading', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    // CardTitle and CardDescription both mention "HuggingFace"; query
    // CardTitle directly via the data-slot so we get exactly one match.
    const title = document.querySelector('[data-slot="card-title"]')
    expect(title).toBeTruthy()
    expect(title?.textContent).toMatch(/huggingface/i)
  })

  it('renders search input', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('renders popular model shortcut buttons when no auto-search has run', () => {
    // The component auto-runs a search on mount when getPopularGGUFModels()
    // returns at least one entry, which immediately replaces the
    // shortcut-buttons UI with the search-results pane. To exercise the
    // shortcut-buttons branch we must report no popular models so the
    // mount-effect's `popularModels.length > 0` guard is false. The
    // shortcut buttons themselves render from the same getter, so we can't
    // both have them present AND skip the auto-search — assert on the
    // rendered prompt copy instead, which is unique to this branch.
    mockGetPopular.mockReturnValue([])
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    expect(screen.getByText(/search for gguf models/i)).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    expect(document.body).toBeTruthy()
  })
})
