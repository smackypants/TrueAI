import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Code, Play, FlaskConical, Package, FileCode, Eye, Download, Trash, Sparkle, CheckCircle, XCircle, Clock, Cube, Lightning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { analytics } from '@/lib/analytics'
import { FRAMEWORK_CONFIGS, getFrameworkConfig, getFrameworkPromptInstructions } from '@/lib/framework-configs'
import type { AppProject, AppFile, TestResult, BuildStep, AppTemplate, Framework } from '@/lib/app-builder-types'

const APP_TEMPLATES: AppTemplate[] = [
  {
    id: 'todo',
    name: 'Todo List',
    description: 'Simple task manager with persistence',
    category: 'productivity',
    preview: '✓',
    basePrompt: 'Create a todo list app with add, complete, and delete functionality',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Basic calculator with scientific functions',
    category: 'utility',
    preview: '🔢',
    basePrompt: 'Create a calculator app with basic arithmetic and scientific functions',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'timer',
    name: 'Timer/Stopwatch',
    description: 'Timer and stopwatch with lap tracking',
    category: 'utility',
    preview: '⏱️',
    basePrompt: 'Create a timer and stopwatch app with lap tracking and countdown functionality',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'notes',
    name: 'Notes App',
    description: 'Rich text note taking with markdown',
    category: 'productivity',
    preview: '📝',
    basePrompt: 'Create a notes app with markdown support and categorization',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'snake',
    name: 'Snake Game',
    description: 'Classic snake game',
    category: 'game',
    preview: '🐍',
    basePrompt: 'Create a snake game with score tracking and increasing difficulty',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'weather',
    name: 'Weather Dashboard',
    description: 'Weather information display',
    category: 'utility',
    preview: '🌤️',
    basePrompt: 'Create a weather dashboard showing temperature, conditions, and forecast',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  }
]

interface AppBuilderProps {
  models: { id: string; name: string }[]
}

