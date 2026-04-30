/**
 * Branch-coverage gap-fill for `src/lib/huggingface.ts`.
 *
 * The existing `huggingface.test.ts` covers the happy paths of the four
 * exported functions, but the error arms (non-2xx response, JSON throws,
 * null response.body, no content-length, empty siblings) and the
 * `getPopularGGUFModels` helper were untested. This file fills those gaps.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  downloadModel,
  getModelFiles,
  getPopularGGUFModels,
  searchHuggingFaceModels,
} from './huggingface'

describe('huggingface — error / edge branches', () => {
  let errSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.restoreAllMocks()
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    errSpy.mockRestore()
  })

  describe('searchHuggingFaceModels', () => {
    it('throws and logs when the API responds non-OK', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('nope', { status: 503, statusText: 'Service Unavailable' })),
      )
      await expect(searchHuggingFaceModels('llama')).rejects.toThrow(/HuggingFace API error/)
      expect(errSpy).toHaveBeenCalledWith('Error searching HuggingFace:', expect.any(Error))
    })

    it('logs and skips a result whose per-model processing throws (mainFile.rfilename access on undefined)', async () => {
      // siblings whose `rfilename` is missing → the .toLowerCase() call inside
      // the .find() will throw, exercising the per-model catch block in
      // searchHuggingFaceModels.
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(
            JSON.stringify([
              {
                modelId: 'broken/Model-GGUF',
                downloads: 0,
                likes: 0,
                tags: [],
                private: false,
                lastModified: '2024-01-01',
                siblings: [{ rfilename: undefined as unknown as string, size: 1 }],
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      )
      const results = await searchHuggingFaceModels('broken')
      expect(results).toEqual([])
      expect(errSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Error processing model broken\/Model-GGUF/),
        expect.any(Error),
      )
    })

    it('handles results with no siblings array (the `|| []` fallback)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(
            JSON.stringify([
              {
                modelId: 'x/Y',
                downloads: 0,
                likes: 0,
                tags: [],
                private: false,
                lastModified: '2024-01-01',
                // no siblings field → `result.siblings?.filter(...)` short-circuits to undefined
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      )
      const results = await searchHuggingFaceModels('x')
      expect(results).toEqual([])
    })

    it('uses the bare "GGUF" quantization label when the filename has no Q-pattern, and parses context length from modelId', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(
            JSON.stringify([
              {
                modelId: 'org/Phi-32k-instruct-GGUF',
                downloads: 0,
                likes: 0,
                tags: ['license:mit', 'region-us', 'phi'],
                private: false,
                lastModified: '2024-01-01',
                siblings: [{ rfilename: 'plainmodel.gguf', size: 1024 * 1024 * 1024 }],
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      )
      const results = await searchHuggingFaceModels('phi')
      expect(results).toHaveLength(1)
      expect(results[0].quantization).toBe('GGUF')
      expect(results[0].contextLength).toBe(32 * 1024)
      expect(results[0].name).toBe('Phi-32k-instruct')
    })
  })

  describe('getModelFiles', () => {
    it('throws and logs when the API responds non-OK', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('x', { status: 404, statusText: 'Not Found' })),
      )
      await expect(getModelFiles('a/b')).rejects.toThrow(/Failed to fetch model files/)
      expect(errSpy).toHaveBeenCalledWith('Error fetching model files:', expect.any(Error))
    })

    it('returns [] when the model has no siblings', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              modelId: 'a/b',
              downloads: 0,
              likes: 0,
              tags: [],
              private: false,
              lastModified: '2024-01-01',
              // no siblings
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      )
      await expect(getModelFiles('a/b')).resolves.toEqual([])
    })
  })

  describe('downloadModel', () => {
    it('throws and logs when the response is non-OK', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('x', { status: 500, statusText: 'Server Error' })),
      )
      await expect(downloadModel('https://example/x')).rejects.toThrow(/Download failed/)
      expect(errSpy).toHaveBeenCalledWith('Error downloading model:', expect.any(Error))
    })

    it('throws when response.body is null', async () => {
      // Construct a Response-like object whose `body` is null. Plain Response
      // exposes a body for a string payload, so we hand-roll a minimal object.
      const fakeResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body: null,
      } as unknown as Response
      vi.stubGlobal('fetch', vi.fn(async () => fakeResponse))
      await expect(downloadModel('https://example/x')).rejects.toThrow(/Response body is null/)
    })

    it('does not invoke onProgress when content-length is missing (total stays 0)', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]))
          controller.close()
        },
      })
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(stream, { status: 200 /* no content-length */ })),
      )
      const onProgress = vi.fn()
      const blob = await downloadModel('https://example/x', onProgress)
      expect(blob.size).toBe(3)
      expect(onProgress).not.toHaveBeenCalled()
    })

    it('streams without an onProgress callback', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([9]))
          controller.close()
        },
      })
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(stream, { status: 200, headers: { 'content-length': '1' } })),
      )
      const blob = await downloadModel('https://example/x')
      expect(blob.size).toBe(1)
    })
  })

  describe('getPopularGGUFModels', () => {
    it('returns a non-empty list of TheBloke / bartowski model IDs', () => {
      const ids = getPopularGGUFModels()
      expect(ids.length).toBeGreaterThan(0)
      // Sanity: every entry is "owner/name" shaped.
      for (const id of ids) {
        expect(id).toMatch(/^[^/]+\/[^/]+$/)
      }
    })
  })
})
