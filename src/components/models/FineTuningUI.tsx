import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Flask, Upload, Play, Trash, FileText, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { FineTuningDataset, FineTuningSample, FineTuningJob, ModelConfig } from '@/lib/types'

interface FineTuningUIProps {
  models: ModelConfig[]
  datasets: FineTuningDataset[]
  jobs: FineTuningJob[]
  onCreateDataset: (dataset: FineTuningDataset) => void
  onStartJob: (job: FineTuningJob) => void
  onDeleteDataset: (id: string) => void
  onDeleteJob: (id: string) => void
}

export function FineTuningUI({
  models,
  datasets,
  jobs,
  onCreateDataset,
  onStartJob,
  onDeleteDataset,
  onDeleteJob
}: FineTuningUIProps) {
  const [newDatasetDialog, setNewDatasetDialog] = useState(false)
  const [newJobDialog, setNewJobDialog] = useState(false)
  const [addSampleDialog, setAddSampleDialog] = useState(false)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)
  
  const [datasetForm, setDatasetForm] = useState({
    name: '',
    description: '',
    format: 'jsonl' as 'jsonl' | 'csv' | 'parquet'
  })

  const [sampleForm, setSampleForm] = useState({
    prompt: '',
    completion: ''
  })

  const [jobForm, setJobForm] = useState({
    modelId: '',
    datasetId: '',
    epochs: 3,
    learningRate: 0.0001,
    batchSize: 4
  })

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId)

  const createDataset = () => {
    const newDataset: FineTuningDataset = {
      id: `dataset-${Date.now()}`,
      name: datasetForm.name || 'New Dataset',
      description: datasetForm.description,
      format: datasetForm.format,
      samples: [],
      createdAt: Date.now(),
      size: 0
    }
    
    onCreateDataset(newDataset)
    setNewDatasetDialog(false)
    setDatasetForm({ name: '', description: '', format: 'jsonl' })
    toast.success('Dataset created')
  }

  const addSample = () => {
    if (!selectedDataset) return

    const newSample: FineTuningSample = {
      id: `sample-${Date.now()}`,
      prompt: sampleForm.prompt,
      completion: sampleForm.completion
    }

    const updatedDataset: FineTuningDataset = {
      ...selectedDataset,
      samples: [...selectedDataset.samples, newSample],
      size: selectedDataset.samples.length + 1
    }

    onCreateDataset(updatedDataset)
    setAddSampleDialog(false)
    setSampleForm({ prompt: '', completion: '' })
    toast.success('Sample added')
  }

  const startFineTuning = () => {
    const newJob: FineTuningJob = {
      id: `job-${Date.now()}`,
      modelId: jobForm.modelId,
      datasetId: jobForm.datasetId,
      status: 'running',
      progress: 0,
      epochs: jobForm.epochs,
      learningRate: jobForm.learningRate,
      batchSize: jobForm.batchSize,
      startedAt: Date.now(),
      metrics: {
        loss: [],
        accuracy: [],
        epoch: 0,
        step: 0
      }
    }

    onStartJob(newJob)
    setNewJobDialog(false)
    setJobForm({ modelId: '', datasetId: '', epochs: 3, learningRate: 0.0001, batchSize: 4 })
    toast.success('Fine-tuning started')
  }

  const getStatusColor = (status: FineTuningJob['status']) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Flask weight="fill" size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Model Fine-Tuning</h2>
            <p className="text-sm text-muted-foreground">Train models on custom datasets</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Training Datasets</h3>
            <Button onClick={() => setNewDatasetDialog(true)} size="sm">
              <Plus weight="bold" size={18} className="mr-2" />
              New Dataset
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {datasets.length === 0 && (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">No datasets created yet</p>
                </Card>
              )}
              {datasets.map(dataset => (
                <Card
                  key={dataset.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedDatasetId === dataset.id ? 'ring-2 ring-accent' : ''
                  }`}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText weight="fill" size={18} className="text-primary" />
                        <h4 className="font-semibold truncate">{dataset.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{dataset.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {dataset.format.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {dataset.samples.length} samples
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteDataset(dataset.id)
                        toast.success('Dataset deleted')
                      }}
                    >
                      <Trash size={18} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Fine-Tuning Jobs</h3>
            <Button
              onClick={() => setNewJobDialog(true)}
              size="sm"
              disabled={datasets.length === 0}
            >
              <Play weight="fill" size={18} className="mr-2" />
              Start Training
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {jobs.length === 0 && (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">No training jobs yet</p>
                </Card>
              )}
              {jobs.map(job => {
                const model = models.find(m => m.id === job.modelId)
                const dataset = datasets.find(d => d.id === job.datasetId)
                return (
                  <Card key={job.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold mb-1">{model?.name || 'Unknown Model'}</h4>
                          <p className="text-sm text-muted-foreground">
                            Dataset: {dataset?.name || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
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
                          {job.metrics && (
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Epoch: {job.metrics.epoch}/{job.epochs}</span>
                              <span>Step: {job.metrics.step}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Epochs:</span>{' '}
                          <span className="font-mono">{job.epochs}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Batch Size:</span>{' '}
                          <span className="font-mono">{job.batchSize}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Learning Rate:</span>{' '}
                          <span className="font-mono">{job.learningRate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span>{' '}
                          <span>{new Date(job.startedAt || 0).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {job.status === 'completed' && job.resultModelId && (
                        <Badge variant="outline" className="w-full justify-center">
                          Result Model: {job.resultModelId}
                        </Badge>
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
        </div>
      </div>

      {selectedDataset && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Dataset Samples: {selectedDataset.name}</h3>
            <Button onClick={() => setAddSampleDialog(true)} size="sm">
              <Plus weight="bold" size={18} className="mr-2" />
              Add Sample
            </Button>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {selectedDataset.samples.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No samples yet</p>
              )}
              {selectedDataset.samples.map((sample, index) => (
                <Card key={sample.id} className="p-4 bg-muted/50">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Sample {index + 1} - Prompt</Label>
                      <p className="text-sm mt-1">{sample.prompt}</p>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Completion</Label>
                      <p className="text-sm mt-1">{sample.completion}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      <Dialog open={newDatasetDialog} onOpenChange={setNewDatasetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Training Dataset</DialogTitle>
            <DialogDescription>
              Create a new dataset for model fine-tuning
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-name">Name</Label>
              <Input
                id="dataset-name"
                value={datasetForm.name}
                onChange={(e) => setDatasetForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer Support Dataset"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataset-desc">Description</Label>
              <Textarea
                id="dataset-desc"
                value={datasetForm.description}
                onChange={(e) => setDatasetForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Training data for customer support responses..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-format">Format</Label>
              <Select
                value={datasetForm.format}
                onValueChange={(value: 'jsonl' | 'csv' | 'parquet') => 
                  setDatasetForm(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger id="dataset-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jsonl">JSONL</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="parquet">Parquet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDatasetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createDataset}>Create Dataset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addSampleDialog} onOpenChange={setAddSampleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Training Sample</DialogTitle>
            <DialogDescription>
              Add a prompt-completion pair to the dataset
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sample-prompt">Prompt</Label>
              <Textarea
                id="sample-prompt"
                value={sampleForm.prompt}
                onChange={(e) => setSampleForm(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="How do I reset my password?"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sample-completion">Completion</Label>
              <Textarea
                id="sample-completion"
                value={sampleForm.completion}
                onChange={(e) => setSampleForm(prev => ({ ...prev, completion: e.target.value }))}
                placeholder="To reset your password, click on the 'Forgot Password' link..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSampleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addSample} disabled={!sampleForm.prompt || !sampleForm.completion}>
              Add Sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newJobDialog} onOpenChange={setNewJobDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Fine-Tuning</DialogTitle>
            <DialogDescription>
              Configure and start a model fine-tuning job
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="job-model">Base Model</Label>
              <Select
                value={jobForm.modelId}
                onValueChange={(value) => setJobForm(prev => ({ ...prev, modelId: value }))}
              >
                <SelectTrigger id="job-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-dataset">Dataset</Label>
              <Select
                value={jobForm.datasetId}
                onValueChange={(value) => setJobForm(prev => ({ ...prev, datasetId: value }))}
              >
                <SelectTrigger id="job-dataset">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map(dataset => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      {dataset.name} ({dataset.samples.length} samples)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-epochs">Epochs</Label>
                <Input
                  id="job-epochs"
                  type="number"
                  min="1"
                  max="100"
                  value={jobForm.epochs}
                  onChange={(e) => setJobForm(prev => ({ ...prev, epochs: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-batch">Batch Size</Label>
                <Input
                  id="job-batch"
                  type="number"
                  min="1"
                  max="32"
                  value={jobForm.batchSize}
                  onChange={(e) => setJobForm(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-lr">Learning Rate</Label>
                <Input
                  id="job-lr"
                  type="number"
                  step="0.00001"
                  value={jobForm.learningRate}
                  onChange={(e) => setJobForm(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewJobDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={startFineTuning}
              disabled={!jobForm.modelId || !jobForm.datasetId}
            >
              <Play weight="fill" size={18} className="mr-2" />
              Start Training
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
