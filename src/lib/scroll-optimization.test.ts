import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { smoothScrollTo, ScrollManager } from './scroll-optimization'

function makeElement(scrollTop = 0): HTMLElement {
  const el = document.createElement('div')
  el.scrollTop = scrollTop
  return el
}

describe('scroll-optimization', () => {
  describe('ScrollManager', () => {
    beforeEach(() => {
      ScrollManager.clearAll()
    })

    it('saves and restores a scroll position', () => {
      const el = makeElement(120)
      ScrollManager.savePosition('list', el)

      const target = makeElement(0)
      ScrollManager.restorePosition('list', target)
      expect(target.scrollTop).toBe(120)
    })

    it('does not change scrollTop when no position is saved for that key', () => {
      const target = makeElement(50)
      ScrollManager.restorePosition('missing', target)
      expect(target.scrollTop).toBe(50)
    })

    it('clears a single position by key', () => {
      const el = makeElement(80)
      ScrollManager.savePosition('a', el)
      ScrollManager.savePosition('b', el)

      ScrollManager.clearPosition('a')

      const targetA = makeElement(0)
      ScrollManager.restorePosition('a', targetA)
      expect(targetA.scrollTop).toBe(0)

      const targetB = makeElement(0)
      ScrollManager.restorePosition('b', targetB)
      expect(targetB.scrollTop).toBe(80)
    })

    it('clears all saved positions', () => {
      const el = makeElement(80)
      ScrollManager.savePosition('a', el)
      ScrollManager.savePosition('b', el)
      ScrollManager.clearAll()

      const target = makeElement(0)
      ScrollManager.restorePosition('a', target)
      ScrollManager.restorePosition('b', target)
      expect(target.scrollTop).toBe(0)
    })

    it('overwrites a previously saved position for the same key', () => {
      const first = makeElement(40)
      ScrollManager.savePosition('k', first)
      const second = makeElement(200)
      ScrollManager.savePosition('k', second)

      const target = makeElement(0)
      ScrollManager.restorePosition('k', target)
      expect(target.scrollTop).toBe(200)
    })

    it('shares state across all callers (static map)', () => {
      const el = makeElement(15)
      ScrollManager.savePosition('shared', el)
      const target = makeElement(0)
      ScrollManager.restorePosition('shared', target)
      expect(target.scrollTop).toBe(15)
    })
  })

  describe('smoothScrollTo', () => {
    let now = 0
    const rafCallbacks: Array<(t: number) => void> = []

    beforeEach(() => {
      now = 0
      rafCallbacks.length = 0
      vi.spyOn(performance, 'now').mockImplementation(() => now)
      vi.stubGlobal(
        'requestAnimationFrame',
        ((cb: (t: number) => void): number => {
          rafCallbacks.push(cb)
          return rafCallbacks.length
        }) as unknown as typeof requestAnimationFrame,
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    function flushAt(time: number) {
      now = time
      const cb = rafCallbacks.shift()
      if (cb) cb(time)
    }

    it('does not change scrollTop on the first frame at t=0', () => {
      const el = makeElement(0)
      smoothScrollTo(el, 100, 300)
      flushAt(0)
      expect(el.scrollTop).toBe(0)
    })

    it('lands exactly on the target when the duration has elapsed', () => {
      const el = makeElement(0)
      smoothScrollTo(el, 100, 300)
      // First scheduled frame
      flushAt(300)
      expect(el.scrollTop).toBe(100)
      // No more frames should be scheduled past completion
      expect(rafCallbacks.length).toBe(0)
    })

    it('continues scheduling frames while progress < 1', () => {
      const el = makeElement(0)
      smoothScrollTo(el, 100, 300)
      flushAt(150) // halfway
      // Halfway through eased curve should sit at 50 (cubic ease symmetric at 0.5)
      expect(el.scrollTop).toBeCloseTo(50, 5)
      // A new frame should have been scheduled
      expect(rafCallbacks.length).toBe(1)
    })

    it('handles scrolling upward (negative distance)', () => {
      const el = makeElement(200)
      smoothScrollTo(el, 0, 300)
      flushAt(300)
      expect(el.scrollTop).toBe(0)
    })

    it('uses the default duration of 300ms when omitted', () => {
      const el = makeElement(0)
      smoothScrollTo(el, 100)
      flushAt(300)
      expect(el.scrollTop).toBe(100)
    })
  })
})
