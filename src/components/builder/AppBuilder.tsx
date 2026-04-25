import { useState, useEffect, useRef } from 'react'
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
    category: 'dashboard',
    preview: '🌤️',
    basePrompt: 'Create a weather dashboard showing temperature, conditions, and forecast',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'portfolio',
    name: 'Portfolio Site',
    description: 'Personal portfolio with projects showcase',
    category: 'portfolio',
    preview: '💼',
    basePrompt: 'Create a personal portfolio website with sections for about, projects, skills, and contact information',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'resume',
    name: 'Resume/CV',
    description: 'Professional resume layout',
    category: 'portfolio',
    preview: '📄',
    basePrompt: 'Create a professional resume/CV layout with sections for experience, education, skills, and achievements',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Data visualization and metrics',
    category: 'dashboard',
    preview: '📊',
    basePrompt: 'Create an analytics dashboard with charts, graphs, and key performance indicators for business metrics',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'admin',
    name: 'Admin Panel',
    description: 'Admin dashboard with user management',
    category: 'dashboard',
    preview: '⚙️',
    basePrompt: 'Create an admin dashboard with user management, data tables, and settings panel',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Store',
    description: 'Product listing with shopping cart',
    category: 'ecommerce',
    preview: '🛒',
    basePrompt: 'Create an e-commerce store with product listings, shopping cart, and checkout flow',
    frameworks: ['vanilla', 'react', 'vue', 'svelte']
  },
  {
    id: 'product-catalog',
    name: 'Product Catalog',
    description: 'Filterable product showcase',
    category: 'ecommerce',
    preview: '🏷️',
    basePrompt: 'Create a product catalog with filtering, sorting, search, and detailed product views',
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
  const [templatePreviewDialog, setTemplatePreviewDialog] = useState(false)
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const templateIframeRef = useRef<HTMLIFrameElement>(null)
  
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

      const tempProject: AppProject = {
        id: projectId,
        name: '',
        description: '',
        prompt: '',
        framework,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'ready',
        files
      }
      
      const previewUrl = generatePreviewUrl(tempProject)

      setProjects(prev => 
        prev.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                files, 
                status: 'ready',
                previewUrl,
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

    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              status: 'ready',
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
    
    if (project?.previewUrl) {
      URL.revokeObjectURL(project.previewUrl)
    }
    
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

  const generatePreviewUrl = (project: AppProject): string => {
    const htmlFile = project.files.find(f => f.path === 'index.html')
    const jsFiles = project.files.filter(f => f.language === 'javascript' || f.language === 'typescript' || f.language === 'jsx' || f.language === 'tsx')
    const cssFiles = project.files.filter(f => f.language === 'css')
    
    if (!htmlFile) {
      return ''
    }

    let htmlContent = htmlFile.content
    
    cssFiles.forEach(cssFile => {
      const styleTag = `<style>\n${cssFile.content}\n</style>`
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `${styleTag}\n</head>`)
      } else {
        htmlContent = `<head>${styleTag}</head>${htmlContent}`
      }
    })
    
    jsFiles.forEach(jsFile => {
      const scriptTag = `<script type="module">\n${jsFile.content}\n</script>`
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${scriptTag}\n</body>`)
      } else {
        htmlContent = `${htmlContent}${scriptTag}`
      }
    })
    
    const blob = new Blob([htmlContent], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }

  const updateLivePreview = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project || project.files.length === 0) return

    if (project.previewUrl) {
      URL.revokeObjectURL(project.previewUrl)
    }

    const newPreviewUrl = generatePreviewUrl(project)
    
    setProjects(prev => 
      prev.map(p => 
        p.id === projectId 
          ? { ...p, previewUrl: newPreviewUrl } 
          : p
      )
    )
    
    setPreviewKey(prev => prev + 1)
  }

  useEffect(() => {
    if (activeProject && activeProject.files.length > 0 && !activeProject.previewUrl) {
      updateLivePreview(activeProject.id)
    }
  }, [activeProject?.files.length])

  useEffect(() => {
    return () => {
      projects.forEach(project => {
        if (project.previewUrl) {
          URL.revokeObjectURL(project.previewUrl)
        }
      })
    }
  }, [])

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

  const generateTemplatePreview = (templateId: string): string => {
    const templates: Record<string, string> = {
      portfolio: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>John Doe - Portfolio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #0a0a0a;
      color: white;
    }
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      text-align: center;
      padding: 40px 20px;
    }
    .hero h1 {
      font-size: 64px;
      margin-bottom: 16px;
      font-weight: 700;
    }
    .hero p {
      font-size: 24px;
      opacity: 0.9;
      margin-bottom: 32px;
    }
    .hero button {
      padding: 16px 40px;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .hero button:hover {
      transform: scale(1.05);
    }
    .section {
      max-width: 1200px;
      margin: 0 auto;
      padding: 80px 20px;
    }
    .section h2 {
      font-size: 42px;
      margin-bottom: 48px;
      text-align: center;
    }
    .projects {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
    }
    .project {
      background: #1a1a1a;
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .project:hover {
      transform: translateY(-8px);
    }
    .project-image {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
    }
    .project-content {
      padding: 24px;
    }
    .project h3 {
      font-size: 24px;
      margin-bottom: 12px;
    }
    .project p {
      color: #999;
      line-height: 1.6;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    }
    .skill {
      background: #1a1a1a;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 18px;
      border: 2px solid #333;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div>
      <h1>John Doe</h1>
      <p>Full-Stack Developer & Designer</p>
      <button>View My Work</button>
    </div>
  </div>
  
  <div class="section">
    <h2>Featured Projects</h2>
    <div class="projects">
      <div class="project">
        <div class="project-image">🚀</div>
        <div class="project-content">
          <h3>Project Alpha</h3>
          <p>A modern web application built with React and TypeScript featuring real-time collaboration.</p>
        </div>
      </div>
      <div class="project">
        <div class="project-image">💼</div>
        <div class="project-content">
          <h3>Business Dashboard</h3>
          <p>Analytics platform with interactive charts and data visualization tools.</p>
        </div>
      </div>
      <div class="project">
        <div class="project-image">🎨</div>
        <div class="project-content">
          <h3>Design System</h3>
          <p>Complete UI component library with accessibility and theming support.</p>
        </div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Skills & Technologies</h2>
    <div class="skills">
      <div class="skill">React</div>
      <div class="skill">TypeScript</div>
      <div class="skill">Node.js</div>
      <div class="skill">Python</div>
      <div class="skill">SQL</div>
      <div class="skill">AWS</div>
    </div>
  </div>
</body>
</html>`,
      resume: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - Jane Smith</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', serif;
      background: #f5f5f5;
      padding: 40px 20px;
    }
    .resume {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 48px;
      text-align: center;
    }
    .header h1 {
      font-size: 42px;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 18px;
      opacity: 0.95;
    }
    .contact {
      display: flex;
      gap: 24px;
      justify-content: center;
      margin-top: 16px;
      font-size: 14px;
    }
    .content {
      padding: 48px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 24px;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 8px;
      margin-bottom: 24px;
    }
    .experience-item {
      margin-bottom: 32px;
    }
    .experience-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
    }
    .experience-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    .experience-company {
      font-style: italic;
      color: #666;
    }
    .experience-date {
      color: #999;
      font-size: 14px;
    }
    .experience-description {
      color: #555;
      line-height: 1.6;
      margin-left: 16px;
    }
    .experience-description li {
      margin-bottom: 8px;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .skill-category {
      background: #f9f9f9;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .skill-category h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #333;
    }
    .skill-category ul {
      list-style: none;
      color: #666;
      font-size: 14px;
    }
    .skill-category li {
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="resume">
    <div class="header">
      <h1>Jane Smith</h1>
      <p>Senior Software Engineer</p>
      <div class="contact">
        <span>📧 jane@example.com</span>
        <span>📱 (555) 123-4567</span>
        <span>📍 San Francisco, CA</span>
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Professional Summary</h2>
        <p style="color: #555; line-height: 1.6;">
          Experienced software engineer with 8+ years of expertise in full-stack development, cloud architecture, 
          and team leadership. Proven track record of delivering scalable solutions and mentoring junior developers.
        </p>
      </div>
      
      <div class="section">
        <h2>Experience</h2>
        <div class="experience-item">
          <div class="experience-header">
            <div>
              <div class="experience-title">Senior Software Engineer</div>
              <div class="experience-company">TechCorp Inc.</div>
            </div>
            <div class="experience-date">2020 - Present</div>
          </div>
          <ul class="experience-description">
            <li>Led development of microservices architecture serving 2M+ daily active users</li>
            <li>Mentored team of 5 junior developers and conducted code reviews</li>
            <li>Reduced API response time by 40% through optimization initiatives</li>
          </ul>
        </div>
        
        <div class="experience-item">
          <div class="experience-header">
            <div>
              <div class="experience-title">Software Engineer</div>
              <div class="experience-company">StartupXYZ</div>
            </div>
            <div class="experience-date">2018 - 2020</div>
          </div>
          <ul class="experience-description">
            <li>Built and maintained React-based web applications</li>
            <li>Implemented CI/CD pipelines reducing deployment time by 60%</li>
            <li>Collaborated with design team to create responsive user interfaces</li>
          </ul>
        </div>
      </div>
      
      <div class="section">
        <h2>Education</h2>
        <div class="experience-item">
          <div class="experience-header">
            <div>
              <div class="experience-title">B.S. Computer Science</div>
              <div class="experience-company">University of Technology</div>
            </div>
            <div class="experience-date">2014 - 2018</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Skills</h2>
        <div class="skills-grid">
          <div class="skill-category">
            <h3>Frontend</h3>
            <ul>
              <li>React, Vue.js</li>
              <li>TypeScript</li>
              <li>HTML/CSS</li>
            </ul>
          </div>
          <div class="skill-category">
            <h3>Backend</h3>
            <ul>
              <li>Node.js, Python</li>
              <li>PostgreSQL, MongoDB</li>
              <li>REST & GraphQL</li>
            </ul>
          </div>
          <div class="skill-category">
            <h3>DevOps</h3>
            <ul>
              <li>AWS, Docker</li>
              <li>CI/CD</li>
              <li>Kubernetes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
      analytics: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #0f1419;
      color: white;
      padding: 20px;
    }
    .header {
      margin-bottom: 32px;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .header p {
      color: #8b949e;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: #161b22;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #30363d;
    }
    .metric-label {
      color: #8b949e;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .metric-change {
      font-size: 14px;
      color: #3fb950;
    }
    .metric-change.negative {
      color: #f85149;
    }
    .charts {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }
    .chart-card {
      background: #161b22;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #30363d;
    }
    .chart-card h2 {
      font-size: 18px;
      margin-bottom: 24px;
    }
    .chart {
      height: 300px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 20px 0;
    }
    .bar {
      flex: 1;
      background: linear-gradient(to top, #667eea, #764ba2);
      border-radius: 4px 4px 0 0;
      min-height: 40px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .bar:hover {
      opacity: 1;
    }
    .pie-chart {
      width: 200px;
      height: 200px;
      margin: 0 auto;
      border-radius: 50%;
      background: conic-gradient(
        #667eea 0deg 120deg,
        #764ba2 120deg 240deg,
        #4caf50 240deg 300deg,
        #ff9800 300deg 360deg
      );
    }
    .legend {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .table-card {
      background: #161b22;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #30363d;
    }
    .table-card h2 {
      font-size: 18px;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #30363d;
      color: #8b949e;
      font-size: 14px;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #21262d;
    }
    tr:hover {
      background: #0d1117;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analytics Dashboard</h1>
    <p>Real-time business metrics and insights</p>
  </div>
  
  <div class="metrics">
    <div class="metric-card">
      <div class="metric-label">Total Revenue</div>
      <div class="metric-value">$124.5K</div>
      <div class="metric-change">↑ 12.5% from last month</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Active Users</div>
      <div class="metric-value">8,429</div>
      <div class="metric-change">↑ 8.2% from last month</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Conversion Rate</div>
      <div class="metric-value">3.24%</div>
      <div class="metric-change negative">↓ 0.5% from last month</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg. Session</div>
      <div class="metric-value">4m 32s</div>
      <div class="metric-change">↑ 15s from last month</div>
    </div>
  </div>
  
  <div class="charts">
    <div class="chart-card">
      <h2>Revenue Overview (Last 7 Days)</h2>
      <div class="chart">
        <div class="bar" style="height: 65%"></div>
        <div class="bar" style="height: 80%"></div>
        <div class="bar" style="height: 75%"></div>
        <div class="bar" style="height: 90%"></div>
        <div class="bar" style="height: 85%"></div>
        <div class="bar" style="height: 70%"></div>
        <div class="bar" style="height: 95%"></div>
      </div>
    </div>
    
    <div class="chart-card">
      <h2>Traffic Sources</h2>
      <div class="pie-chart"></div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #667eea"></div>
          <span>Direct (33%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #764ba2"></div>
          <span>Social (33%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #4caf50"></div>
          <span>Search (17%)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff9800"></div>
          <span>Referral (17%)</span>
        </div>
      </div>
    </div>
  </div>
  
  <div class="table-card">
    <h2>Top Pages</h2>
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>Views</th>
          <th>Unique</th>
          <th>Avg. Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>/dashboard</td>
          <td>24,582</td>
          <td>18,429</td>
          <td>3m 42s</td>
        </tr>
        <tr>
          <td>/products</td>
          <td>18,234</td>
          <td>14,223</td>
          <td>2m 18s</td>
        </tr>
        <tr>
          <td>/pricing</td>
          <td>12,456</td>
          <td>10,234</td>
          <td>4m 05s</td>
        </tr>
        <tr>
          <td>/about</td>
          <td>8,923</td>
          <td>7,456</td>
          <td>1m 52s</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`,
      admin: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #f5f7fa;
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 250px;
      background: #1e293b;
      color: white;
      padding: 24px 0;
      position: fixed;
      height: 100vh;
    }
    .logo {
      padding: 0 24px;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 32px;
    }
    .nav-item {
      padding: 12px 24px;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.1);
    }
    .nav-item.active {
      background: #667eea;
      border-right: 4px solid #fff;
    }
    .main {
      margin-left: 250px;
      flex: 1;
      padding: 32px;
    }
    .header {
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 32px;
      color: #1e293b;
    }
    .btn {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 8px;
    }
    .stat-label {
      color: #64748b;
      font-size: 14px;
    }
    .card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card h2 {
      font-size: 20px;
      margin-bottom: 24px;
      color: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #e2e8f0;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      margin-right: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.active {
      background: #d1fae5;
      color: #065f46;
    }
    .badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .icon-btn {
      padding: 8px;
      background: #f1f5f9;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .icon-btn:hover {
      background: #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo">⚙️ Admin</div>
    <div class="nav-item active">📊 Dashboard</div>
    <div class="nav-item">👥 Users</div>
    <div class="nav-item">📦 Products</div>
    <div class="nav-item">💳 Orders</div>
    <div class="nav-item">⚙️ Settings</div>
  </div>
  
  <div class="main">
    <div class="header">
      <h1>Dashboard</h1>
      <button class="btn">+ Add New</button>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">2,543</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">1,829</div>
        <div class="stat-label">Active Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">$45.2K</div>
        <div class="stat-label">Revenue</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">94.5%</div>
        <div class="stat-label">Satisfaction</div>
      </div>
    </div>
    
    <div class="card">
      <h2>Recent Users</h2>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="display: flex; align-items: center;">
                <div class="user-avatar">JD</div>
                <span>John Doe</span>
              </div>
            </td>
            <td>john@example.com</td>
            <td><span class="badge active">Active</span></td>
            <td>Jan 15, 2024</td>
            <td>
              <div class="actions">
                <button class="icon-btn">✏️</button>
                <button class="icon-btn">🗑️</button>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="display: flex; align-items: center;">
                <div class="user-avatar">JS</div>
                <span>Jane Smith</span>
              </div>
            </td>
            <td>jane@example.com</td>
            <td><span class="badge active">Active</span></td>
            <td>Jan 14, 2024</td>
            <td>
              <div class="actions">
                <button class="icon-btn">✏️</button>
                <button class="icon-btn">🗑️</button>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="display: flex; align-items: center;">
                <div class="user-avatar">BJ</div>
                <span>Bob Johnson</span>
              </div>
            </td>
            <td>bob@example.com</td>
            <td><span class="badge inactive">Inactive</span></td>
            <td>Jan 10, 2024</td>
            <td>
              <div class="actions">
                <button class="icon-btn">✏️</button>
                <button class="icon-btn">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`,
      ecommerce: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-commerce Store</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #f9fafb;
    }
    .header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }
    .nav {
      display: flex;
      gap: 32px;
      align-items: center;
    }
    .nav a {
      text-decoration: none;
      color: #4b5563;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav a:hover {
      color: #667eea;
    }
    .cart {
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 80px 40px;
      text-align: center;
    }
    .hero h1 {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .hero p {
      font-size: 20px;
      opacity: 0.9;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px;
    }
    .section-title {
      font-size: 32px;
      margin-bottom: 32px;
      color: #1f2937;
    }
    .products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .product {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .product:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    .product-image {
      width: 100%;
      height: 240px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64px;
    }
    .product-info {
      padding: 20px;
    }
    .product-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .product-description {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .product-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .price {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }
    .btn-add {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-add:hover {
      background: #5568d3;
    }
    .rating {
      color: #fbbf24;
      font-size: 14px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛍️ ShopHub</div>
    <div class="nav">
      <a href="#">Home</a>
      <a href="#">Products</a>
      <a href="#">Categories</a>
      <a href="#">About</a>
      <div class="cart">🛒 Cart (3)</div>
    </div>
  </div>
  
  <div class="hero">
    <h1>Summer Sale</h1>
    <p>Up to 50% off on selected items</p>
  </div>
  
  <div class="container">
    <h2 class="section-title">Featured Products</h2>
    <div class="products">
      <div class="product">
        <div class="product-image">👕</div>
        <div class="product-info">
          <div class="rating">⭐⭐⭐⭐⭐ (128)</div>
          <div class="product-name">Premium T-Shirt</div>
          <div class="product-description">Comfortable cotton blend with modern fit</div>
          <div class="product-footer">
            <div class="price">$29.99</div>
            <button class="btn-add">Add to Cart</button>
          </div>
        </div>
      </div>
      
      <div class="product">
        <div class="product-image">👟</div>
        <div class="product-info">
          <div class="rating">⭐⭐⭐⭐ (94)</div>
          <div class="product-name">Running Shoes</div>
          <div class="product-description">Lightweight and breathable design</div>
          <div class="product-footer">
            <div class="price">$89.99</div>
            <button class="btn-add">Add to Cart</button>
          </div>
        </div>
      </div>
      
      <div class="product">
        <div class="product-image">🎧</div>
        <div class="product-info">
          <div class="rating">⭐⭐⭐⭐⭐ (256)</div>
          <div class="product-name">Wireless Headphones</div>
          <div class="product-description">Crystal clear sound with noise cancellation</div>
          <div class="product-footer">
            <div class="price">$149.99</div>
            <button class="btn-add">Add to Cart</button>
          </div>
        </div>
      </div>
      
      <div class="product">
        <div class="product-image">💼</div>
        <div class="product-info">
          <div class="rating">⭐⭐⭐⭐ (76)</div>
          <div class="product-name">Laptop Bag</div>
          <div class="product-description">Durable and spacious with multiple pockets</div>
          <div class="product-footer">
            <div class="price">$59.99</div>
            <button class="btn-add">Add to Cart</button>
          </div>
        </div>
      </div>
      
      <div class="product">
        <div class="product-image">⌚</div>
        <div class="product-info">
          <div class="rating">⭐⭐⭐⭐⭐ (189)</div>
          <div class="product-name">Smart Watch</div>
          <div class="product-description">Track fitness and notifications</div>
          <div class="product-footer">
            <div class="price">$199.99</div>
            <button class="btn-add">Add to Cart</button>
          </div>
        </div>
      </div>
      
      <div class="product">
        <div class="product-image">📱</div>
        <div class="product-info">
          <div class="rating">⭐⭐⭐⭐ (142)</div>
          <div class="product-name">Phone Case</div>
          <div class="product-description">Protective and stylish design</div>
          <div class="product-footer">
            <div class="price">$24.99</div>
            <button class="btn-add">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
      'product-catalog': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Catalog</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: #ffffff;
    }
    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 40px;
      margin-bottom: 16px;
      color: #1f2937;
    }
    .controls {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 32px;
    }
    .search {
      flex: 1;
      min-width: 300px;
      padding: 14px 20px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    .search:focus {
      outline: none;
      border-color: #667eea;
    }
    .filter-group {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .filter-label {
      font-weight: 600;
      color: #4b5563;
    }
    select {
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 15px;
      cursor: pointer;
      background: white;
    }
    .tags {
      display: flex;
      gap: 12px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }
    .tag {
      padding: 10px 20px;
      background: #f3f4f6;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }
    .tag:hover {
      background: #667eea;
      color: white;
    }
    .tag.active {
      background: #667eea;
      color: white;
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 32px;
    }
    .product-card {
      background: white;
      border: 2px solid #f3f4f6;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s;
      cursor: pointer;
    }
    .product-card:hover {
      border-color: #667eea;
      box-shadow: 0 12px 24px rgba(102, 126, 234, 0.15);
      transform: translateY(-4px);
    }
    .product-image {
      width: 100%;
      height: 280px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80px;
      position: relative;
    }
    .badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: #ef4444;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }
    .product-details {
      padding: 24px;
    }
    .product-category {
      color: #667eea;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .product-title {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .product-desc {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .product-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .rating {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fbbf24;
      font-size: 14px;
    }
    .rating span {
      color: #9ca3af;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .price {
      font-size: 28px;
      font-weight: 800;
      color: #1f2937;
    }
    .old-price {
      color: #9ca3af;
      text-decoration: line-through;
      font-size: 16px;
      margin-left: 8px;
    }
    .btn-view {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-view:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Product Catalog</h1>
      <p style="color: #6b7280; font-size: 16px;">Discover our collection of premium products</p>
    </div>
    
    <div class="controls">
      <input type="text" class="search" placeholder="Search products..." />
      <div class="filter-group">
        <span class="filter-label">Sort by:</span>
        <select>
          <option>Featured</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
          <option>Newest</option>
          <option>Rating</option>
        </select>
      </div>
      <div class="filter-group">
        <span class="filter-label">Category:</span>
        <select>
          <option>All Categories</option>
          <option>Electronics</option>
          <option>Fashion</option>
          <option>Home & Living</option>
          <option>Sports</option>
        </select>
      </div>
    </div>
    
    <div class="tags">
      <div class="tag active">All</div>
      <div class="tag">New Arrivals</div>
      <div class="tag">Best Sellers</div>
      <div class="tag">On Sale</div>
      <div class="tag">Premium</div>
    </div>
    
    <div class="product-grid">
      <div class="product-card">
        <div class="product-image">
          🎮
          <div class="badge">-20%</div>
        </div>
        <div class="product-details">
          <div class="product-category">Electronics</div>
          <div class="product-title">Gaming Console</div>
          <div class="product-desc">Next-gen gaming experience with 4K graphics</div>
          <div class="product-meta">
            <div class="rating">
              ⭐⭐⭐⭐⭐ <span>(234)</span>
            </div>
          </div>
          <div class="price-row">
            <div>
              <span class="price">$399</span>
              <span class="old-price">$499</span>
            </div>
            <button class="btn-view">View</button>
          </div>
        </div>
      </div>
      
      <div class="product-card">
        <div class="product-image">📸</div>
        <div class="product-details">
          <div class="product-category">Electronics</div>
          <div class="product-title">Digital Camera</div>
          <div class="product-desc">Professional quality photos and 4K video</div>
          <div class="product-meta">
            <div class="rating">
              ⭐⭐⭐⭐ <span>(178)</span>
            </div>
          </div>
          <div class="price-row">
            <div>
              <span class="price">$849</span>
            </div>
            <button class="btn-view">View</button>
          </div>
        </div>
      </div>
      
      <div class="product-card">
        <div class="product-image">
          🏃
          <div class="badge">NEW</div>
        </div>
        <div class="product-details">
          <div class="product-category">Sports</div>
          <div class="product-title">Athletic Sneakers</div>
          <div class="product-desc">Comfort and performance for your workout</div>
          <div class="product-meta">
            <div class="rating">
              ⭐⭐⭐⭐⭐ <span>(412)</span>
            </div>
          </div>
          <div class="price-row">
            <div>
              <span class="price">$129</span>
            </div>
            <button class="btn-view">View</button>
          </div>
        </div>
      </div>
      
      <div class="product-card">
        <div class="product-image">🎨</div>
        <div class="product-details">
          <div class="product-category">Home & Living</div>
          <div class="product-title">Art Print Set</div>
          <div class="product-desc">Gallery-quality prints for your space</div>
          <div class="product-meta">
            <div class="rating">
              ⭐⭐⭐⭐ <span>(89)</span>
            </div>
          </div>
          <div class="price-row">
            <div>
              <span class="price">$79</span>
            </div>
            <button class="btn-view">View</button>
          </div>
        </div>
      </div>
      
      <div class="product-card">
        <div class="product-image">🎧</div>
        <div class="product-details">
          <div class="product-category">Electronics</div>
          <div class="product-title">Pro Headphones</div>
          <div class="product-desc">Studio-quality sound with active noise cancellation</div>
          <div class="product-meta">
            <div class="rating">
              ⭐⭐⭐⭐⭐ <span>(567)</span>
            </div>
          </div>
          <div class="price-row">
            <div>
              <span class="price">$299</span>
            </div>
            <button class="btn-view">View</button>
          </div>
        </div>
      </div>
      
      <div class="product-card">
        <div class="product-image">
          ☕
          <div class="badge">-15%</div>
        </div>
        <div class="product-details">
          <div class="product-category">Home & Living</div>
          <div class="product-title">Coffee Maker</div>
          <div class="product-desc">Barista-quality coffee at home</div>
          <div class="product-meta">
            <div class="rating">
              ⭐⭐⭐⭐ <span>(203)</span>
            </div>
          </div>
          <div class="price-row">
            <div>
              <span class="price">$169</span>
              <span class="old-price">$199</span>
            </div>
            <button class="btn-view">View</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
      todo: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo List</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .container { 
      background: white; 
      border-radius: 16px; 
      padding: 30px; 
      width: 100%; 
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #667eea; 
      margin-bottom: 24px; 
      font-size: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .input-group { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 24px; 
    }
    input { 
      flex: 1; 
      padding: 14px; 
      border: 2px solid #e0e0e0; 
      border-radius: 8px; 
      font-size: 15px;
      transition: border-color 0.2s;
    }
    input:focus { 
      outline: none; 
      border-color: #667eea; 
    }
    button { 
      padding: 14px 24px; 
      background: #667eea; 
      color: white; 
      border: none; 
      border-radius: 8px; 
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover { 
      background: #5568d3; 
    }
    .todos { 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
    }
    .todo { 
      display: flex; 
      align-items: center; 
      padding: 14px; 
      background: #f7f7f7; 
      border-radius: 8px;
      gap: 12px;
      transition: all 0.2s;
    }
    .todo:hover {
      background: #eeeeee;
    }
    .todo.completed {
      opacity: 0.6;
    }
    .todo.completed span {
      text-decoration: line-through;
    }
    .todo input[type="checkbox"] { 
      width: 20px; 
      height: 20px; 
      cursor: pointer;
      accent-color: #667eea;
    }
    .todo span { 
      flex: 1; 
      font-size: 15px;
    }
    .todo button { 
      padding: 6px 12px; 
      background: #dc3545; 
      font-size: 13px;
    }
    .todo button:hover {
      background: #c82333;
    }
    .empty {
      text-align: center;
      padding: 40px;
      color: #999;
      font-size: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><span>✓</span> Todo List</h1>
    <div class="input-group">
      <input type="text" id="todoInput" placeholder="Add a new task..." />
      <button onclick="addTodo()">Add</button>
    </div>
    <div class="todos" id="todos">
      <div class="empty">No tasks yet. Add one above!</div>
    </div>
  </div>
  <script>
    let todos = [];
    
    function addTodo() {
      const input = document.getElementById('todoInput');
      const text = input.value.trim();
      if (!text) return;
      
      todos.push({ id: Date.now(), text, completed: false });
      input.value = '';
      render();
    }
    
    function toggleTodo(id) {
      todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      render();
    }
    
    function deleteTodo(id) {
      todos = todos.filter(t => t.id !== id);
      render();
    }
    
    function render() {
      const container = document.getElementById('todos');
      if (todos.length === 0) {
        container.innerHTML = '<div class="empty">No tasks yet. Add one above!</div>';
        return;
      }
      
      container.innerHTML = todos.map(todo => \`
        <div class="todo \${todo.completed ? 'completed' : ''}">
          <input type="checkbox" \${todo.completed ? 'checked' : ''} onchange="toggleTodo(\${todo.id})" />
          <span>\${todo.text}</span>
          <button onclick="deleteTodo(\${todo.id})">Delete</button>
        </div>
      \`).join('');
    }
    
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
  </script>
</body>
</html>`,
      calculator: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculator</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .calculator { 
      background: #1a1a2e; 
      border-radius: 20px; 
      padding: 24px; 
      width: 100%; 
      max-width: 360px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .display { 
      background: #16213e; 
      color: white; 
      padding: 24px; 
      border-radius: 12px; 
      text-align: right;
      font-size: 36px;
      margin-bottom: 20px;
      min-height: 80px;
      word-wrap: break-word;
      font-weight: 300;
    }
    .buttons { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
    }
    button { 
      padding: 24px; 
      font-size: 20px; 
      border: none; 
      border-radius: 12px; 
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    button:active { 
      transform: scale(0.95); 
    }
    .btn-number { 
      background: #2d3561; 
      color: white; 
    }
    .btn-number:hover { 
      background: #3d4571; 
    }
    .btn-operator { 
      background: #0f3460; 
      color: #4fc3f7; 
    }
    .btn-operator:hover { 
      background: #1a4d7a; 
    }
    .btn-equals { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      grid-column: span 2;
    }
    .btn-equals:hover { 
      opacity: 0.9; 
    }
    .btn-clear { 
      background: #e53935; 
      color: white; 
    }
    .btn-clear:hover { 
      background: #c62828; 
    }
  </style>
</head>
<body>
  <div class="calculator">
    <div class="display" id="display">0</div>
    <div class="buttons">
      <button class="btn-clear" onclick="clearDisplay()">C</button>
      <button class="btn-operator" onclick="appendOperator('/')">/</button>
      <button class="btn-operator" onclick="appendOperator('*')">×</button>
      <button class="btn-operator" onclick="appendOperator('-')">-</button>
      
      <button class="btn-number" onclick="appendNumber('7')">7</button>
      <button class="btn-number" onclick="appendNumber('8')">8</button>
      <button class="btn-number" onclick="appendNumber('9')">9</button>
      <button class="btn-operator" onclick="appendOperator('+')">+</button>
      
      <button class="btn-number" onclick="appendNumber('4')">4</button>
      <button class="btn-number" onclick="appendNumber('5')">5</button>
      <button class="btn-number" onclick="appendNumber('6')">6</button>
      <button class="btn-operator" onclick="appendOperator('%')">%</button>
      
      <button class="btn-number" onclick="appendNumber('1')">1</button>
      <button class="btn-number" onclick="appendNumber('2')">2</button>
      <button class="btn-number" onclick="appendNumber('3')">3</button>
      <button class="btn-operator" onclick="backspace()">←</button>
      
      <button class="btn-number" onclick="appendNumber('0')">0</button>
      <button class="btn-number" onclick="appendNumber('.')">.</button>
      <button class="btn-equals" onclick="calculate()">=</button>
    </div>
  </div>
  <script>
    let display = '0';
    
    function updateDisplay() {
      document.getElementById('display').textContent = display;
    }
    
    function clearDisplay() {
      display = '0';
      updateDisplay();
    }
    
    function appendNumber(num) {
      if (display === '0') {
        display = num;
      } else {
        display += num;
      }
      updateDisplay();
    }
    
    function appendOperator(op) {
      const lastChar = display[display.length - 1];
      if (['+', '-', '*', '/', '%'].includes(lastChar)) {
        display = display.slice(0, -1) + op;
      } else {
        display += op;
      }
      updateDisplay();
    }
    
    function backspace() {
      display = display.length > 1 ? display.slice(0, -1) : '0';
      updateDisplay();
    }
    
    function calculate() {
      try {
        const result = eval(display);
        display = String(result);
        updateDisplay();
      } catch {
        display = 'Error';
        updateDisplay();
        setTimeout(() => {
          display = '0';
          updateDisplay();
        }, 1500);
      }
    }
  </script>
</body>
</html>`,
      timer: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timer & Stopwatch</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .container { 
      background: rgba(255, 255, 255, 0.1); 
      backdrop-filter: blur(10px);
      border-radius: 24px; 
      padding: 40px; 
      width: 100%; 
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
    }
    .tab {
      flex: 1;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tab.active {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
    .display { 
      color: white; 
      font-size: 64px;
      text-align: center;
      margin: 40px 0;
      font-weight: 300;
      letter-spacing: 4px;
      font-variant-numeric: tabular-nums;
    }
    .controls { 
      display: flex; 
      gap: 12px; 
      justify-content: center;
      margin-bottom: 20px;
    }
    button { 
      padding: 16px 32px; 
      font-size: 16px; 
      border: none; 
      border-radius: 12px; 
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    button:active { 
      transform: scale(0.95); 
    }
    .btn-start { 
      background: #4caf50; 
      color: white; 
    }
    .btn-start:hover { 
      background: #45a049; 
    }
    .btn-stop { 
      background: #f44336; 
      color: white; 
    }
    .btn-stop:hover { 
      background: #da190b; 
    }
    .btn-reset { 
      background: rgba(255, 255, 255, 0.2); 
      color: white; 
    }
    .btn-reset:hover { 
      background: rgba(255, 255, 255, 0.3); 
    }
    .laps {
      max-height: 200px;
      overflow-y: auto;
      margin-top: 20px;
    }
    .lap {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 8px;
      color: white;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="tabs">
      <button class="tab active" onclick="switchMode('stopwatch')">⏱️ Stopwatch</button>
      <button class="tab" onclick="switchMode('timer')">⏲️ Timer</button>
    </div>
    
    <div id="stopwatch-mode">
      <div class="display" id="stopwatch-display">00:00:00</div>
      <div class="controls">
        <button class="btn-start" onclick="startStopwatch()">Start</button>
        <button class="btn-stop" onclick="stopStopwatch()">Stop</button>
        <button class="btn-reset" onclick="resetStopwatch()">Reset</button>
      </div>
      <div class="laps" id="laps"></div>
    </div>
    
    <div id="timer-mode" class="hidden">
      <div class="display" id="timer-display">05:00</div>
      <div class="controls">
        <button class="btn-start" onclick="startTimer()">Start</button>
        <button class="btn-stop" onclick="stopTimer()">Stop</button>
        <button class="btn-reset" onclick="resetTimer()">Reset</button>
      </div>
    </div>
  </div>
  <script>
    let stopwatchTime = 0;
    let timerTime = 300;
    let stopwatchInterval = null;
    let timerInterval = null;
    let laps = [];
    
    function switchMode(mode) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      
      if (mode === 'stopwatch') {
        document.getElementById('stopwatch-mode').classList.remove('hidden');
        document.getElementById('timer-mode').classList.add('hidden');
      } else {
        document.getElementById('timer-mode').classList.remove('hidden');
        document.getElementById('stopwatch-mode').classList.add('hidden');
      }
    }
    
    function formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
    }
    
    function formatTimerTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
    }
    
    function startStopwatch() {
      if (stopwatchInterval) return;
      stopwatchInterval = setInterval(() => {
        stopwatchTime++;
        document.getElementById('stopwatch-display').textContent = formatTime(stopwatchTime);
      }, 1000);
    }
    
    function stopStopwatch() {
      if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        laps.push(stopwatchTime);
        renderLaps();
      }
    }
    
    function resetStopwatch() {
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
      stopwatchTime = 0;
      laps = [];
      document.getElementById('stopwatch-display').textContent = '00:00:00';
      document.getElementById('laps').innerHTML = '';
    }
    
    function renderLaps() {
      const container = document.getElementById('laps');
      container.innerHTML = laps.map((lap, i) => \`
        <div class="lap">
          <span>Lap \${i + 1}</span>
          <span>\${formatTime(lap)}</span>
        </div>
      \`).join('');
    }
    
    function startTimer() {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
        if (timerTime > 0) {
          timerTime--;
          document.getElementById('timer-display').textContent = formatTimerTime(timerTime);
        } else {
          stopTimer();
        }
      }, 1000);
    }
    
    function stopTimer() {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    function resetTimer() {
      stopTimer();
      timerTime = 300;
      document.getElementById('timer-display').textContent = '05:00';
    }
  </script>
</body>
</html>`,
      notes: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notes App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      display: grid;
      grid-template-columns: 300px 1fr;
      height: calc(100vh - 40px);
    }
    .sidebar {
      background: #f8f9fa;
      padding: 20px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
    }
    .sidebar h2 {
      margin-bottom: 16px;
      font-size: 20px;
    }
    .new-note {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .note-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .note-item {
      padding: 12px;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .note-item:hover {
      border-color: #667eea;
    }
    .note-item.active {
      background: #667eea;
      color: white;
    }
    .note-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .note-preview {
      font-size: 13px;
      opacity: 0.7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .editor {
      padding: 40px;
      display: flex;
      flex-direction: column;
    }
    .editor input {
      font-size: 32px;
      border: none;
      outline: none;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .editor textarea {
      flex: 1;
      border: none;
      outline: none;
      font-size: 16px;
      line-height: 1.6;
      resize: none;
      font-family: inherit;
    }
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
      flex-direction: column;
      gap: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h2>📝 Notes</h2>
      <button class="new-note" onclick="createNote()">+ New Note</button>
      <div class="note-list" id="noteList">
        <div class="empty">No notes yet</div>
      </div>
    </div>
    <div class="editor" id="editor">
      <div class="empty">
        <span style="font-size: 64px">📝</span>
        <p>Select a note or create a new one</p>
      </div>
    </div>
  </div>
  <script>
    let notes = [];
    let activeNoteId = null;
    
    function createNote() {
      const note = {
        id: Date.now(),
        title: 'Untitled Note',
        content: '',
        createdAt: Date.now()
      };
      notes.unshift(note);
      selectNote(note.id);
      renderNotes();
    }
    
    function selectNote(id) {
      activeNoteId = id;
      const note = notes.find(n => n.id === id);
      if (!note) return;
      
      document.getElementById('editor').innerHTML = \`
        <input type="text" value="\${note.title}" oninput="updateNoteTitle(event.target.value)" placeholder="Note title..." />
        <textarea oninput="updateNoteContent(event.target.value)" placeholder="Start writing...">\${note.content}</textarea>
      \`;
      renderNotes();
    }
    
    function updateNoteTitle(title) {
      const note = notes.find(n => n.id === activeNoteId);
      if (note) {
        note.title = title || 'Untitled Note';
        renderNotes();
      }
    }
    
    function updateNoteContent(content) {
      const note = notes.find(n => n.id === activeNoteId);
      if (note) {
        note.content = content;
        renderNotes();
      }
    }
    
    function renderNotes() {
      const container = document.getElementById('noteList');
      if (notes.length === 0) {
        container.innerHTML = '<div class="empty">No notes yet</div>';
        return;
      }
      
      container.innerHTML = notes.map(note => \`
        <div class="note-item \${note.id === activeNoteId ? 'active' : ''}" onclick="selectNote(\${note.id})">
          <div class="note-title">\${note.title}</div>
          <div class="note-preview">\${note.content || 'Empty note'}</div>
        </div>
      \`).join('');
    }
  </script>
</body>
</html>`,
      snake: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snake Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .container { 
      text-align: center;
    }
    h1 {
      color: white;
      margin-bottom: 20px;
      font-size: 36px;
    }
    .score {
      color: white;
      font-size: 24px;
      margin-bottom: 16px;
    }
    canvas { 
      background: #1a1a2e;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .controls {
      margin-top: 20px;
      color: white;
      font-size: 14px;
    }
    button {
      margin-top: 12px;
      padding: 12px 24px;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐍 Snake Game</h1>
    <div class="score">Score: <span id="score">0</span></div>
    <canvas id="game" width="400" height="400"></canvas>
    <div class="controls">Use arrow keys to move</div>
    <button id="restart" style="display: none;">Play Again</button>
  </div>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const restartBtn = document.getElementById('restart');
    
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let dx = 0;
    let dy = 0;
    let score = 0;
    let gameLoop = null;
    
    function draw() {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
      
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#51cf66' : '#37b24d';
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
      });
    }
    
    function update() {
      const head = {x: snake[0].x + dx, y: snake[0].y + dy};
      
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
      }
      
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
      }
      
      snake.unshift(head);
      
      if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        placeFood();
      } else {
        snake.pop();
      }
      
      draw();
    }
    
    function placeFood() {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };
    }
    
    function gameOver() {
      clearInterval(gameLoop);
      restartBtn.style.display = 'block';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
    }
    
    function restart() {
      snake = [{x: 10, y: 10}];
      dx = 0;
      dy = 0;
      score = 0;
      scoreEl.textContent = score;
      placeFood();
      restartBtn.style.display = 'none';
      gameLoop = setInterval(update, 100);
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
    });
    
    restartBtn.addEventListener('click', restart);
    
    draw();
    gameLoop = setInterval(update, 100);
  </script>
</body>
</html>`,
      weather: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      max-width: 1000px;
      margin: 0 auto;
    }
    .current {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 40px;
      color: white;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .location {
      font-size: 32px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .date {
      font-size: 16px;
      opacity: 0.8;
      margin-bottom: 32px;
    }
    .temp-container {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 32px;
    }
    .icon {
      font-size: 96px;
    }
    .temp {
      font-size: 72px;
      font-weight: 300;
    }
    .condition {
      font-size: 24px;
      opacity: 0.9;
    }
    .details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    .detail {
      background: rgba(255, 255, 255, 0.1);
      padding: 16px;
      border-radius: 12px;
    }
    .detail-label {
      font-size: 13px;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .detail-value {
      font-size: 20px;
      font-weight: 600;
    }
    .forecast {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
    }
    .forecast-day {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .forecast-date {
      font-size: 14px;
      margin-bottom: 12px;
      opacity: 0.8;
    }
    .forecast-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .forecast-temp {
      font-size: 20px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="current">
      <div class="location">San Francisco, CA</div>
      <div class="date" id="currentDate"></div>
      
      <div class="temp-container">
        <div class="icon">☀️</div>
        <div>
          <div class="temp">72°F</div>
          <div class="condition">Sunny</div>
        </div>
      </div>
      
      <div class="details">
        <div class="detail">
          <div class="detail-label">Feels Like</div>
          <div class="detail-value">70°F</div>
        </div>
        <div class="detail">
          <div class="detail-label">Humidity</div>
          <div class="detail-value">45%</div>
        </div>
        <div class="detail">
          <div class="detail-label">Wind Speed</div>
          <div class="detail-value">12 mph</div>
        </div>
        <div class="detail">
          <div class="detail-label">UV Index</div>
          <div class="detail-value">6</div>
        </div>
      </div>
    </div>
    
    <div class="forecast">
      <div class="forecast-day">
        <div class="forecast-date">Monday</div>
        <div class="forecast-icon">🌤️</div>
        <div class="forecast-temp">75° / 62°</div>
      </div>
      <div class="forecast-day">
        <div class="forecast-date">Tuesday</div>
        <div class="forecast-icon">☁️</div>
        <div class="forecast-temp">68° / 58°</div>
      </div>
      <div class="forecast-day">
        <div class="forecast-date">Wednesday</div>
        <div class="forecast-icon">🌧️</div>
        <div class="forecast-temp">64° / 55°</div>
      </div>
      <div class="forecast-day">
        <div class="forecast-date">Thursday</div>
        <div class="forecast-icon">⛈️</div>
        <div class="forecast-temp">62° / 54°</div>
      </div>
      <div class="forecast-day">
        <div class="forecast-date">Friday</div>
        <div class="forecast-icon">🌤️</div>
        <div class="forecast-temp">70° / 60°</div>
      </div>
    </div>
  </div>
  <script>
    const dateEl = document.getElementById('currentDate');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
  </script>
</body>
</html>`
    };
    
    return templates[templateId] || '';
  }

  const openTemplatePreview = (templateId: string) => {
    setSelectedTemplateForPreview(templateId)
    setTemplatePreviewDialog(true)
    
    const template = APP_TEMPLATES.find(t => t.id === templateId)
    analytics.track('template_preview_opened', 'builder', 'view_template_preview', {
      label: template?.name || templateId,
      metadata: { templateId, templateCategory: template?.category }
    })
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

      {projects.length === 0 && (
        <Card className="p-6 mb-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkle weight="fill" size={20} className="text-accent" />
              Quick Start Templates
            </h3>
            <p className="text-sm text-muted-foreground">
              Browse sample apps or create your own from scratch
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {APP_TEMPLATES.map(template => (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 relative group"
                  onClick={() => openTemplatePreview(template.id)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Eye size={14} />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-2">{template.preview}</div>
                    <h4 className="font-semibold text-xs mb-1">{template.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

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
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye size={18} />
                    Live Preview
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

                <TabsContent value="preview" className="flex-1 mt-0 flex flex-col">
                  {activeProject.files.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <p className="text-sm text-muted-foreground">
                          Live preview of your generated app
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateLivePreview(activeProject.id)
                            toast.success('Preview refreshed')
                          }}
                        >
                          <Sparkle size={16} className="mr-1" />
                          Refresh
                        </Button>
                      </div>
                      {activeProject.previewUrl ? (
                        <iframe
                          key={previewKey}
                          ref={iframeRef}
                          src={activeProject.previewUrl}
                          className="w-full h-full border border-border rounded-lg bg-background"
                          title={`Live preview of ${activeProject.name}`}
                          sandbox="allow-scripts allow-same-origin allow-forms"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center border border-border rounded-lg bg-muted/30">
                          <div className="text-center">
                            <Eye size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">Generating preview...</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-border rounded-lg bg-muted/30">
                      <div className="text-center">
                        <Eye size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">No code to preview</p>
                      </div>
                    </div>
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
              <p className="text-xs text-muted-foreground mb-2">
                Choose a pre-built template or describe your own custom app below
              </p>
              <div className="grid grid-cols-2 gap-3">
                {APP_TEMPLATES.map(template => {
                  const isSelected = newProjectForm.template === template.id
                  return (
                    <Card 
                      key={template.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setNewProjectForm(prev => ({ ...prev, template: template.id }))}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-3xl">{template.preview}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            openTemplatePreview(template.id)
                          }}
                        >
                          <Eye size={16} />
                        </Button>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </Card>
                  )
                })}
              </div>
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

      <Dialog open={templatePreviewDialog} onOpenChange={setTemplatePreviewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">
                {selectedTemplateForPreview && APP_TEMPLATES.find(t => t.id === selectedTemplateForPreview)?.preview}
              </span>
              {selectedTemplateForPreview && APP_TEMPLATES.find(t => t.id === selectedTemplateForPreview)?.name} - Live Preview
            </DialogTitle>
            <DialogDescription>
              Interactive preview of the {selectedTemplateForPreview && APP_TEMPLATES.find(t => t.id === selectedTemplateForPreview)?.name.toLowerCase()} template
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-background">
            {selectedTemplateForPreview && (
              <iframe
                ref={templateIframeRef}
                srcDoc={generateTemplatePreview(selectedTemplateForPreview)}
                className="w-full h-full"
                title={`Preview of ${APP_TEMPLATES.find(t => t.id === selectedTemplateForPreview)?.name}`}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="text-sm text-muted-foreground hidden sm:block">
              This is a sample implementation. Generated apps may vary based on your prompt.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTemplatePreviewDialog(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedTemplateForPreview) {
                    setNewProjectForm(prev => ({ ...prev, template: selectedTemplateForPreview }))
                    setTemplatePreviewDialog(false)
                    setNewProjectDialog(true)
                  }
                }}
              >
                <Sparkle size={16} className="mr-2" />
                Use This Template
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}