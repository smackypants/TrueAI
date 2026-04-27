import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'

export interface DynamicUIPreferences {
  layoutDensity: 'compact' | 'comfortable' | 'spacious'
  colorScheme: 'default' | 'vibrant' | 'minimal' | 'high-contrast'
  sidebarPosition: 'left' | 'right'
  chatBubbleStyle: 'rounded' | 'sharp' | 'minimal'
  animationIntensity: 'none' | 'subtle' | 'normal' | 'enhanced'
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
  cardStyle: 'flat' | 'elevated' | 'bordered' | 'glass'
  accentColor: string
  backgroundPattern: 'none' | 'dots' | 'grid' | 'waves' | 'gradient'
  autoAdaptLayout: boolean
  smartSpacing: boolean
  contextualColors: boolean
}

export interface AdaptiveLayoutState {
  columnCount: number
  cardSize: 'small' | 'medium' | 'large'
  showSidebar: boolean
  compactMode: boolean
}

const defaultPreferences: DynamicUIPreferences = {
  layoutDensity: 'comfortable',
  colorScheme: 'default',
  sidebarPosition: 'left',
  chatBubbleStyle: 'rounded',
  animationIntensity: 'normal',
  fontSize: 'medium',
  cardStyle: 'elevated',
  accentColor: 'oklch(0.75 0.14 200)',
  backgroundPattern: 'dots',
  autoAdaptLayout: true,
  smartSpacing: true,
  contextualColors: true,
}

interface UIUsageAnalytics {
  mostUsedTabs: Record<string, number>
  timeOfDayPreferences: Record<string, string>
  devicePreferences: Record<string, Partial<DynamicUIPreferences>>
}

const defaultUsage: UIUsageAnalytics = {
  mostUsedTabs: {},
  timeOfDayPreferences: {},
  devicePreferences: {},
}

export function useDynamicUI() {
  const [preferences, setPreferences] = useKV<DynamicUIPreferences>('dynamic-ui-preferences', defaultPreferences)

  const [adaptiveLayout, setAdaptiveLayout] = useState<AdaptiveLayoutState>({
    columnCount: 3,
    cardSize: 'medium',
    showSidebar: true,
    compactMode: false,
  })

  const [usage, setUsage] = useKV<UIUsageAnalytics>('ui-usage-analytics', defaultUsage)

  const updatePreference = useCallback(<K extends keyof DynamicUIPreferences>(
    key: K,
    value: DynamicUIPreferences[K]
  ) => {
    setPreferences(prev => ({ ...(prev ?? defaultPreferences), [key]: value }))
  }, [setPreferences])

  const trackTabUsage = useCallback((tabId: string) => {
    setUsage(prev => {
      const base = prev ?? defaultUsage
      return {
        ...base,
        mostUsedTabs: {
          ...base.mostUsedTabs,
          [tabId]: (base.mostUsedTabs[tabId] || 0) + 1,
        },
      }
    })
  }, [setUsage])

  const adaptToScreenSize = useCallback((width: number) => {
    if (!preferences?.autoAdaptLayout) return

    let columnCount = 3
    let cardSize: 'small' | 'medium' | 'large' = 'medium'
    let showSidebar = true
    let compactMode = false

    if (width < 640) {
      columnCount = 1
      cardSize = 'small'
      showSidebar = false
      compactMode = true
    } else if (width < 1024) {
      columnCount = 2
      cardSize = 'small'
      showSidebar = false
    } else if (width < 1280) {
      columnCount = 2
      cardSize = 'medium'
      showSidebar = true
    } else if (width < 1536) {
      columnCount = 3
      cardSize = 'medium'
      showSidebar = true
    } else {
      columnCount = 4
      cardSize = 'large'
      showSidebar = true
    }

    setAdaptiveLayout({ columnCount, cardSize, showSidebar, compactMode })
  }, [preferences?.autoAdaptLayout])

  useEffect(() => {
    const handleResize = () => {
      adaptToScreenSize(window.innerWidth)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [adaptToScreenSize])

  const getSpacingClass = useCallback(() => {
    if (!preferences) return 'gap-4'
    
    switch (preferences.layoutDensity) {
      case 'compact':
        return 'gap-2'
      case 'spacious':
        return 'gap-6'
      default:
        return 'gap-4'
    }
  }, [preferences])

  const getPaddingClass = useCallback(() => {
    if (!preferences) return 'p-4'
    
    switch (preferences.layoutDensity) {
      case 'compact':
        return 'p-2'
      case 'spacious':
        return 'p-6'
      default:
        return 'p-4'
    }
  }, [preferences])

  const getFontSizeClass = useCallback(() => {
    if (!preferences) return 'text-base'
    
    switch (preferences.fontSize) {
      case 'small':
        return 'text-sm'
      case 'large':
        return 'text-lg'
      case 'xlarge':
        return 'text-xl'
      default:
        return 'text-base'
    }
  }, [preferences])

  const getCardStyleClasses = useCallback(() => {
    if (!preferences) return ''
    
    const baseClasses = 'transition-all duration-200'
    
    switch (preferences.cardStyle) {
      case 'flat':
        return `${baseClasses} bg-card border-0 shadow-none`
      case 'elevated':
        return `${baseClasses} bg-card border border-border/50 shadow-lg hover:shadow-xl`
      case 'bordered':
        return `${baseClasses} bg-card border-2 border-border shadow-sm`
      case 'glass':
        return `${baseClasses} bg-card/80 backdrop-blur-xl border border-border/30 shadow-lg`
      default:
        return baseClasses
    }
  }, [preferences])

  const getAnimationClasses = useCallback(() => {
    if (!preferences) return ''
    
    switch (preferences.animationIntensity) {
      case 'none':
        return ''
      case 'subtle':
        return 'transition-opacity duration-150'
      case 'enhanced':
        return 'transition-all duration-300 hover:scale-[1.02]'
      default:
        return 'transition-all duration-200'
    }
  }, [preferences])

  return {
    preferences,
    updatePreference,
    setPreferences,
    adaptiveLayout,
    usage,
    trackTabUsage,
    getSpacingClass,
    getPaddingClass,
    getFontSizeClass,
    getCardStyleClasses,
    getAnimationClasses,
  }
}
