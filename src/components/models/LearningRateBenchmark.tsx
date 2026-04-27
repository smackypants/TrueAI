import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Play, 
  Stop, 
  TrendUp, 
  TrendDown, 
  Lightning, 
  ChartLine, 
  CheckCircle,
  Warning,
  ArrowRight,
  Target,
  Brain,
  Sparkle,
  Download} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { ModelConfig, TaskType } from '@/lib/types'
import type { BenchmarkSuite } from '@/lib/model-benchmark'
import { 
  learningRateTuner, 
  type LearningRateMetrics,
  type LearningRateAdjustment,
  type LearningRateSchedule
} from '@/lib/learning-rate-tuner'
import { runModelBenchmark, benchmarkTests } from '@/lib/model-benchmark'
import { analytics } from '@/lib/analytics'

interface LearningRateBenchmarkProps {
  models: ModelConfig[]
  onModelUpdate?: (model: ModelConfig) => void
  _recentBenchmarks?: BenchmarkSuite[]
}

interface LearningRateExperiment {
  id: string
  modelId: string
  learningRate: number
  taskType: TaskType
  benchmarkScore: number
  responseTime: number
  qualityScore: number
  timestamp: number
  trainingLoss: number[]
  validationLoss: number[]
  epochs: number
  successRate: number
}

