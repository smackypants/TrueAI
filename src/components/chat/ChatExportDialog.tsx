import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DownloadSimple, FileText, FilePdf, FileCode } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type { Message, Conversation } from '@/lib/types'

interface ChatExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: Conversation
  messages: Message[]
}

type ExportFormat = 'txt' | 'json' | 'md' | 'html'

export function ChatExportDialog({ open, onOpenChange, conversation, messages }: ChatExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('txt')
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)

  const exportChat = () => {
    let content = ''
    let filename = ''
    let mimeType = ''

    if (format === 'txt') {
      content = generateTextExport()
      filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_chat.txt`
      mimeType = 'text/plain'
    } else if (format === 'json') {
      content = generateJSONExport()
      filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_chat.json`
      mimeType = 'application/json'
    } else if (format === 'md') {
      content = generateMarkdownExport()
      filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_chat.md`
      mimeType = 'text/markdown'
    } else if (format === 'html') {
      content = generateHTMLExport()
      filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_chat.html`
      mimeType = 'text/html'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    toast.success('Chat exported successfully')
    onOpenChange(false)
  }

  const generateTextExport = () => {
    let text = ''
    
    if (includeMetadata) {
      text += `Conversation: ${conversation.title}\n`
      text += `Model: ${conversation.model}\n`
      text += `Date: ${new Date(conversation.createdAt).toLocaleString()}\n`
      if (conversation.systemPrompt) {
        text += `System Prompt: ${conversation.systemPrompt}\n`
      }
      text += '\n' + '='.repeat(80) + '\n\n'
    }

    messages.forEach((msg) => {
      const role = msg.role.toUpperCase()
      const timestamp = includeTimestamps ? ` [${new Date(msg.timestamp).toLocaleString()}]` : ''
      text += `${role}${timestamp}:\n${msg.content}\n\n${'-'.repeat(80)}\n\n`
    })

    return text
  }

  const generateJSONExport = () => {
    const data = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        systemPrompt: conversation.systemPrompt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model
      })),
      exportedAt: Date.now()
    }
    return JSON.stringify(data, null, 2)
  }

  const generateMarkdownExport = () => {
    let md = `# ${conversation.title}\n\n`
    
    if (includeMetadata) {
      md += `**Model:** ${conversation.model}\n`
      md += `**Date:** ${new Date(conversation.createdAt).toLocaleString()}\n\n`
      if (conversation.systemPrompt) {
        md += `**System Prompt:**\n> ${conversation.systemPrompt}\n\n`
      }
      md += '---\n\n'
    }

    messages.forEach((msg) => {
      const icon = msg.role === 'user' ? '👤' : '🤖'
      const timestamp = includeTimestamps ? ` _${new Date(msg.timestamp).toLocaleString()}_` : ''
      md += `### ${icon} ${msg.role.toUpperCase()}${timestamp}\n\n`
      md += `${msg.content}\n\n`
      md += '---\n\n'
    })

    return md
  }

  const generateHTMLExport = () => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${conversation.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: #fff;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 1rem 0;
      color: #1a1a1a;
    }
    .metadata {
      color: #666;
      font-size: 0.9rem;
    }
    .message {
      background: #fff;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .message.user {
      border-left: 4px solid #3b82f6;
    }
    .message.assistant {
      border-left: 4px solid #10b981;
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .role {
      text-transform: uppercase;
    }
    .timestamp {
      color: #999;
      font-weight: 400;
    }
    .content {
      white-space: pre-wrap;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${conversation.title}</h1>
    ${includeMetadata ? `
    <div class="metadata">
      <p><strong>Model:</strong> ${conversation.model}</p>
      <p><strong>Date:</strong> ${new Date(conversation.createdAt).toLocaleString()}</p>
      ${conversation.systemPrompt ? `<p><strong>System Prompt:</strong> ${conversation.systemPrompt}</p>` : ''}
    </div>
    ` : ''}
  </div>
`

    messages.forEach((msg) => {
      const timestamp = includeTimestamps ? `<span class="timestamp">${new Date(msg.timestamp).toLocaleString()}</span>` : ''
      html += `
  <div class="message ${msg.role}">
    <div class="message-header">
      <span class="role">${msg.role}</span>
      ${timestamp}
    </div>
    <div class="content">${msg.content}</div>
  </div>
`
    })

    html += `
</body>
</html>`

    return html
  }

  const formatIcons = {
    txt: <FileText weight="fill" size={20} />,
    json: <FileCode weight="fill" size={20} />,
    md: <FileText weight="fill" size={20} />,
    html: <FilePdf weight="fill" size={20} />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DownloadSimple weight="fill" className="text-primary" size={24} />
            Export Conversation
          </DialogTitle>
          <DialogDescription>
            Export this conversation in various formats
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">
                  <div className="flex items-center gap-2">
                    {formatIcons.txt}
                    <div>
                      <div className="font-medium">Plain Text</div>
                      <div className="text-xs text-muted-foreground">Simple text format</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    {formatIcons.json}
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-muted-foreground">Structured data format</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="md">
                  <div className="flex items-center gap-2">
                    {formatIcons.md}
                    <div>
                      <div className="font-medium">Markdown</div>
                      <div className="text-xs text-muted-foreground">Formatted markdown</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="html">
                  <div className="flex items-center gap-2">
                    {formatIcons.html}
                    <div>
                      <div className="font-medium">HTML</div>
                      <div className="text-xs text-muted-foreground">Styled web page</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Timestamps</Label>
                <p className="text-xs text-muted-foreground">Show message timestamps</p>
              </div>
              <Switch checked={includeTimestamps} onCheckedChange={setIncludeTimestamps} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Metadata</Label>
                <p className="text-xs text-muted-foreground">Include conversation details</p>
              </div>
              <Switch checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="font-medium mb-1">Preview</div>
            <div className="text-muted-foreground">
              {messages.length} messages will be exported
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={exportChat} className="gap-2">
              <DownloadSimple weight="fill" size={18} />
              Export
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
