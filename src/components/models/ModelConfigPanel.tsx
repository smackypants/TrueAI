import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{model.name}</h3>
          <Badge variant="secondary" className="mt-1 capitalize">
            {model.provider}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">Temperature</Label>
            <span className="text-sm text-muted-foreground font-mono">
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
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <span className="text-sm text-muted-foreground font-mono">
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
            <Label htmlFor="topP">Top P</Label>
            <span className="text-sm text-muted-foreground font-mono">
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
            <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
            <span className="text-sm text-muted-foreground font-mono">
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
            <Label htmlFor="presencePenalty">Presence Penalty</Label>
            <span className="text-sm text-muted-foreground font-mono">
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
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              type="url"
              value={localModel.endpoint || ''}
              onChange={(e) =>
                setLocalModel({ ...localModel, endpoint: e.target.value })
              }
              placeholder="https://api.example.com/v1/chat"
            />
            <p className="text-xs text-muted-foreground">
              Custom API endpoint for this model.
            </p>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <FloppyDisk size={20} className="mr-2" />
          Save Configuration
        </Button>
      </div>
    </Card>
  )
}
