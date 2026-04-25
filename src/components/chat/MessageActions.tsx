import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Check, ArrowBendUpLeft, PencilSimple, Trash, Download } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import type { Message } from '@/lib/types'

interface MessageActionsProps {
  message: Message
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onExport?: (message: Message) => void
  isVisible: boolean
  position: 'left' | 'right'
}

export function MessageActions({
  message,
  onEdit,
  onDelete,
  onRegenerate,
  onExport,
  isVisible,
  position
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim())
      toast.success('Message edited')
    }
    setEditDialogOpen(false)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id)
      toast.success('Message deleted')
    }
    setDeleteDialogOpen(false)
  }

  const handleExport = () => {
    if (onExport) {
      onExport(message)
      toast.success('Message exported')
    }
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`absolute -top-10 flex gap-1 ${position === 'right' ? 'right-0' : 'left-0'}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 shadow-lg active:scale-95 transition-transform"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check size={14} weight="bold" className="text-green-500" />
                  ) : (
                    <Copy size={14} weight="bold" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? 'Copied!' : 'Copy'}</p>
              </TooltipContent>
            </Tooltip>

            {message.role === 'assistant' && onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 shadow-lg active:scale-95 transition-transform"
                    onClick={() => onRegenerate(message.id)}
                  >
                    <ArrowBendUpLeft size={14} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Regenerate</p>
                </TooltipContent>
              </Tooltip>
            )}

            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 shadow-lg active:scale-95 transition-transform"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <PencilSimple size={14} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            )}

            {onExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 shadow-lg active:scale-95 transition-transform"
                    onClick={handleExport}
                  >
                    <Download size={14} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export</p>
                </TooltipContent>
              </Tooltip>
            )}

            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 shadow-lg active:scale-95 transition-transform hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash size={14} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Make changes to this message
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editContent.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