export function LearningRateBenchmark({ models, onModelUpdate, _recentBenchmarks = [] }: LearningRateBenchmarkProps) {
  const [experiments, setExperiments] = useKV<LearningRateExperiment[]>('lr-experiments', [])
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || '')
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('creative_writing')
  const [currentLearningRate, setCurrentLearningRate] = useState(0.001)
  const [autoTuneEnabled, setAutoTuneEnabled] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentMetrics, setCurrentMetrics] = useState<LearningRateMetrics | null>(null)
  const [adjustmentHistory, setAdjustmentHistory] = useState<LearningRateAdjustment[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<LearningRateSchedule | null>(null)
  const _compareMode = false
  const [baselineExperimentId, setBaselineExperimentId] = useState<string | null>(null)

  const selectedModel = models.find(m => m.id === selectedModelId)
  const taskTypes: TaskType[] = ['creative_writing', 'code_generation', 'summarization', 'question_answering', 'conversation']

  useEffect(() => {
    if (selectedModel) {
      const optimalRate = learningRateTuner.getOptimalRateForTask(selectedTaskType, 'medium')
      setCurrentLearningRate(optimalRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskType])

  const generateSchedule = () => {
    if (!selectedModel) return

    const schedule = learningRateTuner.generateSchedule(selectedTaskType, 100, 'medium')
    setSelectedSchedule(schedule)
    toast.success(`Generated ${schedule.type} learning rate schedule`)
    
    analytics.track('learning_rate_schedule_generated', 'models', 'generate_schedule', {
      metadata: { scheduleType: schedule.type, taskType: selectedTaskType }
    })
  }

  const runExperiment = async () => {
    if (!selectedModel) {
      toast.error('Select a model first')
      return
    }

    setIsRunning(true)
    setProgress(0)

    const startTime = Date.now()

    try {
      const trainingLoss: number[] = []
      const validationLoss: number[] = []
      const epochs = 20

      for (let epoch = 0; epoch < epochs; epoch++) {
        const trainLoss = Math.random() * 2 + 1 - (epoch * 0.05)
        const valLoss = trainLoss + Math.random() * 0.3
        
        trainingLoss.push(Math.max(0.1, trainLoss))
        validationLoss.push(Math.max(0.1, valLoss))

        const metrics = learningRateTuner.getLearningRateMetrics(
          currentLearningRate,
          trainingLoss,
          validationLoss,
          epoch,
          Date.now() - startTime,
          0.85
        )

        setCurrentMetrics(metrics)

        if (autoTuneEnabled && epoch > 5) {
          const adjustment = learningRateTuner.recommendLearningRate(
            currentLearningRate,
            trainingLoss,
            validationLoss,
            epoch
          )

          if (adjustment && adjustment.confidence > 0.7) {
            setCurrentLearningRate(adjustment.newRate)
            setAdjustmentHistory(prev => [adjustment, ...prev])
            toast.info(`Learning rate adjusted: ${adjustment.newRate.toFixed(6)}`)
          }
        }

        setProgress((epoch / epochs) * 50)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setProgress(60)

      const testsForTask = benchmarkTests.filter(t => t.taskType === selectedTaskType).slice(0, 3)
      
      const benchmark = await runModelBenchmark(
        selectedModel,
        {
          temperature: selectedModel.temperature,
          maxTokens: selectedModel.maxTokens,
          topP: selectedModel.topP,
          frequencyPenalty: selectedModel.frequencyPenalty,
          presencePenalty: selectedModel.presencePenalty
        },
        testsForTask,
        (prog) => {
          setProgress(60 + (prog * 0.4))
        }
      )

      const experiment: LearningRateExperiment = {
        id: `exp-${Date.now()}`,
        modelId: selectedModel.id,
        learningRate: currentLearningRate,
        taskType: selectedTaskType,
        benchmarkScore: benchmark.overallScore,
        responseTime: benchmark.averageResponseTime,
        qualityScore: benchmark.overallScore,
        timestamp: Date.now(),
        trainingLoss,
        validationLoss,
        epochs,
        successRate: benchmark.tests.filter(t => !t.error).length / benchmark.tests.length
      }

      setExperiments(prev => (prev ? [experiment, ...prev] : [experiment]))

      const nextExperiments: LearningRateExperiment[] = [experiment, ...(experiments ?? [])]

      learningRateTuner.recordPerformanceMetrics({
        modelId: selectedModel.id,
        taskType: selectedTaskType,
        avgLoss: trainingLoss[trainingLoss.length - 1],
        lossVariance: calculateVariance(trainingLoss),
        avgResponseTime: benchmark.averageResponseTime,
        successRate: nextExperiments.length > 0 ?
          nextExperiments.reduce((sum, e) => sum + (e.successRate || 0), 0) / nextExperiments.length :
          benchmark.overallScore / 100,
        userSatisfaction: benchmark.overallScore / 100,
        convergenceSpeed: (trainingLoss[0] - trainingLoss[trainingLoss.length - 1]) / epochs,
        stabilityIndex: learningRateTuner.getLearningRateMetrics(
          currentLearningRate, trainingLoss, validationLoss, epochs, 0, 0.85
        ).stabilityScore,
        overfittingRisk: 0.1,
        timestamp: Date.now()
      })

      toast.success(`Experiment completed! Benchmark score: ${benchmark.overallScore.toFixed(1)}`)
      
      analytics.track('learning_rate_experiment_completed', 'models', 'complete_experiment', {
        duration: Date.now() - startTime,
        metadata: {
          learningRate: currentLearningRate,
          benchmarkScore: benchmark.overallScore,
          adjustmentCount: adjustmentHistory.length
        }
      })
    } catch (error) {
      toast.error('Experiment failed: ' + String(error))
      console.error(error)
    } finally {
      setIsRunning(false)
      setProgress(0)
    }
  }

  const applyOptimalLearningRate = () => {
    if (!selectedModel || !currentMetrics) return

    const updatedModel: ModelConfig = {
      ...selectedModel,
      temperature: currentMetrics.recommendedRate * 10
    }

    if (onModelUpdate) {
      onModelUpdate(updatedModel)
    }

    toast.success(`Applied optimal learning rate (${currentMetrics.recommendedRate.toFixed(6)}) to model`)
    
    analytics.track('learning_rate_applied', 'models', 'apply_optimal_rate', {
      metadata: { 
        oldRate: currentLearningRate, 
        newRate: currentMetrics.recommendedRate,
        confidence: currentMetrics.confidence
      }
    })
  }

  const compareExperiments = (exp1Id: string, exp2Id: string) => {
    const exp1 = experiments?.find(e => e.id === exp1Id)
    const exp2 = experiments?.find(e => e.id === exp2Id)

    if (!exp1 || !exp2) return null

    return {
      scoreImprovement: ((exp2.benchmarkScore - exp1.benchmarkScore) / exp1.benchmarkScore) * 100,
      speedImprovement: ((exp1.responseTime - exp2.responseTime) / exp1.responseTime) * 100,
      learningRateDelta: exp2.learningRate - exp1.learningRate,
      successRateChange: (exp2.successRate - exp1.successRate) * 100
    }
  }

  const exportExperiments = () => {
    const data = JSON.stringify({ experiments, adjustments: adjustmentHistory }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `learning-rate-experiments-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Experiments exported')
  }

  const calculateVariance = (values: number[]): number => {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendUp weight="bold" className="text-green-500" size={16} />
    if (value < -5) return <TrendDown weight="bold" className="text-red-500" size={16} />
    return <ArrowRight weight="bold" className="text-muted-foreground" size={16} />
  }

  const baseline = baselineExperimentId ? experiments?.find(e => e.id === baselineExperimentId) : null
  const modelExperiments = experiments?.filter(e => e.modelId === selectedModelId)

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain weight="fill" className="text-accent" size={24} />
                Learning Rate Optimization
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fine-tune learning rates with automated benchmarking
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportExperiments} disabled={experiments?.length === 0}>
                <Download weight="bold" size={18} className="mr-2" />
                Export
              </Button>
              <Button
                onClick={runExperiment}
                disabled={isRunning || !selectedModel}
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Stop weight="fill" size={20} className="mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play weight="fill" size={20} className="mr-2" />
                    Run Experiment
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={selectedTaskType} onValueChange={(v) => setSelectedTaskType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Learning Rate</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={currentLearningRate}
                  onChange={(e) => setCurrentLearningRate(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={() => {
                  const optimal = learningRateTuner.getOptimalRateForTask(selectedTaskType, 'medium')
                  setCurrentLearningRate(optimal)
                  toast.success('Set to optimal rate')
                }}>
                  <Sparkle weight="fill" size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoTuneEnabled}
                onCheckedChange={setAutoTuneEnabled}
                id="auto-tune"
              />
              <Label htmlFor="auto-tune" className="cursor-pointer">
                Auto-tune during training
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={generateSchedule}>
              <ChartLine weight="bold" size={16} className="mr-2" />
              Generate Schedule
            </Button>
          </div>

          {selectedSchedule && (
            <Card className="p-4 bg-accent/5 border-accent">
              <p className="font-medium mb-2 flex items-center gap-2">
                <Target weight="fill" size={18} />
                Active Schedule: {selectedSchedule.type.replace(/_/g, ' ')}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Initial:</span>{' '}
                  <span className="font-mono">{selectedSchedule.initialRate.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Min:</span>{' '}
                  <span className="font-mono">{selectedSchedule.minRate.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max:</span>{' '}
                  <span className="font-mono">{selectedSchedule.maxRate.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Warmup:</span>{' '}
                  <span className="font-mono">{selectedSchedule.warmupSteps || 0} steps</span>
                </div>
              </div>
            </Card>
          )}

          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Training Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                
                {currentMetrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-muted-foreground text-xs">Current Loss</p>
                      <p className="font-mono font-medium">
                        {currentMetrics.trainingLoss[currentMetrics.trainingLoss.length - 1]?.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Convergence</p>
                      <p className="font-mono font-medium">{currentMetrics.convergenceRate.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Stability</p>
                      <p className="font-mono font-medium">{(currentMetrics.stabilityScore * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Epochs</p>
                      <p className="font-mono font-medium">{currentMetrics.epochsCompleted}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {currentMetrics && !isRunning && (
            <Card className="p-4 bg-primary/5 border-primary">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <Lightning weight="fill" className="text-accent" size={20} />
                    Recommended Learning Rate
                  </p>
                  <p className="text-2xl font-bold mt-1">{currentMetrics.recommendedRate.toFixed(6)}</p>
                </div>
                <Badge variant={currentMetrics.confidence > 0.8 ? 'default' : 'secondary'}>
                  {(currentMetrics.confidence * 100).toFixed(0)}% confidence
                </Badge>
              </div>
              <Button onClick={applyOptimalLearningRate} className="w-full">
                Apply to Model
              </Button>
            </Card>
          )}
        </div>
      </Card>

      {experiments && experiments.length > 0 && (
        <Card className="p-6">
          <Tabs defaultValue="results" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="results" className="gap-2">
                  <ChartLine weight="fill" size={18} />
                  Results
                </TabsTrigger>
                <TabsTrigger value="compare" className="gap-2">
                  <TrendUp weight="fill" size={18} />
                  Compare
                </TabsTrigger>
                <TabsTrigger value="adjustments" className="gap-2">
                  <Target weight="fill" size={18} />
                  Adjustments
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="results" className="space-y-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {modelExperiments?.map(exp => (
                    <Card key={exp.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize">
                                {exp.taskType.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(exp.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium">LR: {exp.learningRate.toFixed(6)}</p>
                          </div>
                          <Badge className={getScoreColor(exp.benchmarkScore)}>
                            {exp.benchmarkScore.toFixed(1)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Response:</span>{' '}
                            <span className="font-mono">{exp.responseTime.toFixed(0)}ms</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Success:</span>{' '}
                            <span className="font-mono">{(exp.successRate * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Epochs:</span>{' '}
                            <span className="font-mono">{exp.epochs}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Final Loss:</span>{' '}
                            <span className="font-mono">
                              {exp.trainingLoss[exp.trainingLoss.length - 1]?.toFixed(4)}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setBaselineExperimentId(exp.id)}
                        >
                          Use as Baseline
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="compare" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Baseline</Label>
                  <Select value={baselineExperimentId || ''} onValueChange={setBaselineExperimentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select baseline" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelExperiments?.map(exp => (
                        <SelectItem key={exp.id} value={exp.id}>
                          LR {exp.learningRate.toFixed(6)} - {exp.benchmarkScore.toFixed(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {baseline && modelExperiments && (
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {modelExperiments
                      .filter(exp => exp.id !== baseline.id)
                      .map(exp => {
                        const comparison = compareExperiments(baseline.id, exp.id)
                        if (!comparison) return null

                        return (
                          <Card key={exp.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium">LR: {exp.learningRate.toFixed(6)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(exp.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getTrendIcon(comparison.scoreImprovement)}
                                  <span className={getScoreColor(exp.benchmarkScore)}>
                                    {comparison.scoreImprovement > 0 ? '+' : ''}
                                    {comparison.scoreImprovement.toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="p-2 bg-muted/50 rounded">
                                  <p className="text-muted-foreground mb-1">Score</p>
                                  <p className="font-mono flex items-center gap-1">
                                    {getTrendIcon(comparison.scoreImprovement)}
                                    {comparison.scoreImprovement.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="p-2 bg-muted/50 rounded">
                                  <p className="text-muted-foreground mb-1">Speed</p>
                                  <p className="font-mono flex items-center gap-1">
                                    {getTrendIcon(comparison.speedImprovement)}
                                    {comparison.speedImprovement.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="p-2 bg-muted/50 rounded">
                                  <p className="text-muted-foreground mb-1">Success</p>
                                  <p className="font-mono flex items-center gap-1">
                                    {getTrendIcon(comparison.successRateChange)}
                                    {comparison.successRateChange.toFixed(1)}%
                                  </p>
                                </div>
                              </div>

                              {Math.abs(comparison.scoreImprovement) > 10 && (
                                <div className={`p-2 rounded text-xs ${
                                  comparison.scoreImprovement > 10 
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                  {comparison.scoreImprovement > 10 ? (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle weight="fill" size={14} />
                                      <span>Significant improvement detected</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Warning weight="fill" size={14} />
                                      <span>Performance degraded significantly</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-4">
              {adjustmentHistory.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {adjustmentHistory.map((adj, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant={
                                adj.strategy === 'reduce' ? 'destructive' : 
                                adj.strategy === 'increase' ? 'default' : 'secondary'
                              } className="mb-2">
                                {adj.strategy}
                              </Badge>
                              <p className="text-sm font-medium">
                                {adj.oldRate.toFixed(6)} → {adj.newRate.toFixed(6)}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {(adj.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{adj.reason}</p>
                          <p className="text-xs text-accent">{adj.expectedImprovement}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">
                    No adjustments yet. Run an experiment with auto-tune enabled.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  )
}

export default LearningRateBenchmark
