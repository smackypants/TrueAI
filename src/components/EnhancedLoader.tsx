import { motion } from 'framer-motion'
import { memo } from 'react'

interface EnhancedLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export const EnhancedLoader = memo(({ size = 'md', message }: EnhancedLoaderProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  }

  const dotSizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-4 w-4'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        className={`${sizeClasses[size]} relative`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={`${sizeClasses[size]} rounded-full border-4 border-primary/30 border-t-primary`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.2, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground text-center"
        >
          {message}
        </motion.p>
      )}

      <div className="flex gap-2">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${dotSizeClasses[size]} rounded-full bg-accent`}
            animate={{
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
})

EnhancedLoader.displayName = 'EnhancedLoader'
