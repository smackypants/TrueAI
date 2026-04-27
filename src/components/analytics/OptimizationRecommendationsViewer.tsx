import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Sparkle,
  TrendUp,
  Lightning,
  CheckCircle,
  Warning,
  Info,
  ArrowRight,
  Eye,
  ListChecks,
  Target,
  Clock,
  ChartBar,
  Brain,
  MagnifyingGlass,
  Rocket,
  FunnelSimple,
  Faders
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OptimizationInsight } from '@/lib/auto-optimizer'
import type { ModelConfig, AutoTuneRecommendation } from '@/lib/types'

interface OptimizationRecommendationsViewerProps {
  insights: OptimizationInsight[]
  autoTuneRecommendations: AutoTuneRecommendation[]
  models: ModelConfig[]
  appliedInsights: Set<string>
  onApplyInsight: (insight: OptimizationInsight) => void
  onApplyAutoTune: (recommendation: AutoTuneRecommendation, modelId: string) => void
  onApplyAll: () => void
  isAnalyzing?: boolean
}

export function OptimizationRecommendationsViewer({
  insights,
  autoTuneRecommendations,
  models,
  appliedInsights,
  onApplyInsight,
  onApplyAutoTune,
  onApplyAll,
  isAnalyzing = false
}: OptimizationRecommendationsViewerProps) {
  const [selectedInsight, setSelectedInsight] = useState<OptimizationInsight | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<OptimizationInsight['severity'] | 'all'>('all')
  const [filterType, setFilterType] = useState<OptimizationInsight['type'] | 'all'>('all')
  const _sortBy = 'severity'
  const [showAppliedOnly, setShowAppliedOnly] = useState(false)
  const [showUnappliedOnly, setShowUnappliedOnly] = useState(false)

  const filteredInsights = insights
    .filter(i => filterSeverity === 'all' || i.severity === filterSeverity)
    .filter(i => filterType === 'all' || i.type === filterType)
    .filter(i => !showAppliedOnly || appliedInsights.has(i.id))
    .filter(i => !showUnappliedOnly || !appliedInsights.has(i.id))
    .sort((a, b) => {
      if (_sortBy === 'severity') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      } else if (_sortBy === 'confidence') {
        return b.confidence - a.confidence
      } else {
        return b.timestamp - a.timestamp
      }
    })

  const criticalCount = insights.filter(i => i.severity === 'critical' && !appliedInsights.has(i.id)).length
  const highCount = insights.filter(i => i.severity === 'high' && !appliedInsights.has(i.id)).length
  const appliedCount = insights.filter(i => appliedInsights.has(i.id)).length
  const totalActionable = insights.filter(i => i.suggestedAction && !appliedInsights.has(i.id)).length

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
        return <Warning weight="fill" size={20} className="text-red-500" />
      case 'high':
        return <Warning weight="fill" size={20} className="text-orange-500" />
      case 'medium':
        return <Info weight="fill" size={20} className="text-blue-500" />
      case 'low':
        return <CheckCircle weight="fill" size={20} className="text-green-500" />
    }
  }

  const getTypeIcon = (type: OptimizationInsight['type']) => {
    switch (type) {
      case 'performance':
        return <Lightning weight="fill" size={16} />
      case 'quality':
        return <Target weight="fill" size={16} />
      case 'efficiency':
        return <TrendUp weight="fill" size={16} />
      case 'cost':
        return <ChartBar weight="fill" size={16} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Brain weight="fill" size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">AI Optimization Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                View and apply intelligent performance insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalActionable > 0 && (
              <Button
                onClick={onApplyAll}
                size="sm"
                className="gap-2"
                disabled={isAnalyzing}
              >
                <Rocket weight="fill" size={16} />
                Apply All ({totalActionable})
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
              </div>
              <Warning weight="fill" size={32} className="text-red-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4 border-orange-500/20 bg-orange-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">High Priority</p>
                <p className="text-2xl font-bold text-orange-500">{highCount}</p>
              </div>
              <Warning weight="fill" size={32} className="text-orange-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4 border-green-500/20 bg-green-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Applied</p>
                <p className="text-2xl font-bold text-green-500">{appliedCount}</p>
              </div>
              <CheckCircle weight="fill" size={32} className="text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4 border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Insights</p>
                <p className="text-2xl font-bold text-purple-500">{insights.length}</p>
              </div>
              <Sparkle weight="fill" size={32} className="text-purple-500 opacity-20" />
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelSimple size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge 
                variant={filterSeverity === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterSeverity('all')}
              >
                All
              </Badge>
              <Badge 
                variant={filterSeverity === 'critical' ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterSeverity('critical')}
              >
                Critical
              </Badge>
              <Badge 
                variant={filterSeverity === 'high' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterSeverity('high')}
              >
                High
              </Badge>
              <Badge 
                variant={filterSeverity === 'medium' ? 'secondary' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterSeverity('medium')}
              >
                Medium
              </Badge>
              <Badge 
                variant={filterSeverity === 'low' ? 'outline' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterSeverity('low')}
              >
                Low
              </Badge>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <Badge 
                variant={filterType === 'all' ? 'default' : 'outline'}
                className="cursor-pointer gap-1"
                onClick={() => setFilterType('all')}
              >
                All Types
              </Badge>
              <Badge 
                variant={filterType === 'performance' ? 'default' : 'outline'}
                className="cursor-pointer gap-1"
                onClick={() => setFilterType('performance')}
              >
                <Lightning size={12} weight="fill" />
                Performance
              </Badge>
              <Badge 
                variant={filterType === 'quality' ? 'default' : 'outline'}
                className="cursor-pointer gap-1"
                onClick={() => setFilterType('quality')}
              >
                <Target size={12} weight="fill" />
                Quality
              </Badge>
              <Badge 
                variant={filterType === 'efficiency' ? 'default' : 'outline'}
                className="cursor-pointer gap-1"
                onClick={() => setFilterType('efficiency')}
              >
                <TrendUp size={12} weight="fill" />
                Efficiency
              </Badge>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <Button
                variant={showUnappliedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowUnappliedOnly(!showUnappliedOnly)
                  setShowAppliedOnly(false)
                }}
                className="h-8 gap-1"
              >
                <ListChecks size={14} />
                Pending
              </Button>
              <Button
                variant={showAppliedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowAppliedOnly(!showAppliedOnly)
                  setShowUnappliedOnly(false)
                }}
                className="h-8 gap-1"
              >
                <CheckCircle size={14} weight="fill" />
                Applied
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {filteredInsights.length === 0 && !isAnalyzing && (
        <Card className="p-12 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
            <MagnifyingGlass size={40} className="text-muted-foreground" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No insights found</h4>
          <p className="text-sm text-muted-foreground">
            {insights.length === 0 
              ? 'Use the app to generate data for AI-powered optimization insights'
              : 'Try adjusting your filters to see more recommendations'
            }
          </p>
        </Card>
      )}

      {filteredInsights.length > 0 && (
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <ListChecks size={18} />
              List View
            </TabsTrigger>
            <TabsTrigger value="detailed" className="gap-2">
              <Eye size={18} />
              Detailed View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3 mt-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredInsights.map((insight) => (
                    <InsightListCard
                      key={insight.id}
                      insight={insight}
                      isApplied={appliedInsights.has(insight.id)}
                      onApply={() => onApplyInsight(insight)}
                      onView={() => setSelectedInsight(insight)}
                      getSeverityColor={getSeverityColor}
                      getSeverityIcon={getSeverityIcon}
                      getTypeIcon={getTypeIcon}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="detailed" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-1 p-4">
                <h4 className="text-sm font-semibold mb-3">Insights ({filteredInsights.length})</h4>
                <ScrollArea className="h-[550px]">
                  <div className="space-y-2">
                    {filteredInsights.map((insight) => (
                      <Button
                        key={insight.id}
                        variant={selectedInsight?.id === insight.id ? 'secondary' : 'ghost'}
                        className="w-full justify-start text-left h-auto py-3 px-3"
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start gap-2 w-full">
                          <div className="shrink-0 mt-0.5">
                            {getSeverityIcon(insight.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{insight.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {insight.type}
                              </Badge>
                              {appliedInsights.has(insight.id) && (
                                <CheckCircle size={12} weight="fill" className="text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="lg:col-span-2 p-6">
                {selectedInsight ? (
                  <DetailedInsightView
                    insight={selectedInsight}
                    isApplied={appliedInsights.has(selectedInsight.id)}
                    onApply={() => onApplyInsight(selectedInsight)}
                    getSeverityColor={getSeverityColor}
                    getSeverityIcon={getSeverityIcon}
                    getTypeIcon={getTypeIcon}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[550px]">
                    <div className="text-center">
                      <Eye size={48} className="text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Select an insight to view details
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {autoTuneRecommendations.length > 0 && (
        <div className="space-y-4">
          <Separator />
          
          <div className="flex items-center gap-2">
            <Faders weight="fill" size={20} className="text-primary" />
            <h4 className="text-lg font-semibold">Auto-Tune Recommendations</h4>
            <Badge variant="secondary">{autoTuneRecommendations.length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autoTuneRecommendations.map((rec, index) => (
              <AutoTuneRecommendationCard
                key={index}
                recommendation={rec}
                models={models}
                onApply={(modelId) => onApplyAutoTune(rec, modelId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface InsightListCardProps {
  insight: OptimizationInsight
  isApplied: boolean
  onApply: () => void
  onView: () => void
  getSeverityColor: (severity: OptimizationInsight['severity']) => string
  getSeverityIcon: (severity: OptimizationInsight['severity']) => JSX.Element
  getTypeIcon: (type: OptimizationInsight['type']) => JSX.Element
}

function InsightListCard({
  insight,
  isApplied,
  onApply,
  onView,
  getSeverityColor,
  getSeverityIcon,
  getTypeIcon
}: InsightListCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`p-4 ${isApplied ? 'bg-green-500/5 border-green-500/20' : ''}`}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-1">
            {getSeverityIcon(insight.severity)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm">{insight.title}</h4>
              <Badge variant={getSeverityColor(insight.severity) as 'destructive' | 'default' | 'secondary' | 'outline'} className="gap-1 text-xs shrink-0">
                {getTypeIcon(insight.type)}
                {insight.type}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <TrendUp size={12} weight="fill" />
                  {Math.round(insight.confidence * 100)}% confidence
                </Badge>
                {insight.affectedModels.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {insight.affectedModels.length} model{insight.affectedModels.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onView}
                  className="h-8 gap-1"
                >
                  <Eye size={14} />
                  View
                </Button>
                
                {insight.suggestedAction && !isApplied && (
                  <Button
                    onClick={onApply}
                    size="sm"
                    className="gap-2 h-8"
                  >
                    Apply
                    <ArrowRight size={14} weight="bold" />
                  </Button>
                )}
                
                {isApplied && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle size={14} weight="fill" />
                    Applied
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

interface DetailedInsightViewProps {
  insight: OptimizationInsight
  isApplied: boolean
  onApply: () => void
  getSeverityColor: (severity: OptimizationInsight['severity']) => string
  getSeverityIcon: (severity: OptimizationInsight['severity']) => JSX.Element
  getTypeIcon: (type: OptimizationInsight['type']) => JSX.Element
}

function DetailedInsightView({
  insight,
  isApplied,
  onApply,
  getSeverityColor,
  getSeverityIcon,
  getTypeIcon
}: DetailedInsightViewProps) {
  return (
    <ScrollArea className="h-[550px]">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            {getSeverityIcon(insight.severity)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xl font-bold">{insight.title}</h3>
              {isApplied && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle size={16} weight="fill" />
                  Applied
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getSeverityColor(insight.severity) as 'destructive' | 'default' | 'secondary' | 'outline'} className="gap-1">
                {getTypeIcon(insight.type)}
                {insight.type}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <TrendUp size={12} weight="fill" />
                {Math.round(insight.confidence * 100)}% confidence
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock size={12} weight="fill" />
                {new Date(insight.timestamp).toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Description
          </h4>
          <p className="text-base">{insight.description}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Recommendation
          </h4>
          <Card className="p-4 bg-blue-500/5 border-blue-500/20">
            <p className="text-base">{insight.recommendation}</p>
          </Card>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Expected Impact
          </h4>
          <Card className="p-4 bg-green-500/5 border-green-500/20">
            <div className="flex items-start gap-2">
              <TrendUp size={20} weight="fill" className="text-green-500 shrink-0 mt-0.5" />
              <p className="text-base text-green-700 dark:text-green-400">{insight.impact}</p>
            </div>
          </Card>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Confidence Analysis
          </h4>
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Confidence Level</span>
                <span className="font-semibold">{Math.round(insight.confidence * 100)}%</span>
              </div>
              <Progress value={insight.confidence * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {insight.confidence >= 0.9 
                  ? 'Very high confidence - strongly recommended'
                  : insight.confidence >= 0.75
                  ? 'High confidence - recommended'
                  : insight.confidence >= 0.6
                  ? 'Moderate confidence - consider carefully'
                  : 'Low confidence - review before applying'
                }
              </p>
            </div>
          </Card>
        </div>

        {insight.affectedModels.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Affected Models
            </h4>
            <div className="flex flex-wrap gap-2">
              {insight.affectedModels.map((modelId) => (
                <Badge key={modelId} variant="secondary" className="text-sm">
                  {modelId}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insight.suggestedAction && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Suggested Action
            </h4>
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{insight.suggestedAction.type.replace('_', ' ')}</Badge>
                </div>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(insight.suggestedAction.details, null, 2)}
                </pre>
              </div>
            </Card>
          </div>
        )}

        {insight.suggestedAction && !isApplied && (
          <Button
            onClick={onApply}
            className="w-full gap-2"
            size="lg"
          >
            <Rocket weight="fill" size={20} />
            Apply This Optimization
            <ArrowRight size={20} weight="bold" />
          </Button>
        )}
      </div>
    </ScrollArea>
  )
}

interface AutoTuneRecommendationCardProps {
  recommendation: AutoTuneRecommendation
  models: ModelConfig[]
  onApply: (modelId: string) => void
}

function AutoTuneRecommendationCard({
  recommendation,
  models,
  onApply
}: AutoTuneRecommendationCardProps) {
  const [_selectedModel, _setSelectedModel] = useState<string>(models[0]?.id || '')

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
    }
  ].filter(p => p.current !== p.recommended)

  return (
    <Card className="p-4 border-purple-500/20 bg-purple-500/5">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="gap-1">
              <Lightning weight="fill" size={12} />
              {recommendation.taskType.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {Math.round(recommendation.confidence * 100)}% confidence
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3">PARAMETER CHANGES</p>
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

        <Button
          onClick={() => onApply(_selectedModel)}
          className="w-full gap-2"
          size="sm"
        >
          <Lightning weight="fill" size={16} />
          Apply Auto-Tune
        </Button>
      </div>
    </Card>
  )
}
