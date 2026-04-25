import { useState } from 'react'
import { Agent } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Play, Trash, Robot, Eye, Pause, Warning, ChatCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
  onRun: (agentId: string) => void
  onDelete: (agentId: string) => void
  onView: (agentId: string) => void
  onFeedback?: (agentId: string) => void
  hasRecentRun?: boolean
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

const getStatusIcon = (status: Agent['status']) => {
  switch (status) {
    case 'running':
      return <Pause size={12} weight="fill" />
    case 'completed':
      return null
    case 'error':
      return <Warning size={12} weight="fill" />
    default:
      return null
  }
}

export function AgentCard({ agent, onRun, onDelete, onView, onFeedback, hasRecentRun }: AgentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    onDelete(agent.id)
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 relative overflow-hidden",
            isHovered && "border-accent/50 shadow-lg shadow-accent/10"
          )}
          onClick={() => onView(agent.id)}
        >
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <CardHeader className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <motion.div 
                  className={cn(
                    "h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 transition-all duration-200",
                    isHovered && "bg-primary/30 scale-110"
                  )}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Robot weight="fill" size={24} className="text-primary" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {agent.goal}
                  </CardDescription>
                </div>
              </div>
              
              <Badge 
                variant="outline" 
                className={cn(
                  'shrink-0 gap-1 transition-all duration-200',
                  getStatusColor(agent.status),
                  agent.status === 'running' && 'animate-pulse-glow'
                )}
              >
                {getStatusIcon(agent.status)}
                {agent.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {agent.tools.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No tools configured</span>
                ) : (
                  agent.tools.map((tool) => (
                    <Tooltip key={tool}>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="secondary" 
                          className="text-xs cursor-help hover:bg-secondary/80 transition-colors"
                        >
                          {tool.replace('_', ' ')}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="capitalize">{tool.replace('_', ' ')} tool</p>
                      </TooltipContent>
                    </Tooltip>
                  ))
                )}
              </div>
              
              <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(agent.id)}
                      >
                        <Eye weight="fill" size={16} />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View execution history</p>
                  </TooltipContent>
                </Tooltip>

                {onFeedback && hasRecentRun && agent.status === 'completed' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFeedback(agent.id)}
                          className="gap-1 border-accent text-accent hover:bg-accent/10"
                        >
                          <ChatCircle weight="fill" size={16} />
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Provide feedback to help agent learn</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onRun(agent.id)}
                        disabled={agent.status === 'running'}
                        className="gap-1"
                      >
                        <Play weight="fill" size={16} />
                        {agent.status === 'running' ? 'Running...' : 'Run'}
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{agent.status === 'running' ? 'Agent is already running' : 'Execute agent workflow'}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash weight="fill" size={16} />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete agent</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agent.name}"? This action cannot be undone and will remove all execution history for this agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

export default AgentCard
