import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatBytes,
  getPopularGGUFModels,
  searchHuggingFaceModels,
  getModelFiles,
  downloadModel,
} from './huggingface'

describe('huggingface helpers', () => {
  describe('formatBytes', () => {
    it('returns "0 B" for zero', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('formats bytes', () => {
      expect(formatBytes(512)).toBe('512.00 B')
    })

    it('formats kilobytes', () => {
      expect(formatBytes(2048)).toBe('2.00 KB')
    })

    it('formats megabytes', () => {
      expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB')
    })

    it('formats gigabytes', () => {
      expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.00 GB')
    })

    it('formats terabytes', () => {
      expect(formatBytes(2 * 1024 ** 4)).toBe('2.00 TB')
    })
  })

  describe('getPopularGGUFModels', () => {
    it('returns a non-empty list of model identifiers', () => {
      const models = getPopularGGUFModels()
      expect(Array.isArray(models)).toBe(true)
      expect(models.length).toBeGreaterThan(0)
      models.forEach(id => {
        expect(typeof id).toBe('string')
        expect(id).toMatch(/.+\/.+/)
      })
    })

    it('always includes a Llama-family model', () => {
      const models = getPopularGGUFModels().join(' ').toLowerCase()
      expect(models).toContain('llama')
    })
  })
})

describe('searchHuggingFaceModels', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('parses GGUF results, picks Q4 file when available, and skips repos without GGUF files', async () => {
    const mockResults = [
      {
        id: 'a/Llama-2-7B-Chat-GGUF',
        modelId: 'TheBloke/Llama-2-7B-Chat-GGUF',
        author: 'TheBloke',
        downloads: 1000,
        likes: 50,
        tags: ['license:llama2', 'region-us', 'text-generation', 'gguf'],
        siblings: [
          { rfilename: 'llama-2-7b-chat.Q4_K_M.gguf', size: 4_000_000_000 },
          { rfilename: 'llama-2-7b-chat.Q8_0.gguf', size: 7_000_000_000 },
          { rfilename: 'README.md', size: 1024 },
        ],
        private: false,
        lastModified: '2024-01-01',
      },
      {
        // No GGUF files -> filtered out
        id: 'a/no-gguf',
        modelId: 'someone/no-gguf',
        author: 'someone',
        downloads: 1,
        likes: 0,
        tags: [],
        siblings: [{ rfilename: 'config.json', size: 100 }],
        private: false,
        lastModified: '2024-01-01',
      },
      {
        // Has 32k context hint in name; no Q4 file -> falls back to first GGUF
        id: 'a/Mistral-32k-GGUF',
        modelId: 'maker/Mistral-32k-GGUF',
        author: 'maker',
        downloads: 10,
        likes: 1,
        tags: ['license:apache-2.0', 'gguf'],
        siblings: [
          { rfilename: 'mistral.Q8_0.gguf', size: 8_000_000_000 },
        ],
        private: false,
        lastModified: '2024-01-01',
      },
    ]
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResults,
      statusText: 'OK',
    }) as unknown as typeof fetch

    const models = await searchHuggingFaceModels('llama', 5)
    expect(models).toHaveLength(2)

    const llama = models.find(m => m.id === 'TheBloke/Llama-2-7B-Chat-GGUF')!
    expect(llama).toBeDefined()
    expect(llama.author).toBe('TheBloke')
    // Picked Q4 file (~4 GB → 3.72)
    expect(llama.size).toBeCloseTo(4_000_000_000 / 1024 ** 3, 2)
    expect(llama.quantization.toUpperCase()).toContain('Q4')
    // GGUF suffix stripped from name
    expect(llama.name).toBe('Llama-2-7B-Chat')
    // license/region tags filtered out
    expect(llama.tags).not.toContain('license:llama2')
    expect(llama.tags).not.toContain('region-us')
    expect(llama.downloadUrl).toContain('llama-2-7b-chat.Q4_K_M.gguf')
    // Default context length when name has no [n]k marker
    expect(llama.contextLength).toBe(4096)

    const mistral = models.find(m => m.id === 'maker/Mistral-32k-GGUF')!
    expect(mistral).toBeDefined()
    expect(mistral.contextLength).toBe(32 * 1024)
    expect(mistral.quantization.toUpperCase()).toContain('Q8')

    // Verify search URL was constructed correctly
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/models?search=llama'),
      expect.any(Object)
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=5'),
      expect.any(Object)
    )
  })

  it('throws when the API responds with a non-ok status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      json: async () => ({}),
    }) as unknown as typeof fetch

    await expect(searchHuggingFaceModels('x')).rejects.toThrow(/Service Unavailable/)
  })

  it('propagates network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch
    await expect(searchHuggingFaceModels('x')).rejects.toThrow('boom')
  })
})

describe('getModelFiles', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns only GGUF/GGML/BIN files with full HF URLs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        siblings: [
          { rfilename: 'model.q4.gguf', size: 100 },
          { rfilename: 'model.bin', size: 200 },
          { rfilename: 'README.md', size: 10 },
          { rfilename: 'model.ggml', size: 300 },
        ],
      }),
    }) as unknown as typeof fetch

    const files = await getModelFiles('owner/repo')
    expect(files).toHaveLength(3)
    expect(files.map(f => f.name).sort()).toEqual(['model.bin', 'model.ggml', 'model.q4.gguf'])
    files.forEach(f => {
      expect(f.url).toBe(`https://huggingface.co/owner/repo/resolve/main/${f.name}`)
    })
  })

  it('returns empty array when there are no siblings', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const files = await getModelFiles('owner/repo')
    expect(files).toEqual([])
  })

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({}),
    }) as unknown as typeof fetch
    await expect(getModelFiles('owner/repo')).rejects.toThrow(/Not Found/)
  })
})

describe('downloadModel', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('streams chunks, reports progress, and returns a Blob', async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])]
    let i = 0
    const reader = {
      read: vi.fn().mockImplementation(async () => {
        if (i < chunks.length) return { done: false, value: chunks[i++] }
        return { done: true, value: undefined }
      }),
    }
    const total = 5
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === 'content-length' ? String(total) : null) },
      body: { getReader: () => reader },
    }) as unknown as typeof fetch

    const onProgress = vi.fn()
    const blob = await downloadModel('https://example.com/model.gguf', onProgress)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBe(total)
    expect(onProgress).toHaveBeenCalledTimes(2)
    // Final progress should be 100%
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
    expect(lastCall[0]).toBeCloseTo(100, 5)
    expect(lastCall[1]).toBe(total)
    expect(lastCall[2]).toBe(total)
  })

  it('throws when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
    }) as unknown as typeof fetch

    await expect(downloadModel('https://x')).rejects.toThrow(/Forbidden/)
  })

  it('throws when body is null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      body: null,
    }) as unknown as typeof fetch
    await expect(downloadModel('https://x')).rejects.toThrow(/body is null/)
  })
})
