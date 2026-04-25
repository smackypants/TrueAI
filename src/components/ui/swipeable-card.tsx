import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: {
    icon: ReactNode
    label: string
    color: string
  }
  rightAction?: {
    icon: ReactNode
    label: string
    color: string
  }
  className?: string
  disabled?: boolean
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
  disabled = false
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5])
  const leftActionOpacity = useTransform(x, [0, 100], [0, 1])
  const rightActionOpacity = useTransform(x, [-100, 0], [1, 0])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    const threshold = 100

    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight()
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft()
    }

    x.set(0)
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className="relative overflow-hidden">
      {leftAction && (
        <motion.div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-end px-6 rounded-r-lg',
            leftAction.color
          )}
          style={{ opacity: leftActionOpacity, width: '100%' }}
        >
          <div className="flex items-center gap-2 text-white">
            {leftAction.icon}
            <span className="font-medium">{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {rightAction && (
        <motion.div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-start px-6 rounded-l-lg',
            rightAction.color
          )}
          style={{ opacity: rightActionOpacity, width: '100%' }}
        >
          <div className="flex items-center gap-2 text-white">
            {rightAction.icon}
            <span className="font-medium">{rightAction.label}</span>
          </div>
        </motion.div>
      )}

      <motion.div
        className={cn('relative z-10', className)}
        style={{ x, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>

      {isDragging && (
        <div className="absolute inset-0 pointer-events-none" />
      )}
    </div>
  )
}
