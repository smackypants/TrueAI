import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Sparkle, 
  TrendUp, 
  Lightning, 
  Brain,
  CheckCircle,
  Warning,
  Info,
  ArrowRight,
  Robot,
  ChartBar,
  Clock,
  Target,
  Gear
} from '@phosphor-icons/react'
import { useAnalytics } from '@/lib/analytics'
import { autoOptimizer, type OptimizationInsight } from '@/lib/auto-optimizer'
import { thresholdManager, type ThresholdConfig } from '@/lib/confidence-thresholds'
import { ConfidenceThresholdConfig } from './ConfidenceThresholdConfig'
import type { ModelConfig, PerformanceProfile, AutoTuneRecommendation } from '@/lib/types'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface AutoOptimizationPanelProps {
  models: ModelConfig[]
  profiles: PerformanceProfile[]
  onApplyOptimization: (insight: OptimizationInsight) => void
  onApplyAutoTune: (recommendation: AutoTuneRecommendation, modelId: string) => void
  onCreateProfile: (taskType: string) => void
}

export function AutoOptimizationPanel({
  models,
  profiles,
  onApplyOptimization,
  onApplyAutoTune,
  onCreateProfile
}: AutoOptimizationPanelProps) {
  const { events } = useAnalytics()
  const [insights, setInsights] = useState<OptimizationInsight[]>([])
  const [autoTuneRecommendations, setAutoTuneRecommendations] = useState<AutoTuneRecommendation[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [autoLearnEnabled, setAutoLearnEnabled] = useState(true)
  const [thresholdConfig, setThresholdConfig] = useState<ThresholdConfig>(thresholdManager.getConfig())
  const [learningProgress, setLearningProgress] = useState(0)
  const [appliedInsights, setAppliedInsights] = useState<Set<string>>(new Set())
  const [autoImplementCount, setAutoImplementCount] = useState(0)
  const [showThresholdConfig, setShowThresholdConfig] = useState(false)
  const [pendingInsight, setPendingInsight] = useState<OptimizationInsight | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  useEffect(() => {
    analyzePerformance()
  }, [events.length, models.length])

  useEffect(() => {
    const totalInteractions = events.filter(e => 
      e.type === 'chat_message_sent' || 
      e.type === 'agent_run_started'
    ).length
    
    const progress = Math.min(100, (totalInteractions / 50) * 100)
    setLearningProgress(progress)
  }, [events.length])

  useEffect(() => {
    if (thresholdConfig.autoImplementEnabled && insights.length > 0) {
      autoImplementInsights()
    }
  }, [insights, thresholdConfig.autoImplementEnabled])

  useEffect(() => {
    thresholdManager.setConfig(thresholdConfig)
  }, [thresholdConfig])

  const analyzePerformance = async () => {
    if (events.length < 10) return
    
    setIsAnalyzing(true)
    try {
      const newInsights = await autoOptimizer.analyzeAndOptimize(events, models, profiles)
      setInsights(newInsights)
      
      const recommendations = autoOptimizer.generateAutoTuneRecommendations(events, models)
      setAutoTuneRecommendations(recommendations)
      
      if (newInsights.length > 0 && autoLearnEnabled) {
        toast.success(`Found ${newInsights.length} optimization opportunities`)
      }
    } catch (error) {
      console.error('Failed to analyze performance:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const autoImplementInsights = async () => {
    const unappliedInsights = insights.filter(i => !appliedInsights.has(i.id))
    let implementedCount = 0

    for (const insight of unappliedInsights) {
      const decision = thresholdManager.shouldAutoImplement(insight)
      
      if (!decision.allowed) {
        continue
      }

      if (decision.requiresConfirmation && thresholdConfig.requireConfirmation) {
        continue
      }

      try {
        onApplyOptimization(insight)
        setAppliedInsights(prev => new Set([...prev, insight.id]))
        thresholdManager.recordImplementation(insight.id, insight.confidence, insight.severity, true)
        implementedCount++
        
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Failed to auto-implement insight ${insight.id}:`, error)
      }
    }

    if (implementedCount > 0) {
      setAutoImplementCount(prev => prev + implementedCount)
      
      if (thresholdConfig.enableNotifications) {
        toast.success(`Auto-implemented ${implementedCount} optimization${implementedCount > 1 ? 's' : ''}`, {
          description: `${implementedCount} ${implementedCount > 1 ? 'insights have' : 'insight has'} been automatically applied`,
          duration: 5000
        })
      }
    }

    if (autoTuneRecommendations.length > 0 && models.length > 0 && implementedCount < thresholdConfig.maxAutoImplementPerSession) {
      const firstModel = models[0]
      const firstRecommendation = autoTuneRecommendations[0]
      
      if (firstRecommendation.confidence >= thresholdConfig.globalMinConfidence) {
        try {
          onApplyAutoTune(firstRecommendation, firstModel.id)
          thresholdManager.recordImplementation('auto-tune', firstRecommendation.confidence, 'high', true)
          
          if (thresholdConfig.enableNotifications) {
            toast.success('Auto-tune applied to primary model', {
              description: `Optimized ${firstModel.name} for ${firstRecommendation.taskType.replace('_', ' ')}`,
              duration: 5000
            })
          }
        } catch (error) {
          console.error('Failed to auto-tune:', error)
        }
      }
    }
  }

  const handleApplyInsight = (insight: OptimizationInsight) => {
    const decision = thresholdManager.shouldAutoImplement(insight)
    
    if (decision.requiresConfirmation && thresholdConfig.requireConfirmation) {
      setPendingInsight(insight)
      setShowConfirmDialog(true)
      return
    }

    applyInsight(insight)
  }

  const applyInsight = (insight: OptimizationInsight) => {
    onApplyOptimization(insight)
    setAppliedInsights(prev => new Set([...prev, insight.id]))
    thresholdManager.recordImplementation(insight.id, insight.confidence, insight.severity, false)
    
    if (thresholdConfig.enableNotifications) {
      toast.success('Optimization applied')
    }
    
    setShowConfirmDialog(false)
    setPendingInsight(null)
  }

  const handleApplyAutoTune = (recommendation: AutoTuneRecommendation, modelId: string) => {
    onApplyAutoTune(recommendation, modelId)
    toast.success(`Auto-tuned for ${recommendation.taskType.replace('_', ' ')}`)
  }

  const handleApplyAll = async () => {
    const unappliedInsights = insights.filter(i => !appliedInsights.has(i.id) && i.suggestedAction)
    
    if (unappliedInsights.length === 0) {
      toast.info('No insights to apply')
      return
    }

    let count = 0
    for (const insight of unappliedInsights) {
      try {
        onApplyOptimization(insight)
        setAppliedInsights(prev => new Set([...prev, insight.id]))
        count++
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`Failed to apply insight ${insight.id}:`, error)
      }
    }

    toast.success(`Applied ${count} optimization${count > 1 ? 's' : ''}`, {
      description: `${count} insight${count > 1 ? 's have' : ' has'} been applied successfully`,
      duration: 4000
    })

    if (autoTuneRecommendations.length > 0 && models.length > 0) {
      models.forEach((model, index) => {
        if (autoTuneRecommendations[index]) {
          try {
            onApplyAutoTune(autoTuneRecommendations[index], model.id)
          } catch (error) {
            console.error(`Failed to auto-tune model ${model.id}:`, error)
          }
        }
      })
      toast.success('Auto-tune applied to all models')
    }
  }

  const getSeverityColor = (severity: OptimizationInsight['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
    }
  }

  const getSeverityIcon = (severity: OptimizationInsight['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <Warning weight="fill" size={20} />
      case 'medium':
        return <Info weight="fill" size={20} />
      case 'low':
        return <CheckCircle weight="fill" size={20} />
    }
  }

  const getTypeIcon = (type: OptimizationInsight['type']) => {
    switch (type) {
      case 'performance':
        return <Lightning weight="fill" size={18} />
      case 'quality':
        return <Target weight="fill" size={18} />
      case 'efficiency':
        return <TrendUp weight="fill" size={18} />
      case 'cost':
        return <ChartBar weight="fill" size={18} />
    }
  }

  const criticalInsights = insights.filter(i => i.severity === 'critical')
  const highInsights = insights.filter(i => i.severity === 'high')
  const otherInsights = insights.filter(i => i.severity !== 'critical' && i.severity !== 'high')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain weight="fill" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Auto Optimization</h3>
              <p className="text-sm text-muted-foreground">AI-powered performance insights</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-learn"
                checked={autoLearnEnabled}
                onCheckedChange={setAutoLearnEnabled}
              />
              <Label htmlFor="auto-learn" className="text-sm cursor-pointer">
                Auto-learn
              </Label>
            </div>
            
            <Button
              onClick={analyzePerformance}
              disabled={isAnalyzing}
              size="sm"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkle weight="fill" size={16} />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                <Lightning weight="fill" size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Auto-Implement Insights</p>
                <p className="text-xs text-muted-foreground">
                  Automatically apply critical and high-priority optimizations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {autoImplementCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle size={14} weight="fill" className="text-green-500" />
                  {autoImplementCount} applied
                </Badge>
              )}
              <Switch
                id="auto-implement"
                checked={thresholdConfig.autoImplementEnabled}
                onCheckedChange={(checked) => 
                  setThresholdConfig(prev => ({ ...prev, autoImplementEnabled: checked }))
                }
              />
              <Label htmlFor="auto-implement" className="text-sm cursor-pointer">
                {thresholdConfig.autoImplementEnabled ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Learning Progress</span>
          <span className="text-xs text-muted-foreground">
            {Math.round(learningProgress)}% ({events.length} interactions)
          </span>
        </div>
        <Progress value={learningProgress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {learningProgress < 100 
            ? `Need ${50 - events.length} more interactions for full optimization`
            : 'System fully trained - providing intelligent recommendations'
          }
        </p>
      </Card>

      {insights.length === 0 && !isAnalyzing && (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sparkle weight="fill" size={32} className="text-muted-foreground" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No insights yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Use the app to generate data for optimization insights
          </p>
          {events.length < 10 && (
            <p className="text-xs text-muted-foreground">
              Need {10 - events.length} more interactions to start analyzing
            </p>
          )}
        </Card>
      )}

      {insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Optimization Insights
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkle weight="fill" size={12} />
                {insights.length} found
              </Badge>
              {insights.filter(i => !appliedInsights.has(i.id) && i.suggestedAction).length > 0 && (
                <Button
                  onClick={handleApplyAll}
                  size="sm"
                  variant="default"
                  className="gap-2 h-8"
                >
                  <CheckCircle size={14} weight="fill" />
                  Apply All ({insights.filter(i => !appliedInsights.has(i.id) && i.suggestedAction).length})
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {criticalInsights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onApply={handleApplyInsight}
                    isApplied={appliedInsights.has(insight.id)}
                    getSeverityColor={getSeverityColor}
                    getSeverityIcon={getSeverityIcon}
                    getTypeIcon={getTypeIcon}
                  />
                ))}

                {highInsights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onApply={handleApplyInsight}
                    isApplied={appliedInsights.has(insight.id)}
                    getSeverityColor={getSeverityColor}
                    getSeverityIcon={getSeverityIcon}
                    getTypeIcon={getTypeIcon}
                  />
                ))}

                {otherInsights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onApply={handleApplyInsight}
                    isApplied={appliedInsights.has(insight.id)}
                    getSeverityColor={getSeverityColor}
                    getSeverityIcon={getSeverityIcon}
                    getTypeIcon={getTypeIcon}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      )}

      {autoTuneRecommendations.length > 0 && (
        <div className="space-y-4">
          <Separator />
          
          <div className="flex items-center gap-2">
            <Robot weight="fill" size={20} className="text-primary" />
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Auto-Tune Recommendations
            </h4>
            <Badge variant="secondary">{autoTuneRecommendations.length}</Badge>
          </div>

          <div className="space-y-3">
            {autoTuneRecommendations.map((rec, index) => (
              <AutoTuneCard
                key={index}
                recommendation={rec}
                models={models}
                onApply={handleApplyAutoTune}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface InsightCardProps {
  insight: OptimizationInsight
  onApply: (insight: OptimizationInsight) => void
  isApplied: boolean
  getSeverityColor: (severity: OptimizationInsight['severity']) => string
  getSeverityIcon: (severity: OptimizationInsight['severity']) => JSX.Element
  getTypeIcon: (type: OptimizationInsight['type']) => JSX.Element
}

function InsightCard({
  insight,
  onApply,
  isApplied,
  getSeverityColor,
  getSeverityIcon,
  getTypeIcon
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`p-4 ${isApplied ? 'opacity-60' : ''}`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 mt-0.5">
                {getSeverityIcon(insight.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  <Badge variant={getSeverityColor(insight.severity) as any} className="gap-1 text-xs">
                    {getTypeIcon(insight.type)}
                    {insight.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            </div>
            
            <Badge variant="outline" className="shrink-0 gap-1 text-xs">
              <TrendUp size={12} weight="fill" />
              {Math.round(insight.confidence * 100)}%
            </Badge>
          </div>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t border-border"
            >
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">RECOMMENDATION</p>
                <p className="text-sm">{insight.recommendation}</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">EXPECTED IMPACT</p>
                <p className="text-sm text-green-600 dark:text-green-400">{insight.impact}</p>
              </div>

              {insight.affectedModels.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">AFFECTED MODELS</p>
                  <div className="flex flex-wrap gap-1">
                    {insight.affectedModels.map((modelId) => (
                      <Badge key={modelId} variant="secondary" className="text-xs">
                        {modelId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs h-8"
            >
              {expanded ? 'Less' : 'More'} details
            </Button>
            
            {insight.suggestedAction && !isApplied && (
              <Button
                onClick={() => onApply(insight)}
                size="sm"
                className="gap-2 h-8 ml-auto"
              >
                Apply Fix
                <ArrowRight size={14} weight="bold" />
              </Button>
            )}
            
            {isApplied && (
              <Badge variant="secondary" className="gap-1 ml-auto">
                <CheckCircle size={14} weight="fill" />
                Applied
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

interface AutoTuneCardProps {
  recommendation: AutoTuneRecommendation
  models: ModelConfig[]
  onApply: (recommendation: AutoTuneRecommendation, modelId: string) => void
}

function AutoTuneCard({ recommendation, models, onApply }: AutoTuneCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(models[0]?.id || '')

  const parameterChanges = [
    {
      name: 'Temperature',
      current: recommendation.currentParams.temperature,
      recommended: recommendation.recommendedParams.temperature
    },
    {
      name: 'Max Tokens',
      current: recommendation.currentParams.maxTokens,
      recommended: recommendation.recommendedParams.maxTokens
    },
    {
      name: 'Top P',
      current: recommendation.currentParams.topP,
      recommended: recommendation.recommendedParams.topP
    },
    {
      name: 'Frequency Penalty',
      current: recommendation.currentParams.frequencyPenalty,
      recommended: recommendation.recommendedParams.frequencyPenalty
    },
    {
      name: 'Presence Penalty',
      current: recommendation.currentParams.presencePenalty,
      recommended: recommendation.recommendedParams.presencePenalty
    }
  ].filter(p => p.current !== p.recommended)

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="gap-1">
                <Lightning weight="fill" size={12} />
                {recommendation.taskType.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock size={12} weight="fill" />
                {Math.round(recommendation.confidence * 100)}% confidence
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3 pt-3 border-t border-border"
          >
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">PARAMETER CHANGES</p>
              <div className="space-y-2">
                {parameterChanges.map((change) => (
                  <div key={change.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{change.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {change.current}
                      </Badge>
                      <ArrowRight size={12} />
                      <Badge variant="secondary" className="font-mono text-xs">
                        {change.recommended}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(recommendation.expectedImprovements).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">EXPECTED IMPROVEMENTS</p>
                <ul className="space-y-1">
                  {Object.entries(recommendation.expectedImprovements).map(([key, value]) => (
                    <li key={key} className="text-sm flex items-start gap-2">
                      <CheckCircle size={16} weight="fill" className="text-green-500 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium capitalize">{key}:</span> {value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs h-8"
          >
            {expanded ? 'Less' : 'More'} details
          </Button>
          
          <Button
            onClick={() => onApply(recommendation, selectedModel)}
            size="sm"
            className="gap-2 h-8 ml-auto"
          >
            <Lightning weight="fill" size={14} />
            Auto-Tune
          </Button>
        </div>
      </div>
    </Card>
  )
}
