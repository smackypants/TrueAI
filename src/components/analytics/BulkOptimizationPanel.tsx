import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Lightning,
  Sparkle,
  CheckCircle,
  ArrowsClockwise,
  Stack,
  Target,
  Rocket,
  Gauge,
  ListChecks,
  Code,
  PaintBrush,
  ChatCircle,
  MagnifyingGlass,
  Broom,
  BatteryCharging,
  ChartBar,
  Play,
  ArrowCounterClockwise} from '@phosphor-icons/react'
import { 
  bulkOptimizationManager, 
  optimizationPresets,
  type OptimizationBundle,
  type OptimizationAction,
  type BulkOptimizationResult,
  type OptimizationPreset
} from '@/lib/bulk-optimization'
import type { ModelConfig } from '@/lib/types'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useIsMobile } from '@/hooks/use-mobile'

interface BulkOptimizationPanelProps {
  models: ModelConfig[]
  onApplyBundle: (bundle: OptimizationBundle, models: ModelConfig[]) => Promise<void>
}

const bundleIcons: Record<string, React.ReactNode> = {
  '⚡': <Lightning weight="fill" size={24} className="text-accent" />,
  '✨': <Sparkle weight="fill" size={24} className="text-accent" />,
  '⚖️': <Gauge weight="fill" size={24} className="text-accent" />,
  '🎨': <PaintBrush weight="fill" size={24} className="text-accent" />,
  '💻': <Code weight="fill" size={24} className="text-accent" />,
  '🔋': <BatteryCharging weight="fill" size={24} className="text-accent" />,
  '🎯': <Target weight="fill" size={24} className="text-accent" />,
  '💬': <ChatCircle weight="fill" size={24} className="text-accent" />,
  '🔬': <MagnifyingGlass weight="fill" size={24} className="text-accent" />,
  '🧹': <Broom weight="fill" size={24} className="text-accent" />
}

const categoryColors: Record<OptimizationBundle['category'], string> = {
  performance: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  quality: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  balanced: 'bg-green-500/10 text-green-500 border-green-500/20',
  efficiency: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  cost: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  custom: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
}

