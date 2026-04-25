import { useState } from 'react'
import { Message } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { User, Robot } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { MessageActions } from './MessageActions'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onExport?: (message: Message) => void
}

export function MessageBubble({ 
  message, 
  isStreaming,
  onEdit,
  onDelete,
  onRegenerate,
  onExport
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [isHovered, setIsHovered] = useState(false)

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'flex gap-3 sm:gap-3 my-3 sm:my-4 group',
          isUser && 'flex-row-reverse'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Avatar className={cn(
            'h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-transparent transition-all duration-200',
            isSystem && 'opacity-50',
            isHovered && !isSystem && 'ring-accent/30'
          )}>
            <AvatarFallback className={cn(
              'transition-colors duration-200',
              isUser && 'bg-accent text-accent-foreground',
              !isUser && 'bg-primary text-primary-foreground'
            )}>
              {isUser ? <User weight="bold" size={18} /> : <Robot weight="bold" size={18} />}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        <div className={cn(
          'flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]',
          isUser && 'items-end'
        )}>
          <div className="relative">
            <motion.div
              className={cn(
                'px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl transition-all duration-200',
                isUser && 'bg-accent text-accent-foreground',
                !isUser && 'bg-card text-card-foreground border border-border',
                isSystem && 'bg-muted text-muted-foreground italic',
                isHovered && !isStreaming && 'shadow-lg'
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
                {isStreaming && (
                  <motion.span
                    className="inline-block w-2 h-4 ml-1 bg-current rounded-sm"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </p>
            </motion.div>

            <MessageActions
              message={message}
              onEdit={onEdit}
              onDelete={onDelete}
              onRegenerate={onRegenerate}
              onExport={onExport}
              isVisible={isHovered && !isStreaming}
              position={isUser ? 'right' : 'left'}
            />
          </div>
          
          <motion.span
            className="text-[11px] sm:text-[13px] text-muted-foreground px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
            {message.model && ` • ${message.model}`}
          </motion.span>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}
