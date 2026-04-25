import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Code, Plus, Trash, Download, Eye, Wrench } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { HarnessManifest, HarnessTool, HarnessParameter } from '@/lib/types'

interface HarnessCreatorProps {
  harnesses: HarnessManifest[]
  onCreateHarness: (harness: HarnessManifest) => void
  onDeleteHarness: (id: string) => void
  onExportHarness: (id: string) => void
}

export function HarnessCreator({
  harnesses,
  onCreateHarness,
  onDeleteHarness,
  onExportHarness
}: HarnessCreatorProps) {
  const [newHarnessDialog, setNewHarnessDialog] = useState(false)
  const [addToolDialog, setAddToolDialog] = useState(false)
  const [addParameterDialog, setAddParameterDialog] = useState(false)
  const [previewDialog, setPreviewDialog] = useState(false)
  const [selectedHarnessId, setSelectedHarnessId] = useState<string | null>(null)
  const [selectedToolIndex, setSelectedToolIndex] = useState<number | null>(null)

  const [harnessForm, setHarnessForm] = useState({
    name: '',
    version: '1.0.0',
    description: '',
    author: '',
    repository: '',
    license: 'MIT',
    tools: [] as HarnessTool[]
  })

  const [toolForm, setToolForm] = useState({
    name: '',
    description: '',
    returns: 'string',
    parameters: [] as HarnessParameter[]
  })

  const [parameterForm, setParameterForm] = useState({
    name: '',
    type: 'string' as HarnessParameter['type'],
    description: '',
    required: true,
    default: ''
  })

  const selectedHarness = harnesses.find(h => h.id === selectedHarnessId)

  const createHarness = () => {
    const newHarness: HarnessManifest = {
      id: `harness-${Date.now()}`,
      name: harnessForm.name,
      version: harnessForm.version,
      description: harnessForm.description,
      author: harnessForm.author,
      tools: harnessForm.tools,
      repository: harnessForm.repository || undefined,
      license: harnessForm.license
    }

    onCreateHarness(newHarness)
    setNewHarnessDialog(false)
    setHarnessForm({
      name: '',
      version: '1.0.0',
      description: '',
      author: '',
      repository: '',
      license: 'MIT',
      tools: []
    })
    toast.success('Harness created')
  }

  const addTool = () => {
    const newTool: HarnessTool = {
      name: toolForm.name,
      description: toolForm.description,
      parameters: toolForm.parameters,
      returns: toolForm.returns
    }

    setHarnessForm(prev => ({
      ...prev,
      tools: [...prev.tools, newTool]
    }))

    setAddToolDialog(false)
    setToolForm({
      name: '',
      description: '',
      returns: 'string',
      parameters: []
    })
    toast.success('Tool added')
  }

  const addParameter = () => {
    const newParam: HarnessParameter = {
      name: parameterForm.name,
      type: parameterForm.type,
      description: parameterForm.description,
      required: parameterForm.required,
      default: parameterForm.default || undefined
    }

    setToolForm(prev => ({
      ...prev,
      parameters: [...prev.parameters, newParam]
    }))

    setAddParameterDialog(false)
    setParameterForm({
      name: '',
      type: 'string',
      description: '',
      required: true,
      default: ''
    })
    toast.success('Parameter added')
  }

  const removeTool = (index: number) => {
    setHarnessForm(prev => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index)
    }))
    toast.success('Tool removed')
  }

  const removeParameter = (index: number) => {
    setToolForm(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }))
    toast.success('Parameter removed')
  }

  const generateManifestJSON = (harness: HarnessManifest) => {
    return JSON.stringify(harness, null, 2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Wrench weight="fill" size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Harness Development</h2>
            <p className="text-sm text-muted-foreground">Create custom tool harnesses for agents</p>
          </div>
        </div>
        <Button onClick={() => setNewHarnessDialog(true)}>
          <Plus weight="bold" size={18} className="mr-2" />
          New Harness
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Your Harnesses</h3>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {harnesses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No harnesses created yet
                  </p>
                )}
                {harnesses.map(harness => (
                  <Card
                    key={harness.id}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      selectedHarnessId === harness.id ? 'ring-2 ring-accent' : ''
                    }`}
                    onClick={() => setSelectedHarnessId(harness.id)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{harness.name}</h4>
                          <p className="text-xs text-muted-foreground">v{harness.version}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteHarness(harness.id)
                            if (selectedHarnessId === harness.id) {
                              setSelectedHarnessId(null)
                            }
                            toast.success('Harness deleted')
                          }}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {harness.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {harness.tools.length} tools
                        </Badge>
                        {harness.author && (
                          <Badge variant="outline" className="text-xs">
                            {harness.author}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedHarness ? (
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{selectedHarness.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedHarness.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewDialog(true)}
                    >
                      <Eye size={18} className="mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExportHarness(selectedHarness.id)}
                    >
                      <Download size={18} className="mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <p className="font-mono">{selectedHarness.version}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">License:</span>
                    <p>{selectedHarness.license}</p>
                  </div>
                  {selectedHarness.author && (
                    <div>
                      <span className="text-muted-foreground">Author:</span>
                      <p>{selectedHarness.author}</p>
                    </div>
                  )}
                  {selectedHarness.repository && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Repository:</span>
                      <p className="text-xs font-mono break-all">{selectedHarness.repository}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Tools ({selectedHarness.tools.length})</h4>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {selectedHarness.tools.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No tools defined
                        </p>
                      )}
                      {selectedHarness.tools.map((tool, index) => (
                        <Card key={index} className="p-4 bg-muted/30">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Code weight="bold" size={18} className="text-accent" />
                              <h5 className="font-semibold">{tool.name}</h5>
                              <Badge variant="outline" className="ml-auto font-mono text-xs">
                                → {tool.returns}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                            
                            {tool.parameters.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <Label className="text-xs text-muted-foreground">Parameters</Label>
                                  <div className="mt-2 space-y-1">
                                    {tool.parameters.map((param, pIndex) => (
                                      <div
                                        key={pIndex}
                                        className="flex items-center justify-between text-xs p-2 bg-background rounded"
                                      >
                                        <div className="flex items-center gap-2">
                                          <code className="font-mono text-accent">{param.name}</code>
                                          <Badge variant="secondary" className="text-xs h-5">
                                            {param.type}
                                          </Badge>
                                          {param.required && (
                                            <Badge variant="destructive" className="text-xs h-5">
                                              required
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="text-muted-foreground">
                                          {param.description}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 flex flex-col items-center justify-center h-[700px]">
              <Wrench size={64} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Harness Selected</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Select a harness from the left or create a new one to start developing custom agent tools
              </p>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={newHarnessDialog} onOpenChange={setNewHarnessDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Harness</DialogTitle>
            <DialogDescription>
              Define a new tool harness with custom functionality for agents
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="tools">Tools ({harnessForm.tools.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="harness-name">Name *</Label>
                  <Input
                    id="harness-name"
                    value={harnessForm.name}
                    onChange={(e) => setHarnessForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="my-custom-harness"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="harness-version">Version</Label>
                  <Input
                    id="harness-version"
                    value={harnessForm.version}
                    onChange={(e) => setHarnessForm(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="harness-desc">Description</Label>
                <Textarea
                  id="harness-desc"
                  value={harnessForm.description}
                  onChange={(e) => setHarnessForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A harness for custom tool functionality..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="harness-author">Author</Label>
                  <Input
                    id="harness-author"
                    value={harnessForm.author}
                    onChange={(e) => setHarnessForm(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Your Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="harness-license">License</Label>
                  <Select
                    value={harnessForm.license}
                    onValueChange={(value) => setHarnessForm(prev => ({ ...prev, license: value }))}
                  >
                    <SelectTrigger id="harness-license">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MIT">MIT</SelectItem>
                      <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
                      <SelectItem value="GPL-3.0">GPL 3.0</SelectItem>
                      <SelectItem value="BSD-3-Clause">BSD 3-Clause</SelectItem>
                      <SelectItem value="ISC">ISC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="harness-repo">Repository (optional)</Label>
                <Input
                  id="harness-repo"
                  value={harnessForm.repository}
                  onChange={(e) => setHarnessForm(prev => ({ ...prev, repository: e.target.value }))}
                  placeholder="https://github.com/username/repo"
                />
              </div>
            </TabsContent>

            <TabsContent value="tools" className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <Label>Defined Tools</Label>
                <Button
                  size="sm"
                  onClick={() => setAddToolDialog(true)}
                >
                  <Plus weight="bold" size={16} className="mr-2" />
                  Add Tool
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {harnessForm.tools.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No tools added yet
                    </p>
                  )}
                  {harnessForm.tools.map((tool, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="font-mono font-semibold">{tool.name}</code>
                            <Badge variant="outline" className="text-xs">
                              {tool.parameters.length} params
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTool(index)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewHarnessDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createHarness} disabled={!harnessForm.name || harnessForm.tools.length === 0}>
              Create Harness
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addToolDialog} onOpenChange={setAddToolDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tool</DialogTitle>
            <DialogDescription>
              Define a new tool function for this harness
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">Function Name *</Label>
              <Input
                id="tool-name"
                value={toolForm.name}
                onChange={(e) => setToolForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="fetch_data"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-desc">Description *</Label>
              <Textarea
                id="tool-desc"
                value={toolForm.description}
                onChange={(e) => setToolForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Fetches data from an external API..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-returns">Return Type</Label>
              <Input
                id="tool-returns"
                value={toolForm.returns}
                onChange={(e) => setToolForm(prev => ({ ...prev, returns: e.target.value }))}
                placeholder="string"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Parameters ({toolForm.parameters.length})</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddParameterDialog(true)}
                >
                  <Plus weight="bold" size={16} className="mr-2" />
                  Add
                </Button>
              </div>

              <div className="space-y-1 max-h-[150px] overflow-auto">
                {toolForm.parameters.map((param, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <code className="font-mono">{param.name}</code>
                      <Badge variant="secondary" className="text-xs h-5">
                        {param.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParameter(index)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToolDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={addTool}
              disabled={!toolForm.name || !toolForm.description}
            >
              Add Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addParameterDialog} onOpenChange={setAddParameterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Parameter</DialogTitle>
            <DialogDescription>
              Define a parameter for this tool function
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="param-name">Name *</Label>
                <Input
                  id="param-name"
                  value={parameterForm.name}
                  onChange={(e) => setParameterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="param-type">Type</Label>
                <Select
                  value={parameterForm.type}
                  onValueChange={(value: HarnessParameter['type']) =>
                    setParameterForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger id="param-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">string</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                    <SelectItem value="object">object</SelectItem>
                    <SelectItem value="array">array</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="param-desc">Description *</Label>
              <Textarea
                id="param-desc"
                value={parameterForm.description}
                onChange={(e) => setParameterForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="The URL to fetch data from"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="param-default">Default Value (optional)</Label>
              <Input
                id="param-default"
                value={parameterForm.default}
                onChange={(e) => setParameterForm(prev => ({ ...prev, default: e.target.value }))}
                placeholder="https://api.example.com"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="param-required"
                checked={parameterForm.required}
                onChange={(e) => setParameterForm(prev => ({ ...prev, required: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="param-required">Required parameter</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParameterDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={addParameter}
              disabled={!parameterForm.name || !parameterForm.description}
            >
              Add Parameter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Harness Manifest Preview</DialogTitle>
            <DialogDescription>
              JSON representation of your harness
            </DialogDescription>
          </DialogHeader>
          
          {selectedHarness && (
            <ScrollArea className="h-[500px] w-full rounded border">
              <pre className="p-4 text-xs font-mono">
                {generateManifestJSON(selectedHarness)}
              </pre>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
