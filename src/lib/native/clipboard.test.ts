import { describe, it, expect, beforeEach, vi } from 'vitest'
import { copyText, readText } from './clipboard'

describe('native/clipboard (web fallback)', () => {
  beforeEach(() => {
    // Reset clipboard mock between tests.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText, readText: vi.fn().mockResolvedValue('hello') },
    })
    const ok = await copyText('hello world')
    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello world')
  })

  it('falls back to execCommand when clipboard API rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    // jsdom doesn't implement execCommand by default — install a stub.
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    })
    const ok = await copyText('payload')
    expect(ok).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('returns false when both paths fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(false),
    })
    const ok = await copyText('payload')
    expect(ok).toBe(false)
  })

  it('readText returns clipboard contents on web', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: vi.fn(), readText: vi.fn().mockResolvedValue('clip!') },
    })
    expect(await readText()).toBe('clip!')
  })

  it('readText returns undefined when reading is not supported', async () => {
    expect(await readText()).toBeUndefined()
  })
})
