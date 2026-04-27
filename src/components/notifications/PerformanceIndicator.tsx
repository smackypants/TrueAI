import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { usePerformanceOptimization } from '@/hooks/use-performance-optimization'
import { Lightning, BatteryCharging, WifiHigh, Cpu } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

export function PerformanceIndicator() {
  const { 
    performanceScore, 
    capabilities, 
    isLowEndDevice, 
    isSlowConnection, 
    isLowBattery 
  } = usePerformanceOptimization()

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-orange-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Limited'
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightning size={20} className={getScoreColor(performanceScore)} weight="fill" />
            <h3 className="font-semibold text-sm">Performance</h3>
          </div>
          <Badge variant="outline" className={getScoreColor(performanceScore)}>
            {getScoreLabel(performanceScore)}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall Score</span>
            <span className="font-medium">{performanceScore}%</span>
          </div>
          <Progress value={performanceScore} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`p-3 rounded-lg border ${
              isLowEndDevice ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className={isLowEndDevice ? 'text-orange-500' : 'text-muted-foreground'} />
              <span className="text-xs font-medium">CPU</span>
            </div>
            <p className="text-xs text-muted-foreground">{capabilities.cores} cores</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className={`p-3 rounded-lg border ${
              isSlowConnection ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <WifiHigh size={16} className={isSlowConnection ? 'text-orange-500' : 'text-muted-foreground'} />
              <span className="text-xs font-medium">Network</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase">{capabilities.connectionType}</p>
          </motion.div>

          {capabilities.batteryLevel !== null && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`p-3 rounded-lg border col-span-2 ${
                isLowBattery ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <BatteryCharging size={16} className={isLowBattery ? 'text-orange-500' : 'text-muted-foreground'} weight={capabilities.isCharging ? 'fill' : 'regular'} />
                  <span className="text-xs font-medium">Battery</span>
                </div>
                <span className="text-xs font-medium">
                  {Math.round(capabilities.batteryLevel)}%
                </span>
              </div>
              <Progress value={capabilities.batteryLevel} className="h-1" />
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {(isLowEndDevice || isSlowConnection || isLowBattery) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3"
            >
              <p className="text-xs text-muted-foreground">
                {isLowEndDevice && 'Performance features reduced for optimal experience. '}
                {isSlowConnection && 'Slow connection detected. '}
                {isLowBattery && 'Low battery mode active. '}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default PerformanceIndicator
