import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  ChartBar, 
  ChartLine, 
  Clock, 
  Users, 
  TrendUp, 
  ChatCircle,
  Robot,
  Lightning,
  Warning,
  CalendarDots,
  ArrowUp,
  ArrowDown,
  Download,
  ArrowsClockwise,
  Pause,
  Play,
  Sparkle,
  Brain,
  Stack
} from '@phosphor-icons/react'
import { useAnalytics } from '@/lib/analytics'
import { MetricCard } from './MetricCard'
import { EventChart } from './EventChart'
import { CategoryBreakdown } from './CategoryBreakdown'
import { TimeSeriesChart } from './TimeSeriesChart'
import { TopItemsList } from './TopItemsList'
import { ModelUsageChart } from './ModelUsageChart'
import { AutoOptimizationPanel } from './AutoOptimizationPanel'
import { LearningDashboard } from './LearningDashboard'
import { PerformanceScanPanel } from './PerformanceScanPanel'
import { BulkOptimizationPanel } from './BulkOptimizationPanel'
import { thresholdManager, type ThresholdConfig } from '@/lib/confidence-thresholds'
import type { AnalyticsMetrics, AnalyticsFilter, ModelConfig, PerformanceProfile } from '@/lib/types'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface AnalyticsDashboardProps {
  models?: ModelConfig[]
  profiles?: PerformanceProfile[]
  onApplyOptimization?: (insight: any) => void
  onApplyAutoTune?: (recommendation: any, modelId: string) => void
  onCreateProfile?: (taskType: string) => void
  onModelUpdate?: (models: ModelConfig[]) => void
}

