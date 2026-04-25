import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  TrendUp, 
  TrendDown, 
  Minus, 
  Lightbulb, 
  CheckCircle, 
  Warning, 
  ChartBar,
  Robot,
  Star,
  Target,
  Brain,
  Lightning
} from '@phosphor-icons/react'
import type { AgentLearningMetrics, LearningInsight, Agent } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface LearningInsightsPanelProps {
  agent: Agent
  metrics: AgentLearningMetrics
  onApplyInsight: (insight: LearningInsight) => void
  onTriggerLearning: () => void
  isLearning?: boolean
}

export function LearningInsightsPanel({ 
  agent, 
  metrics, 
  onApplyInsight,
  onTriggerLearning,
  isLearning = false
}: LearningInsightsPanelProps) {
  const getInsightIcon = (type: LearningInsight['type']) => {
    switch (type) {
      case 'pattern': return ChartBar
      case 'improvement': return TrendUp
      case 'regression': return Warning
      case 'recommendation': return Lightbulb
      default: return Brain
    }
  }

  const getInsightColor = (type: LearningInsight['type']) => {
    switch (type) {
      case 'pattern': return 'text-blue-400'
      case 'improvement': return 'text-green-400'
      case 'regression': return 'text-orange-400'
      case 'recommendation': return 'text-accent'
      default: return 'text-foreground'
    }
  }

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving': return <TrendUp size={16} className="text-green-400" weight="bold" />
      case 'declining': return <TrendDown size={16} className="text-orange-400" weight="bold" />
      case 'stable': return <Minus size={16} className="text-muted-foreground" weight="bold" />
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-card via-card to-accent/5 border-accent/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Robot weight="fill" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Learning Metrics</h3>
              <p className="text-sm text-muted-foreground">Agent: {agent.name}</p>
            </div>
          </div>
          <Button
            onClick={onTriggerLearning}
            disabled={isLearning || metrics.totalRuns < 3}
            size="sm"
            className="gap-2"
          >
            {isLearning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Brain size={18} weight="fill" />
                </motion.div>
                Learning...
              </>
            ) : (
              <>
                <Lightning size={18} weight="fill" />
                Analyze & Learn
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Runs</p>
            <p className="text-2xl font-bold">{metrics.totalRuns}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</p>
              <Star size={18} weight="fill" className="text-accent" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Improvement</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${metrics.improvementRate > 0 ? 'text-green-400' : metrics.improvementRate < 0 ? 'text-orange-400' : ''}`}>
                {metrics.improvementRate > 0 ? '+' : ''}{metrics.improvementRate.toFixed(1)}%
              </p>
              {getTrendIcon(metrics.improvementRate > 5 ? 'improving' : metrics.improvementRate < -5 ? 'declining' : 'stable')}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Insights</p>
            <p className="text-2xl font-bold">{metrics.learningInsights.length}</p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Parameter Trends</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3 bg-card/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="text-lg font-bold font-mono">{metrics.parameterTrends.temperature.value}</p>
                </div>
                {getTrendIcon(metrics.parameterTrends.temperature.trend)}
              </div>
            </Card>
            <Card className="p-3 bg-card/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Max Iterations</p>
                  <p className="text-lg font-bold font-mono">{metrics.parameterTrends.maxIterations.value}</p>
                </div>
                {getTrendIcon(metrics.parameterTrends.maxIterations.trend)}
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {metrics.commonIssues.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Warning size={20} weight="fill" className="text-orange-400" />
            <h4 className="text-base font-semibold">Common Issues</h4>
          </div>
          <div className="space-y-2">
            {metrics.commonIssues.slice(0, 3).map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm capitalize">{issue.issue.replace(/_/g, ' ')}</span>
                <Badge variant="secondary">{issue.count} times</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {metrics.toolEffectiveness.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={20} weight="fill" className="text-accent" />
            <h4 className="text-base font-semibold">Tool Effectiveness</h4>
          </div>
          <div className="space-y-3">
            {metrics.toolEffectiveness.map((tool, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{tool.tool.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {(tool.successRate * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={tool.successRate * 100} className="h-2" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {metrics.learningInsights.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} weight="fill" className="text-accent" />
            <h4 className="text-base font-semibold">Learning Insights</h4>
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {metrics.learningInsights.map((insight, index) => {
                  const Icon = getInsightIcon(insight.type)
                  const colorClass = getInsightColor(insight.type)

                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`p-4 border-l-4 ${insight.applied ? 'border-l-green-400 bg-green-400/5' : 'border-l-accent'}`}>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Icon size={20} weight="fill" className={colorClass} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h5 className="text-sm font-semibold">{insight.title}</h5>
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {(insight.confidence * 100).toFixed(0)}% confident
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{insight.description}</p>
                            </div>
                          </div>

                          {insight.actionable && !insight.applied && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onApplyInsight(insight)}
                                className="gap-2"
                              >
                                <CheckCircle size={16} weight="fill" />
                                Apply
                              </Button>
                            </div>
                          )}

                          {insight.applied && (
                            <div className="flex items-center gap-2 text-xs text-green-400">
                              <CheckCircle size={14} weight="fill" />
                              <span>Applied</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
