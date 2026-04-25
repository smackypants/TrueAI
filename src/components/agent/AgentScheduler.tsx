import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { Agent, AgentSchedule } from '@/lib/types'
import { Clock, CalendarBlank, Repeat, Lightning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface AgentSchedulerProps {
  agent: Agent
  onUpdateSchedule: (agentId: string, schedule: AgentSchedule) => void
}

export function AgentScheduler({ agent, onUpdateSchedule }: AgentSchedulerProps) {
  const [enabled, setEnabled] = useState(agent.schedule?.enabled || false)
  const [frequency, setFrequency] = useState<AgentSchedule['frequency']>(agent.schedule?.frequency || 'daily')
  const [time, setTime] = useState<string>(() => {
    if (agent.schedule?.nextRun) {
      const date = new Date(agent.schedule.nextRun)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    return '09:00'
  })

  const handleSave = () => {
    const [hours, minutes] = time.split(':').map(Number)
    const nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)
    
    if (nextRun.getTime() < Date.now()) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    const schedule: AgentSchedule = {
      enabled,
      frequency,
      nextRun: nextRun.getTime(),
      lastRun: agent.schedule?.lastRun
    }

    onUpdateSchedule(agent.id, schedule)
    toast.success('Schedule updated successfully')
  }

  const getNextRunText = () => {
    if (!enabled) return 'Scheduling disabled'
    
    const [hours, minutes] = time.split(':').map(Number)
    const nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)
    
    if (nextRun.getTime() < Date.now()) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    const now = new Date()
    const diffMs = nextRun.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours < 24) {
      return `Next run in ${diffHours}h ${diffMinutes}m`
    }
    return `Next run: ${nextRun.toLocaleDateString()} at ${time}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <motion.div 
            className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0"
            whileHover={{ scale: 1.05 }}
          >
            <Clock size={24} className="text-accent" weight="fill" />
          </motion.div>
          <div className="flex-1">
            <CardTitle className="text-lg">Schedule Agent</CardTitle>
            <CardDescription>Configure automatic execution for {agent.name}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Scheduling</Label>
            <p className="text-sm text-muted-foreground">Run agent automatically</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="frequency" className="flex items-center gap-2">
                <Repeat size={16} />
                Frequency
              </Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as AgentSchedule['frequency'])}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <CalendarBlank size={16} />
                Execution Time
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
              <div className="flex items-start gap-3">
                <Lightning size={20} className="text-accent mt-0.5" weight="fill" />
                <div>
                  <p className="text-sm font-medium">Schedule Preview</p>
                  <p className="text-sm text-muted-foreground mt-1">{getNextRunText()}</p>
                  {agent.schedule?.lastRun && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last run: {new Date(agent.schedule.lastRun).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSave}>
              Save Schedule
            </Button>
          </motion.div>
        )}

        {!enabled && (
          <div className="text-center py-8">
            <Clock size={48} className="text-muted-foreground mx-auto mb-3" weight="duotone" />
            <p className="text-sm text-muted-foreground">Enable scheduling to configure automatic execution</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AgentScheduler
