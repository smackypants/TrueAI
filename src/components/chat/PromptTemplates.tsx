import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Lightning, Trash, PencilSimple, Star, BookBookmark } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface PromptTemplate {
  id: string
  title: string
  content: string
  category: string
  isFavorite: boolean
  usageCount: number
  createdAt: number
}

interface PromptTemplatesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: PromptTemplate) => void
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'explain-code',
    title: 'Explain Code',
    content: 'Please explain the following code in detail:\n\n[paste code here]',
    category: 'Development',
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now()
  },
  {
    id: 'summarize-text',
    title: 'Summarize Text',
    content: 'Please provide a concise summary of the following text:\n\n[paste text here]',
    category: 'Writing',
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now()
  },
  {
    id: 'creative-story',
    title: 'Creative Story',
    content: 'Write a creative story about [topic]. Include vivid descriptions and engaging dialogue.',
    category: 'Creative',
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now()
  },
  {
    id: 'debug-code',
    title: 'Debug Code',
    content: 'Help me debug this code. Identify any issues and suggest fixes:\n\n[paste code here]',
    category: 'Development',
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now()
  },
  {
    id: 'improve-writing',
    title: 'Improve Writing',
    content: 'Please improve the following text for clarity, grammar, and style:\n\n[paste text here]',
    category: 'Writing',
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now()
  },
  {
    id: 'brainstorm',
    title: 'Brainstorm Ideas',
    content: 'Help me brainstorm creative ideas for [topic]. Provide at least 10 unique suggestions.',
    category: 'Creative',
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now()
  }
]

export function PromptTemplates({ open, onOpenChange, onSelectTemplate }: PromptTemplatesProps) {
  const [templates, setTemplates] = useKV<PromptTemplate[]>('prompt-templates', DEFAULT_TEMPLATES)
  const [newTemplateDialog, setNewTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General'
  })

  const categories = ['all', ...Array.from(new Set((templates || []).map(t => t.category)))]

  const filteredTemplates = (templates || []).filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreateTemplate = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    const newTemplate: PromptTemplate = {
      id: `template-${Date.now()}`,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      isFavorite: false,
      usageCount: 0,
      createdAt: Date.now()
    }

    setTemplates((prev) => [newTemplate, ...(prev || [])])
    setFormData({ title: '', content: '', category: 'General' })
    setNewTemplateDialog(false)
    toast.success('Template created')
  }

  const handleEditTemplate = () => {
    if (!editingTemplate || !formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    setTemplates((prev) =>
      (prev || []).map(t =>
        t.id === editingTemplate.id
          ? { ...t, title: formData.title, content: formData.content, category: formData.category }
          : t
      )
    )
    setEditingTemplate(null)
    setFormData({ title: '', content: '', category: 'General' })
    toast.success('Template updated')
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => (prev || []).filter(t => t.id !== templateId))
    toast.success('Template deleted')
  }

  const handleToggleFavorite = (templateId: string) => {
    setTemplates((prev) =>
      (prev || []).map(t =>
        t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
      )
    )
  }

  const handleSelectTemplate = (template: PromptTemplate) => {
    setTemplates((prev) =>
      (prev || []).map(t =>
        t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
      )
    )
    onSelectTemplate(template)
    onOpenChange(false)
  }

  const openEditDialog = (template: PromptTemplate) => {
    setEditingTemplate(template)
    setFormData({
      title: template.title,
      content: template.content,
      category: template.category
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookBookmark weight="fill" className="text-primary" size={24} />
              Prompt Templates
            </DialogTitle>
            <DialogDescription>
              Save and reuse common prompts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setNewTemplateDialog(true)} className="gap-2">
                <Plus weight="bold" size={18} />
                New
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>

            <ScrollArea className="flex-1 pr-4">
              <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTemplates
                    .sort((a, b) => {
                      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
                      return b.usageCount - a.usageCount
                    })
                    .map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer group">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold truncate">{template.title}</h3>
                                  {template.isFavorite && (
                                    <Star weight="fill" size={16} className="text-yellow-500 shrink-0" />
                                  )}
                                </div>
                                <Badge variant="secondary" className="mt-1">
                                  {template.category}
                                </Badge>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleFavorite(template.id)
                                      }}
                                    >
                                      <Star
                                        weight={template.isFavorite ? 'fill' : 'regular'}
                                        size={14}
                                        className={template.isFavorite ? 'text-yellow-500' : ''}
                                      />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{template.isFavorite ? 'Unfavorite' : 'Favorite'}</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEditDialog(template)
                                      }}
                                    >
                                      <PencilSimple size={14} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteTemplate(template.id)
                                      }}
                                    >
                                      <Trash size={14} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {template.content}
                            </p>

                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs text-muted-foreground">
                                Used {template.usageCount} times
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleSelectTemplate(template)}
                                className="gap-2"
                              >
                                <Lightning weight="fill" size={14} />
                                Use
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                </div>
              </AnimatePresence>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <BookBookmark size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No templates found</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newTemplateDialog || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setNewTemplateDialog(false)
          setEditingTemplate(null)
          setFormData({ title: '', content: '', category: 'General' })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update' : 'Create a new'} prompt template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-title">Title</Label>
              <Input
                id="template-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Explain Code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category">Category</Label>
              <Input
                id="template-category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Development"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">Prompt Content</Label>
              <Textarea
                id="template-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Please explain the following code..."
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewTemplateDialog(false)
                setEditingTemplate(null)
                setFormData({ title: '', content: '', category: 'General' })
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingTemplate ? handleEditTemplate : handleCreateTemplate}>
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
