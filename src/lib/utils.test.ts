import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('should handle undefined and null values', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('should merge Tailwind classes correctly (avoid conflicts)', () => {
    // twMerge should handle conflicting Tailwind classes
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle array of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })

  it('should handle object notation', () => {
    expect(cn({
      'class1': true,
      'class2': false,
      'class3': true
    })).toBe('class1 class3')
  })

  it('should handle complex mixed inputs', () => {
    expect(cn(
      'base-class',
      {
        'conditional-true': true,
        'conditional-false': false
      },
      ['array-class-1', 'array-class-2'],
      undefined,
      'final-class'
    )).toBe('base-class conditional-true array-class-1 array-class-2 final-class')
  })
})
