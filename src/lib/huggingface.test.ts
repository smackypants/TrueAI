import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { downloadModel, formatBytes, getModelFiles, searchHuggingFaceModels } from './huggingface'

function jsonResponse(data: unknown, init?: Partial<Response>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('huggingface', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('formatBytes', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('formats kilobytes/megabytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB')
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
    })
  })

  describe('searchHuggingFaceModels', () => {
    it('filters to results with GGUF-like files and derives model metadata', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        expect(url).toContain('filter=gguf')
        expect(url).toContain('search=llama')
        return jsonResponse([
          {
            modelId: 'TheBloke/Llama-2-7B-Chat-GGUF',
            downloads: 5,
            likes: 2,
            tags: ['license:mit', 'gguf', 'region-us', 'llama', 'chat'],
            private: false,
            lastModified: '2024-01-01',
            siblings: [
              { rfilename: 'README.md', size: 10 },
              { rfilename: 'llama.Q4_K_M.gguf', size: 1024 * 1024 * 1024 },
            ],
          },
          {
            modelId: 'someone/No-GGUF',
            downloads: 1,
            likes: 0,
            tags: ['text-generation'],
            private: false,
            lastModified: '2024-01-01',
            siblings: [{ rfilename: 'weights.safetensors', size: 123 }],
          },
        ])
      })

      vi.stubGlobal('fetch', fetchMock)

      const results = await searchHuggingFaceModels('llama', 20)
      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        id: 'TheBloke/Llama-2-7B-Chat-GGUF',
        author: 'TheBloke',
        downloads: 5,
        likes: 2,
        quantization: 'Q4_K_M',
      })

      expect(results[0].tags).toEqual(['gguf', 'llama', 'chat'])
      expect(results[0].downloadUrl).toContain('/resolve/main/llama.Q4_K_M.gguf')
    })
  })

  describe('getModelFiles', () => {
    it('returns only GGUF-ish siblings with resolved URLs', async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({
          modelId: 'a/b',
          downloads: 0,
          likes: 0,
          tags: [],
          private: false,
          lastModified: '2024-01-01',
          siblings: [
            { rfilename: 'model.gguf', size: 100 },
            { rfilename: 'notes.txt', size: 5 },
            { rfilename: 'legacy.bin', size: 200 },
          ],
        })
      )

      vi.stubGlobal('fetch', fetchMock)

      const files = await getModelFiles('TheBloke/X')
      expect(files.map((f) => f.name)).toEqual(['model.gguf', 'legacy.bin'])
      expect(files[0].url).toBe('https://huggingface.co/TheBloke/X/resolve/main/model.gguf')
    })
  })

  describe('downloadModel', () => {
    it('streams a response body and reports progress', async () => {
      const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])]
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const c of chunks) controller.enqueue(c)
          controller.close()
        },
      })

      const fetchMock = vi.fn(async () =>
        new Response(stream, {
          status: 200,
          headers: { 'content-length': '4' },
        })
      )
      vi.stubGlobal('fetch', fetchMock)

      const onProgress = vi.fn()
      const blob = await downloadModel('https://example.com/model.gguf', onProgress)
      expect(blob.size).toBe(4)
      expect(onProgress).toHaveBeenCalled()
      expect(onProgress).toHaveBeenLastCalledWith(100, 4, 4)
    })
  })
})

