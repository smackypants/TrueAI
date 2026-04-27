import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Cpu, DeviceMobile, Lightning, CheckCircle, Info, ArrowsClockwise, ChartBar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { HardwareSpecs, OptimizedSettings } from '@/lib/hardware-scanner'
import { scanHardware, generateOptimizedSettings, formatHardwareInfo } from '@/lib/hardware-scanner'
import type { BenchmarkResult, BenchmarkComparison as BenchmarkComparisonType } from '@/lib/benchmark'
import { runBenchmark, compareBenchmarks } from '@/lib/benchmark'
import { BenchmarkComparison } from './BenchmarkComparison'

interface HardwareOptimizerProps {
  onSettingsApplied?: (settings: OptimizedSettings) => void
}

export function HardwareOptimizer({ onSettingsApplied }: HardwareOptimizerProps) {
  const [hardwareSpecs, setHardwareSpecs] = useKV<HardwareSpecs | null>('hardware-specs', null)
  const [optimizedSettings, setOptimizedSettings] = useKV<OptimizedSettings | null>('optimized-settings', null)
  const [isScanning, setIsScanning] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [autoOptimize, setAutoOptimize] = useKV<boolean>('auto-optimize', true)
  
  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [benchmarkComparison, setBenchmarkComparison] = useKV<BenchmarkComparisonType | null>('benchmark-comparison', null)
  const [showBenchmark, setShowBenchmark] = useState(false)

  useEffect(() => {
    if (!hardwareSpecs && autoOptimize) {
      performScan()
    }
  }, [])

  const performScan = async () => {
    setIsScanning(true)
    toast.info('Scanning device hardware...')

    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const specs = await scanHardware()
      setHardwareSpecs(specs)

      const settings = generateOptimizedSettings(specs)
      setOptimizedSettings(settings)

      if (onSettingsApplied && autoOptimize) {
        onSettingsApplied(settings)
      }

      toast.success(`Hardware scan complete - ${specs.tier.toUpperCase()} tier detected`)
    } catch (_error) {
      toast.error('Failed to scan hardware')
      console.error(_error)
    } finally {
      setIsScanning(false)
    }
  }

  const applySettings = () => {
    if (optimizedSettings && onSettingsApplied) {
      onSettingsApplied(optimizedSettings)
      toast.success('Optimized settings applied')
    }
  }

  const runPerformanceBenchmark = async () => {
    if (!optimizedSettings) {
      toast.error('Please scan hardware first')
      return
    }

    setIsBenchmarking(true)
    toast.info('Running performance benchmark...')

    try {
      const beforeSettings = {
        maxTokens: 2000,
        enableAnimations: true,
        enableBackgroundEffects: true,
        streamingChunkSize: 50
      }

      toast.info('Testing default settings...')
      const beforeBenchmark = await runBenchmark(beforeSettings)

      await new Promise(resolve => setTimeout(resolve, 500))

      toast.info('Testing optimized settings...')
      const afterBenchmark = await runBenchmark({
        maxTokens: optimizedSettings.maxTokens,
        enableAnimations: optimizedSettings.enableAnimations,
        enableBackgroundEffects: optimizedSettings.enableBackgroundEffects,
        streamingChunkSize: optimizedSettings.streamingChunkSize
      })

      const comparison = compareBenchmarks(beforeBenchmark, afterBenchmark)
      setBenchmarkComparison(comparison)
      setShowBenchmark(true)

      const improvement = comparison.improvements.overallScore
      if (improvement > 10) {
        toast.success(`Benchmark complete! ${improvement}% overall improvement detected`)
      } else if (improvement > 0) {
        toast.success(`Benchmark complete! Minor ${improvement}% improvement detected`)
      } else {
        toast.success('Benchmark complete! Settings are already optimal')
      }
    } catch (error) {
      toast.error('Benchmark failed')
      console.error(error)
    } finally {
      setIsBenchmarking(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ultra':
        return 'bg-gradient-to-r from-purple-500 to-pink-500'
      case 'high':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500'
      case 'medium':
        return 'bg-gradient-to-r from-green-500 to-emerald-500'
      case 'low':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTierBadgeVariant = (tier: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (tier) {
      case 'ultra':
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cpu size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Hardware Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically detect and optimize for your device
                </p>
              </div>
            </div>
            
            <Button
              onClick={performScan}
              disabled={isScanning}
              variant="outline"
              size="sm"
            >
              <ArrowsClockwise 
                size={18} 
                className={`mr-2 ${isScanning ? 'animate-spin' : ''}`} 
              />
              {isScanning ? 'Scanning...' : 'Scan Device'}
            </Button>
          </div>

          <Separator />

          {hardwareSpecs && optimizedSettings ? (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 border-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DeviceMobile size={16} />
                        <span>Device Tier</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getTierBadgeVariant(hardwareSpecs.tier)} className="text-lg font-bold uppercase">
                          {hardwareSpecs.tier}
                        </Badge>
                      </div>
                      <div className={`h-2 rounded-full ${getTierColor(hardwareSpecs.tier)}`} />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lightning size={16} />
                        <span>Performance</span>
                      </div>
                      <div className="text-2xl font-bold">{hardwareSpecs.performanceScore}</div>
                      <Progress value={(hardwareSpecs.performanceScore / 500) * 100} className="h-2" />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Cpu size={16} />
                        <span>CPU Cores</span>
                      </div>
                      <div className="text-2xl font-bold">{hardwareSpecs.hardwareConcurrency}</div>
                      <div className="text-xs text-muted-foreground">cores available</div>
                    </div>
                  </Card>

                  {hardwareSpecs.deviceMemory && (
                    <Card className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info size={16} />
                          <span>RAM</span>
                        </div>
                        <div className="text-2xl font-bold">{hardwareSpecs.deviceMemory} GB</div>
                        <div className="text-xs text-muted-foreground">device memory</div>
                      </div>
                    </Card>
                  )}
                </div>

                <Card className="p-4 bg-accent/5 border-accent/20">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                      <CheckCircle size={18} className="text-accent" weight="fill" />
                      <span>Optimized Settings Applied</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Max Tokens</div>
                        <div className="font-semibold">{optimizedSettings.maxTokens}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Chunk Size</div>
                        <div className="font-semibold">{optimizedSettings.streamingChunkSize}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Animations</div>
                        <div className="font-semibold">{optimizedSettings.enableAnimations ? 'Enabled' : 'Disabled'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Agents</div>
                        <div className="font-semibold">{optimizedSettings.maxConcurrentAgents} max</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Cache Size</div>
                        <div className="font-semibold">{optimizedSettings.cacheSize} items</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">History</div>
                        <div className="font-semibold">{optimizedSettings.conversationHistoryLimit}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Image Quality</div>
                        <div className="font-semibold capitalize">{optimizedSettings.imageQuality}</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {optimizedSettings.recommendations.length > 0 && (
                  <Card className="p-4 bg-muted/50">
                    <div className="space-y-3">
                      <div className="font-semibold text-sm">Recommendations</div>
                      <div className="space-y-2">
                        {optimizedSettings.recommendations.map((rec, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="text-accent mt-0.5">•</span>
                            <span className="text-muted-foreground">{rec}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-optimize"
                      checked={autoOptimize}
                      onCheckedChange={setAutoOptimize}
                    />
                    <Label htmlFor="auto-optimize" className="text-sm cursor-pointer">
                      Auto-optimize on startup
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                    >
                      {showDetails ? 'Hide' : 'Show'} Details
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={runPerformanceBenchmark}
                      disabled={isBenchmarking || !optimizedSettings}
                    >
                      <ChartBar size={18} className={`mr-2 ${isBenchmarking ? 'animate-pulse' : ''}`} />
                      {isBenchmarking ? 'Benchmarking...' : 'Run Benchmark'}
                    </Button>
                    <Button size="sm" onClick={applySettings}>
                      <CheckCircle size={18} className="mr-2" weight="fill" />
                      Apply Settings
                    </Button>
                  </div>
                </div>

                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="p-4 bg-card/50">
                      <ScrollArea className="h-[300px]">
                        <div className="pr-4 text-sm space-y-2 font-mono">
                          {formatHardwareInfo(hardwareSpecs).split('\n').map((line, index) => (
                            <div key={index} className={line.startsWith('**') ? 'font-bold mt-3 first:mt-0' : 'text-muted-foreground'}>
                              {line.replace(/\*\*/g, '')}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Cpu size={32} className="text-muted-foreground" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">No hardware scan performed</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Scan Device" to detect and optimize settings
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {benchmarkComparison && showBenchmark && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <BenchmarkComparison comparison={benchmarkComparison} />
        </motion.div>
      )}
    </div>
  )
}

export default HardwareOptimizer
