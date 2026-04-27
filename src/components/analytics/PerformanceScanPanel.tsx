import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Lightning, 
  CheckCircle, 
  WarningCircle, 
  XCircle, 
  TrendUp, 
  Gauge, 
  Cpu,
  Clock,
  Target,
  Wrench,
  Sparkle
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  performanceScanner,
  type PerformanceScanResult,
  type OptimizationAction
} from '@/lib/performance-scanner'
import type { AnalyticsEvent, ModelConfig, PerformanceProfile } from '@/lib/types'
import { formatHardwareInfo } from '@/lib/hardware-scanner'

interface PerformanceScanPanelProps {
  events: AnalyticsEvent[]
  models: ModelConfig[]
  profiles: PerformanceProfile[]
  onApplyOptimizations: (updatedModels: ModelConfig[]) => void
}

export function PerformanceScanPanel({
  events,
  models,
  profiles,
  onApplyOptimizations
}: PerformanceScanPanelProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<PerformanceScanResult | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [appliedOptimizations, setAppliedOptimizations] = useState<Set<string>>(new Set())

  useEffect(() => {
    performanceScanner.loadScanHistory()
  }, [])

  const runScan = async () => {
    setIsScanning(true)
    try {
      const result = await performanceScanner.performComprehensiveScan(events, models, profiles)
      setScanResult(result)
      toast.success('Performance scan completed')
    } catch (error) {
      toast.error('Failed to run performance scan')
      console.error(error)
    } finally {
      setIsScanning(false)
    }
  }

  const applyOptimization = async (optimization: OptimizationAction) => {
    setIsApplying(true)
    try {
      const { updated } = await performanceScanner.applyOptimizations([optimization], models)
      onApplyOptimizations(updated)
      setAppliedOptimizations(prev => new Set([...prev, optimization.id]))
      toast.success(`Applied: ${optimization.description}`)
    } catch (error) {
      toast.error('Failed to apply optimization')
      console.error(error)
    } finally {
      setIsApplying(false)
    }
  }

  const applyAllAutoOptimizations = async () => {
    if (!scanResult) return

    setIsApplying(true)
    try {
      const autoOptimizations = scanResult.optimizations.filter(o => o.autoApplicable)
      const { updated, applied } = await performanceScanner.applyOptimizations(autoOptimizations, models)
      onApplyOptimizations(updated)

      autoOptimizations.forEach(opt => {
        setAppliedOptimizations(prev => new Set([...prev, opt.id]))
      })

      toast.success(`Applied ${applied} optimizations`)
    } catch (error) {
      toast.error('Failed to apply optimizations')
      console.error(error)
    } finally {
      setIsApplying(false)
    }
  }

  const getSeverityColor = (severity: 'critical' | 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    }
  }

  const getSeverityIcon = (severity: 'critical' | 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'critical': return <XCircle weight="fill" />
      case 'high': return <WarningCircle weight="fill" />
      case 'medium': return <WarningCircle />
      case 'low': return <CheckCircle />
    }
  }

  const getPriorityColor = (priority: 'critical' | 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gauge weight="fill" className="text-accent" />
            Performance Scanner
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive system analysis for optimal performance
          </p>
        </div>
        <Button 
          onClick={runScan} 
          disabled={isScanning || events.length < 10}
          size="lg"
          className="gap-2"
        >
          {isScanning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Lightning weight="fill" />
              </motion.div>
              Scanning...
            </>
          ) : (
            <>
              <Lightning weight="fill" />
              Run Full Scan
            </>
          )}
        </Button>
      </div>

      {events.length < 10 && !scanResult && (
        <Alert>
          <Sparkle className="h-4 w-4" />
          <AlertTitle>Not Enough Data</AlertTitle>
          <AlertDescription>
            Collect at least 10 interactions to run a performance scan. Current: {events.length}
          </AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {scanResult && (
          <motion.div
            key={scanResult.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      scanResult.estimatedImprovements.overallScore > 50 
                        ? 'bg-green-500/10 text-green-500' 
                        : scanResult.estimatedImprovements.overallScore > 25
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      <TrendUp weight="fill" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Overall Improvement Potential</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(scanResult.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-accent">
                      {scanResult.estimatedImprovements.overallScore}%
                    </div>
                    <p className="text-xs text-muted-foreground">Potential Gain</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 border-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock size={16} />
                        Response Time
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {scanResult.estimatedImprovements.responseTimeReduction}%
                      </div>
                      <Progress value={scanResult.estimatedImprovements.responseTimeReduction} className="h-2" />
                    </div>
                  </Card>

                  <Card className="p-4 border-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle size={16} />
                        Error Rate
                      </div>
                      <div className="text-2xl font-bold text-green-500">
                        {scanResult.estimatedImprovements.errorRateReduction}%
                      </div>
                      <Progress value={scanResult.estimatedImprovements.errorRateReduction} className="h-2" />
                    </div>
                  </Card>

                  <Card className="p-4 border-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendUp size={16} />
                        Throughput
                      </div>
                      <div className="text-2xl font-bold text-blue-500">
                        {scanResult.estimatedImprovements.throughputIncrease}%
                      </div>
                      <Progress value={scanResult.estimatedImprovements.throughputIncrease} className="h-2" />
                    </div>
                  </Card>

                  <Card className="p-4 border-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target size={16} />
                        Token Efficiency
                      </div>
                      <div className="text-2xl font-bold text-purple-500">
                        {scanResult.estimatedImprovements.tokenEfficiencyGain}%
                      </div>
                      <Progress value={scanResult.estimatedImprovements.tokenEfficiencyGain} className="h-2" />
                    </div>
                  </Card>
                </div>

                {scanResult.optimizations.filter(o => o.autoApplicable).length > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center gap-3">
                      <Sparkle className="text-accent" size={24} />
                      <div>
                        <p className="font-semibold">Auto-Optimize Available</p>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.optimizations.filter(o => o.autoApplicable).length} optimizations can be applied automatically
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={applyAllAutoOptimizations}
                      disabled={isApplying}
                      className="gap-2"
                    >
                      <Lightning weight="fill" />
                      Apply All ({scanResult.optimizations.filter(o => o.autoApplicable).length})
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Tabs defaultValue="optimizations" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="optimizations">
                  Optimizations ({scanResult.optimizations.length})
                </TabsTrigger>
                <TabsTrigger value="bottlenecks">
                  Bottlenecks ({scanResult.bottlenecks.length})
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  Current Metrics
                </TabsTrigger>
                <TabsTrigger value="hardware">
                  Hardware Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="optimizations" className="space-y-4">
                {scanResult.optimizations.length === 0 ? (
                  <Card className="p-12 text-center">
                    <CheckCircle weight="fill" size={48} className="mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold mb-2">System Running Optimally</h3>
                    <p className="text-muted-foreground">No optimizations needed at this time</p>
                  </Card>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {scanResult.optimizations.map(opt => (
                        <Card 
                          key={opt.id} 
                          className={`p-4 ${appliedOptimizations.has(opt.id) ? 'opacity-60 border-green-500' : ''}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={getPriorityColor(opt.priority)}>
                                    {opt.priority}
                                  </Badge>
                                  <Badge variant="outline">{opt.type}</Badge>
                                  {opt.autoApplicable && (
                                    <Badge variant="secondary" className="gap-1">
                                      <Lightning size={12} weight="fill" />
                                      Auto
                                    </Badge>
                                  )}
                                  {appliedOptimizations.has(opt.id) && (
                                    <Badge variant="default" className="gap-1 bg-green-500">
                                      <CheckCircle size={12} weight="fill" />
                                      Applied
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold">{opt.description}</h4>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">Expected:</span>
                                  <span className="text-accent font-medium">{opt.expectedGain}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">
                                    Confidence: {Math.round(opt.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                              {!appliedOptimizations.has(opt.id) && (
                                <Button
                                  onClick={() => applyOptimization(opt)}
                                  disabled={isApplying}
                                  size="sm"
                                  className="gap-2"
                                >
                                  <Wrench size={16} />
                                  Apply
                                </Button>
                              )}
                            </div>
                            
                            {opt.targetModel && (
                              <div className="text-xs text-muted-foreground">
                                Target: {models.find(m => m.id === opt.targetModel)?.name || opt.targetModel}
                              </div>
                            )}
                            
                            {Object.keys(opt.changes).length > 0 && (
                              <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs">
                                <span className="font-semibold">Changes:</span>
                                <pre className="mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(opt.changes, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="bottlenecks" className="space-y-4">
                {scanResult.bottlenecks.length === 0 ? (
                  <Card className="p-12 text-center">
                    <CheckCircle weight="fill" size={48} className="mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold mb-2">No Bottlenecks Detected</h3>
                    <p className="text-muted-foreground">Your system is performing well</p>
                  </Card>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {scanResult.bottlenecks.map(bottleneck => (
                        <Card 
                          key={bottleneck.id}
                          className={`p-4 border-2 ${getSeverityColor(bottleneck.severity)}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                  {getSeverityIcon(bottleneck.severity)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="capitalize">
                                      {bottleneck.type.replace('_', ' ')}
                                    </Badge>
                                    <Badge className={getSeverityColor(bottleneck.severity)}>
                                      {bottleneck.severity}
                                    </Badge>
                                  </div>
                                  <h4 className="font-semibold text-lg">{bottleneck.description}</h4>
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-semibold">Impact: </span>
                                <span className="text-muted-foreground">{bottleneck.impact}</span>
                              </div>
                              
                              {bottleneck.affectedModels.length > 0 && (
                                <div>
                                  <span className="font-semibold">Affected Models: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {bottleneck.affectedModels.map(modelId => (
                                      <Badge key={modelId} variant="secondary" className="text-xs">
                                        {models.find(m => m.id === modelId)?.name || modelId}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Avg Response Time</div>
                      <div className="text-2xl font-bold">
                        {(scanResult.currentMetrics.avgResponseTime / 1000).toFixed(2)}s
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">P95 Response Time</div>
                      <div className="text-2xl font-bold">
                        {(scanResult.currentMetrics.p95ResponseTime / 1000).toFixed(2)}s
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">P99 Response Time</div>
                      <div className="text-2xl font-bold">
                        {(scanResult.currentMetrics.p99ResponseTime / 1000).toFixed(2)}s
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="text-2xl font-bold text-green-500">
                        {scanResult.currentMetrics.successRate.toFixed(1)}%
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Error Rate</div>
                      <div className="text-2xl font-bold text-red-500">
                        {scanResult.currentMetrics.errorRate.toFixed(1)}%
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">System Load</div>
                      <div className="text-2xl font-bold">
                        {scanResult.currentMetrics.systemLoad.toFixed(0)}%
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Model Efficiency</h3>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {Object.values(scanResult.currentMetrics.modelEfficiency).map(efficiency => (
                        <Card key={efficiency.modelId} className="p-4 border-2">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{efficiency.modelName}</h4>
                              <Badge 
                                variant={efficiency.parameterEfficiency > 70 ? 'default' : 'secondary'}
                              >
                                {efficiency.parameterEfficiency.toFixed(0)}% Efficiency
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-muted-foreground text-xs">Avg Response</div>
                                <div className="font-semibold">
                                  {(efficiency.avgResponseTime / 1000).toFixed(2)}s
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs">Tokens/sec</div>
                                <div className="font-semibold">
                                  {efficiency.tokensPerSecond.toFixed(1)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs">Requests</div>
                                <div className="font-semibold">{efficiency.requestCount}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs">Wasted Tokens</div>
                                <div className="font-semibold text-orange-500">
                                  {Math.round(efficiency.wastedTokens)}
                                </div>
                              </div>
                            </div>
                            
                            {efficiency.wastedTokens > 500 && (
                              <Alert>
                                <Sparkle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  Consider reducing maxTokens to {efficiency.optimalMaxTokens} for better performance
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>

              <TabsContent value="hardware">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-accent/10 text-accent">
                      <Cpu weight="fill" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Hardware Specifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Device Tier: <span className="font-semibold capitalize">{scanResult.hardwareSpecs.tier}</span>
                      </p>
                    </div>
                  </div>

                  <ScrollArea className="h-[500px]">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">
                        {formatHardwareInfo(scanResult.hardwareSpecs)}
                      </pre>
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
