import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { smoothScrollTo, ScrollManager, useScrollOptimization } from './scroll-optimization'

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

  describe('useScrollOptimization', () => {
    let rafCallbacks: Array<{ id: number; cb: (t: number) => void }>
    let nextRafId: number
    let cancelled: number[]

    beforeEach(() => {
      rafCallbacks = []
      nextRafId = 0
      cancelled = []
      vi.stubGlobal(
        'requestAnimationFrame',
        ((cb: (t: number) => void): number => {
          const id = ++nextRafId
          rafCallbacks.push({ id, cb })
          return id
        }) as unknown as typeof requestAnimationFrame,
      )
      vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
        cancelled.push(id)
      }) as unknown as typeof cancelAnimationFrame)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    function flushOne() {
      const next = rafCallbacks.shift()
      if (next) next.cb(0)
    }

    it('is a no-op when the ref is null (early return)', () => {
      const ref = { current: null }
      const { unmount } = renderHook(() => useScrollOptimization(ref))
      // No raf scheduled, no listener registered → unmount must not throw.
      expect(rafCallbacks.length).toBe(0)
      unmount()
    })

    it('attaches a passive scroll listener and removes it on unmount', () => {
      const el = document.createElement('div')
      const addSpy = vi.spyOn(el, 'addEventListener')
      const removeSpy = vi.spyOn(el, 'removeEventListener')
      const ref = { current: el }

      const { unmount } = renderHook(() => useScrollOptimization(ref))

      expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
      const handler = addSpy.mock.calls[0][1] as EventListener

      unmount()
      // Same handler reference must be passed to removeEventListener.
      expect(removeSpy).toHaveBeenCalledWith('scroll', handler)
    })

    it('schedules at most one rAF per scroll burst (ticking guard)', () => {
      const el = document.createElement('div')
      const ref = { current: el }
      renderHook(() => useScrollOptimization(ref))

      // Fire several scroll events back-to-back; only the first should
      // schedule a rAF because `ticking` flips true.
      el.dispatchEvent(new Event('scroll'))
      el.dispatchEvent(new Event('scroll'))
      el.dispatchEvent(new Event('scroll'))
      expect(rafCallbacks.length).toBe(1)

      // After the rAF fires, ticking resets to false and a new scroll
      // can schedule again.
      flushOne()
      el.dispatchEvent(new Event('scroll'))
      expect(rafCallbacks.length).toBe(1)
    })

    it('cancels the pending rAF on unmount', () => {
      const el = document.createElement('div')
      const ref = { current: el }
      const { unmount } = renderHook(() => useScrollOptimization(ref))

      el.dispatchEvent(new Event('scroll'))
      const scheduledId = rafCallbacks[0].id

      unmount()
      expect(cancelled).toContain(scheduledId)
    })

    it('does not call cancelAnimationFrame when no rAF was scheduled', () => {
      const el = document.createElement('div')
      const ref = { current: el }
      const { unmount } = renderHook(() => useScrollOptimization(ref))

      // No scroll → no rAF → cleanup must skip cancelAnimationFrame.
      unmount()
      expect(cancelled.length).toBe(0)
    })

    it('still works with a real ref-like wrapper', () => {
      // Exercises the same code path via a useRef-driven hook.
      const el = document.createElement('div')
      const { result, unmount } = renderHook(() => {
        const ref = useRef<HTMLElement>(el)
        useScrollOptimization(ref)
        return ref
      })
      expect(result.current.current).toBe(el)
      el.dispatchEvent(new Event('scroll'))
      expect(rafCallbacks.length).toBe(1)
      unmount()
    })
  })
})
