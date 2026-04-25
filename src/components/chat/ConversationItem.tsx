import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { motion } from 'framer-motion'
import { PushPin, Archive, Trash } from '@phosphor-icons/react'
import type { Conversation } from '@/lib/types'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  index: number
  onPin?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onClick,
  index,
  onPin,
  onArchive,
  onDelete
}: ConversationItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      whileHover={{ x: 4 }}
      className="group relative"
    >
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className="w-full justify-start text-left h-auto py-3 px-4 transition-all duration-200 hover:shadow-md"
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {conversation.pinned && (
              <PushPin weight="fill" size={14} className="text-primary shrink-0" />
            )}
            <p className="truncate font-medium text-sm sm:text-base flex-1">
              {conversation.title}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(conversation.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </Button>

      {!conversation.archived && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onPin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPin(conversation.id)
                  }}
                >
                  <PushPin 
                    size={12} 
                    weight={conversation.pinned ? 'fill' : 'regular'}
                    className={conversation.pinned ? 'text-primary' : ''}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{conversation.pinned ? 'Unpin' : 'Pin'}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onArchive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onArchive(conversation.id)
                  }}
                >
                  <Archive size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Archive</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conversation.id)
                  }}
                >
                  <Trash size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </motion.div>
  )
})
