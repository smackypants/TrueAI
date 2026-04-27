import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Star, CheckCircle, XCircle, Clock, Target, Brain, type Icon } from '@phosphor-icons/react'
import type { AgentFeedback, AgentRun, FeedbackIssue } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentRun: AgentRun
  onSubmit: (feedback: Omit<AgentFeedback, 'id' | 'timestamp'>) => void
}

export function FeedbackDialog({ open, onOpenChange, agentRun, onSubmit }: FeedbackDialogProps) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [accuracy, setAccuracy] = useState(0.7)
  const [efficiency, setEfficiency] = useState(0.7)
  const [relevance, setRelevance] = useState(0.7)
  const [comment, setComment] = useState('')
  const [selectedIssues, setSelectedIssues] = useState<Set<FeedbackIssue['type']>>(new Set())
  const [issueDescriptions, setIssueDescriptions] = useState<Record<string, string>>({})
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)

  const issueTypes: { type: FeedbackIssue['type']; label: string; icon: Icon }[] = [
    { type: 'incorrect_result', label: 'Incorrect Result', icon: XCircle },
    { type: 'missing_information', label: 'Missing Information', icon: Target },
    { type: 'wrong_tool', label: 'Wrong Tool Used', icon: Brain },
    { type: 'poor_reasoning', label: 'Poor Reasoning', icon: Brain },
    { type: 'timeout', label: 'Timeout', icon: Clock },
    { type: 'other', label: 'Other', icon: XCircle }
  ]

  const handleToggleIssue = (issueType: FeedbackIssue['type']) => {
    const newIssues = new Set(selectedIssues)
    if (newIssues.has(issueType)) {
      newIssues.delete(issueType)
      const newDescriptions = { ...issueDescriptions }
      delete newDescriptions[issueType]
      setIssueDescriptions(newDescriptions)
    } else {
      newIssues.add(issueType)
    }
    setSelectedIssues(newIssues)
  }

  const handleSubmit = () => {
    const issues: FeedbackIssue[] = Array.from(selectedIssues).map(type => ({
      type,
      description: issueDescriptions[type] || '',
      severity: rating <= 2 ? 'high' : rating === 3 ? 'medium' : 'low'
    }))

    onSubmit({
      runId: agentRun.id,
      agentId: agentRun.agentId,
      rating,
      accuracy,
      efficiency,
      relevance,
      comment: comment.trim() || undefined,
      issues: issues.length > 0 ? issues : undefined
    })

    setRating(3)
    setAccuracy(0.7)
    setEfficiency(0.7)
    setRelevance(0.7)
    setComment('')
    setSelectedIssues(new Set())
    setIssueDescriptions({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Agent Feedback</DialogTitle>
          <DialogDescription>
            Help the agent learn and improve by providing detailed feedback on this run
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Overall Rating</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onClick={() => setRating(star as 1 | 2 | 3 | 4 | 5)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Star
                    weight={(hoveredStar !== null ? star <= hoveredStar : star <= rating) ? 'fill' : 'regular'}
                    size={32}
                    className={`transition-colors ${
                      (hoveredStar !== null ? star <= hoveredStar : star <= rating)
                        ? 'text-accent'
                        : 'text-muted-foreground'
                    }`}
                  />
                </motion.button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4 bg-card/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Accuracy</Label>
                  <span className="text-sm font-mono text-accent">{(accuracy * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[accuracy * 100]}
                  onValueChange={(value) => setAccuracy(value[0] / 100)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">How accurate was the agent's result?</p>
              </div>
            </Card>

            <Card className="p-4 bg-card/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Efficiency</Label>
                  <span className="text-sm font-mono text-accent">{(efficiency * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[efficiency * 100]}
                  onValueChange={(value) => setEfficiency(value[0] / 100)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">How efficiently did the agent complete the task?</p>
              </div>
            </Card>

            <Card className="p-4 bg-card/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Relevance</Label>
                  <span className="text-sm font-mono text-accent">{(relevance * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[relevance * 100]}
                  onValueChange={(value) => setRelevance(value[0] / 100)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">How relevant was the agent's output to the goal?</p>
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Issues Encountered (Optional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {issueTypes.map(({ type, label, icon: Icon }) => (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`p-3 cursor-pointer transition-all ${
                      selectedIssues.has(type)
                        ? 'bg-accent/10 border-accent'
                        : 'bg-card/50 hover:bg-card'
                    }`}
                    onClick={() => handleToggleIssue(type)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIssues.has(type)}
                        onCheckedChange={() => handleToggleIssue(type)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Icon size={20} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {selectedIssues.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {Array.from(selectedIssues).map(issueType => (
                    <div key={issueType} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Describe the "{issueTypes.find(i => i.type === issueType)?.label}" issue
                      </Label>
                      <Textarea
                        placeholder="Provide details about this issue..."
                        value={issueDescriptions[issueType] || ''}
                        onChange={(e) => setIssueDescriptions({
                          ...issueDescriptions,
                          [issueType]: e.target.value
                        })}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-comment">Additional Comments (Optional)</Label>
            <Textarea
              id="feedback-comment"
              placeholder="Any other feedback or suggestions for improvement..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <CheckCircle size={18} className="mr-2" weight="fill" />
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackDialog
