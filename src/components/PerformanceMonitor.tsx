import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  usePerformanceMonitor, 
  useDeviceCapabilities, 
  MobilePerformanceOptimizer,
  DeviceCapabilities 
} from '@/lib/mobile-performance'
import { Cpu, Gauge, DeviceMobile, Lightning, BatteryCharging, WifiHigh } from '@phosphor-icons/react'

export function PerformanceMonitor() {
  const metrics = usePerformanceMonitor()
  const capabilities = useDeviceCapabilities()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const optimizer = MobilePerformanceOptimizer.getInstance()
    optimizer.startFPSMonitoring()
  }, [])

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500'
    if (fps >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getMemoryColor = (memory: number) => {
    if (memory < 60) return 'text-green-500'
    if (memory < 80) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getTierBadgeVariant = (tier?: DeviceCapabilities['tier']) => {
    if (tier === 'high') return 'default'
    if (tier === 'mid') return 'secondary'
    return 'destructive'
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
        <Button
          size="sm"
          variant="outline"
          className="h-10 gap-2 bg-card/95 backdrop-blur-sm border-border/50 shadow-lg"
          onClick={() => setIsExpanded(true)}
        >
          <Gauge size={18} weight="fill" />
          <span className={getFPSColor(metrics.fps)}>{metrics.fps} FPS</span>
        </Button>
      </div>
    )
  }

  return (
    <Card className="fixed bottom-20 lg:bottom-6 right-4 z-40 w-80 p-4 bg-card/95 backdrop-blur-sm border-border/50 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Gauge size={20} weight="fill" />
          Performance Monitor
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(false)}
          className="h-8 w-8 p-0"
        >
          ✕
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightning size={16} className="text-accent" />
            <span className="text-sm text-muted-foreground">FPS</span>
          </div>
          <span className={`text-lg font-bold ${getFPSColor(metrics.fps)}`}>
            {metrics.fps}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-accent" />
              <span className="text-sm text-muted-foreground">Memory</span>
            </div>
            <span className={`text-sm font-semibold ${getMemoryColor(metrics.memory)}`}>
              {metrics.memory}%
            </span>
          </div>
          <Progress value={metrics.memory} className="h-2" />
        </div>

        {capabilities && (
          <>
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DeviceMobile size={16} className="text-accent" />
                  <span className="text-sm font-medium">Device Info</span>
                </div>
                <Badge variant={getTierBadgeVariant(capabilities.tier)}>
                  {capabilities.tier.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU Cores</span>
                  <span className="font-mono">{capabilities.cores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="font-mono">{capabilities.memory} GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Connection</span>
                  <div className="flex items-center gap-1">
                    <WifiHigh size={14} />
                    <span className="font-mono uppercase">{capabilities.connection}</span>
                  </div>
                </div>
                {capabilities.batteryLevel < 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Battery</span>
                    <div className="flex items-center gap-1">
                      <BatteryCharging
                        size={14}
                        className={capabilities.charging ? 'text-green-500' : ''}
                      />
                      <span className="font-mono">
                        {Math.round(capabilities.batteryLevel * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {capabilities.saveData && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Data Saver mode is active
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
