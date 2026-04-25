import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Agent } from '@/lib/types'
import { DotsThree, Play, Gear, Clock, ChartBar, Trash, Pause } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface AgentQuickActionsProps {
  agent: Agent
  onRun: (agentId: string) => void
  onConfigure: (agentId: string) => void
  onSchedule: (agentId: string) => void
  onViewAnalytics: (agentId: string) => void
  onDelete: (agentId: string) => void
}

export function AgentQuickActions({ 
  agent, 
  onRun, 
  onConfigure, 
  onSchedule, 
  onViewAnalytics, 
  onDelete 
}: AgentQuickActionsProps) {
  const [open, setOpen] = useState(false)

  const actions = [
    {
      id: 'run',
      label: agent.status === 'running' ? 'Pause' : 'Run Agent',
      icon: agent.status === 'running' ? <Pause size={20} /> : <Play size={20} weight="fill" />,
      color: 'text-green-500',
      onClick: () => {
        onRun(agent.id)
        setOpen(false)
      },
      disabled: false
    },
    {
      id: 'configure',
      label: 'Configure',
      icon: <Gear size={20} weight="fill" />,
      color: 'text-blue-500',
      onClick: () => {
        onConfigure(agent.id)
        setOpen(false)
      },
      disabled: false
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: <Clock size={20} weight="fill" />,
      color: 'text-purple-500',
      onClick: () => {
        onSchedule(agent.id)
        setOpen(false)
      },
      disabled: false
    },
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: <ChartBar size={20} weight="fill" />,
      color: 'text-orange-500',
      onClick: () => {
        onViewAnalytics(agent.id)
        setOpen(false)
      },
      disabled: false
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash size={20} weight="fill" />,
      color: 'text-destructive',
      onClick: () => {
        onDelete(agent.id)
        setOpen(false)
      },
      disabled: false
    }
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <DotsThree size={20} weight="bold" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{agent.name}</SheetTitle>
          <SheetDescription className="line-clamp-2">{agent.goal}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {actions.map((action, index) => (
            <div key={action.id}>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left touch-target ${
                  action.id === 'delete' ? 'hover:bg-destructive/10' : ''
                }`}
              >
                <div className={action.color}>{action.icon}</div>
                <span className="font-medium">{action.label}</span>
              </motion.button>
              {index < actions.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={agent.status === 'running' ? 'default' : 'outline'}>
              {agent.status}
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AgentQuickActions
