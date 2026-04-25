import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface MobileBottomNavProps {
  items: Array<{
    id: string
    label: string
    icon: ReactNode
    active?: boolean
    onClick: () => void
  }>
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-lg transition-colors',
              item.active
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute inset-0 bg-accent/10 rounded-lg"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30
                }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className={cn('transition-transform', item.active && 'scale-110')}>
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          </button>
        ))}
      </div>
    </nav>
  )
}
