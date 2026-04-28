import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  CurrencyDollar,
  TrendUp,
  TrendDown,
  Lightning,
  Warning,
  Plus,
  Download
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { CostEntry, CostSummary, Budget } from '@/lib/workflow-types'

interface CostTrackingProps {
  costEntries: CostEntry[]
  budgets: Budget[]
  onCreateBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'spent'>) => void
  onDeleteBudget: (id: string) => void
}

// Model cost constants for reference (tokens per dollar)
const _MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.01 / 1000, output: 0.03 / 1000 },
  'gpt-4o-mini': { input: 0.0015 / 1000, output: 0.006 / 1000 },
  'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
  'gpt-3.5-turbo': { input: 0.0005 / 1000, output: 0.0015 / 1000 },
}

export function CostTracking({
  costEntries,
  budgets,
  onCreateBudget,
  onDeleteBudget
}: CostTrackingProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week')
  const [newBudgetDialog, setNewBudgetDialog] = useState(false)
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    amount: 0,
    period: 'monthly' as 'daily' | 'weekly' | 'monthly',
    alertThreshold: 80,
    enabled: true
  })

  const filteredEntries = useMemo(() => {
    const now = Date.now()
    const ranges = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      all: Infinity
    }
    
    return costEntries.filter(entry => now - entry.timestamp < ranges[timeRange])
  }, [costEntries, timeRange])

  const summary: CostSummary = useMemo(() => {
    const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.cost, 0)
    const totalTokens = filteredEntries.reduce((sum, entry) => sum + entry.tokensIn + entry.tokensOut, 0)

    const byModel: Record<string, { cost: number; tokens: number; calls: number }> = {}
    const byResource: Record<string, { cost: number; tokens: number }> = {}

    filteredEntries.forEach(entry => {
      if (!byModel[entry.model]) {
        byModel[entry.model] = { cost: 0, tokens: 0, calls: 0 }
      }
      byModel[entry.model].cost += entry.cost
      byModel[entry.model].tokens += entry.tokensIn + entry.tokensOut
      byModel[entry.model].calls += 1

      if (!byResource[entry.resource]) {
        byResource[entry.resource] = { cost: 0, tokens: 0 }
      }
      byResource[entry.resource].cost += entry.cost
      byResource[entry.resource].tokens += entry.tokensIn + entry.tokensOut
    })

    const trend: { date: string; cost: number }[] = []
    const dayBuckets: Record<string, number> = {}
    
    filteredEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString()
      if (!dayBuckets[date]) dayBuckets[date] = 0
      dayBuckets[date] += entry.cost
    })

    Object.entries(dayBuckets).forEach(([date, cost]) => {
      trend.push({ date, cost })
    })

    trend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      totalCost,
      totalTokens,
      byModel,
      byResource,
      trend
    }
  }, [filteredEntries])

  const createBudget = () => {
    if (!budgetForm.name || budgetForm.amount <= 0) {
      return
    }

    onCreateBudget(budgetForm)
    setNewBudgetDialog(false)
    setBudgetForm({
      name: '',
      amount: 0,
      period: 'monthly',
      alertThreshold: 80,
      enabled: true
    })
  }

  const getBudgetStatus = (budget: Budget): 'safe' | 'warning' | 'exceeded' => {
    const percentage = (budget.spent / budget.amount) * 100
    if (percentage >= 100) return 'exceeded'
    if (percentage >= budget.alertThreshold) return 'warning'
    return 'safe'
  }

  const exportData = () => {
    const dataStr = JSON.stringify(filteredEntries, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cost-report-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cost Tracking & Budgets</h2>
          <p className="text-sm text-muted-foreground">
            Monitor spending, set budgets, optimize costs
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value: 'day' | 'week' | 'month' | 'all') => setTimeRange(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setNewBudgetDialog(true)} variant="outline" size="sm">
            <Plus weight="bold" size={18} className="mr-2" />
            New Budget
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download weight="bold" size={18} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <CurrencyDollar size={20} className="text-primary" />
            </div>
            <div className="text-3xl font-bold">
              ${summary.totalCost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {summary.totalTokens.toLocaleString()} tokens
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Avg per Call</div>
              <Lightning size={20} className="text-accent" />
            </div>
            <div className="text-3xl font-bold">
              ${filteredEntries.length > 0 ? (summary.totalCost / filteredEntries.length).toFixed(4) : '0.0000'}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {filteredEntries.length} API calls
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Trend</div>
              {summary.trend.length > 1 && summary.trend[summary.trend.length - 1].cost > summary.trend[0].cost ? (
                <TrendUp size={20} className="text-red-500" />
              ) : (
                <TrendDown size={20} className="text-green-500" />
              )}
            </div>
            <div className="text-3xl font-bold">
              {summary.trend.length > 1 && summary.trend[0].cost > 0
                ? `${((summary.trend[summary.trend.length - 1].cost / summary.trend[0].cost - 1) * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              vs. period start
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Cost by Model</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {Object.entries(summary.byModel).map(([model, data]) => (
                <div key={model} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{model}</div>
                      <div className="text-xs text-muted-foreground">
                        {data.calls} calls · {data.tokens.toLocaleString()} tokens
                      </div>
                    </div>
                    <div className="font-semibold">${data.cost.toFixed(4)}</div>
                  </div>
                  <Progress 
                    value={(data.cost / summary.totalCost) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Cost by Resource</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {Object.entries(summary.byResource).map(([resource, data]) => (
                <div key={resource} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm capitalize">{resource}</div>
                      <div className="text-xs text-muted-foreground">
                        {data.tokens.toLocaleString()} tokens
                      </div>
                    </div>
                    <div className="font-semibold">${data.cost.toFixed(4)}</div>
                  </div>
                  <Progress 
                    value={(data.cost / summary.totalCost) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Budgets</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => {
            const status = getBudgetStatus(budget)
            const percentage = (budget.spent / budget.amount) * 100

            return (
              <Card key={budget.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium">{budget.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {budget.period}
                    </div>
                  </div>
                  {status === 'warning' && (
                    <Warning size={18} className="text-yellow-500" />
                  )}
                  {status === 'exceeded' && (
                    <Warning size={18} className="text-red-500" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Spent</span>
                    <span className="font-semibold">
                      ${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(percentage, 100)}
                    className={`h-2 ${
                      status === 'exceeded' ? 'bg-red-500/20' : 
                      status === 'warning' ? 'bg-yellow-500/20' : ''
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% used</span>
                    <Badge
                      variant={status === 'safe' ? 'secondary' : status === 'warning' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {status}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={() => onDeleteBudget(budget.id)}
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3"
                >
                  Delete Budget
                </Button>
              </Card>
            )
          })}

          {budgets.length === 0 && (
            <Card className="p-8 col-span-full text-center">
              <CurrencyDollar size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No budgets set. Create one to track spending limits.
              </p>
              <Button onClick={() => setNewBudgetDialog(true)} size="sm">
                <Plus weight="bold" size={18} className="mr-2" />
                Create Budget
              </Button>
            </Card>
          )}
        </div>
      </Card>

      <Dialog open={newBudgetDialog} onOpenChange={setNewBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget</DialogTitle>
            <DialogDescription>
              Set spending limits and get alerts when approaching your budget
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Budget Name</Label>
              <Input
                placeholder="e.g., Monthly AI Spending"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="100.00"
                value={budgetForm.amount || ''}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={budgetForm.period}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setBudgetForm(prev => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Alert Threshold (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="80"
                value={budgetForm.alertThreshold || ''}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) || 80 }))}
              />
              <p className="text-xs text-muted-foreground">
                Get notified when spending reaches this percentage
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBudgetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createBudget}>Create Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CostTracking
