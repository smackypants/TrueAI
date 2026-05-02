/**
 * Tests for the native (Capacitor Share) path of `native/share`. The
 * existing `share.test.ts` covers only the web fallback (Web Share API +
 * clipboard last-resort). Here we mock `./platform` as native and
 * `@capacitor/share` so we can exercise the Share.share success and
 * cancel/error branches that the web tests cannot reach.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

const shareMock = vi.fn()

vi.mock('@capacitor/share', () => ({
  Share: {
    share: (...args: unknown[]) => shareMock(...args),
  },
}))

beforeEach(() => {
  shareMock.mockReset()
  vi.resetModules()
})

describe('native/share (Android Capacitor path)', () => {
  it('share() forwards all options to Share.share and returns true on success', async () => {
    shareMock.mockResolvedValue({ activityType: 'com.example.target' })
    const { share } = await import('./share')
    const ok = await share({
      title: 'T',
      text: 'X',
      url: 'https://example.com',
      dialogTitle: 'Pick app',
    })
    expect(ok).toBe(true)
    expect(shareMock).toHaveBeenCalledWith({
      title: 'T',
      text: 'X',
      url: 'https://example.com',
      dialogTitle: 'Pick app',
    })
  })

  it('share() returns false when Share.share rejects (user cancel or error)', async () => {
    shareMock.mockRejectedValue(new Error('cancelled'))
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const { share } = await import('./share')
    const ok = await share({ text: 'hi' })
    expect(ok).toBe(false)
    expect(debugSpy).toHaveBeenCalled()
    debugSpy.mockRestore()
  })

  it('canShare() is always true on native regardless of Web Share / clipboard support', async () => {
    const { canShare } = await import('./share')
    expect(canShare()).toBe(true)
  })
})
