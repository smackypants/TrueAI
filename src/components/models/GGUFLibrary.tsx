import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  FilePlus, 
  MagnifyingGlass, 
  Trash, 
  Info, 
  Download,
  File,
  HardDrives,
  ChartBar,
  Calendar,
  Tag
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/ui/empty-state'
import { emptyStateModels } from '@/assets'
import type { GGUFModel } from '@/lib/types'

interface GGUFLibraryProps {
  models: GGUFModel[]
  onAddModel: (model: Omit<GGUFModel, 'id' | 'downloadedAt'>) => void
  onDeleteModel: (id: string) => void
}

export function GGUFLibrary({ models, onAddModel, onDeleteModel }: GGUFLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState<GGUFModel | null>(null)
  const [addModelDialog, setAddModelDialog] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date')
  
  const [newModelForm, setNewModelForm] = useState({
    name: '',
    filename: '',
    path: '',
    size: '',
    quantization: 'Q4_K_M',
    architecture: '',
    contextLength: '4096',
    parameterCount: '',
  })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filterModels = () => {
    let filtered = models.filter(model => 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.quantization.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'size') return b.size - a.size
      if (sortBy === 'date') return b.downloadedAt - a.downloadedAt
      return 0
    })

    return filtered
  }

  const handleAddModel = () => {
    const sizeInBytes = parseFloat(newModelForm.size) * 1024 * 1024 * 1024
    
    const model: Omit<GGUFModel, 'id' | 'downloadedAt'> = {
      name: newModelForm.name,
      filename: newModelForm.filename,
      path: newModelForm.path || `/models/${newModelForm.filename}`,
      size: sizeInBytes,
      quantization: newModelForm.quantization,
      architecture: newModelForm.architecture || undefined,
      contextLength: parseInt(newModelForm.contextLength) || undefined,
      parameterCount: newModelForm.parameterCount ? parseFloat(newModelForm.parameterCount) * 1000000000 : undefined,
      metadata: {
        format: 'GGUF',
        maxSequenceLength: parseInt(newModelForm.contextLength) || undefined,
      }
    }

    onAddModel(model)
    setAddModelDialog(false)
    setNewModelForm({
      name: '',
      filename: '',
      path: '',
      size: '',
      quantization: 'Q4_K_M',
      architecture: '',
      contextLength: '4096',
      parameterCount: '',
    })
    toast.success('Model added to library')
  }

  const handleDeleteModel = (id: string) => {
    onDeleteModel(id)
    setSelectedModel(null)
    toast.success('Model removed from library')
  }

  const filteredModels = filterModels()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GGUF Model Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your downloaded GGUF model files
          </p>
        </div>
        <Button onClick={() => setAddModelDialog(true)} className="gap-2">
          <FilePlus weight="bold" size={20} />
          Add Model
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search models by name, file, or quantization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Recently Added</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {filteredModels.length === 0 && (
            <Card className="p-12">
              <EmptyState
                illustration={emptyStateModels}
                title="No Models Found"
                description={searchQuery ? 'Try a different search term' : 'Add your first GGUF model to get started'}
                size="lg"
                action={
                  !searchQuery ? (
                    <Button onClick={() => setAddModelDialog(true)} className="gap-2 mt-4">
                      <FilePlus weight="bold" size={20} />
                      Add Model
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          )}

          <div className="grid gap-4">
            {filteredModels.map(model => (
              <Card 
                key={model.id} 
                className={`p-5 cursor-pointer transition-all hover:shadow-md ${selectedModel?.id === model.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedModel(model)}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <File weight="duotone" size={28} className="text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{model.name}</h3>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {model.filename}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {model.quantization}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <HardDrives size={16} />
                        <span>{formatBytes(model.size)}</span>
                      </div>
                      {model.architecture && (
                        <div className="flex items-center gap-1.5">
                          <ChartBar size={16} />
                          <span>{model.architecture}</span>
                        </div>
                      )}
                      {model.contextLength && (
                        <div className="flex items-center gap-1.5">
                          <Tag size={16} />
                          <span>{model.contextLength.toLocaleString()} ctx</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar size={16} />
                        <span>{formatDate(model.downloadedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            {selectedModel ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg">Model Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteModel(selectedModel.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash weight="bold" size={18} />
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Name</Label>
                    <p className="font-medium mt-1">{selectedModel.name}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">Filename</Label>
                    <p className="font-mono text-sm mt-1 break-all">{selectedModel.filename}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">Path</Label>
                    <p className="font-mono text-sm mt-1 break-all text-muted-foreground">{selectedModel.path}</p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground text-xs">Size</Label>
                    <p className="font-medium mt-1">{formatBytes(selectedModel.size)}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">Quantization</Label>
                    <p className="font-medium mt-1">{selectedModel.quantization}</p>
                  </div>

                  {selectedModel.architecture && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Architecture</Label>
                      <p className="font-medium mt-1">{selectedModel.architecture}</p>
                    </div>
                  )}

                  {selectedModel.contextLength && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Context Length</Label>
                      <p className="font-medium mt-1">{selectedModel.contextLength.toLocaleString()} tokens</p>
                    </div>
                  )}

                  {selectedModel.parameterCount && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Parameters</Label>
                      <p className="font-medium mt-1">
                        {(selectedModel.parameterCount / 1000000000).toFixed(1)}B
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-muted-foreground text-xs">Downloaded</Label>
                    <p className="font-medium mt-1">{formatDate(selectedModel.downloadedAt)}</p>
                  </div>

                  {selectedModel.lastUsed && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Last Used</Label>
                      <p className="font-medium mt-1">{formatDate(selectedModel.lastUsed)}</p>
                    </div>
                  )}

                  {selectedModel.metadata.tensorCount && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground text-xs">Technical Details</Label>
                        <div className="mt-2 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tensors:</span>
                            <span className="font-mono">{selectedModel.metadata.tensorCount}</span>
                          </div>
                          {selectedModel.metadata.layerCount && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Layers:</span>
                              <span className="font-mono">{selectedModel.metadata.layerCount}</span>
                            </div>
                          )}
                          {selectedModel.metadata.headCount && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Heads:</span>
                              <span className="font-mono">{selectedModel.metadata.headCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <EmptyState
                  illustration={emptyStateModels}
                  title="No Model Selected"
                  description="Select a model to view details"
                  size="sm"
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={addModelDialog} onOpenChange={setAddModelDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add GGUF Model</DialogTitle>
            <DialogDescription>
              Register a GGUF model file that's already downloaded on your system
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="model-name">Model Name *</Label>
                  <Input
                    id="model-name"
                    value={newModelForm.name}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Llama 3.1 8B Instruct"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="model-filename">Filename *</Label>
                  <Input
                    id="model-filename"
                    value={newModelForm.filename}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, filename: e.target.value }))}
                    placeholder="llama-3.1-8b-instruct-q4_k_m.gguf"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="model-path">File Path</Label>
                  <Input
                    id="model-path"
                    value={newModelForm.path}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, path: e.target.value }))}
                    placeholder="/models/llama-3.1-8b-instruct-q4_k_m.gguf"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to auto-generate from filename
                  </p>
                </div>

                <div>
                  <Label htmlFor="model-size">Size (GB) *</Label>
                  <Input
                    id="model-size"
                    type="number"
                    step="0.1"
                    value={newModelForm.size}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, size: e.target.value }))}
                    placeholder="4.7"
                  />
                </div>

                <div>
                  <Label htmlFor="model-quantization">Quantization *</Label>
                  <Select
                    value={newModelForm.quantization}
                    onValueChange={(value) => setNewModelForm(prev => ({ ...prev, quantization: value }))}
                  >
                    <SelectTrigger id="model-quantization">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q2_K">Q2_K</SelectItem>
                      <SelectItem value="Q3_K_S">Q3_K_S</SelectItem>
                      <SelectItem value="Q3_K_M">Q3_K_M</SelectItem>
                      <SelectItem value="Q3_K_L">Q3_K_L</SelectItem>
                      <SelectItem value="Q4_0">Q4_0</SelectItem>
                      <SelectItem value="Q4_1">Q4_1</SelectItem>
                      <SelectItem value="Q4_K_S">Q4_K_S</SelectItem>
                      <SelectItem value="Q4_K_M">Q4_K_M</SelectItem>
                      <SelectItem value="Q5_0">Q5_0</SelectItem>
                      <SelectItem value="Q5_1">Q5_1</SelectItem>
                      <SelectItem value="Q5_K_S">Q5_K_S</SelectItem>
                      <SelectItem value="Q5_K_M">Q5_K_M</SelectItem>
                      <SelectItem value="Q6_K">Q6_K</SelectItem>
                      <SelectItem value="Q8_0">Q8_0</SelectItem>
                      <SelectItem value="F16">F16</SelectItem>
                      <SelectItem value="F32">F32</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model-architecture">Architecture</Label>
                  <Input
                    id="model-architecture"
                    value={newModelForm.architecture}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, architecture: e.target.value }))}
                    placeholder="llama"
                  />
                </div>

                <div>
                  <Label htmlFor="model-context">Context Length</Label>
                  <Input
                    id="model-context"
                    type="number"
                    value={newModelForm.contextLength}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, contextLength: e.target.value }))}
                    placeholder="4096"
                  />
                </div>

                <div>
                  <Label htmlFor="model-params">Parameters (B)</Label>
                  <Input
                    id="model-params"
                    type="number"
                    step="0.1"
                    value={newModelForm.parameterCount}
                    onChange={(e) => setNewModelForm(prev => ({ ...prev, parameterCount: e.target.value }))}
                    placeholder="8"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    In billions (e.g., 8 for 8B model)
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModelDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddModel}
              disabled={!newModelForm.name || !newModelForm.filename || !newModelForm.size}
            >
              Add Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
