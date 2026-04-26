import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  ClockCounterClockwise, 
  GitBranch, 
  TrendUp,
  TrendDown,
  User,
  Robot,
  ArrowRight
} from '@phosphor-icons/react'
import type { AgentVersion } from '@/lib/types'
import { motion } from 'framer-motion'

interface AgentVersionHistoryProps {
  versions: AgentVersion[]
  onRestore?: (version: AgentVersion) => void
}

export function AgentVersionHistory({ versions, onRestore }: AgentVersionHistoryProps) {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPerformanceChange = (current: number, previous?: number) => {
    if (!previous) return null
    const change = ((current - previous) / previous) * 100
    return {
      value: change,
      isPositive: change > 0,
      icon: change > 0 ? TrendUp : TrendDown
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClockCounterClockwise size={24} weight="fill" className="text-accent" />
        <div>
          <h3 className="text-lg font-semibold">Version History</h3>
          <p className="text-sm text-muted-foreground">Track agent evolution and improvements</p>
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {sortedVersions.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch size={48} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No version history yet</p>
              <p className="text-sm text-muted-foreground mt-1">Versions are created when learning is applied</p>
            </div>
          ) : (
            sortedVersions.map((version, index) => {
              const previousVersion = sortedVersions[index + 1]
              const ratingChange = getPerformanceChange(
                version.performanceSnapshot.avgRating,
                previousVersion?.performanceSnapshot.avgRating
              )
              const successRateChange = getPerformanceChange(
                version.performanceSnapshot.successRate,
                previousVersion?.performanceSnapshot.successRate
              )

              return (
                <motion.div
                  key={version.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`p-4 ${index === 0 ? 'border-accent border-2' : ''}`}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {version.createdBy === 'auto_learning' ? (
                            <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
                              <Robot size={18} weight="fill" className="text-accent" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                              <User size={18} weight="fill" className="text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">
                                Version {version.version}
                              </p>
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">Current</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(version.createdAt)} • {version.createdBy === 'auto_learning' ? 'Auto-learned' : 'Manual'}
                            </p>
                          </div>
                        </div>

                        {index > 0 && onRestore && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRestore(version)}
                            className="shrink-0 text-xs"
                          >
                            Restore
                          </Button>
                        )}
                      </div>

                      {version.changes.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Changes</p>
                            {version.changes.map((change, changeIndex) => (
                              <div key={changeIndex} className="text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {change.field.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                                  <code className="px-2 py-1 bg-muted rounded">
                                    {typeof change.oldValue === 'object' 
                                      ? JSON.stringify(change.oldValue)
                                      : String(change.oldValue)}
                                  </code>
                                  <ArrowRight size={12} />
                                  <code className="px-2 py-1 bg-accent/20 rounded text-accent">
                                    {typeof change.newValue === 'object'
                                      ? JSON.stringify(change.newValue)
                                      : String(change.newValue)}
                                  </code>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-2 italic">
                                  {change.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <Separator />
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Avg Rating</p>
                          <div className="flex items-center gap-1">
                            <p className="font-semibold font-mono">
                              {version.performanceSnapshot.avgRating.toFixed(2)}
                            </p>
                            {ratingChange && (
                              <div className={`flex items-center text-xs ${ratingChange.isPositive ? 'text-green-400' : 'text-orange-400'}`}>
                                <ratingChange.icon size={12} weight="bold" />
                                <span>{Math.abs(ratingChange.value).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <div className="flex items-center gap-1">
                            <p className="font-semibold font-mono">
                              {(version.performanceSnapshot.successRate * 100).toFixed(0)}%
                            </p>
                            {successRateChange && (
                              <div className={`flex items-center text-xs ${successRateChange.isPositive ? 'text-green-400' : 'text-orange-400'}`}>
                                <successRateChange.icon size={12} weight="bold" />
                                <span>{Math.abs(successRateChange.value).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Avg Time</p>
                          <p className="font-semibold font-mono">
                            {(version.performanceSnapshot.avgExecutionTime / 1000).toFixed(1)}s
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

export default AgentVersionHistory