export function BulkOptimizationPanel({ models, onApplyBundle }: BulkOptimizationPanelProps) {
  const isMobile = useIsMobile()
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set())
  const [availableBundles, setAvailableBundles] = useState<OptimizationBundle[]>([])
  const [bundleHistory, setBundleHistory] = useState<BulkOptimizationResult[]>([])
  const [isApplying, setIsApplying] = useState(false)
  const [applyProgress, setApplyProgress] = useState(0)
  const [currentAction, setCurrentAction] = useState<OptimizationAction | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showBundleDialog, setShowBundleDialog] = useState(false)
  const [selectedBundleDetail, setSelectedBundleDetail] = useState<OptimizationBundle | null>(null)
  const [activeTab, setActiveTab] = useState<'bundles' | 'presets' | 'history'>('bundles')
  const [selectedCategory, setSelectedCategory] = useState<OptimizationBundle['category'] | 'all'>('all')

  useEffect(() => {
    loadAvailableBundles()
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models])

  const loadAvailableBundles = () => {
    const bundles = bulkOptimizationManager.getAvailableBundles(models)
    setAvailableBundles(bundles)
  }

  const loadHistory = () => {
    const history = bulkOptimizationManager.getBundleHistory()
    setBundleHistory(history)
  }

  const toggleBundleSelection = (bundleId: string) => {
    setSelectedBundles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bundleId)) {
        newSet.delete(bundleId)
      } else {
        newSet.add(bundleId)
      }
      return newSet
    })
  }

  const applySelectedBundles = async () => {
    if (selectedBundles.size === 0) {
      toast.error('Please select at least one optimization bundle')
      return
    }

    setIsApplying(true)
    setApplyProgress(0)

    try {
      const bundlesToApply = availableBundles.filter(b => selectedBundles.has(b.id))
      const totalActions = bundlesToApply.reduce((sum, b) => sum + b.actions.length, 0)
      let completedActions = 0

      for (const bundle of bundlesToApply) {
        await bulkOptimizationManager.applyBundle(
          bundle,
          models,
          (progress, action) => {
            setCurrentAction(action)
            completedActions++
            setApplyProgress((completedActions / totalActions) * 100)
          }
        )

        await onApplyBundle(bundle, models)
      }

      toast.success(`Successfully applied ${bundlesToApply.length} optimization ${bundlesToApply.length === 1 ? 'bundle' : 'bundles'}`)
      setSelectedBundles(new Set())
      loadHistory()
    } catch (_error) {
      toast.error('Failed to apply optimization bundles')
    } finally {
      setIsApplying(false)
      setApplyProgress(0)
      setCurrentAction(null)
    }
  }

  const applyPreset = async (preset: OptimizationPreset) => {
    setSelectedPreset(preset.id)
    const presetBundles = bulkOptimizationManager.getPresetBundles(preset.id, models)
    
    if (presetBundles.length === 0) {
      toast.error('No bundles available for this preset')
      return
    }

    setIsApplying(true)
    setApplyProgress(0)

    try {
      const totalActions = presetBundles.reduce((sum, b) => sum + b.actions.length, 0)
      let completedActions = 0

      for (const bundle of presetBundles) {
        await bulkOptimizationManager.applyBundle(
          bundle,
          models,
          (progress, action) => {
            setCurrentAction(action)
            completedActions++
            setApplyProgress((completedActions / totalActions) * 100)
          }
        )

        await onApplyBundle(bundle, models)
      }

      toast.success(`Successfully applied "${preset.name}" preset`)
      loadHistory()
    } catch (_error) {
      toast.error('Failed to apply preset')
    } finally {
      setIsApplying(false)
      setApplyProgress(0)
      setCurrentAction(null)
      setSelectedPreset(null)
    }
  }

  const rollbackBundle = async (bundleId: string) => {
    try {
      const success = await bulkOptimizationManager.rollbackBundle(bundleId, models)
      if (success) {
        toast.success('Successfully rolled back optimization')
        loadHistory()
      } else {
        toast.error('Failed to rollback optimization')
      }
    } catch (_error) {
      toast.error('Failed to rollback optimization')
    }
  }

  const viewBundleDetails = (bundle: OptimizationBundle) => {
    setSelectedBundleDetail(bundle)
    setShowBundleDialog(true)
  }

  const filteredBundles = selectedCategory === 'all' 
    ? availableBundles 
    : availableBundles.filter(b => b.category === selectedCategory)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Stack weight="fill" size={isMobile ? 24 : 28} className="text-accent" />
            Bulk Optimizations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Apply multiple related optimizations together
          </p>
        </div>
        
        {selectedBundles.size > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Badge variant="secondary" className="text-sm">
              {selectedBundles.size} selected
            </Badge>
            <Button
              onClick={applySelectedBundles}
              disabled={isApplying}
              className="flex-1 sm:flex-initial"
              size={isMobile ? 'sm' : 'default'}
            >
              <Play weight="fill" size={18} className="mr-2" />
              Apply Selected
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <ScrollArea className="w-full pb-2">
          <TabsList className={`inline-flex ${isMobile ? 'w-full' : 'w-auto'} min-w-full sm:min-w-0 h-auto p-1`}>
            <TabsTrigger value="bundles" className="gap-2 flex-1 sm:flex-initial">
              <Lightning size={16} />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Bundles</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-2 flex-1 sm:flex-initial">
              <Rocket size={16} />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Presets</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 flex-1 sm:flex-initial">
              <ChartBar size={16} />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>History</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="bundles" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="text-xs sm:text-sm"
            >
              All
            </Button>
            {(['performance', 'quality', 'balanced', 'efficiency'] as const).map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs sm:text-sm capitalize"
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredBundles.map(bundle => (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className={`p-4 hover:border-accent/50 transition-all cursor-pointer ${
                    selectedBundles.has(bundle.id) ? 'border-accent bg-accent/5' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-card rounded-lg">
                          {bundle.icon && bundleIcons[bundle.icon]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{bundle.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`text-xs mt-1 ${categoryColors[bundle.category]}`}
                          >
                            {bundle.category}
                          </Badge>
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedBundles.has(bundle.id)}
                        onCheckedChange={() => toggleBundleSelection(bundle.id)}
                        className="mt-1"
                      />
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {bundle.description}
                    </p>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Actions:</span>
                        <span className="font-mono">{bundle.actions.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Models:</span>
                        <span className="font-mono">{bundle.affectedModels.length}</span>
                      </div>
                    </div>

                    {bundle.estimatedImpact && (
                      <div className="space-y-1.5 pt-2 border-t">
                        {Object.entries(bundle.estimatedImpact).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex items-start gap-2">
                              <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" weight="fill" />
                              <span className="text-xs text-muted-foreground">
                                <span className="capitalize font-medium">{key}:</span> {value}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewBundleDetails(bundle)
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredBundles.length === 0 && (
            <Card className="p-8 sm:p-12 text-center">
              <Stack size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
              <h3 className="font-semibold text-base sm:text-lg mb-2">No bundles available</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCategory !== 'all' 
                  ? `No optimization bundles in the ${selectedCategory} category`
                  : 'No optimization bundles available for your current models'}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="presets" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Quick-apply curated optimization combinations for common scenarios
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {optimizationPresets.map(preset => (
              <Card key={preset.id} className="p-4 hover:border-accent/50 transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{preset.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {preset.bundles.length} bundles
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground font-medium">Target Scenario:</div>
                    <div className="text-xs">{preset.targetScenario}</div>
                  </div>

                  <Button
                    onClick={() => applyPreset(preset)}
                    disabled={isApplying && selectedPreset === preset.id}
                    className="w-full"
                    size="sm"
                  >
                    {isApplying && selectedPreset === preset.id ? (
                      <>
                        <ArrowsClockwise size={16} className="mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Rocket size={16} weight="fill" className="mr-2" />
                        Apply Preset
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {bundleHistory.length === 0 && (
                <Card className="p-8 sm:p-12 text-center">
                  <ChartBar size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                  <h3 className="font-semibold text-base sm:text-lg mb-2">No history yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Applied optimization bundles will appear here
                  </p>
                </Card>
              )}

              {bundleHistory.map(result => {
                const bundle = availableBundles.find(b => b.id === result.bundleId)
                return (
                  <Card key={result.bundleId} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">
                            {bundle?.name || 'Unknown Bundle'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(result.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs shrink-0">
                          {result.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>

                      {result.metrics && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">Duration</div>
                            <div className="font-mono">{(result.metrics.executionTime / 1000).toFixed(1)}s</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Models</div>
                            <div className="font-mono">{result.metrics.affectedModels}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Changes</div>
                            <div className="font-mono">{result.metrics.parameterChanges}</div>
                          </div>
                        </div>
                      )}

                      {result.failedActions.length > 0 && (
                        <div className="p-2 bg-destructive/10 rounded-md">
                          <div className="text-xs font-medium text-destructive mb-1">
                            {result.failedActions.length} Failed Action{result.failedActions.length > 1 ? 's' : ''}
                          </div>
                          {result.failedActions.map(failed => (
                            <div key={failed.actionId} className="text-xs text-muted-foreground">
                              {failed.error}
                            </div>
                          ))}
                        </div>
                      )}

                      {result.rollbackAvailable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => rollbackBundle(result.bundleId)}
                        >
                          <ArrowCounterClockwise size={16} className="mr-2" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {isApplying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50"
          >
            <Card className="p-4 shadow-xl border-accent">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowsClockwise size={20} className="animate-spin text-accent" weight="bold" />
                    <span className="font-semibold text-sm sm:text-base">Applying Optimizations</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{Math.round(applyProgress)}%</span>
                </div>
                <Progress value={applyProgress} className="h-2" />
                {currentAction && (
                  <p className="text-xs text-muted-foreground truncate">
                    {currentAction.description}
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showBundleDialog} onOpenChange={setShowBundleDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedBundleDetail?.icon && bundleIcons[selectedBundleDetail.icon]}
              {selectedBundleDetail?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedBundleDetail?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedBundleDetail && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ListChecks size={18} />
                  Actions ({selectedBundleDetail.actions.length})
                </h4>
                <div className="space-y-2">
                  {selectedBundleDetail.actions.map((action, index) => (
                    <div key={action.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{action.description}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Type: {action.type}</span>
                            <span>Target: {action.target}</span>
                            {action.reversible && (
                              <Badge variant="secondary" className="text-xs">
                                Reversible
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedBundleDetail.estimatedImpact && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target size={18} />
                    Estimated Impact
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(selectedBundleDetail.estimatedImpact).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex items-start gap-2 p-2 bg-muted rounded">
                          <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" weight="fill" />
                          <div>
                            <span className="text-sm font-medium capitalize">{key}: </span>
                            <span className="text-sm text-muted-foreground">{value}</span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-3">Affected Models ({selectedBundleDetail.affectedModels.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBundleDetail.affectedModels.map(modelId => {
                    const model = models.find(m => m.id === modelId)
                    return (
                      <Badge key={modelId} variant="outline" className="text-xs">
                        {model?.name || modelId}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBundleDialog(false)}>
              Close
            </Button>
            {selectedBundleDetail && (
              <Button onClick={() => {
                toggleBundleSelection(selectedBundleDetail.id)
                setShowBundleDialog(false)
              }}>
                {selectedBundles.has(selectedBundleDetail.id) ? 'Deselect' : 'Select'} Bundle
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
