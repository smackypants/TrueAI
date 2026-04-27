import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FloppyDisk, X } from '@phosphor-icons/react'
import type { ModelConfig } from '@/lib/types'

interface ModelConfigPanelProps {
  model: ModelConfig
  onSave: (model: ModelConfig) => void
  onClose: () => void
}

export function ModelConfigPanel({ model, onSave, onClose }: ModelConfigPanelProps) {
  const [localModel, setLocalModel] = useState<ModelConfig>(model)

  const handleSave = () => {
    onSave(localModel)
  }

  return (
    <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold truncate">{model.name}</h3>
          <Badge variant="secondary" className="mt-1 capitalize text-xs">
            {model.provider}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
          <X size={18} className="sm:w-5 sm:h-5" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="max-h-[500px] sm:max-h-none pr-2">
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature" className="text-sm">Temperature</Label>
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {localModel.temperature.toFixed(2)}
              </span>
            </div>
          <Slider
            id="temperature"
            min={0}
            max={2}
            step={0.01}
            value={[localModel.temperature]}
            onValueChange={([value]) =>
              setLocalModel({ ...localModel, temperature: value })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controls randomness. Lower is more focused, higher is more creative.
          </p>
        </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxTokens" className="text-sm">Max Tokens</Label>
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {localModel.maxTokens}
              </span>
            </div>
          <Slider
            id="maxTokens"
            min={100}
            max={4000}
            step={100}
            value={[localModel.maxTokens]}
            onValueChange={([value]) =>
              setLocalModel({ ...localModel, maxTokens: value })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Maximum length of the response in tokens.
          </p>
        </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="topP" className="text-sm">Top P</Label>
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {localModel.topP.toFixed(2)}
              </span>
            </div>
          <Slider
            id="topP"
            min={0}
            max={1}
            step={0.01}
            value={[localModel.topP]}
            onValueChange={([value]) =>
              setLocalModel({ ...localModel, topP: value })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Nucleus sampling. Lower values make responses more deterministic.
          </p>
        </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="frequencyPenalty" className="text-sm">Frequency Penalty</Label>
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {localModel.frequencyPenalty.toFixed(2)}
              </span>
            </div>
          <Slider
            id="frequencyPenalty"
            min={-2}
            max={2}
            step={0.01}
            value={[localModel.frequencyPenalty]}
            onValueChange={([value]) =>
              setLocalModel({ ...localModel, frequencyPenalty: value })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Reduces repetition. Higher values discourage repeated tokens.
          </p>
        </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="presencePenalty" className="text-sm">Presence Penalty</Label>
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {localModel.presencePenalty.toFixed(2)}
              </span>
            </div>
          <Slider
            id="presencePenalty"
            min={-2}
            max={2}
            step={0.01}
            value={[localModel.presencePenalty]}
            onValueChange={([value]) =>
              setLocalModel({ ...localModel, presencePenalty: value })
            }
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Encourages topic diversity. Higher values promote new topics.
          </p>
        </div>

          {model.provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="endpoint" className="text-sm">API Endpoint</Label>
              <Input
                id="endpoint"
                type="url"
                value={localModel.endpoint || ''}
                onChange={(e) =>
                  setLocalModel({ ...localModel, endpoint: e.target.value })
                }
                placeholder="https://api.example.com/v1/chat"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Custom API endpoint for this model.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button onClick={handleSave} className="w-full sm:w-auto">
          <FloppyDisk size={18} className="sm:mr-2" />
          <span className="hidden sm:inline ml-2">Save Configuration</span>
          <span className="sm:hidden ml-2">Save</span>
        </Button>
      </div>
    </Card>
  )
}

export default ModelConfigPanel
