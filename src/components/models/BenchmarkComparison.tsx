import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  TrendUp, 
  TrendDown, 
  Lightning, 
  Timer, 
  Monitor, 
  ChartLine,
  CheckCircle,
  Minus
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { BenchmarkComparison as BenchmarkComparisonType } from '@/lib/benchmark'

interface BenchmarkComparisonProps {
  comparison: BenchmarkComparisonType
}

export function BenchmarkComparison({ comparison }: BenchmarkComparisonProps) {
  const { before, after, improvements } = comparison

  const _getImprovementColor = (improvement: number) => {
    if (improvement > 10) return 'text-green-500'
    if (improvement > 0) return 'text-green-400'
    if (improvement === 0) return 'text-muted-foreground'
    return 'text-red-500'
  }

  const _getImprovementIcon = (improvement: number) => {
    if (improvement > 0) return <TrendUp size={18} className="text-green-500" weight="bold" />
    if (improvement === 0) return <Minus size={18} className="text-muted-foreground" weight="bold" />
    return <TrendDown size={18} className="text-red-500" weight="bold" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-blue-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lightning size={24} className="text-primary" weight="fill" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Performance Comparison</h3>
                <p className="text-sm text-muted-foreground">
                  Before vs After Optimization
                </p>
              </div>
            </div>
            <Badge 
              variant={improvements.overallScore > 0 ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {improvements.overallScore > 0 ? '+' : ''}{improvements.overallScore}%
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Before</Badge>
                <span className="text-sm text-muted-foreground">{before.label}</span>
              </div>
              <div className="text-center p-6 rounded-lg bg-background/50 border border-border">
                <div className={`text-4xl font-bold ${getScoreColor(before.score)}`}>
                  {before.score}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Performance Score</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">After</Badge>
                <span className="text-sm text-muted-foreground">{after.label}</span>
              </div>
              <div className="text-center p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
                <div className={`text-4xl font-bold ${getScoreColor(after.score)}`}>
                  {after.score}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Performance Score</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={<Timer size={20} />}
          title="Render Time"
          beforeValue={before.metrics.renderTime}
          afterValue={after.metrics.renderTime}
          improvement={improvements.renderTime}
          unit="ms"
          lowerIsBetter
        />

        <MetricCard
          icon={<Lightning size={20} />}
          title="Interaction Latency"
          beforeValue={before.metrics.interactionLatency}
          afterValue={after.metrics.interactionLatency}
          improvement={improvements.interactionLatency}
          unit="ms"
          lowerIsBetter
        />

        <MetricCard
          icon={<ChartLine size={20} />}
          title="Frame Rate"
          beforeValue={before.metrics.frameRate}
          afterValue={after.metrics.frameRate}
          improvement={improvements.frameRate}
          unit="fps"
          lowerIsBetter={false}
        />

        <MetricCard
          icon={<Monitor size={20} />}
          title="Memory Usage"
          beforeValue={before.metrics.memoryUsage}
          afterValue={after.metrics.memoryUsage}
          improvement={improvements.memoryUsage}
          unit="MB"
          lowerIsBetter
        />

        <MetricCard
          icon={<CheckCircle size={20} />}
          title="Load Time"
          beforeValue={before.metrics.loadTime}
          afterValue={after.metrics.loadTime}
          improvement={improvements.loadTime}
          unit="ms"
          lowerIsBetter
        />
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          <div className="font-semibold text-sm">Performance Insights</div>
          <div className="space-y-2 text-sm">
            {improvements.overallScore > 20 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span className="text-muted-foreground">
                  Excellent optimization! Overall performance improved by {improvements.overallScore}%
                </span>
              </motion.div>
            )}
            
            {improvements.renderTime > 10 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-2"
              >
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span className="text-muted-foreground">
                  Render time improved by {improvements.renderTime}% - UI will feel more responsive
                </span>
              </motion.div>
            )}

            {improvements.frameRate > 5 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-2"
              >
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span className="text-muted-foreground">
                  Frame rate increased - animations will be smoother
                </span>
              </motion.div>
            )}

            {improvements.memoryUsage > 10 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-2"
              >
                <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                <span className="text-muted-foreground">
                  Memory footprint reduced by {improvements.memoryUsage}% - better for low-end devices
                </span>
              </motion.div>
            )}

            {improvements.overallScore <= 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <Minus size={16} className="text-muted-foreground mt-0.5" weight="bold" />
                <span className="text-muted-foreground">
                  Settings appear optimal for your device. No significant improvement detected.
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  title: string
  beforeValue: number
  afterValue: number
  improvement: number
  unit: string
  lowerIsBetter: boolean
}

function MetricCard({
  icon,
  title,
  beforeValue,
  afterValue,
  improvement,
  unit,
  lowerIsBetter
}: MetricCardProps) {
  const getImprovementColor = (imp: number, lower: boolean) => {
    const adjusted = lower ? imp : -imp
    if (adjusted > 10) return 'text-green-500'
    if (adjusted > 0) return 'text-green-400'
    if (adjusted === 0) return 'text-muted-foreground'
    return 'text-red-500'
  }

  const displayBefore = unit === 'MB' && beforeValue === 0 ? 'N/A' : `${beforeValue.toFixed(1)}${unit}`
  const displayAfter = unit === 'MB' && afterValue === 0 ? 'N/A' : `${afterValue.toFixed(1)}${unit}`

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-primary">{icon}</div>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <Badge 
            variant="outline" 
            className={getImprovementColor(improvement, lowerIsBetter)}
          >
            {improvement > 0 ? '+' : ''}{improvement}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Before</div>
            <div className="font-semibold mt-1">{displayBefore}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">After</div>
            <div className="font-semibold mt-1">{displayAfter}</div>
          </div>
        </div>

        {unit === 'MB' && beforeValue === 0 ? (
          <div className="text-xs text-muted-foreground">Memory API not available</div>
        ) : (
          <Progress 
            value={Math.abs(improvement)} 
            className="h-1.5"
          />
        )}
      </div>
    </Card>
  )
}
