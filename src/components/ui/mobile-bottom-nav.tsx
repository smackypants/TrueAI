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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border/50 lg:hidden shadow-2xl">
      <div className="safe-bottom">
        <div className="flex items-center justify-around h-16 px-2 safe-left safe-right">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-xl transition-all duration-200 active:scale-90',
                item.active
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground active:text-accent'
              )}
            >
              {item.active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-accent/15 rounded-xl"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <motion.div 
                  className="transition-transform duration-200"
                  animate={{ 
                    scale: item.active ? 1.1 : 1,
                    y: item.active ? -2 : 0
                  }}
                >
                  {item.icon}
                </motion.div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