export function AnalyticsDashboard({
  models = [],
  profiles = [],
  onApplyOptimization,
  onApplyAutoTune,
  onCreateProfile,
  onModelUpdate
}: AnalyticsDashboardProps = {}) {
  const analyticsHook = useAnalytics()
  const { getMetrics, events, sessions, clearData } = analyticsHook || {}
  
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')
  const [filter, setFilter] = useState<AnalyticsFilter>({})
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<5 | 10 | 30>(5)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())
  const [countdown, setCountdown] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const [thresholdConfig, setThresholdConfig] = useKV<ThresholdConfig>('threshold-config', thresholdManager.getConfig())

  const safeEvents = events || []
  const safeSessions = sessions || []
  const safeModels = models || []
  const safeProfiles = profiles || []

  useEffect(() => {
    loadMetrics()
  }, [timeRange])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadMetrics()
      }, refreshInterval * 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, timeRange])

  useEffect(() => {
    if (autoRefresh) {
      setCountdown(refreshInterval)
      
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return refreshInterval
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
        }
      }
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      setCountdown(0)
    }
  }, [autoRefresh, refreshInterval])

  useEffect(() => {
    if (safeEvents.length > 0) {
      const latestEventTime = Math.max(...safeEvents.map(e => e.timestamp))
      if (latestEventTime > lastRefresh && !isLoading) {
        loadMetrics()
      }
    }
  }, [safeEvents.length])

  const loadMetrics = async () => {
    if (!getMetrics) {
      console.warn('Analytics not ready')
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      const now = Date.now()
      const newFilter: AnalyticsFilter = {}

      if (timeRange === '7d') {
        newFilter.startDate = now - 7 * 24 * 60 * 60 * 1000
      } else if (timeRange === '30d') {
        newFilter.startDate = now - 30 * 24 * 60 * 60 * 1000
      }

      setFilter(newFilter)
      const data = await getMetrics(newFilter)
      setMetrics(data)
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Failed to load metrics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshIntervalChange = (value: string) => {
    const interval = parseInt(value) as 5 | 10 | 30
    setRefreshInterval(interval)
    setCountdown(interval)
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
    if (!autoRefresh) {
      toast.success('Auto-refresh enabled')
    } else {
      toast.success('Auto-refresh paused')
    }
  }

  const handleManualRefresh = () => {
    loadMetrics()
    setCountdown(refreshInterval)
    toast.success('Analytics refreshed')
  }

  const handleClearData = async () => {
    if (!clearData) {
      toast.error('Analytics not ready')
      return
    }
    
    if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      await clearData()
      await loadMetrics()
      toast.success('Analytics data cleared')
    }
  }

  const handleExportData = () => {
    const dataStr = JSON.stringify({ events: safeEvents, sessions: safeSessions, metrics }, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-export-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics data exported')
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Track performance and usage metrics in real-time</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              <ArrowsClockwise size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleClearData}>
              Clear Data
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoRefresh}
                  className="gap-2"
                >
                  {autoRefresh ? (
                    <Pause size={16} weight="fill" />
                  ) : (
                    <Play size={16} weight="fill" />
                  )}
                  {autoRefresh ? 'Pause' : 'Resume'}
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8" />

              <div className="flex items-center gap-2">
                <Label htmlFor="refresh-interval" className="text-sm text-muted-foreground">
                  Auto-refresh every:
                </Label>
                <Select 
                  value={refreshInterval.toString()} 
                  onValueChange={handleRefreshIntervalChange}
                  disabled={!autoRefresh}
                >
                  <SelectTrigger id="refresh-interval" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5s</SelectItem>
                    <SelectItem value="10">10s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              {autoRefresh && countdown > 0 && (
                <Badge variant="secondary" className="gap-2 animate-pulse">
                  <Clock size={14} weight="fill" />
                  Next refresh in {countdown}s
                </Badge>
              )}

              {!autoRefresh && (
                <Badge variant="outline" className="gap-2">
                  Updates paused
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Events"
          value={metrics.totalEvents}
          icon={<ChartBar weight="fill" size={24} />}
          trend={metrics.totalEvents > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Active Sessions"
          value={metrics.totalSessions}
          icon={<Users weight="fill" size={24} />}
          trend={metrics.totalSessions > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Avg Session Time"
          value={formatDuration(metrics.averageSessionDuration)}
          icon={<Clock weight="fill" size={24} />}
          trend="neutral"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(1)}%`}
          icon={<Warning weight="fill" size={24} />}
          trend={metrics.errorRate > 5 ? 'down' : 'up'}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-6xl grid-cols-8 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scanner" className="gap-1">
            <Lightning weight="fill" size={16} />
            <span className="hidden md:inline">Scan</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="gap-1">
            <Sparkle weight="fill" size={16} />
            <span className="hidden md:inline">Optimize</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1">
            <Stack weight="fill" size={16} />
            <span className="hidden md:inline">Bulk</span>
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-1">
            <Brain weight="fill" size={16} />
            <span className="hidden md:inline">Learn</span>
          </TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-4">
          <PerformanceScanPanel
            events={events}
            models={models}
            profiles={profiles}
            onApplyOptimizations={(updatedModels) => {
              if (onModelUpdate) {
                onModelUpdate(updatedModels)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChartLine weight="fill" size={20} />
                Events Over Time
              </h3>
              <TimeSeriesChart data={metrics.eventsByDay} />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChartBar weight="fill" size={20} />
                Events by Type
              </h3>
              <CategoryBreakdown data={metrics.eventsByType} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Top Actions</h3>
              <TopItemsList
                items={metrics.topActions.map(a => ({
                  label: a.action,
                  value: a.count
                }))}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {events.slice(0, 20).map(event => (
                    <div key={event.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                      <div className="flex-1">
                        <p className="font-medium">{event.action}</p>
                        <p className="text-xs text-muted-foreground">{event.category}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <AutoOptimizationPanel
            models={models}
            profiles={profiles}
            onApplyOptimization={onApplyOptimization || (() => {})}
            onApplyAutoTune={onApplyAutoTune || (() => {})}
            onCreateProfile={onCreateProfile || (() => {})}
            thresholdConfig={thresholdConfig}
            onThresholdConfigChange={setThresholdConfig}
          />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkOptimizationPanel
            models={models}
            onApplyBundle={async (bundle, updatedModels) => {
              if (onModelUpdate) {
                onModelUpdate(updatedModels)
              }
              toast.success(`Applied ${bundle.name} optimization bundle`)
            }}
          />
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <LearningDashboard
            thresholdConfig={thresholdConfig ||thresholdManager.getConfig()}
            onThresholdConfigChange={setThresholdConfig}
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Messages"
              value={metrics.chatMetrics.totalMessages}
              icon={<ChatCircle weight="fill" size={24} />}
              trend="up"
            />
            
            <MetricCard
              title="Conversations"
              value={metrics.chatMetrics.totalConversations}
              icon={<ChatCircle weight="fill" size={24} />}
              trend="up"
            />
            
            <MetricCard
              title="Avg Response Time"
              value={formatDuration(metrics.chatMetrics.averageResponseTime)}
              icon={<Clock weight="fill" size={24} />}
              trend="neutral"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Most Used Models</h3>
              <ModelUsageChart data={metrics.chatMetrics.mostUsedModels} />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Chat Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Messages / Conv</span>
                  <span className="font-semibold">
                    {metrics.chatMetrics.averageMessagesPerConversation.toFixed(1)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Conversations</span>
                  <span className="font-semibold">{metrics.chatMetrics.totalConversations}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Messages</span>
                  <span className="font-semibold">{metrics.chatMetrics.totalMessages}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-semibold">
                    {formatDuration(metrics.chatMetrics.averageResponseTime)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Agents"
              value={metrics.agentMetrics.totalAgents}
              icon={<Robot weight="fill" size={24} />}
              trend="up"
            />
            
            <MetricCard
              title="Total Runs"
              value={metrics.agentMetrics.totalRuns}
              icon={<Lightning weight="fill" size={24} />}
              trend="up"
            />
            
            <MetricCard
              title="Success Rate"
              value={`${metrics.agentMetrics.successRate.toFixed(1)}%`}
              icon={<TrendUp weight="fill" size={24} />}
              trend={metrics.agentMetrics.successRate > 80 ? 'up' : 'down'}
            />
            
            <MetricCard
              title="Avg Execution Time"
              value={formatDuration(metrics.agentMetrics.averageExecutionTime)}
              icon={<Clock weight="fill" size={24} />}
              trend="neutral"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Most Used Tools</h3>
              <TopItemsList
                items={metrics.agentMetrics.mostUsedTools.map(t => ({
                  label: t.tool,
                  value: t.count
                }))}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Agents</span>
                  <span className="font-semibold">{metrics.agentMetrics.totalAgents}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Runs</span>
                  <span className="font-semibold">{metrics.agentMetrics.totalRuns}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Success Rate</span>
                  <div className="flex items-center gap-2">
                    {metrics.agentMetrics.successRate > 80 ? (
                      <ArrowUp size={16} className="text-green-500" />
                    ) : (
                      <ArrowDown size={16} className="text-red-500" />
                    )}
                    <span className="font-semibold">
                      {metrics.agentMetrics.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Execution Time</span>
                  <span className="font-semibold">
                    {formatDuration(metrics.agentMetrics.averageExecutionTime)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Models"
              value={metrics.modelMetrics.totalModels}
              icon={<Lightning weight="fill" size={24} />}
              trend="up"
            />
            
            <MetricCard
              title="Total Downloads"
              value={metrics.modelMetrics.totalDownloads}
              icon={<Download weight="fill" size={24} />}
              trend="up"
            />
            
            <MetricCard
              title="Storage Used"
              value={formatBytes(metrics.modelMetrics.storageUsed)}
              icon={<ChartBar weight="fill" size={24} />}
              trend="neutral"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Most Popular Models</h3>
              <TopItemsList
                items={metrics.modelMetrics.mostPopularModels.map(m => ({
                  label: m.model,
                  value: m.downloads
                }))}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Model Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Models</span>
                  <span className="font-semibold">{metrics.modelMetrics.totalModels}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Downloads</span>
                  <span className="font-semibold">{metrics.modelMetrics.totalDownloads}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Storage Used</span>
                  <span className="font-semibold">
                    {formatBytes(metrics.modelMetrics.storageUsed)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Most Popular</span>
                  <span className="font-semibold truncate max-w-[200px]">
                    {metrics.modelMetrics.mostPopularModels[0]?.model || 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
