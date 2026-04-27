import { useEffect, useRef, RefObject } from 'react'

export function useScrollOptimization(elementRef: RefObject<HTMLElement>) {
  const rafRef = useRef<number>()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let ticking = false
    const _lastScrollY = element.scrollTop

    const handleScroll = () => {
      _lastScrollY = element.scrollTop

      if (!ticking) {
        rafRef.current = requestAnimationFrame(() => {
          ticking = false
        })
        ticking = true
      }
    }

    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      element.removeEventListener('scroll', handleScroll)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [elementRef])
}

export function smoothScrollTo(
  element: HTMLElement,
  targetY: number,
  duration: number = 300
) {
  const startY = element.scrollTop
  const distance = targetY - startY
  const startTime = performance.now()

  function step(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    const easeInOutCubic = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2

    element.scrollTop = startY + distance * easeInOutCubic

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

export class ScrollManager {
  private static scrollPositions = new Map<string, number>()

  static savePosition(key: string, element: HTMLElement) {
    this.scrollPositions.set(key, element.scrollTop)
  }

  static restorePosition(key: string, element: HTMLElement) {
    const position = this.scrollPositions.get(key)
    if (position !== undefined) {
      element.scrollTop = position
    }
  }

  static clearPosition(key: string) {
    this.scrollPositions.delete(key)
  }

  static clearAll() {
    this.scrollPositions.clear()
  }
}
