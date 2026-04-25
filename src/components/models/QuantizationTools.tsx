import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Cube, Play, Trash, DownloadSimple, Package } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { QuantizationJob, ModelConfig } from '@/lib/types'

interface QuantizationToolsProps {
  models: ModelConfig[]
  jobs: QuantizationJob[]
  onStartJob: (job: QuantizationJob) => void
  onDeleteJob: (id: string) => void
  onDownloadModel: (modelId: string) => void
}

export function QuantizationTools({
  models,
  jobs,
  onStartJob,
  onDeleteJob,
  onDownloadModel
}: QuantizationToolsProps) {
  const [newJobDialog, setNewJobDialog] = useState(false)
  const [jobForm, setJobForm] = useState({
    modelId: '',
    targetFormat: 'Q4_0' as QuantizationJob['targetFormat']
  })

  const quantFormats = [
    { value: 'Q4_0', label: 'Q4_0 (4-bit, fastest)', desc: 'Smallest size, good quality' },
    { value: 'Q4_1', label: 'Q4_1 (4-bit, improved)', desc: 'Slightly better quality' },
    { value: 'Q5_0', label: 'Q5_0 (5-bit)', desc: 'Balanced size/quality' },
    { value: 'Q5_1', label: 'Q5_1 (5-bit, improved)', desc: 'Better quality, larger' },
    { value: 'Q8_0', label: 'Q8_0 (8-bit)', desc: 'High quality, moderate size' },
    { value: 'F16', label: 'F16 (16-bit float)', desc: 'Very high quality' },
    { value: 'F32', label: 'F32 (32-bit float)', desc: 'Full precision' }
  ] as const

  const startQuantization = () => {
    const newJob: QuantizationJob = {
      id: `quant-${Date.now()}`,
      modelId: jobForm.modelId,
      targetFormat: jobForm.targetFormat,
      status: 'running',
      progress: 0,
      startedAt: Date.now()
    }

    onStartJob(newJob)
    setNewJobDialog(false)
    setJobForm({ modelId: '', targetFormat: 'Q4_0' })
    toast.success('Quantization started')
  }

  const getStatusColor = (status: QuantizationJob['status']) => {
    switch (status) {
      case 'running':
        return 'bg-accent text-accent-foreground'
      case 'completed':
        return 'bg-primary text-primary-foreground'
      case 'failed':
        return 'bg-destructive text-destructive-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const calculateCompression = (original?: number, quantized?: number) => {
    if (!original || !quantized) return null
    const ratio = ((original - quantized) / original) * 100
    return ratio.toFixed(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Cube weight="fill" size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Model Quantization</h2>
            <p className="text-sm text-muted-foreground">Convert and compress models locally</p>
          </div>
        </div>
        <Button
          onClick={() => setNewJobDialog(true)}
          disabled={models.length === 0}
        >
          <Play weight="fill" size={18} className="mr-2" />
          Quantize Model
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quantization Format Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quantFormats.map(format => (
              <Card key={format.value} className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <Badge variant="outline" className="font-mono">
                    {format.value}
                  </Badge>
                  <h4 className="font-semibold text-sm">{format.label}</h4>
                  <p className="text-xs text-muted-foreground">{format.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Quantization Jobs</h3>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {jobs.length === 0 && (
                <div className="py-12 text-center">
                  <Package size={48} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No quantization jobs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start quantizing a model to reduce its size
                  </p>
                </div>
              )}
              {jobs.map(job => {
                const model = models.find(m => m.id === job.modelId)
                const compression = calculateCompression(job.originalSize, job.quantizedSize)

                return (
                  <Card key={job.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold mb-1">
                            {model?.name || 'Unknown Model'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {job.targetFormat}
                            </Badge>
                            <Badge className={getStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.status === 'completed' && job.resultModelId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownloadModel(job.resultModelId!)}
                            >
                              <DownloadSimple size={18} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onDeleteJob(job.id)
                              toast.success('Job deleted')
                            }}
                          >
                            <Trash size={18} />
                          </Button>
                        </div>
                      </div>

                      {job.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-mono">{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {job.originalSize && (
                          <div>
                            <span className="text-muted-foreground">Original Size:</span>
                            <p className="font-semibold">{formatBytes(job.originalSize)}</p>
                          </div>
                        )}
                        {job.quantizedSize && (
                          <div>
                            <span className="text-muted-foreground">Quantized Size:</span>
                            <p className="font-semibold">{formatBytes(job.quantizedSize)}</p>
                          </div>
                        )}
                        {compression && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Compression:</span>
                            <p className="font-semibold text-accent">{compression}% smaller</p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <p className="text-xs">
                            {new Date(job.startedAt || 0).toLocaleString()}
                          </p>
                        </div>
                        {job.completedAt && (
                          <div>
                            <span className="text-muted-foreground">Completed:</span>
                            <p className="text-xs">
                              {new Date(job.completedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {job.status === 'completed' && job.resultModelId && (
                        <Card className="p-3 bg-accent/10 border-accent/20">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-accent" weight="fill" />
                            <span className="text-sm font-semibold">Result Model:</span>
                            <span className="text-sm font-mono">{job.resultModelId}</span>
                          </div>
                        </Card>
                      )}

                      {job.status === 'failed' && job.error && (
                        <div className="text-xs text-destructive p-2 bg-destructive/10 rounded">
                          {job.error}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={newJobDialog} onOpenChange={setNewJobDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quantize Model</DialogTitle>
            <DialogDescription>
              Convert a model to a quantized format to reduce file size
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quant-model">Source Model</Label>
              <Select
                value={jobForm.modelId}
                onValueChange={(value) => setJobForm(prev => ({ ...prev, modelId: value }))}
              >
                <SelectTrigger id="quant-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        {model.size && (
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(model.size)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quant-format">Target Format</Label>
              <Select
                value={jobForm.targetFormat}
                onValueChange={(value: QuantizationJob['targetFormat']) => 
                  setJobForm(prev => ({ ...prev, targetFormat: value }))
                }
              >
                <SelectTrigger id="quant-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quantFormats.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      <div className="flex flex-col">
                        <span>{format.label}</span>
                        <span className="text-xs text-muted-foreground">{format.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="p-4 bg-muted/50">
              <h4 className="text-sm font-semibold mb-2">Quantization Info</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Q4_0/Q4_1: Best for small models, ~4x compression</li>
                <li>• Q5_0/Q5_1: Balanced quality and size</li>
                <li>• Q8_0: High quality, ~2x compression</li>
                <li>• F16/F32: Minimal compression, best quality</li>
              </ul>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewJobDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={startQuantization}
              disabled={!jobForm.modelId}
            >
              <Play weight="fill" size={18} className="mr-2" />
              Start Quantization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
