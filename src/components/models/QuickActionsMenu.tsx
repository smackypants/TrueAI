import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Lightning, Thermometer, Cube, ArrowsOutSimple, Robot, PencilSimple, Sparkle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { ModelConfig } from '@/lib/types'
import { motion } from 'framer-motion'

interface QuickActionsMenuProps {
  model: ModelConfig
  onUpdate: (model: ModelConfig) => void
}

interface Preset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  settings: Partial<ModelConfig>
  color: string
}

const presets: Preset[] = [
  {
    id: 'creative',
    name: 'Creative',
    description: 'High creativity, diverse outputs',
    icon: <Sparkle weight="fill" />,
    settings: {
      temperature: 1.2,
      topP: 0.95,
      frequencyPenalty: 0.5,
      presencePenalty: 0.6
    },
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good mix of creativity and focus',
    icon: <Lightning weight="fill" />,
    settings: {
      temperature: 0.7,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'precise',
    name: 'Precise',
    description: 'Low randomness, focused responses',
    icon: <Robot weight="fill" />,
    settings: {
      temperature: 0.3,
      topP: 0.7,
      frequencyPenalty: -0.2,
      presencePenalty: -0.2
    },
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'code',
    name: 'Code',
    description: 'Optimized for coding tasks',
    icon: <PencilSimple weight="fill" />,
    settings: {
      temperature: 0.2,
      topP: 0.5,
      frequencyPenalty: 0,
      presencePenalty: 0,
      maxTokens: 3000
    },
    color: 'from-orange-500 to-amber-500'
  }
]

export function QuickActionsMenu({ model, onUpdate }: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [localModel, setLocalModel] = useState<ModelConfig>(model)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const applyPreset = (preset: Preset) => {
    const updated = { ...localModel, ...preset.settings }
    setLocalModel(updated)
    setSelectedPreset(preset.id)
    toast.success(`Applied ${preset.name} preset`)
  }

  const handleSave = () => {
    onUpdate(localModel)
    setOpen(false)
    toast.success('Settings saved')
  }

  const handleReset = () => {
    setLocalModel(model)
    setSelectedPreset(null)
    toast.info('Settings reset')
  }

  const quickAdjust = (param: keyof ModelConfig, delta: number) => {
    const current = localModel[param] as number
    let newValue = current + delta
    
    if (param === 'temperature') {
      newValue = Math.max(0, Math.min(2, newValue))
    } else if (param === 'topP') {
      newValue = Math.max(0, Math.min(1, newValue))
    } else if (param === 'maxTokens') {
      newValue = Math.max(100, Math.min(4000, newValue))
    } else if (param === 'frequencyPenalty' || param === 'presencePenalty') {
      newValue = Math.max(-2, Math.min(2, newValue))
    }
    
    setLocalModel({ ...localModel, [param]: newValue })
    setSelectedPreset(null)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Lightning weight="fill" size={18} />
          Quick Settings
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 pt-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Lightning weight="fill" className="text-primary" size={24} />
              Quick Settings
            </SheetTitle>
            <SheetDescription>
              {model.name} - Fast access to common configurations
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                  Presets
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {presets.map((preset) => (
                    <motion.div
                      key={preset.id}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        className={`p-4 cursor-pointer transition-all ${
                          selectedPreset === preset.id
                            ? 'ring-2 ring-primary border-primary'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => applyPreset(preset)}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center text-white shadow-lg`}>
                            {preset.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{preset.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {preset.description}
                            </p>
                          </div>
                          {selectedPreset === preset.id && (
                            <Badge variant="default" className="text-xs mt-1">
                              Active
                            </Badge>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  Fine-tune Settings
                </h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Thermometer size={18} className="text-accent" />
                        <Label className="text-sm font-medium">Temperature</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => quickAdjust('temperature', -0.1)}
                        >
                          -
                        </Button>
                        <span className="text-sm font-mono font-semibold min-w-[3rem] text-center">
                          {localModel.temperature.toFixed(2)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => quickAdjust('temperature', 0.1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[localModel.temperature]}
                      onValueChange={([value]) => {
                        setLocalModel({ ...localModel, temperature: value })
                        setSelectedPreset(null)
                      }}
                      min={0}
                      max={2}
                      step={0.01}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Controls randomness and creativity
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cube size={18} className="text-accent" />
                        <Label className="text-sm font-medium">Max Tokens</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => quickAdjust('maxTokens', -100)}
                        >
                          -
                        </Button>
                        <span className="text-sm font-mono font-semibold min-w-[3rem] text-center">
                          {localModel.maxTokens}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => quickAdjust('maxTokens', 100)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[localModel.maxTokens]}
                      onValueChange={([value]) => {
                        setLocalModel({ ...localModel, maxTokens: value })
                        setSelectedPreset(null)
                      }}
                      min={100}
                      max={4000}
                      step={100}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum response length
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowsOutSimple size={18} className="text-accent" />
                        <Label className="text-sm font-medium">Top P</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => quickAdjust('topP', -0.05)}
                        >
                          -
                        </Button>
                        <span className="text-sm font-mono font-semibold min-w-[3rem] text-center">
                          {localModel.topP.toFixed(2)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => quickAdjust('topP', 0.05)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[localModel.topP]}
                      onValueChange={([value]) => {
                        setLocalModel({ ...localModel, topP: value })
                        setSelectedPreset(null)
                      }}
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Nucleus sampling threshold
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4 space-y-2 safe-bottom">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                className="flex-1"
              >
                Apply Settings
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
