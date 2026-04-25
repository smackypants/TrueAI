import { useEffect, useRef } from 'react'

export function useSafeTab(tabName: string, activeTab: string) {
  const isMountedRef = useRef(false)
  const isActiveRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    isActiveRef.current = tabName === activeTab

    return () => {
      isMountedRef.current = false
      isActiveRef.current = false
    }
  }, [tabName, activeTab])

  const isSafe = () => {
    return isMountedRef.current && isActiveRef.current
  }

  return { isMounted: isMountedRef.current, isActive: isActiveRef.current, isSafe }
}
