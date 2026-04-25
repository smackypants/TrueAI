import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Message, Conversation } from '@/lib/types'

interface ChatSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: Conversation[]
  messages: Message[]
  onSelectMessage: (conversationId: string, messageId: string) => void
}

interface SearchResult {
  message: Message
  conversation: Conversation
  preview: string
  matchCount: number
}

export function ChatSearch({
  open,
  onOpenChange,
  conversations,
  messages,
  onSelectMessage
}: ChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    const results: SearchResult[] = []

    messages.forEach(message => {
      const content = message.content.toLowerCase()
      if (content.includes(query)) {
        const conversation = conversations.find(c => c.id === message.conversationId)
        if (conversation) {
          const matchIndex = content.indexOf(query)
          const start = Math.max(0, matchIndex - 40)
          const end = Math.min(content.length, matchIndex + query.length + 40)
          const preview = (start > 0 ? '...' : '') + 
                         message.content.substring(start, end) + 
                         (end < content.length ? '...' : '')

          const matchCount = (content.match(new RegExp(query, 'g')) || []).length

          results.push({
            message,
            conversation,
            preview,
            matchCount
          })
        }
      }
    })

    return results.sort((a, b) => b.matchCount - a.matchCount)
  }, [searchQuery, messages, conversations])

  const handleSelectResult = (result: SearchResult) => {
    onSelectMessage(result.conversation.id, result.message.id)
    onOpenChange(false)
    setSearchQuery('')
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-accent text-accent-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagnifyingGlass weight="bold" className="text-primary" size={24} />
            Search Conversations
          </DialogTitle>
          <DialogDescription>
            Search through all your messages and conversations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <MagnifyingGlass 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </Button>
            )}
          </div>

          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
            </div>
          )}

          <ScrollArea className="flex-1 pr-4">
            <AnimatePresence mode="popLayout">
              {searchQuery && searchResults.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <MagnifyingGlass size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No messages found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try a different search term
                  </p>
                </motion.div>
              )}

              {!searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <MagnifyingGlass size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Start typing to search</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Search through all your conversations
                  </p>
                </motion.div>
              )}

              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <motion.div
                    key={result.message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-4 justify-start text-left hover:bg-accent/50"
                      onClick={() => handleSelectResult(result)}
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="shrink-0">
                            {result.conversation.title}
                          </Badge>
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {result.message.role}
                          </Badge>
                          {result.matchCount > 1 && (
                            <Badge variant="outline" className="shrink-0">
                              {result.matchCount} matches
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            {new Date(result.message.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {highlightText(result.preview, searchQuery)}
                        </p>
                      </div>
                    </Button>
                    {index < searchResults.length - 1 && <Separator />}
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
