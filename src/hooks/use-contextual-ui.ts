import { useCallback, useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'

export interface UserBehavior {
  mostUsedFeatures: Record<string, number>
  timePatterns: {
    morning: string[]
    afternoon: string[]
    evening: string[]
    night: string[]
  }
  preferredLayouts: Record<string, number>
  errorPatterns: string[]
  sessionDuration: number[]
  lastActive: number
}

export interface ContextualSuggestion {
  id: string
  type: 'feature' | 'shortcut' | 'optimization' | 'tip'
  title: string
  description: string
  action?: () => void
  priority: number
  dismissed?: boolean
}

const initialBehavior: UserBehavior = {
  mostUsedFeatures: {},
  timePatterns: {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  },
  preferredLayouts: {},
  errorPatterns: [],
  sessionDuration: [],
  lastActive: Date.now(),
}

export function useContextualUI() {
  const [behavior, setBehavior] = useKV<UserBehavior>('user-behavior', initialBehavior)

  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useKV<string[]>('dismissed-suggestions', [])

  const trackFeatureUsage = (feature: string) => {
    setBehavior(prev => {
      const base = prev ?? initialBehavior
      return {
        ...base,
        mostUsedFeatures: {
          ...base.mostUsedFeatures,
          [feature]: (base.mostUsedFeatures[feature] || 0) + 1,
        },
      }
    })
  }

  const trackTimeOfDay = (feature: string) => {
    const hour = new Date().getHours()
    let period: keyof UserBehavior['timePatterns']

    if (hour >= 6 && hour < 12) period = 'morning'
    else if (hour >= 12 && hour < 17) period = 'afternoon'
    else if (hour >= 17 && hour < 22) period = 'evening'
    else period = 'night'

    setBehavior(prev => {
      const base = prev ?? initialBehavior
      return {
        ...base,
        timePatterns: {
          ...base.timePatterns,
          [period]: [...new Set([...base.timePatterns[period], feature])],
        },
      }
    })
  }

  const trackError = (error: string) => {
    setBehavior(prev => {
      const base = prev ?? initialBehavior
      return {
        ...base,
        errorPatterns: [...base.errorPatterns.slice(-10), error],
      }
    })
  }

  const trackSessionDuration = (duration: number) => {
    setBehavior(prev => {
      const base = prev ?? initialBehavior
      return {
        ...base,
        sessionDuration: [...base.sessionDuration.slice(-20), duration],
        lastActive: Date.now(),
      }
    })
  }

  const generateSuggestions = useCallback((): ContextualSuggestion[] => {
    if (!behavior) return []

    const newSuggestions: ContextualSuggestion[] = []
    const mostUsed = Object.entries(behavior.mostUsedFeatures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    if (mostUsed.length > 0 && mostUsed[0][1] > 10) {
      newSuggestions.push({
        id: 'keyboard-shortcut',
        type: 'shortcut',
        title: 'Use Keyboard Shortcuts',
        description: `You frequently use ${mostUsed[0][0]}. Try Ctrl+K to quickly access features.`,
        priority: 8,
      })
    }

    const avgSessionDuration = behavior.sessionDuration.length > 0
      ? behavior.sessionDuration.reduce((a, b) => a + b, 0) / behavior.sessionDuration.length
      : 0

    if (avgSessionDuration > 30 * 60 * 1000) {
      newSuggestions.push({
        id: 'break-reminder',
        type: 'tip',
        title: 'Take a Break',
        description: 'You\'ve been working for a while. Consider taking a short break!',
        priority: 5,
      })
    }

    if (behavior.errorPatterns.length > 5) {
      const errorCounts = behavior.errorPatterns.reduce((acc, err) => {
        acc[err] = (acc[err] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const mostCommonError = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)[0]

      if (mostCommonError && mostCommonError[1] > 2) {
        newSuggestions.push({
          id: 'error-help',
          type: 'tip',
          title: 'Need Help?',
          description: `We noticed you encountered "${mostCommonError[0]}" multiple times. Check the docs or adjust your settings.`,
          priority: 9,
        })
      }
    }

    const hour = new Date().getHours()
    let currentPeriod: keyof UserBehavior['timePatterns']
    if (hour >= 6 && hour < 12) currentPeriod = 'morning'
    else if (hour >= 12 && hour < 17) currentPeriod = 'afternoon'
    else if (hour >= 17 && hour < 22) currentPeriod = 'evening'
    else currentPeriod = 'night'

    const commonTimeFeatures = behavior.timePatterns[currentPeriod]
    if (commonTimeFeatures.length > 0) {
      newSuggestions.push({
        id: 'time-pattern',
        type: 'optimization',
        title: 'Quick Access',
        description: `You usually use ${commonTimeFeatures[0]} at this time. Pin it for faster access?`,
        priority: 6,
      })
    }

    return newSuggestions.filter(s => !dismissedSuggestions?.includes(s.id))
  }, [behavior, dismissedSuggestions])

  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => [...(prev || []), suggestionId])
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
  }

  useEffect(() => {
    // Only depend on `generateSuggestions` (which is itself memoized on
    // `behavior` and `dismissedSuggestions`). Listing `behavior` /
    // `dismissedSuggestions` here too would be redundant; listing a
    // non-stable function reference here previously caused an infinite
    // render loop (React error #185).
    setSuggestions(generateSuggestions())
  }, [generateSuggestions])

  const getPredictedNextAction = (): string | null => {
    if (!behavior) return null

    const mostUsed = Object.entries(behavior.mostUsedFeatures)
      .sort(([, a], [, b]) => b - a)

    if (mostUsed.length > 0) {
      return mostUsed[0][0]
    }

    return null
  }

  const getRecommendedFeatures = (): string[] => {
    if (!behavior) return []

    const allFeatures = ['chat', 'agents', 'models', 'workflows', 'analytics', 'builder']
    const usedFeatures = Object.keys(behavior.mostUsedFeatures)
    
    return allFeatures.filter(f => !usedFeatures.includes(f))
  }

  return {
    behavior,
    trackFeatureUsage,
    trackTimeOfDay,
    trackError,
    trackSessionDuration,
    suggestions,
    dismissSuggestion,
    getPredictedNextAction,
    getRecommendedFeatures,
  }
}
