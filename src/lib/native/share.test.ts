import { describe, it, expect, beforeEach, vi } from 'vitest'
import { share, canShare } from './share'

describe('native/share (web fallback)', () => {
  beforeEach(() => {
    // Reset navigator.share between tests.
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: undefined,
    })
  })

  it('uses Web Share API when available', async () => {
    const webShare = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: webShare,
    })
    const ok = await share({ title: 'Hello', text: 'world' })
    expect(ok).toBe(true)
    expect(webShare).toHaveBeenCalledWith({
      title: 'Hello',
      text: 'world',
      url: undefined,
    })
  })

  it('returns false when Web Share rejects (user cancel)', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: vi.fn().mockRejectedValue(new Error('AbortError')),
    })
    const ok = await share({ text: 'x' })
    expect(ok).toBe(false)
  })

  it('falls back to clipboard when Web Share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })
    const ok = await share({ title: 'A', text: 'B', url: 'C' })
    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('A\nB\nC')
  })

  it('returns false when payload is empty and no share API exists', async () => {
    const ok = await share({})
    expect(ok).toBe(false)
  })

  it('canShare reflects available capabilities', () => {
    expect(canShare()).toBe(false)
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
    expect(canShare()).toBe(true)
  })
})
