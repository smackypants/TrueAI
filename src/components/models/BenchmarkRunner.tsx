import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Play, Stop, ChartBar, Target, TrendUp, Clock, Lightning, Brain, CheckCircle, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { ModelConfig, TaskType} from '@/lib/types'
import { 
  runModelBenchmark, 
  benchmarkTests, 
  compareBenchmarkSuites,
  type BenchmarkSuite,
  type BenchmarkTest
} from '@/lib/model-benchmark'

interface BenchmarkRunnerProps {
  models: ModelConfig[]
  onBenchmarkComplete?: (suite: BenchmarkSuite) => void
}

export function BenchmarkRunner({ models, onBenchmarkComplete }: BenchmarkRunnerProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || '')
  const [selectedTests, setSelectedTests] = useState<string[]>(benchmarkTests.map(t => t.id))
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState('')
  const [results, setResults] = useState<BenchmarkSuite[]>([])
  const [activeResult, setActiveResult] = useState<BenchmarkSuite | null>(null)
  const _comparisonMode = false
  const [baselineId, setBaselineId] = useState<string | null>(null)

  const selectedModel = models.find(m => m.id === selectedModelId)
  const testsToRun = benchmarkTests.filter(t => selectedTests.includes(t.id))

  const taskTypeGroups = benchmarkTests.reduce((acc, test) => {
    if (!acc[test.taskType]) {
      acc[test.taskType] = []
    }
    acc[test.taskType].push(test)
    return acc
  }, {} as Record<TaskType, BenchmarkTest[]>)

  const toggleTest = (testId: string) => {
    setSelectedTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    )
  }

  const toggleTaskType = (taskType: TaskType) => {
    const taskTests = taskTypeGroups[taskType].map(t => t.id)
    const allSelected = taskTests.every(id => selectedTests.includes(id))
    
    if (allSelected) {
      setSelectedTests(prev => prev.filter(id => !taskTests.includes(id)))
    } else {
      setSelectedTests(prev => [...new Set([...prev, ...taskTests])])
    }
  }

  const runBenchmark = async () => {
    if (!selectedModel || testsToRun.length === 0) {
      toast.error('Select a model and at least one test')
      return
    }

    setIsRunning(true)
    setProgress(0)
    setCurrentTest('')

    try {
      const suite = await runModelBenchmark(
        selectedModel,
        {
          temperature: selectedModel.temperature,
          maxTokens: selectedModel.maxTokens,
          topP: selectedModel.topP,
          frequencyPenalty: selectedModel.frequencyPenalty,
          presencePenalty: selectedModel.presencePenalty
        },
        testsToRun,
        (prog, test) => {
          setProgress(prog)
          setCurrentTest(test)
        }
      )

      setResults(prev => [suite, ...prev])
      setActiveResult(suite)
      
      if (onBenchmarkComplete) {
        onBenchmarkComplete(suite)
      }

      toast.success(`Benchmark completed! Score: ${suite.overallScore.toFixed(1)}/100`)
    } catch (error) {
      toast.error('Benchmark failed: ' + String(error))
      console.error(error)
    } finally {
      setIsRunning(false)
      setProgress(0)
      setCurrentTest('')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  const baseline = baselineId ? results.find(r => r.id === baselineId) : null
  const comparison = baseline && activeResult && baseline.id !== activeResult.id
    ? compareBenchmarkSuites(baseline, activeResult)
    : null

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain weight="fill" className="text-accent" size={24} />
                Model Benchmark Suite
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Test model performance across different task types
              </p>
            </div>
            <Button
              onClick={runBenchmark}
              disabled={isRunning || !selectedModel || testsToRun.length === 0}
              size="lg"
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Stop weight="fill" size={20} />
                  Running...
                </>
              ) : (
                <>
                  <Play weight="fill" size={20} />
                  Run Benchmark
                </>
              )}
            </Button>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>Tests Selected</Label>
              <div className="h-10 px-3 flex items-center border border-input rounded-md bg-muted/30">
                <span className="text-sm font-medium">{testsToRun.length} / {benchmarkTests.length} tests</span>
              </div>
            </div>
          </div>

          {selectedModel && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Parameters</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Temp:</span>{' '}
                  <span className="font-mono">{selectedModel.temperature}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens:</span>{' '}
                  <span className="font-mono">{selectedModel.maxTokens}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Top P:</span>{' '}
                  <span className="font-mono">{selectedModel.topP}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Freq:</span>{' '}
                  <span className="font-mono">{selectedModel.frequencyPenalty}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pres:</span>{' '}
                  <span className="font-mono">{selectedModel.presencePenalty}</span>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentTest && (
                  <p className="text-xs text-muted-foreground">
                    Testing: {currentTest.replace('_', ' ')}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <Label>Select Tests</Label>
            <ScrollArea className="h-64 border border-border rounded-lg p-3">
              <div className="space-y-3">
                {Object.entries(taskTypeGroups).map(([taskType, tests]) => {
                  const allSelected = tests.every(t => selectedTests.includes(t.id))
                  const someSelected = tests.some(t => selectedTests.includes(t.id))
                  
                  return (
                    <div key={taskType} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`task-${taskType}`}
                          checked={allSelected}
                          onCheckedChange={() => toggleTaskType(taskType as TaskType)}
                          className={someSelected && !allSelected ? 'opacity-50' : ''}
                        />
                        <Label
                          htmlFor={`task-${taskType}`}
                          className="font-semibold capitalize cursor-pointer"
                        >
                          {taskType.replace(/_/g, ' ')}
                        </Label>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {tests.length}
                        </Badge>
                      </div>
                      <div className="ml-6 space-y-1.5">
                        {tests.map(test => (
                          <div key={test.id} className="flex items-center gap-2">
                            <Checkbox
                              id={test.id}
                              checked={selectedTests.includes(test.id)}
                              onCheckedChange={() => toggleTest(test.id)}
                            />
                            <Label htmlFor={test.id} className="text-xs cursor-pointer">
                              {test.prompt.substring(0, 60)}...
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <Tabs defaultValue="results" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="results" className="gap-2">
                  <ChartBar weight="fill" size={18} />
                  Results
                </TabsTrigger>
                <TabsTrigger value="comparison" className="gap-2">
                  <TrendUp weight="fill" size={18} />
                  Compare
                </TabsTrigger>
              </TabsList>
              
              {results.length > 0 && (
                <Select value={activeResult?.id || ''} onValueChange={(id) => {
                  setActiveResult(results.find(r => r.id === id) || null)
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    {results.map(result => (
                      <SelectItem key={result.id} value={result.id}>
                        {new Date(result.timestamp).toLocaleTimeString()} - {result.overallScore.toFixed(0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="results" className="space-y-4">
              {activeResult && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target weight="fill" className="text-accent" size={20} />
                        <p className="text-xs text-muted-foreground">Overall Score</p>
                      </div>
                      <p className={`text-2xl font-bold ${getScoreColor(activeResult.overallScore)}`}>
                        {activeResult.overallScore.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">/ 100</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock weight="fill" className="text-accent" size={20} />
                        <p className="text-xs text-muted-foreground">Avg Response</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {activeResult.averageResponseTime.toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">ms</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightning weight="fill" className="text-accent" size={20} />
                        <p className="text-xs text-muted-foreground">Throughput</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {activeResult.averageTokensPerSecond.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">tok/s</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle weight="fill" className="text-accent" size={20} />
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                      </div>
                      <p className="text-2xl font-bold">
                        {((activeResult.tests.filter(t => !t.error).length / activeResult.tests.length) * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeResult.tests.filter(t => !t.error).length}/{activeResult.tests.length}
                      </p>
                    </Card>
                  </div>

                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {activeResult.tests.map(test => {
                        const testDef = benchmarkTests.find(t => t.id === test.testId)
                        return (
                          <Card key={test.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="capitalize text-xs">
                                      {testDef?.taskType.replace(/_/g, ' ')}
                                    </Badge>
                                    {test.error ? (
                                      <XCircle weight="fill" className="text-red-500" size={16} />
                                    ) : (
                                      <CheckCircle weight="fill" className="text-green-500" size={16} />
                                    )}
                                  </div>
                                  <p className="text-sm font-medium truncate">{testDef?.prompt}</p>
                                </div>
                                <Badge variant={getScoreBadgeVariant(test.qualityScore)} className="shrink-0">
                                  {test.qualityScore.toFixed(0)}/100
                                </Badge>
                              </div>

                              {!test.error && (
                                <>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Relevance:</span>{' '}
                                      <span className="font-mono">{test.qualityBreakdown.relevance.toFixed(0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Coherence:</span>{' '}
                                      <span className="font-mono">{test.qualityBreakdown.coherence.toFixed(0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Creativity:</span>{' '}
                                      <span className="font-mono">{test.qualityBreakdown.creativity.toFixed(0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Accuracy:</span>{' '}
                                      <span className="font-mono">{test.qualityBreakdown.accuracy.toFixed(0)}</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>⏱️ {test.responseTime}ms</span>
                                    <span>⚡ {test.tokensPerSecond.toFixed(1)} tok/s</span>
                                  </div>
                                </>
                              )}

                              {test.error && (
                                <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                                  <p className="text-xs text-destructive">{test.error}</p>
                                </div>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Baseline</Label>
                    <Select value={baselineId || ''} onValueChange={setBaselineId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select baseline" />
                      </SelectTrigger>
                      <SelectContent>
                        {results.map(result => (
                          <SelectItem key={result.id} value={result.id}>
                            {new Date(result.timestamp).toLocaleString()} - {result.overallScore.toFixed(0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Compare With</Label>
                    <Select value={activeResult?.id || ''} onValueChange={(id) => {
                      setActiveResult(results.find(r => r.id === id) || null)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select comparison" />
                      </SelectTrigger>
                      <SelectContent>
                        {results.filter(r => r.id !== baselineId).map(result => (
                          <SelectItem key={result.id} value={result.id}>
                            {new Date(result.timestamp).toLocaleString()} - {result.overallScore.toFixed(0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {comparison && baseline && activeResult && (
                  <div className="space-y-4">
                    <Card className="p-4 bg-accent/5 border-accent">
                      <p className="font-semibold mb-2 flex items-center gap-2">
                        <TrendUp weight="fill" size={20} />
                        Recommendation
                      </p>
                      <p className="text-sm">{comparison.recommendation}</p>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-2">Quality Change</p>
                        <p className={`text-2xl font-bold ${comparison.scoreDelta > 0 ? 'text-green-500' : comparison.scoreDelta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {comparison.scoreDelta > 0 ? '+' : ''}{comparison.scoreDelta.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {baseline.overallScore.toFixed(1)} → {activeResult.overallScore.toFixed(1)}
                        </p>
                      </Card>

                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-2">Speed Change</p>
                        <p className={`text-2xl font-bold ${comparison.speedDelta > 0 ? 'text-green-500' : comparison.speedDelta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {comparison.speedDelta > 0 ? '+' : ''}{comparison.speedDelta.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {baseline.averageResponseTime.toFixed(0)}ms → {activeResult.averageResponseTime.toFixed(0)}ms
                        </p>
                      </Card>

                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-2">Throughput Change</p>
                        <p className={`text-2xl font-bold ${comparison.throughputDelta > 0 ? 'text-green-500' : comparison.throughputDelta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {comparison.throughputDelta > 0 ? '+' : ''}{comparison.throughputDelta.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {baseline.averageTokensPerSecond.toFixed(1)} → {activeResult.averageTokensPerSecond.toFixed(1)} tok/s
                        </p>
                      </Card>
                    </div>

                    {(comparison.betterTests.length > 0 || comparison.worseTests.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {comparison.betterTests.length > 0 && (
                          <Card className="p-4">
                            <p className="font-medium mb-2 text-green-500 flex items-center gap-2">
                              <CheckCircle weight="fill" size={18} />
                              Improved Tests
                            </p>
                            <ul className="space-y-1">
                              {comparison.betterTests.map(testId => {
                                const test = benchmarkTests.find(t => t.id === testId)
                                return (
                                  <li key={testId} className="text-xs capitalize">
                                    • {test?.taskType.replace(/_/g, ' ')}
                                  </li>
                                )
                              })}
                            </ul>
                          </Card>
                        )}

                        {comparison.worseTests.length > 0 && (
                          <Card className="p-4">
                            <p className="font-medium mb-2 text-red-500 flex items-center gap-2">
                              <XCircle weight="fill" size={18} />
                              Declined Tests
                            </p>
                            <ul className="space-y-1">
                              {comparison.worseTests.map(testId => {
                                const test = benchmarkTests.find(t => t.id === testId)
                                return (
                                  <li key={testId} className="text-xs capitalize">
                                    • {test?.taskType.replace(/_/g, ' ')}
                                  </li>
                                )
                              })}
                            </ul>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!baseline || !activeResult && (
                  <Card className="p-8">
                    <p className="text-center text-muted-foreground">
                      Select two benchmark results to compare
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  )
}

export default BenchmarkRunner
