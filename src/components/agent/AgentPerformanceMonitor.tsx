import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { Agent, AgentRun } from '@/lib/types'
import { ChartBar, CheckCircle, XCircle, Clock, Lightning, TrendUp } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface AgentPerformanceMonitorProps {
  agent: Agent
  runs: AgentRun[]
}

interface PerformanceMetrics {
  totalRuns: number
  successRate: number
  averageDuration: number
  totalTokensUsed: number
  averageStepsPerRun: number
  errorCount: number
  lastRunStatus: string
  efficiency: number
}

export function AgentPerformanceMonitor({ agent, runs }: AgentPerformanceMonitorProps) {
  const metrics = useMemo<PerformanceMetrics>(() => {
    const agentRuns = runs.filter(r => r.agentId === agent.id)
    const completedRuns = agentRuns.filter(r => r.status === 'completed')
    const errorRuns = agentRuns.filter(r => r.status === 'error')
    
    const totalDuration = completedRuns.reduce((sum, run) => {
      if (run.completedAt && run.startedAt) {
        return sum + (run.completedAt - run.startedAt)
      }
      return sum
    }, 0)

    const totalSteps = completedRuns.reduce((sum, run) => sum + (run.steps?.length || 0), 0)
    const totalTokens = agentRuns.reduce((sum, run) => sum + (run.tokensUsed || 0), 0)

    const successRate = agentRuns.length > 0 
      ? (completedRuns.length / agentRuns.length) * 100 
      : 0

    const averageDuration = completedRuns.length > 0 
      ? totalDuration / completedRuns.length 
      : 0

    const averageStepsPerRun = completedRuns.length > 0 
      ? totalSteps / completedRuns.length 
      : 0

    const efficiency = successRate > 0 && averageDuration > 0
      ? Math.min(100, (successRate / (averageDuration / 1000)) * 10)
      : 0

    return {
      totalRuns: agentRuns.length,
      successRate,
      averageDuration,
      totalTokensUsed: totalTokens,
      averageStepsPerRun,
      errorCount: errorRuns.length,
      lastRunStatus: agentRuns[0]?.status || 'none',
      efficiency
    }
  }, [agent.id, runs])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getPerformanceRating = () => {
    if (metrics.totalRuns === 0) return { label: 'No Data', color: 'text-muted-foreground' }
    if (metrics.successRate >= 90 && metrics.efficiency >= 70) return { label: 'Excellent', color: 'text-green-500' }
    if (metrics.successRate >= 75 && metrics.efficiency >= 50) return { label: 'Good', color: 'text-blue-500' }
    if (metrics.successRate >= 50) return { label: 'Average', color: 'text-yellow-500' }
    return { label: 'Needs Improvement', color: 'text-orange-500' }
  }

  const performanceRating = getPerformanceRating()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <motion.div 
              className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"
              whileHover={{ scale: 1.05 }}
            >
              <ChartBar size={24} className="text-primary" weight="fill" />
            </motion.div>
            <div>
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
              <CardDescription>Analytics for {agent.name}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={performanceRating.color}>
            <TrendUp size={14} weight="fill" className="mr-1" />
            {performanceRating.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightning size={16} />
              <span>Total Runs</span>
            </div>
            <p className="text-2xl font-bold">{metrics.totalRuns}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle size={16} />
              <span>Success Rate</span>
            </div>
            <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={16} />
              <span>Avg Duration</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(metrics.averageDuration)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle size={16} />
              <span>Errors</span>
            </div>
            <p className="text-2xl font-bold">{metrics.errorCount}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm text-muted-foreground">{metrics.successRate.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.successRate} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Efficiency Score</span>
              <span className="text-sm text-muted-foreground">{metrics.efficiency.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.efficiency} className="h-2" />
          </div>
        </div>

        <Separator />

        <ScrollArea className="h-32">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Average Steps per Run</span>
              <span className="font-medium">{metrics.averageStepsPerRun.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Tokens Used</span>
              <span className="font-medium">{metrics.totalTokensUsed.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Run Status</span>
              <Badge variant={metrics.lastRunStatus === 'completed' ? 'default' : 'destructive'}>
                {metrics.lastRunStatus}
              </Badge>
            </div>
            {agent.schedule?.enabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scheduled</span>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                  {agent.schedule.frequency}
                </Badge>
              </div>
            )}
          </div>
        </ScrollArea>

        {metrics.totalRuns === 0 && (
          <div className="text-center py-8">
            <ChartBar size={48} className="text-muted-foreground mx-auto mb-3" weight="duotone" />
            <p className="text-sm text-muted-foreground">No performance data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run this agent to see analytics</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AgentPerformanceMonitor
