import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  TrendUp,
  TrendDown,
  ChartLine,
  Target,
  Brain,
  ArrowUp,
  ArrowDown,
  Equals,
  CheckCircle,
  Info as InfoIcon,
  Zap,
  Warning as AlertCircle
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  learningRateTuner, 
  type LearningRateMetrics, 
  type LearningRateAdjustment,
  type LearningRateSchedule,
  type PerformanceMetrics
} from '@/lib/learning-rate-tuner'
import type { ModelConfig, FineTuningJob } from '@/lib/types'

interface LearningRateDashboardProps {
  models: ModelConfig[]
  fineTuningJobs: FineTuningJob[]
  onUpdateJobLearningRate: (jobId: string, newRate: number) => void
}

export function LearningRateDashboard({ 
  models, 
  fineTuningJobs,
  onUpdateJobLearningRate 
}: LearningRateDashboardProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<LearningRateMetrics | null>(null)
  const [adjustments, setAdjustments] = useState<LearningRateAdjustment[]>([])
  const [schedule, setSchedule] = useState<LearningRateSchedule | null>(null)
  const [autoTuneEnabled, setAutoTuneEnabled] = useState(false)
  const [customRate, setCustomRate] = useState('0.001')
  const [selectedStrategy, setSelectedStrategy] = useState<'adaptive' | 'step_decay' | 'cosine_annealing'>('adaptive')

  const selectedJob = fineTuningJobs.find(j => j.id === selectedJobId)

  useEffect(() => {
    if (selectedJob) {
      const trainingLoss = selectedJob.metrics?.loss || []
      const validationLoss: number[] = []
      const epochs = selectedJob.metrics?.epoch || 0
      const timeElapsed = selectedJob.startedAt ? Date.now() - selectedJob.startedAt : 0

      const calculatedMetrics = learningRateTuner.getLearningRateMetrics(
        selectedJob.learningRate,
        trainingLoss,
        validationLoss,
        epochs,
        timeElapsed,
        selectedJob.progress / 100
      )

      setMetrics(calculatedMetrics)

      if (autoTuneEnabled && trainingLoss.length > 0) {
        const adjustment = learningRateTuner.recommendLearningRate(
          selectedJob.learningRate,
          trainingLoss,
          validationLoss,
          epochs
        )

        if (adjustment && adjustment.confidence > 0.7) {
          setAdjustments(prev => [adjustment, ...prev.slice(0, 19)])
          onUpdateJobLearningRate(selectedJob.id, adjustment.newRate)
          toast.success(`Learning rate adjusted: ${adjustment.oldRate.toFixed(6)} → ${adjustment.newRate.toFixed(6)}`, {
            description: adjustment.reason
          })
        }
      }
    }
  }, [selectedJob?.id, selectedJob?.metrics, selectedJob?.learningRate, selectedJob?.progress, selectedJob?.startedAt, autoTuneEnabled, onUpdateJobLearningRate])

  const generateSchedule = () => {
    if (!selectedJob) return

    const model = models.find(m => m.id === selectedJob.modelId)
    const complexity = model?.size && model.size > 10000000000 ? 'high' : 
                       model?.size && model.size > 1000000000 ? 'medium' : 'low'

    const newSchedule = learningRateTuner.generateSchedule(
      'fine_tuning',
      selectedJob.epochs,
      complexity
    )

    setSchedule(newSchedule)
    toast.success('Learning rate schedule generated')
  }

  const applyManualRate = () => {
    if (!selectedJob) return

    const rate = parseFloat(customRate)
    if (isNaN(rate) || rate <= 0) {
      toast.error('Invalid learning rate')
      return
    }

    onUpdateJobLearningRate(selectedJob.id, rate)
    toast.success(`Learning rate set to ${rate.toFixed(6)}`)
  }

  const getTrendIcon = (trend: 'decreasing' | 'increasing' | 'plateauing' | 'oscillating') => {
    switch (trend) {
      case 'decreasing':
        return <TrendDown weight="bold" className="text-green-500" size={20} />
      case 'increasing':
        return <TrendUp weight="bold" className="text-red-500" size={20} />
      case 'plateauing':
        return <Equals weight="bold" className="text-yellow-500" size={20} />
      case 'oscillating':
        return <ChartLine weight="bold" className="text-orange-500" size={20} />
    }
  }

  const getStrategyColor = (strategy: LearningRateAdjustment['strategy']) => {
    switch (strategy) {
      case 'reduce':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'increase':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'adaptive':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'cyclic':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    }
  }

  if (fineTuningJobs.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <Brain weight="duotone" size={64} className="mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Fine-Tuning Jobs</h3>
          <p className="text-sm text-muted-foreground">
            Start a fine-tuning job to enable learning rate optimization
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap weight="fill" className="text-accent" size={24} />
                Learning Rate Fine-Tuning
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically optimize learning rates based on training performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={autoTuneEnabled ? 'default' : 'outline'}
                className="gap-1.5"
              >
                {autoTuneEnabled ? (
                  <CheckCircle weight="fill" size={16} />
                ) : (
                  <AlertCircle weight="fill" size={16} />
                )}
                Auto-Tune {autoTuneEnabled ? 'On' : 'Off'}
              </Badge>
              <Button
                variant={autoTuneEnabled ? 'destructive' : 'default'}
                size="sm"
                onClick={() => setAutoTuneEnabled(!autoTuneEnabled)}
              >
                {autoTuneEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Select Fine-Tuning Job</Label>
            <Select value={selectedJobId || ''} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {fineTuningJobs.map(job => {
                  const model = models.find(m => m.id === job.modelId)
                  return (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {job.status}
                        </Badge>
                        <span>{model?.name || 'Unknown Model'}</span>
                        <span className="text-muted-foreground text-xs">
                          (LR: {job.learningRate.toFixed(6)})
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {selectedJob && metrics && (
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Current Metrics</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Rate</p>
                  <p className="text-2xl font-bold font-mono">{metrics.currentRate.toFixed(6)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Recommended</p>
                  <p className="text-2xl font-bold font-mono text-accent">
                    {metrics.recommendedRate.toFixed(6)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.confidence * 100} className="flex-1" />
                    <span className="text-sm font-mono">{(metrics.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stability</p>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.stabilityScore * 100} className="flex-1" />
                    <span className="text-sm font-mono">{(metrics.stabilityScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target weight="bold" className="text-primary" size={20} />
                    <p className="text-sm font-medium">Convergence Rate</p>
                  </div>
                  <p className="text-xl font-mono">{metrics.convergenceRate.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">Loss improvement per epoch</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ChartLine weight="bold" className="text-primary" size={20} />
                    <p className="text-sm font-medium">Success Rate</p>
                  </div>
                  <p className="text-xl font-mono">{(metrics.successRate * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Training completion rate</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain weight="bold" className="text-primary" size={20} />
                    <p className="text-sm font-medium">Epochs</p>
                  </div>
                  <p className="text-xl font-mono">{metrics.epochsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Training iterations</p>
                </div>
              </div>

              {metrics.trainingLoss.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Loss Trend</p>
                      {getTrendIcon(learningRateTuner.analyzeLoss(metrics.trainingLoss).trend)}
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent to-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, 100 - metrics.trainingLoss[metrics.trainingLoss.length - 1] * 100)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current loss: {metrics.trainingLoss[metrics.trainingLoss.length - 1]?.toFixed(4) || 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Adjustment History</h3>
                <Badge variant="outline">{adjustments.length} adjustments</Badge>
              </div>

              <ScrollArea className="h-[500px]">
                <AnimatePresence>
                  {adjustments.length === 0 ? (
                    <div className="text-center py-12">
                      <InfoIcon weight="duotone" size={48} className="mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No adjustments made yet. Enable auto-tune to begin optimization.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adjustments.map((adj, index) => (
                        <motion.div
                          key={adj.timestamp}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="p-4 border-l-4 border-l-accent">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {adj.strategy === 'reduce' && <ArrowDown weight="bold" className="text-blue-500" size={20} />}
                                {adj.strategy === 'increase' && <ArrowUp weight="bold" className="text-green-500" size={20} />}
                                {adj.strategy === 'adaptive' && <Brain weight="bold" className="text-purple-500" size={20} />}
                                <Badge className={getStrategyColor(adj.strategy)}>
                                  {adj.strategy.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={adj.confidence * 100} className="w-20" />
                                <span className="text-xs font-mono text-muted-foreground">
                                  {(adj.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1 mb-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-mono text-muted-foreground">{adj.oldRate.toFixed(6)}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-mono font-semibold text-accent">{adj.newRate.toFixed(6)}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {((adj.newRate - adj.oldRate) / adj.oldRate * 100).toFixed(1)}%
                                </Badge>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-1">{adj.reason}</p>
                            <p className="text-xs text-primary">{adj.expectedImprovement}</p>
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(adj.timestamp).toLocaleString()}
                            </p>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Learning Rate Schedule</h3>
                <Button onClick={generateSchedule} size="sm">
                  <Brain weight="bold" size={18} className="mr-2" />
                  Generate Schedule
                </Button>
              </div>

              {schedule ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Schedule Type</Label>
                      <Badge variant="outline" className="text-sm capitalize">
                        {schedule.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Initial Rate</Label>
                      <p className="font-mono text-sm">{schedule.initialRate.toFixed(6)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Min Rate</Label>
                      <p className="font-mono text-sm">{schedule.minRate.toFixed(6)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Max Rate</Label>
                      <p className="font-mono text-sm">{schedule.maxRate.toFixed(6)}</p>
                    </div>

                    {schedule.warmupSteps && (
                      <div className="space-y-2">
                        <Label>Warmup Steps</Label>
                        <p className="font-mono text-sm">{schedule.warmupSteps}</p>
                      </div>
                    )}

                    {schedule.decayFactor && (
                      <div className="space-y-2">
                        <Label>Decay Factor</Label>
                        <p className="font-mono text-sm">{schedule.decayFactor}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Schedule Visualization</Label>
                    <div className="h-32 bg-muted rounded-lg p-4 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-end justify-start px-4 pb-4">
                        {Array.from({ length: 20 }).map((_, i) => {
                          const epoch = i
                          const rate = learningRateTuner.applySchedule(schedule, epoch, epoch * 100)
                          const normalizedHeight = ((rate - schedule.minRate) / (schedule.maxRate - schedule.minRate)) * 100
                          
                          return (
                            <motion.div
                              key={i}
                              className="flex-1 bg-accent/70 mx-0.5 rounded-t"
                              style={{ height: `${normalizedHeight}%` }}
                              initial={{ height: 0 }}
                              animate={{ height: `${normalizedHeight}%` }}
                              transition={{ delay: i * 0.05 }}
                            />
                          )
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Learning rate progression over 20 epochs
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target weight="duotone" size={48} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Generate a learning rate schedule to visualize training progression
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Manual Override</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-rate">Custom Learning Rate</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-rate"
                      type="number"
                      step="0.000001"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      className="font-mono"
                      placeholder="0.001"
                    />
                    <Button onClick={applyManualRate}>
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manually set the learning rate (0.000001 - 0.1)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Quick Presets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[0.0001, 0.001, 0.01].map(rate => (
                      <Button
                        key={rate}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomRate(rate.toString())
                          onUpdateJobLearningRate(selectedJob.id, rate)
                          toast.success(`Learning rate set to ${rate}`)
                        }}
                      >
                        {rate}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Adjustment Strategy</Label>
                  <Select value={selectedStrategy} onValueChange={(v) => setSelectedStrategy(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adaptive">Adaptive (Recommended)</SelectItem>
                      <SelectItem value="step_decay">Step Decay</SelectItem>
                      <SelectItem value="cosine_annealing">Cosine Annealing</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how the learning rate should be adjusted during training
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