export function AppBuilder({ models }: AppBuilderProps) {
  const [projects, setProjects] = useKV<AppProject[]>('app-builder-projects', [])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [newProjectDialog, setNewProjectDialog] = useState(false)
  const [frameworkInfoDialog, setFrameworkInfoDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    prompt: '',
    template: '',
    framework: 'react' as Framework
  })

  const activeProject = projects.find(p => p.id === activeProjectId)
  const activeFile = activeProject?.files.find(f => f.path === selectedFile)

  const createProject = async () => {
    if (!newProjectForm.prompt && !newProjectForm.template) {
      toast.error('Please provide a prompt or select a template')
      return
    }

    const template = APP_TEMPLATES.find(t => t.id === newProjectForm.template)
    const finalPrompt = newProjectForm.prompt || template?.basePrompt || ''
    const framework = newProjectForm.framework

    const newProject: AppProject = {
      id: `app-${Date.now()}`,
      name: newProjectForm.name || 'Untitled App',
      description: newProjectForm.description,
      prompt: finalPrompt,
      framework,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'creating',
      files: []
    }

    setProjects(prev => [newProject, ...(prev || [])])
    setActiveProjectId(newProject.id)
    setNewProjectDialog(false)
    setNewProjectForm({ name: '', description: '', prompt: '', template: '', framework: 'react' })

    analytics.track('app_project_created', 'builder', 'create_project', {
      label: newProject.name,
      metadata: { framework, hasTemplate: !!template, promptLength: finalPrompt.length }
    })

    await generateAppCode(newProject.id, finalPrompt, framework)
  }

  const generateAppCode = async (projectId: string, prompt: string, framework: Framework) => {
    try {
      toast.info(`Generating ${framework} app structure...`)
      
      const frameworkConfig = getFrameworkConfig(framework)
      const frameworkInstructions = getFrameworkPromptInstructions(framework)
      
      if (!frameworkConfig) {
        throw new Error('Invalid framework')
      }

      let codeGenPrompt = ''

      if (framework === 'vanilla') {
        codeGenPrompt = spark.llmPrompt`You are an expert web developer. Create a complete, working single-page web application based on this description:

"${prompt}"

${frameworkInstructions}

Generate ONLY the code files needed, with the following structure:
1. index.html - Complete HTML structure with inline styles and script
2. app.js - All JavaScript logic
3. styles.css - All styling

Requirements:
- Make it fully functional and production-ready
- Use modern ES6+ JavaScript
- Include responsive design
- Add error handling
- Make it visually appealing with good UX
- Keep all code in these 3 files
- No external dependencies or CDN links

Return ONLY valid JSON in this exact format:
{
  "files": [
    {"path": "index.html", "content": "...", "language": "html"},
    {"path": "app.js", "content": "...", "language": "javascript"},
    {"path": "styles.css", "content": "...", "language": "css"}
  ]
}`
      } else if (framework === 'react') {
        codeGenPrompt = spark.llmPrompt`You are an expert React developer. Create a complete, working React application based on this description:

"${prompt}"

${frameworkInstructions}

Generate the following files:
1. index.html - HTML entry point with root div
2. main.tsx - React root rendering setup
3. App.tsx - Main App component
4. styles.css - Global styles
5. Additional component files as needed

Requirements:
- Use React 19 with TypeScript
- Use functional components with hooks
- Include proper TypeScript types and interfaces
- Make it responsive and accessible
- Include error boundaries
- Use modern React patterns (hooks, context if needed)
- Create reusable components
- No external UI libraries (build components from scratch)

Return ONLY valid JSON in this exact format:
{
  "files": [
    {"path": "index.html", "content": "...", "language": "html"},
    {"path": "main.tsx", "content": "...", "language": "tsx"},
    {"path": "App.tsx", "content": "...", "language": "tsx"},
    {"path": "styles.css", "content": "...", "language": "css"}
  ]
}`
      } else if (framework === 'vue') {
        codeGenPrompt = spark.llmPrompt`You are an expert Vue developer. Create a complete, working Vue 3 application based on this description:

"${prompt}"

${frameworkInstructions}

Generate the following files:
1. index.html - HTML entry point with app div
2. main.ts - Vue app initialization
3. App.vue - Main App component
4. styles.css - Global styles
5. Additional component files as needed

Requirements:
- Use Vue 3 with Composition API and TypeScript
- Use <script setup lang="ts"> syntax
- Include proper TypeScript types and interfaces
- Make it responsive and accessible
- Use reactive refs and computed properties
- Create reusable components with props
- Use scoped styles in components
- No external UI libraries (build components from scratch)

Return ONLY valid JSON in this exact format:
{
  "files": [
    {"path": "index.html", "content": "...", "language": "html"},
    {"path": "main.ts", "content": "...", "language": "typescript"},
    {"path": "App.vue", "content": "...", "language": "vue"},
    {"path": "styles.css", "content": "...", "language": "css"}
  ]
}`
      } else if (framework === 'svelte') {
        codeGenPrompt = spark.llmPrompt`You are an expert Svelte developer. Create a complete, working Svelte application based on this description:

"${prompt}"

${frameworkInstructions}

Generate the following files:
1. index.html - HTML entry point with target div
2. main.ts - Svelte app initialization
3. App.svelte - Main App component
4. app.css - Global styles
5. Additional component files as needed

Requirements:
- Use Svelte with TypeScript
- Use <script lang="ts"> syntax
- Include proper TypeScript types and interfaces
- Make it responsive and accessible
- Use reactive statements with $:
- Create reusable components with props
- Use scoped styles by default
- No external UI libraries (build components from scratch)

Return ONLY valid JSON in this exact format:
{
  "files": [
    {"path": "index.html", "content": "...", "language": "html"},
    {"path": "main.ts", "content": "...", "language": "typescript"},
    {"path": "App.svelte", "content": "...", "language": "svelte"},
    {"path": "app.css", "content": "...", "language": "css"}
  ]
}`
      }

      const response = await spark.llm(codeGenPrompt, 'gpt-4o', true)
      const result = JSON.parse(response)

      if (!result.files || !Array.isArray(result.files)) {
        throw new Error('Invalid response format')
      }

      const files: AppFile[] = result.files.map((f: any) => ({
        path: f.path,
        content: f.content,
        language: f.language,
        size: f.content.length
      }))

      setProjects(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                files, 
                status: 'ready',
                updatedAt: Date.now()
              } 
            : p
        )
      )

      if (files.length > 0) {
        setSelectedFile(files[0].path)
      }

      toast.success(`${framework} app generated successfully!`)
      
      analytics.track('app_code_generated', 'builder', 'generate_code', {
        metadata: { projectId, framework, filesCount: files.length, totalSize: files.reduce((sum, f) => sum + f.size, 0) }
      })

    } catch (error) {
      console.error('Code generation error:', error)
      
      setProjects(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                status: 'error',
                error: 'Failed to generate code',
                updatedAt: Date.now()
              } 
            : p
        )
      )

      toast.error('Failed to generate app code')
      
      analytics.track('error_occurred', 'builder', 'generate_code_failed', {
        metadata: { projectId, framework, error: String(error) }
      })
    }
  }

  const buildProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const frameworkConfig = getFrameworkConfig(project.framework)
    const buildSteps = frameworkConfig?.buildInstructions || [
      'Validating HTML structure...',
      'Checking JavaScript syntax...',
      'Optimizing CSS...',
      'Bundling assets...',
      'Build completed successfully!'
    ]

    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { ...p, status: 'building', buildLog: ['Starting build process...'] } 
          : p
      )
    )

    analytics.track('app_build_started', 'builder', 'build_project', {
      label: project.name,
      metadata: { projectId, framework: project.framework, filesCount: project.files.length }
    })

    await new Promise(resolve => setTimeout(resolve, 1000))

    for (const step of buildSteps) {
      await new Promise(resolve => setTimeout(resolve, 400))
      setProjects(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { ...p, buildLog: [...(p.buildLog || []), step] } 
            : p
        )
      )
    }

    const htmlFile = project.files.find(f => f.path === 'index.html')
    let previewUrl = ''
    
    if (htmlFile) {
      const blob = new Blob([htmlFile.content], { type: 'text/html' })
      previewUrl = URL.createObjectURL(blob)
    }

    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              status: 'ready',
              previewUrl,
              updatedAt: Date.now()
            } 
          : p
      )
    )

    toast.success('Build completed!')
    
    analytics.track('app_build_completed', 'builder', 'build_complete', {
      label: project.name,
      metadata: { projectId, framework: project.framework }
    })
  }

  const testProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { ...p, status: 'testing' } 
          : p
      )
    )

    analytics.track('app_test_started', 'builder', 'test_project', {
      label: project.name,
      metadata: { projectId }
    })

    await new Promise(resolve => setTimeout(resolve, 1500))

    const tests: TestResult[] = [
      {
        id: 'test-1',
        name: 'HTML validation',
        status: 'pass',
        duration: 120,
        timestamp: Date.now()
      },
      {
        id: 'test-2',
        name: 'JavaScript syntax check',
        status: 'pass',
        duration: 230,
        timestamp: Date.now()
      },
      {
        id: 'test-3',
        name: 'CSS validation',
        status: 'pass',
        duration: 95,
        timestamp: Date.now()
      },
      {
        id: 'test-4',
        name: 'Responsive design check',
        status: Math.random() > 0.2 ? 'pass' : 'fail',
        duration: 180,
        error: Math.random() > 0.8 ? 'Some elements overflow on mobile' : undefined,
        timestamp: Date.now()
      }
    ]

    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              status: 'ready',
              testResults: tests,
              updatedAt: Date.now()
            } 
          : p
      )
    )

    const passed = tests.filter(t => t.status === 'pass').length
    const failed = tests.filter(t => t.status === 'fail').length

    if (failed === 0) {
      toast.success(`All ${passed} tests passed!`)
    } else {
      toast.warning(`${passed} passed, ${failed} failed`)
    }
    
    analytics.track('app_test_completed', 'builder', 'test_complete', {
      label: project.name,
      metadata: { projectId, passed, failed }
    })
  }

  const deleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    setProjects(prev => prev.filter(p => p.id !== projectId))
    
    if (activeProjectId === projectId) {
      setActiveProjectId(null)
      setSelectedFile(null)
    }

    toast.success('Project deleted')
    
    analytics.track('app_project_deleted', 'builder', 'delete_project', {
      metadata: { projectId, projectName: project?.name }
    })
  }

  const downloadProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const htmlFile = project.files.find(f => f.path === 'index.html')
    if (!htmlFile) {
      toast.error('No HTML file found')
      return
    }

    const blob = new Blob([htmlFile.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.html`
    link.click()
    URL.revokeObjectURL(url)

    toast.success('App downloaded')
    
    analytics.track('app_project_downloaded', 'builder', 'download_project', {
      label: project.name,
      metadata: { projectId }
    })
  }

  const regenerateCode = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { ...p, status: 'creating', files: [] } 
          : p
      )
    )

    toast.info('Regenerating app...')
    await generateAppCode(projectId, project.prompt, project.framework)
  }

  const getStatusColor = (status: AppProject['status']) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400'
      case 'creating': return 'bg-blue-500/20 text-blue-400'
      case 'building': return 'bg-yellow-500/20 text-yellow-400'
      case 'testing': return 'bg-purple-500/20 text-purple-400'
      case 'error': return 'bg-red-500/20 text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusIcon = (status: AppProject['status']) => {
    switch (status) {
      case 'ready': return <CheckCircle weight="fill" size={16} />
      case 'creating': return <Sparkle weight="fill" size={16} />
      case 'building': return <Package weight="fill" size={16} />
      case 'testing': return <FlaskConical weight="fill" size={16} />
      case 'error': return <XCircle weight="fill" size={16} />
      default: return <Clock weight="fill" size={16} />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">App Builder</h2>
          <p className="text-sm text-muted-foreground">Create complete web apps from natural language</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFrameworkInfoDialog(true)} size="sm">
            <Lightning weight="bold" size={20} className="mr-2" />
            Frameworks
          </Button>
          <Button onClick={() => setNewProjectDialog(true)} size="sm">
            <Code weight="bold" size={20} className="mr-2" />
            New App
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 p-4">
          <h3 className="font-semibold mb-3 text-sm">Projects</h3>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {projects.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Code size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No projects yet</p>
                  <p className="text-xs mt-1">Create your first app</p>
                </div>
              )}
              {projects.map(project => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    variant={activeProjectId === project.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => {
                      setActiveProjectId(project.id)
                      if (project.files.length > 0) {
                        setSelectedFile(project.files[0].path)
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="truncate font-medium text-sm">{project.name}</p>
                        <span className="text-xs opacity-70">{getFrameworkConfig(project.framework)?.icon}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(project.status)}
                            {project.status}
                          </span>
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {project.framework}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-3 p-6 flex flex-col h-[600px]">
          {activeProject ? (
            <>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{activeProject.name}</h3>
                    <Badge variant="outline" className="capitalize">
                      {getFrameworkConfig(activeProject.framework)?.icon} {activeProject.framework}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activeProject.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeProject.status === 'ready' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => buildProject(activeProject.id)}
                      >
                        <Package size={16} className="mr-1" />
                        Build
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProject(activeProject.id)}
                      >
                        <FlaskConical size={16} className="mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadProject(activeProject.id)}
                      >
                        <Download size={16} className="mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                  {activeProject.status === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateCode(activeProject.id)}
                    >
                      <Sparkle size={16} className="mr-1" />
                      Regenerate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProject(activeProject.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
              <Separator className="mb-4" />

              <Tabs defaultValue="code" className="flex-1 flex flex-col">
                <TabsList className="mb-4">
                  <TabsTrigger value="code" className="gap-2">
                    <FileCode size={18} />
                    Code
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2" disabled={!activeProject.previewUrl}>
                    <Eye size={18} />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="gap-2" disabled={!activeProject.testResults}>
                    <FlaskConical size={18} />
                    Tests
                  </TabsTrigger>
                  <TabsTrigger value="build" className="gap-2" disabled={!activeProject.buildLog}>
                    <Package size={18} />
                    Build Log
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="code" className="flex-1 flex flex-col gap-3 mt-0">
                  {activeProject.status === 'creating' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Sparkle size={48} className="mx-auto mb-4 text-accent animate-pulse" />
                        <p className="text-lg font-medium">Generating your app...</p>
                        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
                      </div>
                    </div>
                  )}
                  
                  {activeProject.status === 'error' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <XCircle size={48} className="mx-auto mb-4 text-destructive" />
                        <p className="text-lg font-medium">Generation failed</p>
                        <p className="text-sm text-muted-foreground mt-2">{activeProject.error}</p>
                        <Button
                          className="mt-4"
                          onClick={() => regenerateCode(activeProject.id)}
                        >
                          <Sparkle size={16} className="mr-2" />
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeProject.files.length > 0 && (
                    <>
                      <div className="flex gap-2 border-b border-border pb-2">
                        {activeProject.files.map(file => (
                          <Button
                            key={file.path}
                            variant={selectedFile === file.path ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setSelectedFile(file.path)}
                          >
                            <FileCode size={16} className="mr-1" />
                            {file.path}
                          </Button>
                        ))}
                      </div>
                      
                      {activeFile && (
                        <ScrollArea className="flex-1 border border-border rounded-lg p-4 bg-muted/30">
                          <pre className="text-xs font-mono">
                            <code>{activeFile.content}</code>
                          </pre>
                        </ScrollArea>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="flex-1 mt-0">
                  {activeProject.previewUrl && (
                    <iframe
                      src={activeProject.previewUrl}
                      className="w-full h-full border border-border rounded-lg"
                      title={`Preview of ${activeProject.name}`}
                    />
                  )}
                </TabsContent>

                <TabsContent value="tests" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {activeProject.testResults?.map(test => (
                        <Card key={test.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {test.status === 'pass' ? (
                                <CheckCircle weight="fill" size={24} className="text-green-400 mt-0.5" />
                              ) : test.status === 'fail' ? (
                                <XCircle weight="fill" size={24} className="text-red-400 mt-0.5" />
                              ) : (
                                <Clock weight="fill" size={24} className="text-yellow-400 mt-0.5" />
                              )}
                              <div>
                                <p className="font-medium">{test.name}</p>
                                {test.error && (
                                  <p className="text-sm text-destructive mt-1">{test.error}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {test.duration}ms
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="build" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {activeProject.buildLog?.map((log, index) => (
                        <div key={index} className="text-sm font-mono text-muted-foreground">
                          <span className="text-accent mr-2">{'>'}</span>
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Code size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium">No project selected</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a new app or select an existing project
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setNewProjectDialog(true)}
                >
                  <Code size={16} className="mr-2" />
                  Create New App
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={newProjectDialog} onOpenChange={setNewProjectDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New App</DialogTitle>
            <DialogDescription>
              Describe your app or choose a template, and AI will generate the complete code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">App Name</Label>
              <Input
                id="app-name"
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Awesome App"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-description">Description (optional)</Label>
              <Input
                id="app-description"
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your app"
              />
            </div>

            <div className="space-y-2">
              <Label>Framework</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose the framework for your app. Each has unique strengths and development patterns.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FRAMEWORK_CONFIGS.map(framework => {
                  const isSelected = newProjectForm.framework === framework.id
                  return (
                    <Button
                      key={framework.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-auto py-4 flex flex-col items-start gap-1.5 relative overflow-hidden"
                      onClick={() => setNewProjectForm(prev => ({ ...prev, framework: framework.id }))}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="framework-selection"
                          className="absolute inset-0 bg-primary"
                          initial={false}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <div className={`relative z-10 w-full ${isSelected ? 'text-primary-foreground' : ''}`}>
                        <div className="flex items-center gap-2 w-full mb-1">
                          <span className="text-xl">{framework.icon}</span>
                          <span className="font-semibold">{framework.name}</span>
                        </div>
                        <p className="text-xs text-left opacity-80 leading-snug">{framework.description}</p>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-template">Quick Start Template (optional)</Label>
              <Select
                value={newProjectForm.template}
                onValueChange={(value) => setNewProjectForm(prev => ({ ...prev, template: value }))}
              >
                <SelectTrigger id="app-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {APP_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        <span>{template.preview}</span>
                        <span>{template.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-prompt">Custom Prompt</Label>
              <Textarea
                id="app-prompt"
                value={newProjectForm.prompt}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Describe what you want your app to do in detail..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about features, design, and functionality. The more detail, the better the result.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createProject}
              disabled={!newProjectForm.prompt && !newProjectForm.template}
            >
              <Sparkle size={16} className="mr-2" />
              Generate App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={frameworkInfoDialog} onOpenChange={setFrameworkInfoDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Framework Comparison</DialogTitle>
            <DialogDescription>
              Compare different frameworks to choose the best one for your project
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {FRAMEWORK_CONFIGS.map(framework => (
              <Card key={framework.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{framework.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold">{framework.name}</h3>
                    <p className="text-sm text-muted-foreground">{framework.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase">Key Features</h4>
                    <div className="space-y-1.5">
                      {framework.features.slice(0, 4).map((feature, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <CheckCircle weight="fill" size={14} className="text-accent mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setNewProjectForm(prev => ({ ...prev, framework: framework.id }))
                      setFrameworkInfoDialog(false)
                      setNewProjectDialog(true)
                    }}
                  >
                    <Code size={16} className="mr-2" />
                    Create {framework.name} App
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}