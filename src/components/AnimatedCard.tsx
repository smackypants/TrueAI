import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, hover = true, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          duration: 0.3,
          delay,
          ease: [0.4, 0, 0.2, 1]
        }}
        whileHover={hover ? { 
          y: -4,
          transition: { duration: 0.2 }
        } : undefined}
        className={cn(
          "backdrop-blur-sm bg-card/80 border-border/50 shadow-lg transition-shadow duration-300",
          hover && "hover:shadow-xl hover:shadow-primary/5",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'
