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
  size = 'md'
}: FloatingActionButtonProps) {
  const sizeClasses = {
    sm: 'h-14 w-14',
    md: 'h-16 w-16',
    lg: 'h-18 w-18'
  }

  const iconSizes = {
    sm: 22,
    md: 26,
    lg: 30
  }

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'fixed bottom-24 right-5 z-40 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent shadow-2xl flex items-center justify-center text-white lg:hidden active:shadow-3xl safe-right',
        sizeClasses[size],
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.88 }}
      initial={{ scale: 0, opacity: 0, rotate: -45 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0, rotate: 45 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
    >
      <motion.div 
        style={{ width: iconSizes[size], height: iconSizes[size] }}
        whileTap={{ rotate: 90 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>
      {label && (
        <span className="ml-2 font-medium text-sm whitespace-nowrap">
          {label}
        </span>
      )}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-accent/30"
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
      />
    </motion.button>
  )
}
