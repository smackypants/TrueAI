import { ReactNode, memo } from 'react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

interface LazyTabContentProps {
  isActive: boolean
  children: ReactNode
  tabName: string
  keepMounted?: boolean
}

export const LazyTabContent = memo(({ 
  isActive, 
  children, 
  tabName,
  keepMounted = false 
}: LazyTabContentProps) => {
  if (!isActive && !keepMounted) {
    return null
  }

  if (!isActive && keepMounted) {
    return <div style={{ display: 'none' }}>{children}</div>
  }

  return <>{children}</>
}, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false
  if (prevProps.tabName !== nextProps.tabName) return false
  return true
})

LazyTabContent.displayName = 'LazyTabContent'
