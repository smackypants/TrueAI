import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Gear, ThermometerSimple, Lightning, Brain, Info } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { Conversation, ModelConfig } from '@/lib/types'

interface ConversationSettingsProps {
  conversation: Conversation
  models: ModelConfig[]
  onUpdate: (updates: Partial<Conversation>) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConversationSettings({ 
  conversation, 
  models, 
  onUpdate,
  open,
  onOpenChange
}: ConversationSettingsProps) {
  const [localSettings, setLocalSettings] = useState({
    title: conversation.title,
    systemPrompt: conversation.systemPrompt || '',
    model: conversation.model,
    temperature: conversation.temperature ?? 0.7,
    maxTokens: conversation.maxTokens ?? 2000,
    streamingEnabled: conversation.streamingEnabled ?? true,
    contextWindow: conversation.contextWindow ?? 10,
  })

  const handleSave = () => {
    onUpdate(localSettings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gear weight="fill" className="text-primary" size={24} />
            Conversation Settings
          </DialogTitle>
          <DialogDescription>
            Customize this conversation's behavior, model parameters, and context
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="conv-settings-title">Conversation Title</Label>
            <Input
              id="conv-settings-title"
              value={localSettings.title}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, title: e.target.value }))}
              placeholder="My Conversation"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="conv-settings-model">Model</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Choose the AI model for this conversation</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={localSettings.model}
              onValueChange={(value) => setLocalSettings(prev => ({ ...prev, model: value }))}
            >
              <SelectTrigger id="conv-settings-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ThermometerSimple weight="fill" size={18} className="text-destructive" />
                  Temperature: {localSettings.temperature}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Controls randomness. Lower = more focused, Higher = more creative</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Slider
                value={[localSettings.temperature]}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, temperature: value }))}
                min={0}
                max={2}
                step={0.1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Precise (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Lightning weight="fill" size={18} className="text-accent" />
                  Max Tokens: {localSettings.maxTokens}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Maximum response length</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Slider
                value={[localSettings.maxTokens]}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, maxTokens: value }))}
                min={100}
                max={4000}
                step={100}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Short (100)</span>
                <span>Standard (2000)</span>
                <span>Long (4000)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Brain weight="fill" size={18} className="text-primary" />
                  Context Window: {localSettings.contextWindow} messages
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Number of previous messages to include as context</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Slider
                value={[localSettings.contextWindow]}
                onValueChange={([value]) => setLocalSettings(prev => ({ ...prev, contextWindow: value }))}
                min={1}
                max={50}
                step={1}
                className="py-2"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Streaming Responses</Label>
              <p className="text-xs text-muted-foreground">Show responses as they're generated</p>
            </div>
            <Switch
              checked={localSettings.streamingEnabled}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, streamingEnabled: checked }))}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="conv-settings-prompt">System Prompt</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Instructions that define the AI's behavior and personality</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              id="conv-settings-prompt"
              value={localSettings.systemPrompt}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="You are a helpful assistant that..."
              rows={5}
              className="font-mono text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalSettings(prev => ({
                  ...prev,
                  systemPrompt: 'You are a helpful assistant that provides clear and concise answers.'
                }))}
              >
                Default
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalSettings(prev => ({
                  ...prev,
                  systemPrompt: 'You are a creative writing assistant that helps with storytelling, poetry, and creative content.'
                }))}
              >
                Creative
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalSettings(prev => ({
                  ...prev,
                  systemPrompt: 'You are a technical expert that provides detailed, accurate information with code examples when relevant.'
                }))}
              >
                Technical
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalSettings(prev => ({
                  ...prev,
                  systemPrompt: 'You are a friendly tutor that explains concepts clearly with examples and encourages learning.'
                }))}
              >
                Tutor
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
