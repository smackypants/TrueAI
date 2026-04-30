/**
 * Tests for the native (Capacitor Clipboard) paths of `native/clipboard`.
 * The existing `clipboard.test.ts` covers only the web fallback path
 * (navigator.clipboard + execCommand) because jsdom is not native; this
 * file mocks `./platform` as native and `@capacitor/clipboard` to exercise
 * the Capacitor write/read branches plus the "native write threw → fall
 * back to web" path that the web-only tests can't reach.
 *
 * Follows the same vi.mock + vi.resetModules + dynamic-import pattern as
 * installer.android.test.ts / haptics.android.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

const writeMock = vi.fn()
const readMock = vi.fn()

vi.mock('@capacitor/clipboard', () => ({
  Clipboard: {
    write: (...args: unknown[]) => writeMock(...args),
    read: (...args: unknown[]) => readMock(...args),
  },
}))

beforeEach(() => {
  writeMock.mockReset()
  readMock.mockReset()
  // Reset navigator.clipboard so web-fallback paths are deterministic.
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: undefined,
  })
  vi.resetModules()
})

describe('native/clipboard (Android Capacitor paths)', () => {
  it('copyText delegates to Clipboard.write on native', async () => {
    writeMock.mockResolvedValue(undefined)
    const { copyText } = await import('./clipboard')
    const ok = await copyText('payload')
    expect(ok).toBe(true)
    expect(writeMock).toHaveBeenCalledWith({ string: 'payload' })
  })

  it('copyText falls back to web path when Clipboard.write throws', async () => {
    writeMock.mockRejectedValue(new Error('plugin denied'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { copyText } = await import('./clipboard')
    const ok = await copyText('payload')
    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('payload')
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('copyText returns false when both native and web fallback fail', async () => {
    writeMock.mockRejectedValue(new Error('plugin denied'))
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(false),
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { copyText } = await import('./clipboard')
    const ok = await copyText('payload')
    expect(ok).toBe(false)
    errSpy.mockRestore()
  })

  it('readText returns the value from Clipboard.read on native', async () => {
    readMock.mockResolvedValue({ value: 'native-clip' })
    const { readText } = await import('./clipboard')
    expect(await readText()).toBe('native-clip')
  })

  it('readText returns undefined when Clipboard.read throws', async () => {
    readMock.mockRejectedValue(new Error('permission denied'))
    const { readText } = await import('./clipboard')
    expect(await readText()).toBeUndefined()
  })
})
