import { ReactNode, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabName}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false
  if (prevProps.tabName !== nextProps.tabName) return false
  return true
})

LazyTabContent.displayName = 'LazyTabContent'
