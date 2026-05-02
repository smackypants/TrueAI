import { describe, it, expect } from 'vitest'
import { saveTextFile } from './filesystem'

describe('native/filesystem (web fallback)', () => {
  it('triggers a download via an anchor on web', async () => {
    // The web fallback path appends an <a> with `download`, clicks it, and
    // removes it. We assert the click occurred by spying on the anchor
    // creation pipeline.
    const originalCreate = document.createElement.bind(document)
    let downloadAttr: string | undefined
    let clicked = false
    document.createElement = ((tag: string) => {
      const el = originalCreate(tag)
      if (tag.toLowerCase() === 'a') {
        const anchor = el as HTMLAnchorElement
        const origClick = anchor.click.bind(anchor)
        anchor.click = () => {
          clicked = true
          downloadAttr = anchor.download
          origClick()
        }
      }
      return el
    }) as typeof document.createElement
    try {
      const result = await saveTextFile('chat 2024.json', '{"hello":"world"}')
      expect(clicked).toBe(true)
      expect(downloadAttr).toBe('chat_2024.json')
      expect(result.filename).toBe('chat_2024.json')
      expect(result.uri.startsWith('blob:')).toBe(true)
    } finally {
      document.createElement = originalCreate
    }
  })

  it('sanitises the filename', async () => {
    const originalCreate = document.createElement.bind(document)
    let downloadAttr: string | undefined
    document.createElement = ((tag: string) => {
      const el = originalCreate(tag)
      if (tag.toLowerCase() === 'a') {
        const anchor = el as HTMLAnchorElement
        const origClick = anchor.click.bind(anchor)
        anchor.click = () => {
          downloadAttr = anchor.download
          origClick()
        }
      }
      return el
    }) as typeof document.createElement
    try {
      await saveTextFile('../../etc/passwd', 'x')
      expect(downloadAttr).not.toContain('/')
      expect(downloadAttr).not.toContain('..')
    } finally {
      document.createElement = originalCreate
    }
  })

  it('falls back to "file" when the name sanitises to empty', async () => {
    const originalCreate = document.createElement.bind(document)
    let downloadAttr: string | undefined
    document.createElement = ((tag: string) => {
      const el = originalCreate(tag)
      if (tag.toLowerCase() === 'a') {
        const anchor = el as HTMLAnchorElement
        const origClick = anchor.click.bind(anchor)
        anchor.click = () => {
          downloadAttr = anchor.download
          origClick()
        }
      }
      return el
    }) as typeof document.createElement
    try {
      await saveTextFile('///', 'x')
      expect(downloadAttr).toBe('file')
    } finally {
      document.createElement = originalCreate
    }
  })

  it('picks a sensible MIME type per extension on the web download path', async () => {
    // Spy on Blob construction so we can assert the type passed to it for
    // each known extension. This covers the .md/.txt/.csv/.html branches
    // of pickMimeType() that the JSON-only test above doesn't reach.
    const seenTypes: string[] = []
    const OriginalBlob = globalThis.Blob
    class CapturingBlob extends OriginalBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        seenTypes.push(options?.type ?? '')
      }
    }
    ;(globalThis as { Blob: typeof Blob }).Blob = CapturingBlob as unknown as typeof Blob
    try {
      await saveTextFile('notes.md', '# hi')
      await saveTextFile('a.txt', 'hi')
      await saveTextFile('data.csv', 'a,b')
      await saveTextFile('page.html', '<p/>')
      await saveTextFile('binary.bin', '...')
      expect(seenTypes).toEqual([
        'text/markdown',
        'text/plain',
        'text/csv',
        'text/html',
        'application/octet-stream',
      ])
    } finally {
      ;(globalThis as { Blob: typeof Blob }).Blob = OriginalBlob
    }
  })
})
