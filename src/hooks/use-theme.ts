import { useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useKV<Theme>('app-theme', 'dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const root = document.documentElement
    const updateTheme = (isDark: boolean) => {
      root.classList.remove('light', 'dark')
      root.classList.add(isDark ? 'dark' : 'light')
      setResolvedTheme(isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      updateTheme(mediaQuery.matches)

      const listener = (e: MediaQueryListEvent) => updateTheme(e.matches)
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    } else {
      updateTheme(theme === 'dark')
    }
  }, [theme])

  return { theme, setTheme, resolvedTheme }
}
