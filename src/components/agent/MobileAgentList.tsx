import { useIsMobile } from '@/hooks/use-mobile'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Agent } from '@/lib/types'
import { Robot, Play, Eye, ChartBar } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { memo } from 'react'
import { cn } from '@/lib/utils'

interface MobileAgentListItemProps {
  agent: Agent
  onRun: (agentId: string) => void
  onView: (agentId: string) => void
  onViewAnalytics: (agentId: string) => void
}

const getStatusColor = (status: Agent['status']) => {
  switch (status) {
    case 'running':
      return 'bg-accent/20 text-accent border-accent/50'
    case 'completed':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    case 'error':
      return 'bg-destructive/20 text-destructive border-destructive/50'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export const MobileAgentListItem = memo(({ agent, onRun, onView, onViewAnalytics }: MobileAgentListItemProps) => {
  const isMobile = useIsMobile()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
      className="touch-target"
    >
      <Card 
        className="active:scale-[0.98] transition-transform cursor-pointer"
        onClick={() => onView(agent.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Robot weight="fill" size={20} className="text-primary" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'shrink-0 text-xs',
                    getStatusColor(agent.status),
                    agent.status === 'running' && 'animate-pulse-glow'
                  )}
                >
                  {agent.status}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2">{agent.goal}</p>
              
              <div className="flex flex-wrap gap-1">
                {agent.tools.slice(0, 3).map(tool => (
                  <Badge key={tool} variant="secondary" className="text-xs">
                    {tool.replace('_', ' ')}
                  </Badge>
                ))}
                {agent.tools.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{agent.tools.length - 3}
                  </Badge>
                )}
              </div>
              
              <div 
                className="flex gap-2 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onRun(agent.id)}
                  disabled={agent.status === 'running'}
                  className="flex-1 h-9 gap-1.5"
                >
                  <Play weight="fill" size={14} />
                  {agent.status === 'running' ? 'Running' : 'Run'}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(agent.id)}
                  className="h-9 px-3"
                >
                  <Eye weight="fill" size={16} />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewAnalytics(agent.id)}
                  className="h-9 px-3"
                >
                  <ChartBar weight="fill" size={16} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

MobileAgentListItem.displayName = 'MobileAgentListItem'

interface MobileAgentListProps {
  agents: Agent[]
  onRun: (agentId: string) => void
  onView: (agentId: string) => void
  onViewAnalytics: (agentId: string) => void
}

export function MobileAgentList({ agents, onRun, onView, onViewAnalytics }: MobileAgentListProps) {
  return (
    <div className="space-y-3">
      {agents.map(agent => (
        <MobileAgentListItem
          key={agent.id}
          agent={agent}
          onRun={onRun}
          onView={onView}
          onViewAnalytics={onViewAnalytics}
        />
      ))}
    </div>
  )
}

export default MobileAgentList
