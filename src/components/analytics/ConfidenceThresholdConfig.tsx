import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Gear,
  ShieldCheck,
  Lightning,
  Brain,
  Warning,
  Info,
  CheckCircle,
  Target,
  Download,
  Upload
} from '@phosphor-icons/react'
import type { ThresholdConfig } from '@/lib/confidence-thresholds'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface ConfidenceThresholdConfigProps {
  config: ThresholdConfig
  onConfigChange: (config: ThresholdConfig) => void
  sessionStats?: {
    totalImplemented: number
    autoImplemented: number
    manualImplemented: number
    averageConfidence: number
  }
}

export function ConfidenceThresholdConfig({
  config,
  onConfigChange,
  sessionStats
}: ConfidenceThresholdConfigProps) {
  const [activePreset, setActivePreset] = useState<'custom' | 'conservative' | 'balanced' | 'aggressive'>('custom')

  const presets = {
    conservative: {
      name: 'Conservative',
      description: 'High confidence required, minimal auto-implementation',
      icon: <ShieldCheck weight="fill" size={20} />,
      color: 'text-blue-500'
    },
    balanced: {
      name: 'Balanced',
      description: 'Moderate confidence, selective auto-implementation',
      icon: <Target weight="fill" size={20} />,
      color: 'text-purple-500'
    },
    aggressive: {
      name: 'Aggressive',
      description: 'Lower confidence threshold, more auto-implementation',
      icon: <Lightning weight="fill" size={20} />,
      color: 'text-orange-500'
    }
  }

  const handlePresetChange = (preset: 'conservative' | 'balanced' | 'aggressive') => {
    setActivePreset(preset)
    
    const presetConfigs = {
      conservative: {
        autoImplementEnabled: false,
        thresholds: {
          critical: { severity: 'critical' as const, minConfidence: 0.95, requiresManualApproval: false, description: 'Only auto-apply critical issues with 95%+ confidence' },
          high: { severity: 'high' as const, minConfidence: 0.90, requiresManualApproval: true, description: 'Require approval for high priority issues' },
          medium: { severity: 'medium' as const, minConfidence: 0.95, requiresManualApproval: true, description: 'Require approval for medium priority issues' },
          low: { severity: 'low' as const, minConfidence: 1.0, requiresManualApproval: true, description: 'Never auto-apply low priority issues' }
        },
        globalMinConfidence: 0.85,
        maxAutoImplementPerSession: 2,
        requireConfirmation: true,
        enableNotifications: true,
        allowedActionTypes: ['adjust_parameters' as const]
      },
      balanced: {
        autoImplementEnabled: true,
        thresholds: {
          critical: { severity: 'critical' as const, minConfidence: 0.80, requiresManualApproval: false, description: 'Auto-apply critical issues with 80%+ confidence' },
          high: { severity: 'high' as const, minConfidence: 0.75, requiresManualApproval: false, description: 'Auto-apply high priority issues with 75%+ confidence' },
          medium: { severity: 'medium' as const, minConfidence: 0.80, requiresManualApproval: true, description: 'Require approval for medium priority issues' },
          low: { severity: 'low' as const, minConfidence: 0.85, requiresManualApproval: true, description: 'Require approval for low priority issues' }
        },
        globalMinConfidence: 0.70,
        maxAutoImplementPerSession: 5,
        requireConfirmation: false,
        enableNotifications: true,
        allowedActionTypes: ['adjust_parameters' as const, 'change_model' as const, 'add_profile' as const]
      },
      aggressive: {
        autoImplementEnabled: true,
        thresholds: {
          critical: { severity: 'critical' as const, minConfidence: 0.70, requiresManualApproval: false, description: 'Auto-apply critical issues with 70%+ confidence' },
          high: { severity: 'high' as const, minConfidence: 0.65, requiresManualApproval: false, description: 'Auto-apply high priority issues with 65%+ confidence' },
          medium: { severity: 'medium' as const, minConfidence: 0.70, requiresManualApproval: false, description: 'Auto-apply medium priority issues with 70%+ confidence' },
          low: { severity: 'low' as const, minConfidence: 0.80, requiresManualApproval: true, description: 'Require approval for low priority issues' }
        },
        globalMinConfidence: 0.60,
        maxAutoImplementPerSession: 10,
        requireConfirmation: false,
        enableNotifications: true,
        allowedActionTypes: ['adjust_parameters' as const, 'change_model' as const, 'add_profile' as const, 'reduce_usage' as const]
      }
    }

    onConfigChange(presetConfigs[preset])
    toast.success(`Applied ${preset} preset`)
  }

  const handleThresholdChange = (
    severity: keyof ThresholdConfig['thresholds'],
    minConfidence: number
  ) => {
    setActivePreset('custom')
    onConfigChange({
      ...config,
      thresholds: {
        ...config.thresholds,
        [severity]: {
          ...config.thresholds[severity],
          minConfidence: minConfidence / 100
        }
      }
    })
  }

  const handleManualApprovalToggle = (
    severity: keyof ThresholdConfig['thresholds']
  ) => {
    setActivePreset('custom')
    onConfigChange({
      ...config,
      thresholds: {
        ...config.thresholds,
        [severity]: {
          ...config.thresholds[severity],
          requiresManualApproval: !config.thresholds[severity].requiresManualApproval
        }
      }
    })
  }

  const handleGlobalMinConfidenceChange = (value: number) => {
    setActivePreset('custom')
    onConfigChange({
      ...config,
      globalMinConfidence: value / 100
    })
  }

  const handleMaxImplementChange = (value: number) => {
    setActivePreset('custom')
    onConfigChange({
      ...config,
      maxAutoImplementPerSession: value
    })
  }

  const handleAutoImplementToggle = () => {
    onConfigChange({
      ...config,
      autoImplementEnabled: !config.autoImplementEnabled
    })
  }

  const handleRequireConfirmationToggle = () => {
    setActivePreset('custom')
    onConfigChange({
      ...config,
      requireConfirmation: !config.requireConfirmation
    })
  }

  const handleNotificationsToggle = () => {
    setActivePreset('custom')
    onConfigChange({
      ...config,
      enableNotifications: !config.enableNotifications
    })
  }

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'confidence-threshold-config.json'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Configuration exported')
  }

  const importConfig = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string)
            onConfigChange(imported)
            setActivePreset('custom')
            toast.success('Configuration imported')
          } catch (_error) {
            toast.error('Invalid configuration file')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Warning weight="fill" size={18} className="text-red-500" />
      case 'high':
        return <Warning weight="fill" size={18} className="text-orange-500" />
      case 'medium':
        return <Info weight="fill" size={18} className="text-blue-500" />
      case 'low':
        return <CheckCircle weight="fill" size={18} className="text-green-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Gear weight="fill" size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Confidence Thresholds</h3>
                <p className="text-sm text-muted-foreground">Configure auto-implementation behavior</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={importConfig} className="gap-2">
                <Upload size={16} />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={exportConfig} className="gap-2">
                <Download size={16} />
                Export
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain weight="fill" size={20} className="text-primary" />
                <Label htmlFor="auto-implement" className="text-base font-semibold">
                  Enable Auto-Implementation
                </Label>
              </div>
              <Switch
                id="auto-implement"
                checked={config.autoImplementEnabled}
                onCheckedChange={handleAutoImplementToggle}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically apply optimization insights that meet confidence thresholds
            </p>
          </div>

          {sessionStats && (
            <Card className="p-4 bg-muted/50">
              <h4 className="text-sm font-semibold mb-3">Session Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Applied</p>
                  <p className="text-2xl font-bold">{sessionStats.totalImplemented}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Automatic</p>
                  <p className="text-2xl font-bold text-green-500">{sessionStats.autoImplemented}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Manual</p>
                  <p className="text-2xl font-bold text-blue-500">{sessionStats.manualImplemented}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                  <p className="text-2xl font-bold">{Math.round(sessionStats.averageConfidence * 100)}%</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(presets).map(([key, preset]) => (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    activePreset === key
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handlePresetChange(key as 'conservative' | 'balanced' | 'aggressive')}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center ${
                        key === 'conservative' ? 'from-blue-500 to-blue-600' :
                        key === 'balanced' ? 'from-purple-500 to-purple-600' :
                        'from-orange-500 to-orange-600'
                      }`}>
                        <span className="text-white">{preset.icon}</span>
                      </div>
                      {activePreset === key && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle size={12} weight="fill" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{preset.name}</h4>
                      <p className="text-xs text-muted-foreground">{preset.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="p-6">
            <h4 className="font-semibold mb-4">Preset Configuration Details</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Global Min Confidence</Label>
                  <p className="text-lg font-semibold">{Math.round(config.globalMinConfidence * 100)}%</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max Auto-Implement/Session</Label>
                  <p className="text-lg font-semibold">{config.maxAutoImplementPerSession}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Require Confirmation</Label>
                  <p className="text-lg font-semibold">{config.requireConfirmation ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notifications</Label>
                  <p className="text-lg font-semibold">{config.enableNotifications ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Severity-Based Thresholds</h4>
            <div className="space-y-6">
              {Object.entries(config.thresholds).map(([severity, threshold]) => (
                <div key={severity} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(severity)}
                      <Label className="text-sm font-semibold capitalize">{severity}</Label>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(threshold.minConfidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Manual Approval</Label>
                      <Switch
                        checked={threshold.requiresManualApproval}
                        onCheckedChange={() => handleManualApprovalToggle(severity as keyof ThresholdConfig['thresholds'])}
                      />
                    </div>
                  </div>
                  <Slider
                    value={[Math.round(threshold.minConfidence * 100)]}
                    onValueChange={(value) => handleThresholdChange(severity as keyof ThresholdConfig['thresholds'], value[0])}
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">{threshold.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold mb-4">Global Settings</h4>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Global Minimum Confidence</Label>
                  <Badge variant="outline">{Math.round(config.globalMinConfidence * 100)}%</Badge>
                </div>
                <Slider
                  value={[Math.round(config.globalMinConfidence * 100)]}
                  onValueChange={(value) => handleGlobalMinConfidenceChange(value[0])}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum confidence required for any auto-implementation
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Auto-Implement Per Session</Label>
                  <Badge variant="outline">{config.maxAutoImplementPerSession}</Badge>
                </div>
                <Slider
                  value={[config.maxAutoImplementPerSession]}
                  onValueChange={(value) => handleMaxImplementChange(value[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of optimizations to apply automatically per session
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Require Confirmation</Label>
                  <Switch
                    checked={config.requireConfirmation}
                    onCheckedChange={handleRequireConfirmationToggle}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Show confirmation dialog before applying optimizations
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enable Notifications</Label>
                  <Switch
                    checked={config.enableNotifications}
                    onCheckedChange={handleNotificationsToggle}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Show toast notifications when optimizations are applied
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold mb-4">Allowed Action Types</h4>
            <div className="space-y-2">
              {[
                { type: 'adjust_parameters', label: 'Adjust Parameters', description: 'Modify model temperature, tokens, etc.' },
                { type: 'change_model', label: 'Change Model', description: 'Switch to a different model' },
                { type: 'add_profile', label: 'Add Profile', description: 'Create performance profiles' },
                { type: 'reduce_usage', label: 'Reduce Usage', description: 'Optimize resource utilization' }
              ].map((action) => (
                <div
                  key={action.type}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <Switch
                    checked={config.allowedActionTypes.includes(action.type as 'adjust_parameters' | 'change_model' | 'add_profile' | 'reduce_usage')}
                    onCheckedChange={(checked) => {
                      setActivePreset('custom')
                      onConfigChange({
                        ...config,
                        allowedActionTypes: checked
                          ? [...config.allowedActionTypes, action.type as 'adjust_parameters' | 'change_model' | 'add_profile' | 'reduce_usage']
                          : config.allowedActionTypes.filter(t => t !== action.type)
                      })
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
