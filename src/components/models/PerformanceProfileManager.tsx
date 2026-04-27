import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Lightbulb, Sparkle, TrendUp, CheckCircle, ArrowRight, Faders } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { PerformanceProfile, TaskType, ModelParameters} from '@/lib/types'
import { 
  taskTypeDescriptions, 
  generateAutoTuneRecommendation, 
  analyzeParameterImpact,
  scoreProfileMatch,
  createDefaultProfile
} from '@/lib/performance-profiles'

interface PerformanceProfileManagerProps {
  profiles: PerformanceProfile[]
  currentModelParams: ModelParameters
  currentModelId: string
  onCreateProfile: (profile: Omit<PerformanceProfile, 'id' | 'createdAt'>) => void
  onApplyProfile: (profile: PerformanceProfile) => void
  onDeleteProfile: (id: string) => void
  onAutoTune: (taskType: TaskType) => void
}

export function PerformanceProfileManager({
  profiles,
  currentModelParams,
  onCreateProfile,
  onApplyProfile,
  onDeleteProfile,
  onAutoTune
}: PerformanceProfileManagerProps) {
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('conversation')
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [viewingProfile, setViewingProfile] = useState<PerformanceProfile | null>(null)
  const [creatingProfile, setCreatingProfile] = useState(false)

  const recommendation = generateAutoTuneRecommendation(selectedTaskType, currentModelParams)
  const matchScore = scoreProfileMatch(currentModelParams, selectedTaskType)

  const taskTypes: TaskType[] = [
    'conversation',
    'creative_writing',
    'code_generation',
    'data_analysis',
    'question_answering',
    'summarization',
    'translation',
    'reasoning',
    'instruction_following',
    'brainstorming'
  ]

  const handleCreateFromTemplate = () => {
    const profile = createDefaultProfile(selectedTaskType)
    onCreateProfile({
      ...profile,
      usageCount: 0
    })
    setCreatingProfile(false)
  }

  const handleApplyRecommendation = () => {
    onAutoTune(selectedTaskType)
    setShowRecommendation(false)
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    return 'text-orange-500'
  }

  const getMatchScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent Match'
    if (score >= 70) return 'Good Match'
    if (score >= 50) return 'Fair Match'
    return 'Poor Match'
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Faders size={24} className="text-primary" weight="fill" />
              Performance Profiles
            </h3>
            <p className="text-sm text-muted-foreground">
              Optimize model parameters automatically based on task type
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label>Task Type</Label>
              <Select value={selectedTaskType} onValueChange={(v) => setSelectedTaskType(v as TaskType)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {taskTypeDescriptions[selectedTaskType]}
              </p>
            </div>

            <Alert className="bg-accent/10 border-accent/30">
              <Sparkle className="h-4 w-4 text-accent" weight="fill" />
              <AlertDescription className="ml-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Parameters Match</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your settings are <span className={getMatchScoreColor(matchScore)}>{getMatchScoreLabel(matchScore)}</span> for {selectedTaskType.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getMatchScoreColor(matchScore)}`}>
                      {Math.round(matchScore)}%
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={() => setShowRecommendation(true)} 
                className="flex-1"
                variant="default"
              >
                <Lightbulb size={18} weight="fill" className="mr-2" />
                Get Recommendations
              </Button>
              <Button 
                onClick={() => setCreatingProfile(true)} 
                variant="outline"
                className="flex-1"
              >
                <Sparkle size={18} weight="fill" className="mr-2" />
                Create Profile
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {profiles.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Saved Profiles</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profiles.map(profile => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setViewingProfile(profile)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{profile.name}</h5>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {profile.taskType.replace('_', ' ')}
                    </Badge>
                  </div>
                  {profile.avgQualityScore && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">
                        {Math.round(profile.avgQualityScore)}%
                      </div>
                      <div className="text-xs text-muted-foreground">quality</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>Used {profile.usageCount} times</span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApplyProfile(profile)
                    }}
                    className="h-7 px-2"
                  >
                    Apply
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={showRecommendation} onOpenChange={setShowRecommendation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb size={24} weight="fill" className="text-primary" />
              Auto-Tune Recommendations
            </DialogTitle>
            <DialogDescription>
              Optimized parameters for {selectedTaskType.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-primary/10 border-primary/30">
              <TrendUp className="h-4 w-4 text-primary" weight="fill" />
              <AlertDescription className="ml-8">
                <p className="font-medium mb-1">Confidence: {Math.round(recommendation.confidence * 100)}%</p>
                <p className="text-sm">{recommendation.reasoning}</p>
              </AlertDescription>
            </Alert>

            {Object.keys(recommendation.expectedImprovements).length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Expected Improvements</h4>
                <div className="space-y-2">
                  {Object.entries(recommendation.expectedImprovements).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={16} className="text-green-500 mt-0.5" weight="fill" />
                      <div>
                        <span className="font-medium capitalize">{key}: </span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <ParameterComparison 
              current={recommendation.currentParams}
              recommended={recommendation.recommendedParams}
              taskType={selectedTaskType}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommendation(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyRecommendation}>
              <ArrowRight size={18} className="mr-2" />
              Apply Recommendations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewingProfile && (
        <Dialog open={!!viewingProfile} onOpenChange={() => setViewingProfile(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingProfile.name}</DialogTitle>
              <DialogDescription>{viewingProfile.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Task Type</Label>
                  <Badge variant="secondary" className="mt-1">
                    {viewingProfile.taskType.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Usage Count</Label>
                  <p className="font-medium mt-1">{viewingProfile.usageCount}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold mb-3 block">Parameters</Label>
                <ParameterDisplay parameters={viewingProfile.parameters} />
              </div>

              <Alert className="bg-muted/50">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="ml-8">
                  <p className="text-sm font-medium mb-1">Reasoning</p>
                  <p className="text-xs text-muted-foreground">{viewingProfile.reasoning}</p>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  onDeleteProfile(viewingProfile.id)
                  setViewingProfile(null)
                }}
              >
                Delete
              </Button>
              <Button onClick={() => {
                onApplyProfile(viewingProfile)
                setViewingProfile(null)
              }}>
                Apply Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={creatingProfile} onOpenChange={setCreatingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Performance Profile</DialogTitle>
            <DialogDescription>
              Create a new profile optimized for specific tasks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Select Task Type</Label>
              <Select value={selectedTaskType} onValueChange={(v) => setSelectedTaskType(v as TaskType)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {taskTypeDescriptions[selectedTaskType]}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate}>
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ParameterComparison({ 
  current, 
  recommended, 
  taskType 
}: { 
  current: ModelParameters
  recommended: ModelParameters
  taskType: TaskType
}) {
  const params: Array<{ key: keyof ModelParameters; label: string }> = [
    { key: 'temperature', label: 'Temperature' },
    { key: 'maxTokens', label: 'Max Tokens' },
    { key: 'topP', label: 'Top P' },
    { key: 'frequencyPenalty', label: 'Frequency Penalty' },
    { key: 'presencePenalty', label: 'Presence Penalty' }
  ]

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Parameter Changes</h4>
      {params.map(({ key, label }) => {
        const currentVal = current[key]
        const recommendedVal = recommended[key]
        const hasChange = currentVal !== recommendedVal

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <Label className="text-xs">{label}</Label>
              <div className="flex items-center gap-2">
                <span className={hasChange ? 'text-muted-foreground line-through' : 'font-medium'}>
                  {currentVal}
                </span>
                {hasChange && (
                  <>
                    <ArrowRight size={14} className="text-primary" />
                    <span className="font-medium text-primary">{recommendedVal}</span>
                  </>
                )}
              </div>
            </div>
            {hasChange && (
              <p className="text-xs text-muted-foreground">
                {analyzeParameterImpact(key, recommendedVal as number, taskType)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ParameterDisplay({ parameters }: { parameters: ModelParameters }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <Label className="text-xs text-muted-foreground">Temperature</Label>
        <p className="font-mono">{parameters.temperature}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Max Tokens</Label>
        <p className="font-mono">{parameters.maxTokens}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Top P</Label>
        <p className="font-mono">{parameters.topP}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Top K</Label>
        <p className="font-mono">{parameters.topK || 'N/A'}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Frequency Penalty</Label>
        <p className="font-mono">{parameters.frequencyPenalty}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Presence Penalty</Label>
        <p className="font-mono">{parameters.presencePenalty}</p>
      </div>
    </div>
  )
}
