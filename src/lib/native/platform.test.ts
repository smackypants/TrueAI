import { describe, it, expect } from 'vitest'
import { getPlatform, isNative, isAndroid, isIOS, isPluginAvailable } from './platform'

describe('native/platform', () => {
  it('reports web platform under jsdom', () => {
    expect(getPlatform()).toBe('web')
  })

  it('isNative returns false on web', () => {
    expect(isNative()).toBe(false)
  })

  it('isAndroid / isIOS return false on web', () => {
    expect(isAndroid()).toBe(false)
    expect(isIOS()).toBe(false)
  })

  it('isPluginAvailable returns boolean and never throws', () => {
    expect(typeof isPluginAvailable('Network')).toBe('boolean')
    expect(typeof isPluginAvailable('NoSuchPluginThatExists')).toBe('boolean')
  })
})
