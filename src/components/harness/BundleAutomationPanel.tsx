import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Lightning, 
  Trash, 
  Plus, 
  Clock, 
  ChartBar, 
  Brain, 
  MagicWand,
  FileCode,
  ArrowsClockwise,
  Download,
  Upload,
  TrendUp,
  CheckCircle,
  XCircle,
  Eye
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Message, Agent, AgentRun, HarnessManifest } from '@/lib/types'
import { 
  bundleAutomation, 
  type AutoExecutionRule, 
  type UsagePattern,
  type BundleExecutionResult,
  type AutomationMetrics
} from '@/lib/bundle-automation'
import { analytics } from '@/lib/analytics'

interface BundleAutomationPanelProps {
  messages: Message[]
  agents: Agent[]
  agentRuns: AgentRun[]
  harnesses: HarnessManifest[]
}

export function BundleAutomationPanel({
  messages,
  agents,
  agentRuns,
  harnesses
}: BundleAutomationPanelProps) {
  const [rules, setRules] = useKV<AutoExecutionRule[]>('automation-rules', [])
  const [patterns, setPatterns] = useState<UsagePattern[]>([])
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null)
  const [executionHistory, setExecutionHistory] = useState<BundleExecutionResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<UsagePattern | null>(null)
  const [createRuleDialog, setCreateRuleDialog] = useState(false)
  const [viewRuleDialog, setViewRuleDialog] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AutoExecutionRule | null>(null)
  const [autoExecuteEnabled, setAutoExecuteEnabled] = useKV('auto-execute-enabled', false)

  const [newRuleForm, setNewRuleForm] = useState({
    priority: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    cooldown: 3600000,
    autoEnable: true
  })

  useEffect(() => {
    if (rules) {
      rules.forEach(rule => bundleAutomation.addRule(rule))
    }
    updateMetrics()
    updateExecutionHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (autoExecuteEnabled) {
      const interval = setInterval(() => {
        checkAndExecuteRules()
      }, 30000)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExecuteEnabled, rules, messages, agents, agentRuns])

  const analyzePatterns = () => {
    setIsAnalyzing(true)
    analytics.track('automation_analysis_started', 'automation', 'analyze_patterns')
    
    setTimeout(() => {
      const detectedPatterns = bundleAutomation.analyzeUsagePatterns(
        messages,
        agents,
        agentRuns,
        harnesses
      )
      
      setPatterns(detectedPatterns)
      setIsAnalyzing(false)
      updateMetrics()
      
      toast.success(`Detected ${detectedPatterns.length} usage patterns`)
      analytics.track('automation_analysis_completed', 'automation', 'patterns_detected', {
        metadata: { patternCount: detectedPatterns.length }
      })
    }, 1500)
  }

  const createRuleFromPattern = (pattern: UsagePattern) => {
    const newRule = bundleAutomation.createRuleFromPattern(
      pattern,
      harnesses,
      newRuleForm
    )
    
    bundleAutomation.addRule(newRule)
    setRules(prev => [...(prev || []), newRule])
    setCreateRuleDialog(false)
    setSelectedPattern(null)
    
    toast.success(`Created automation rule: ${newRule.name}`)
    analytics.track('automation_rule_created', 'automation', 'create_rule', {
      label: newRule.name,
      metadata: { patternType: pattern.patternType, confidence: pattern.confidence }
    })
  }

  const toggleRule = (ruleId: string, enabled: boolean) => {
    bundleAutomation.updateRule(ruleId, { enabled })
    setRules(prev => (prev || []).map(r => r.id === ruleId ? { ...r, enabled } : r))
    
    toast.success(enabled ? 'Rule enabled' : 'Rule disabled')
    analytics.track('automation_rule_toggled', 'automation', 'toggle_rule', {
      metadata: { ruleId, enabled }
    })
  }

  const deleteRule = (ruleId: string) => {
    bundleAutomation.deleteRule(ruleId)
    setRules(prev => (prev || []).filter(r => r.id !== ruleId))
    
    toast.success('Rule deleted')
    analytics.track('automation_rule_deleted', 'automation', 'delete_rule')
  }

  const checkAndExecuteRules = async () => {
    const triggeredRules = bundleAutomation.evaluateRules({
      currentTime: Date.now(),
      recentMessages: messages.slice(-10),
      activeAgents: agents.filter(a => a.status === 'running'),
      recentRuns: agentRuns.slice(-5)
    })

    for (const rule of triggeredRules) {
      const results = await bundleAutomation.executeRule(rule, {
        messages,
        agents,
        agentRuns,
        harnesses
      })
      
      results.forEach(result => {
        if (result.success) {
          toast.success(`Auto-executed: ${rule.name}`)
        } else {
          toast.error(`Failed to execute: ${rule.name}`)
        }
      })
      
      updateMetrics()
      updateExecutionHistory()
    }
  }

  const updateMetrics = () => {
    const currentMetrics = bundleAutomation.getMetrics()
    setMetrics(currentMetrics)
  }

  const updateExecutionHistory = () => {
    const history = bundleAutomation.getExecutionHistory(20)
    setExecutionHistory(history)
  }

  const exportRules = () => {
    const rulesJson = bundleAutomation.exportRules()
    const blob = new Blob([rulesJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'automation-rules.json'
    link.click()
    URL.revokeObjectURL(url)
    
    toast.success('Rules exported')
    analytics.track('automation_rules_exported', 'automation', 'export_rules')
  }

  const importRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      bundleAutomation.importRules(content)
      setRules(bundleAutomation.getRules())
      toast.success('Rules imported')
      analytics.track('automation_rules_imported', 'automation', 'import_rules')
    }
    reader.readAsText(file)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground'
      case 'high': return 'bg-accent text-accent-foreground'
      case 'normal': return 'bg-secondary text-secondary-foreground'
      case 'low': return 'bg-muted text-muted-foreground'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const getPatternIcon = (patternType: string) => {
    switch (patternType) {
      case 'temporal': return <Clock size={18} weight="fill" />
      case 'contextual': return <Brain size={18} weight="fill" />
      case 'sequential': return <ArrowsClockwise size={18} weight="fill" />
      case 'frequency': return <TrendUp size={18} weight="fill" />
      default: return <Lightning size={18} weight="fill" />
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Bundle Automation</h2>
            <p className="text-sm text-muted-foreground">Automatically execute harness bundles based on usage patterns</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border">
                  <Switch
                    checked={autoExecuteEnabled}
                    onCheckedChange={setAutoExecuteEnabled}
                  />
                  <span className="text-sm font-medium">Auto-Execute</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Automatically run rules when conditions are met</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{metrics.totalExecutions}</p>
                </div>
                <Lightning size={32} className="text-primary" weight="fill" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {metrics.totalExecutions > 0 
                      ? Math.round((metrics.successfulExecutions / metrics.totalExecutions) * 100)
                      : 0}%
                  </p>
                </div>
                <CheckCircle size={32} className="text-accent" weight="fill" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{Math.round(metrics.averageDuration)}ms</p>
                </div>
                <Clock size={32} className="text-muted-foreground" weight="fill" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pattern Accuracy</p>
                  <p className="text-2xl font-bold">{Math.round(metrics.patternAccuracy * 100)}%</p>
                </div>
                <ChartBar size={32} className="text-primary" weight="fill" />
              </div>
            </Card>
          </div>
        )}

        <Tabs defaultValue="patterns" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patterns" className="gap-2">
              <MagicWand size={18} />
              Patterns
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <FileCode size={18} />
              Rules
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock size={18} />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} detected
              </p>
              <Button
                onClick={analyzePatterns}
                disabled={isAnalyzing}
                className="gap-2"
              >
                <Brain size={18} weight="fill" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze Patterns'}
              </Button>
            </div>

            {isAnalyzing && (
              <Card className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Analyzing usage patterns...</span>
                    <span className="text-sm text-muted-foreground">Please wait</span>
                  </div>
                  <Progress value={66} className="h-2" />
                </div>
              </Card>
            )}

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {patterns.length === 0 && !isAnalyzing && (
                  <Card className="p-8 text-center">
                    <Brain size={48} className="mx-auto mb-4 text-muted-foreground" weight="fill" />
                    <p className="text-muted-foreground">No patterns detected yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click "Analyze Patterns" to scan your usage data
                    </p>
                  </Card>
                )}
                
                {patterns.map(pattern => (
                  <motion.div
                    key={pattern.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-4 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1 text-primary">
                            {getPatternIcon(pattern.patternType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{pattern.description}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Type: {pattern.patternType} • Confidence: {Math.round(pattern.confidence * 100)}%
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pattern.suggestedHarness.map(h => (
                                <Badge key={h} variant="secondary" className="text-xs">
                                  {h}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPattern(pattern)
                            setCreateRuleDialog(true)
                          }}
                          className="shrink-0"
                        >
                          <Plus size={16} weight="bold" className="mr-1" />
                          Create Rule
                        </Button>
                      </div>
                      
                      <div className="mt-3">
                        <Progress value={pattern.confidence * 100} className="h-1.5" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {rules?.length || 0} automation rule{(rules?.length || 0) !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportRules} className="gap-2">
                  <Download size={16} />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-2 relative">
                  <Upload size={16} />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={importRules}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {(!rules || rules.length === 0) && (
                  <Card className="p-8 text-center">
                    <FileCode size={48} className="mx-auto mb-4 text-muted-foreground" weight="fill" />
                    <p className="text-muted-foreground">No automation rules yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Analyze patterns and create rules to automate bundle execution
                    </p>
                  </Card>
                )}
                
                {rules?.map(rule => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{rule.name}</h3>
                              <Badge className={getPriorityColor(rule.priority)}>
                                {rule.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Executed: {rule.executionCount}x</span>
                              <span>Success: {Math.round(rule.successRate * 100)}%</span>
                              <span>Cooldown: {Math.round(rule.cooldown / 60000)}min</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRule(rule)
                                  setViewRuleDialog(true)
                                }}
                              >
                                <Eye size={18} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteRule(rule.id)}
                              >
                                <Trash size={18} className="text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete rule</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {executionHistory.length} recent execution{executionHistory.length !== 1 ? 's' : ''}
            </p>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {executionHistory.length === 0 && (
                  <Card className="p-8 text-center">
                    <Clock size={48} className="mx-auto mb-4 text-muted-foreground" weight="fill" />
                    <p className="text-muted-foreground">No execution history yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enable auto-execute to start tracking automated bundle runs
                    </p>
                  </Card>
                )}
                
                {executionHistory.map((exec, index) => (
                  <Card key={`${exec.ruleId}-${exec.timestamp}-${index}`} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {exec.success ? (
                          <CheckCircle size={20} className="text-accent mt-0.5" weight="fill" />
                        ) : (
                          <XCircle size={20} className="text-destructive mt-0.5" weight="fill" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {harnesses.find(h => h.id === exec.harnessId)?.name || exec.harnessId}
                            </span>
                            <Badge variant={exec.success ? 'default' : 'destructive'}>
                              {exec.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(exec.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Duration: {exec.duration}ms
                          </p>
                          {exec.error && (
                            <p className="text-xs text-destructive mt-2">{exec.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Dialog open={createRuleDialog} onOpenChange={setCreateRuleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>
                Configure a new rule to automatically execute harness bundles
              </DialogDescription>
            </DialogHeader>

            {selectedPattern && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">{selectedPattern.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Type: {selectedPattern.patternType}</span>
                    <span>•</span>
                    <span>Confidence: {Math.round(selectedPattern.confidence * 100)}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newRuleForm.priority}
                    onValueChange={(value: 'low' | 'normal' | 'high' | 'critical') => setNewRuleForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cooldown (minutes)</Label>
                  <Input
                    type="number"
                    value={newRuleForm.cooldown / 60000}
                    onChange={(e) => setNewRuleForm(prev => ({ 
                      ...prev, 
                      cooldown: parseInt(e.target.value) * 60000 
                    }))}
                    min={1}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newRuleForm.autoEnable}
                    onCheckedChange={(checked) => setNewRuleForm(prev => ({ ...prev, autoEnable: checked }))}
                  />
                  <Label>Enable rule immediately</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateRuleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => selectedPattern && createRuleFromPattern(selectedPattern)}>
                Create Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={viewRuleDialog} onOpenChange={setViewRuleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Rule Details</DialogTitle>
            </DialogHeader>

            {selectedRule && (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4 pr-4">
                  <div>
                    <h3 className="font-semibold mb-1">{selectedRule.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedRule.description}</p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Priority</p>
                      <Badge className={getPriorityColor(selectedRule.priority)}>
                        {selectedRule.priority}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={selectedRule.enabled ? 'default' : 'secondary'}>
                        {selectedRule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Executions</p>
                      <p className="text-lg font-bold">{selectedRule.executionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Success Rate</p>
                      <p className="text-lg font-bold">{Math.round(selectedRule.successRate * 100)}%</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Conditions ({selectedRule.conditions.length})</h4>
                    <div className="space-y-2">
                      {selectedRule.conditions.map((condition, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                          <p><span className="font-medium">Type:</span> {condition.type}</p>
                          <p><span className="font-medium">Operator:</span> {condition.operator}</p>
                          <p><span className="font-medium">Value:</span> {JSON.stringify(condition.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Actions ({selectedRule.actions.length})</h4>
                    <div className="space-y-2">
                      {selectedRule.actions.map((action, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                          <p><span className="font-medium">Type:</span> {action.type}</p>
                          <p><span className="font-medium">Target:</span> {action.target}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default BundleAutomationPanel
