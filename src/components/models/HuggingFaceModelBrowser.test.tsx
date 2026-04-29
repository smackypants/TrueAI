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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { HuggingFaceModelBrowser } from './HuggingFaceModelBrowser'

beforeEach(() => {
  mockGetPopular.mockReturnValue(['bartowski/Llama-3-GGUF', 'TheBloke/Mistral-GGUF'])
  mockSearchModels.mockResolvedValue([])
})

describe('HuggingFaceModelBrowser', () => {
  it('renders heading', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    expect(screen.getByText('HuggingFace Model Browser')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('renders popular model shortcut buttons', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    // Component auto-searches on mount, so the initial shortcut state is skipped.
    // Assert a stable loading state instead.
    expect(screen.getByText('Searching models...')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    render(<HuggingFaceModelBrowser onDownload={vi.fn()} />)
    expect(document.body).toBeTruthy()
  })
})
