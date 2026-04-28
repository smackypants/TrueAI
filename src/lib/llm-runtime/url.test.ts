import { describe, it, expect } from 'vitest'
import { stripTrailingSlashes, joinUrl } from './url'

describe('llm-runtime/url', () => {
  describe('stripTrailingSlashes', () => {
    it('removes a single trailing slash', () => {
      expect(stripTrailingSlashes('https://example.com/')).toBe('https://example.com')
    })

    it('removes multiple trailing slashes', () => {
      expect(stripTrailingSlashes('https://example.com////')).toBe('https://example.com')
    })

    it('returns the URL unchanged when there is no trailing slash', () => {
      expect(stripTrailingSlashes('https://example.com')).toBe('https://example.com')
    })

    it('does not strip slashes elsewhere in the URL', () => {
      expect(stripTrailingSlashes('https://example.com/api/v1/')).toBe('https://example.com/api/v1')
    })

    it('handles an empty string', () => {
      expect(stripTrailingSlashes('')).toBe('')
    })

    it('handles a string of only slashes', () => {
      expect(stripTrailingSlashes('////')).toBe('')
    })
  })

  describe('joinUrl', () => {
    it('joins a base URL and a path with no overlapping slashes', () => {
      expect(joinUrl('https://example.com', 'api/chat')).toBe('https://example.com/api/chat')
    })

    it('handles a base URL with a trailing slash', () => {
      expect(joinUrl('https://example.com/', 'api/chat')).toBe('https://example.com/api/chat')
    })

    it('handles a path with a leading slash', () => {
      expect(joinUrl('https://example.com', '/api/chat')).toBe('https://example.com/api/chat')
    })

    it('handles both a trailing slash on base and leading slash on path', () => {
      expect(joinUrl('https://example.com/', '/api/chat')).toBe('https://example.com/api/chat')
    })

    it('handles multiple slashes on both sides', () => {
      expect(joinUrl('https://example.com///', '///api/chat')).toBe('https://example.com/api/chat')
    })

    it('joins with an empty path producing a trailing slash', () => {
      expect(joinUrl('https://example.com', '')).toBe('https://example.com/')
    })

    it('preserves an existing path on the base URL', () => {
      expect(joinUrl('https://example.com/v1', 'models')).toBe('https://example.com/v1/models')
    })
  })
})
