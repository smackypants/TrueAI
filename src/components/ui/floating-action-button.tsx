import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  onClick: () => void
  icon: ReactNode
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  className,
  size = 'lg'
}: FloatingActionButtonProps) {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-14 w-14',
    lg: 'h-16 w-16'
  }

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 28
  }

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-6 z-40 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg flex items-center justify-center text-white lg:hidden',
        sizeClasses[size],
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
    >
      <div style={{ width: iconSizes[size], height: iconSizes[size] }}>
        {icon}
      </div>
      {label && (
        <span className="ml-2 font-medium text-sm whitespace-nowrap">
          {label}
        </span>
      )}
    </motion.button>
  )
}
