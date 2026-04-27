import { useState, useRef, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileCode,
  FolderOpen,
  Plus,
  Trash,
  Play,
  Download,
  Eye,
  Terminal,
  Package,
  FloppyDisk,
  Folders,
  File,
  Code,
  CheckCircle,
  Circle} from '@phosphor-icons/react'
import { CodeEditor, type CodeTheme } from './CodeEditor'
import { analytics } from '@/lib/analytics'
import { useIsMobile } from '@/hooks/use-mobile'

interface IDEFile {
  id: string
  path: string
  content: string
  language: 'typescript' | 'javascript' | 'html' | 'css' | 'json' | 'jsx' | 'tsx'
  saved: boolean
  createdAt: number
  updatedAt: number
}

interface IDEProject {
  id: string
  name: string
  description: string
  framework: 'vanilla' | 'react' | 'preact'
  files: IDEFile[]
  createdAt: number
  updatedAt: number
}

interface ConsoleMessage {
  id: string
  type: 'log' | 'error' | 'warn' | 'info'
  message: string
  timestamp: number
}

export function LocalIDE() {
  const isMobile = useIsMobile()
  const [projects, setProjects] = useKV<IDEProject[]>('ide-projects', [])
  const [editorTheme, setEditorTheme] = useKV<CodeTheme>('ide-editor-theme', 'tomorrow')
  const [autoSaveEnabled, setAutoSaveEnabled] = useKV<boolean>('ide-auto-save-enabled', true)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [newProjectDialog, setNewProjectDialog] = useState(false)
  const [newFileDialog, setNewFileDialog] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const editorContentRef = useRef<string>('')
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    framework: 'vanilla' as IDEProject['framework']
  })

  const [newFileForm, setNewFileForm] = useState({
    name: '',
    language: 'javascript' as IDEFile['language']
  })

  const safeProjects = projects || []
  const safeEditorTheme = editorTheme || 'tomorrow'
  const safeAutoSaveEnabled = autoSaveEnabled ?? true

  const activeProject = safeProjects.find(p => p.id === activeProjectId)
  const activeFile = activeProject?.files.find(f => f.id === activeFileId)

  const addConsoleMessage = (type: ConsoleMessage['type'], message: string) => {
    const msg: ConsoleMessage = {
      id: `console-${Date.now()}`,
      type,
      message,
      timestamp: Date.now()
    }
    setConsoleMessages(prev => [...prev, msg])
  }

  const createProject = () => {
    const projectId = `project-${Date.now()}`
    
    const defaultFiles: IDEFile[] = []

    if (newProjectForm.framework === 'vanilla') {
      defaultFiles.push(
        {
          id: `file-${Date.now()}-1`,
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newProjectForm.name}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Welcome to ${newProjectForm.name}</h1>
    <p>Start building something amazing!</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
          language: 'html',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: `file-${Date.now()}-2`,
          path: 'script.js',
          content: `console.log('${newProjectForm.name} initialized');

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  console.log('App element:', app);
});`,
          language: 'javascript',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: `file-${Date.now()}-3`,
          path: 'styles.css',
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

#app {
  text-align: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

h1 {
  font-size: 48px;
  margin-bottom: 16px;
}

p {
  font-size: 20px;
  opacity: 0.9;
}`,
          language: 'css',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      )
    } else if (newProjectForm.framework === 'react') {
      defaultFiles.push(
        {
          id: `file-${Date.now()}-1`,
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newProjectForm.name}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="app.jsx"></script>
</body>
</html>`,
          language: 'html',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: `file-${Date.now()}-2`,
          path: 'app.jsx',
          content: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>${newProjectForm.name}</h1>
        <p style={styles.description}>Start building something amazing with React!</p>
        <div style={styles.counter}>
          <button style={styles.button} onClick={() => setCount(count - 1)}>-</button>
          <span style={styles.count}>{count}</span>
          <button style={styles.button} onClick={() => setCount(count + 1)}>+</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  card: {
    textAlign: 'center',
    padding: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  description: {
    fontSize: '20px',
    opacity: 0.9,
    marginBottom: '32px',
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '24px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  count: {
    fontSize: '48px',
    fontWeight: '700',
    minWidth: '60px',
  },
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);`,
          language: 'jsx',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      )
    } else if (newProjectForm.framework === 'preact') {
      defaultFiles.push(
        {
          id: `file-${Date.now()}-1`,
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${newProjectForm.name}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="app.jsx"></script>
</body>
</html>`,
          language: 'html',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: `file-${Date.now()}-2`,
          path: 'app.jsx',
          content: `import { h, render } from 'preact';
import { useState } from 'preact/hooks';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>${newProjectForm.name}</h1>
        <p style={styles.description}>Start building something amazing with Preact!</p>
        <div style={styles.counter}>
          <button style={styles.button} onClick={() => setCount(count - 1)}>-</button>
          <span style={styles.count}>{count}</span>
          <button style={styles.button} onClick={() => setCount(count + 1)}>+</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  card: {
    textAlign: 'center',
    padding: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  description: {
    fontSize: '20px',
    opacity: 0.9,
    marginBottom: '32px',
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '24px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  count: {
    fontSize: '48px',
    fontWeight: '700',
    minWidth: '60px',
  },
};

render(<App />, document.getElementById('app'));`,
          language: 'jsx',
          saved: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      )
    }

    const newProject: IDEProject = {
      id: projectId,
      name: newProjectForm.name || 'Untitled Project',
      description: newProjectForm.description,
      framework: newProjectForm.framework,
      files: defaultFiles,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setProjects(prev => [newProject, ...(prev || [])])
    setActiveProjectId(projectId)
    setActiveFileId(defaultFiles[0]?.id || null)
    setNewProjectDialog(false)
    setNewProjectForm({ name: '', description: '', framework: 'vanilla' })
    
    addConsoleMessage('info', `Project "${newProject.name}" created successfully`)
    toast.success(`Project "${newProject.name}" created`)

    analytics.track('ide_project_created', 'builder', 'create_ide_project', {
      label: newProject.name,
      metadata: { framework: newProject.framework, filesCount: defaultFiles.length }
    })
  }

  const createFile = () => {
    if (!activeProjectId) return

    const fileId = `file-${Date.now()}`
    const fileName = newFileForm.name || `untitled.${newFileForm.language === 'typescript' ? 'ts' : newFileForm.language === 'jsx' ? 'jsx' : newFileForm.language === 'tsx' ? 'tsx' : newFileForm.language === 'html' ? 'html' : newFileForm.language === 'css' ? 'css' : 'js'}`
    
    const newFile: IDEFile = {
      id: fileId,
      path: fileName,
      content: '',
      language: newFileForm.language,
      saved: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    setProjects(prev =>
      (prev || []).map(p =>
        p.id === activeProjectId
          ? { ...p, files: [...p.files, newFile], updatedAt: Date.now() }
          : p
      )
    )

    setActiveFileId(fileId)
    setNewFileDialog(false)
    setNewFileForm({ name: '', language: 'javascript' })
    
    addConsoleMessage('info', `File "${fileName}" created`)
    toast.success(`File "${fileName}" created`)

    analytics.track('ide_file_created', 'builder', 'create_ide_file', {
      metadata: { projectId: activeProjectId, fileName, language: newFileForm.language }
    })
  }

  const deleteFile = (fileId: string) => {
    if (!activeProjectId) return

    const project = safeProjects.find(p => p.id === activeProjectId)
    const file = project?.files.find(f => f.id === fileId)
    
    if (!file) return

    setProjects(prev =>
      (prev || []).map(p =>
        p.id === activeProjectId
          ? { ...p, files: p.files.filter(f => f.id !== fileId), updatedAt: Date.now() }
          : p
      )
    )

    if (activeFileId === fileId) {
      const remainingFiles = project.files.filter(f => f.id !== fileId)
      setActiveFileId(remainingFiles[0]?.id || null)
    }
    
    addConsoleMessage('warn', `File "${file.path}" deleted`)
    toast.success(`File "${file.path}" deleted`)

    analytics.track('ide_file_deleted', 'builder', 'delete_ide_file', {
      metadata: { projectId: activeProjectId, fileName: file.path }
    })
  }

  const deleteProject = (projectId: string) => {
    const project = safeProjects.find(p => p.id === projectId)
    
    setProjects(prev => (prev || []).filter(p => p.id !== projectId))
    
    if (activeProjectId === projectId) {
      setActiveProjectId(null)
      setActiveFileId(null)
    }

    toast.success(`Project "${project?.name}" deleted`)

    analytics.track('ide_project_deleted', 'builder', 'delete_ide_project', {
      metadata: { projectId, projectName: project?.name }
    })
  }

  const saveFile = useCallback(() => {
    if (!activeProjectId || !activeFileId) return

    setIsSaving(true)
    
    setProjects(prev =>
      (prev || []).map(p =>
        p.id === activeProjectId
          ? {
              ...p,
              files: p.files.map(f =>
                f.id === activeFileId
                  ? { ...f, content: editorContentRef.current, saved: true, updatedAt: Date.now() }
                  : f
              ),
              updatedAt: Date.now()
            }
          : p
      )
    )

    setLastSaveTime(Date.now())

    setTimeout(() => {
      setIsSaving(false)
      addConsoleMessage('info', `File "${activeFile?.path}" saved`)
    }, 300)

    analytics.track('ide_file_saved', 'builder', 'save_ide_file', {
      metadata: { projectId: activeProjectId, fileId: activeFileId, fileName: activeFile?.path }
    })
  }, [activeProjectId, activeFileId, setProjects, activeFile?.path])

  const autoSaveFile = useCallback(() => {
    if (!safeAutoSaveEnabled || !activeProjectId || !activeFileId) return

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveFile()
    }, 2000)
  }, [safeAutoSaveEnabled, activeProjectId, activeFileId, saveFile])

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const runProject = () => {
    if (!activeProject) return

    setIsRunning(true)
    addConsoleMessage('info', 'Running project...')
    setPreviewKey(prev => prev + 1)

    setTimeout(() => {
      setIsRunning(false)
      addConsoleMessage('log', 'Project executed successfully')
    }, 500)

    analytics.track('ide_project_run', 'builder', 'run_ide_project', {
      label: activeProject.name,
      metadata: { projectId: activeProject.id, framework: activeProject.framework }
    })
  }

  const generatePreviewHtml = (): string => {
    if (!activeProject) return ''

    const htmlFile = activeProject.files.find(f => f.path.endsWith('.html'))
    const jsFiles = activeProject.files.filter(f => 
      f.path.endsWith('.js') || f.path.endsWith('.jsx') || f.path.endsWith('.ts') || f.path.endsWith('.tsx')
    )
    const cssFiles = activeProject.files.filter(f => f.path.endsWith('.css'))

    if (!htmlFile) return '<html><body><h1>No HTML file found</h1></body></html>'

    let html = htmlFile.content

    cssFiles.forEach(cssFile => {
      const styleTag = `<style>\n${cssFile.content}\n</style>`
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`)
      } else {
        html = `<head>${styleTag}</head>${html}`
      }
    })

    if (activeProject.framework === 'react' || activeProject.framework === 'preact') {
      const imports = activeProject.framework === 'react'
        ? `<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react-dom": "https://esm.sh/react-dom@18",
    "react-dom/client": "https://esm.sh/react-dom@18/client"
  }
}
</script>`
        : `<script type="importmap">
{
  "imports": {
    "preact": "https://esm.sh/preact@10",
    "preact/hooks": "https://esm.sh/preact@10/hooks"
  }
}
</script>`

      if (html.includes('</head>')) {
        html = html.replace('</head>', `${imports}\n</head>`)
      } else {
        html = `<head>${imports}</head>${html}`
      }
    }

    jsFiles.forEach(jsFile => {
      const scriptContent = jsFile.content.replace(/export\s+default\s+/, '')
      const scriptTag = `<script type="module">\n${scriptContent}\n</script>`
      
      const scriptReference = `<script type="module" src="${jsFile.path}"></script>`
      
      if (html.includes(scriptReference)) {
        html = html.replace(scriptReference, scriptTag)
      } else if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`)
      } else {
        html = `${html}${scriptTag}`
      }
    })

    return html
  }

  const downloadProject = () => {
    if (!activeProject) return

    const htmlFile = activeProject.files.find(f => f.path.endsWith('.html'))
    if (!htmlFile) {
      toast.error('No HTML file found')
      return
    }

    const fullHtml = generatePreviewHtml()
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}.html`
    link.click()
    URL.revokeObjectURL(url)

    addConsoleMessage('info', `Project "${activeProject.name}" downloaded`)
    toast.success('Project downloaded')

    analytics.track('ide_project_downloaded', 'builder', 'download_ide_project', {
      label: activeProject.name,
      metadata: { projectId: activeProject.id }
    })
  }

  const handleCodeChange = (newCode: string) => {
    editorContentRef.current = newCode
    
    if (!activeProjectId || !activeFileId) return

    setProjects(prev =>
      (prev || []).map(p =>
        p.id === activeProjectId
          ? {
              ...p,
              files: p.files.map(f =>
                f.id === activeFileId
                  ? { ...f, saved: false }
                  : f
              )
            }
          : p
      )
    )

    if (safeAutoSaveEnabled) {
      autoSaveFile()
    }
  }

  useEffect(() => {
    if (activeFile) {
      editorContentRef.current = activeFile.content
    }
  }, [activeFileId, activeFile])

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSaveTime && activeFile?.saved) {
        setLastSaveTime(prev => prev)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [lastSaveTime, activeFile?.saved])

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.html')) return '🌐'
    if (fileName.endsWith('.css')) return '🎨'
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return '⚡'
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return '💠'
    if (fileName.endsWith('.json')) return '📋'
    return '📄'
  }

  const getConsoleIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getConsoleColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      default: return 'text-foreground'
    }
  }

  const handleThemeChange = (newTheme: CodeTheme) => {
    setEditorTheme(newTheme)
    toast.success(`Theme changed to ${newTheme}`)
    analytics.track('ide_theme_changed', 'builder', 'change_editor_theme', {
      metadata: { theme: newTheme }
    })
  }

  const _themeDisplayNames: Record<CodeTheme, string> = {
    tomorrow: 'Tomorrow Night',
    okaidia: 'Okaidia',
    twilight: 'Twilight',
    coy: 'Coy (Light)',
    solarized: 'Solarized Light',
    funky: 'Funky',
    dark: 'Dark'
  }

  const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 h-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Local IDE</h2>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Build web apps with a full-featured code editor</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isMobile && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
              <Label htmlFor="auto-save" className="text-xs cursor-pointer">Auto-save</Label>
              <Switch
                id="auto-save"
                checked={safeAutoSaveEnabled}
                onCheckedChange={(checked) => {
                  setAutoSaveEnabled(checked)
                  toast.success(`Auto-save ${checked ? 'enabled' : 'disabled'}`)
                  analytics.track('ide_auto_save_toggled', 'builder', 'toggle_auto_save', {
                    metadata: { enabled: checked }
                  })
                }}
              />
            </div>
          )}
          <Select value={safeEditorTheme} onValueChange={(value: CodeTheme) => handleThemeChange(value)}>
            <SelectTrigger className={`${isMobile ? 'w-[140px]' : 'w-[180px]'} h-9`}>
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tomorrow">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#2d2d2d] border border-border" />
                  Tomorrow Night
                </div>
              </SelectItem>
              <SelectItem value="okaidia">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#272822] border border-border" />
                  Okaidia
                </div>
              </SelectItem>
              <SelectItem value="twilight">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#141414] border border-border" />
                  Twilight
                </div>
              </SelectItem>
              <SelectItem value="coy">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#fdfdfd] border border-border" />
                  Coy (Light)
                </div>
              </SelectItem>
              <SelectItem value="solarized">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#fdf6e3] border border-border" />
                  Solarized Light
                </div>
              </SelectItem>
              <SelectItem value="funky">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#000000] border border-border" />
                  Funky
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#1e1e1e] border border-border" />
                  Dark
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setNewProjectDialog(true)} size="sm" className="touch-target">
            <Plus weight="bold" size={20} className={isMobile ? '' : 'mr-2'} />
            {!isMobile && 'New Project'}
          </Button>
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 touch-target">
                  <Folders size={18} className="mr-2" />
                  Projects
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Projects</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  <div className="space-y-2">
                    {(!safeProjects || safeProjects.length === 0) && (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No projects</p>
                      </div>
                    )}
                    {safeProjects.map(project => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <Button
                          variant={activeProjectId === project.id ? 'secondary' : 'ghost'}
                          className="w-full justify-start h-auto py-3 px-3 text-sm touch-target"
                          onClick={() => {
                            setActiveProjectId(project.id)
                            setActiveFileId(project.files[0]?.id || null)
                            addConsoleMessage('info', `Opened project "${project.name}"`)
                          }}
                        >
                          <div className="flex-1 min-w-0 text-left">
                            <p className="truncate font-medium">{project.name}</p>
                            <p className="text-xs opacity-70 truncate capitalize">{project.framework}</p>
                          </div>
                        </Button>
                        {activeProjectId === project.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1 h-10 text-xs touch-target"
                            onClick={() => deleteProject(project.id)}
                          >
                            <Trash size={14} className="mr-1" />
                            Delete
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 touch-target" disabled={!activeProject}>
                  <File size={18} className="mr-2" />
                  Files
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    Files
                    {activeProject && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setNewFileDialog(true)}
                      >
                        <Plus size={16} />
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  {activeProject ? (
                    <div className="space-y-2">
                      {activeProject.files.map(file => (
                        <div key={file.id}>
                          <Button
                            variant={activeFileId === file.id ? 'secondary' : 'ghost'}
                            className="w-full justify-start h-auto py-3 px-3 text-sm touch-target"
                            onClick={() => {
                              setActiveFileId(file.id)
                              addConsoleMessage('info', `Opened file "${file.path}"`)
                            }}
                          >
                            <span className="mr-2 text-lg">{getFileIcon(file.path)}</span>
                            <span className="flex-1 truncate text-left">{file.path}</span>
                            {!file.saved && <span className="text-accent">●</span>}
                          </Button>
                          {activeFileId === file.id && activeProject.files.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1 h-10 text-xs touch-target"
                              onClick={() => deleteFile(file.id)}
                            >
                              <Trash size={12} className="mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      <FileCode size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No project selected</p>
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <Card className="flex-1 min-h-0 flex flex-col">
            {activeFile ? (
              <Tabs defaultValue="editor" className="flex-1 flex flex-col">
                <TabsList className="w-full">
                  <TabsTrigger value="editor" className="flex-1">
                    <Code size={18} className="mr-2" />
                    Editor
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1">
                    <Eye size={18} className="mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="console" className="flex-1">
                    <Terminal size={18} className="mr-2" />
                    Console
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="editor" className="flex-1 min-h-0 flex flex-col m-0 p-0">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span>{getFileIcon(activeFile.path)}</span>
                      <span className="font-medium text-sm truncate">{activeFile.path}</span>
                      <AnimatePresence mode="wait">
                        {isSaving ? (
                          <motion.div
                            key="saving"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1 text-xs text-accent"
                          >
                            <Circle size={12} className="animate-pulse" weight="fill" />
                          </motion.div>
                        ) : activeFile.saved ? (
                          <motion.div
                            key="saved"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <CheckCircle size={14} weight="fill" className="text-green-500" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="unsaved"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Circle size={12} weight="fill" className="text-accent" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!safeAutoSaveEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={saveFile}
                          disabled={activeFile.saved}
                        >
                          <FloppyDisk size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={runProject}
                        disabled={isRunning}
                      >
                        <Play size={16} weight="fill" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      code={activeFile.content}
                      language={activeFile.language}
                      onChange={handleCodeChange}
                      theme={safeEditorTheme}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 min-h-0 m-0 p-0">
                  <div className="h-full bg-white">
                    <iframe
                      key={previewKey}
                      ref={iframeRef}
                      srcDoc={generatePreviewHtml()}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-modals"
                      title="Preview"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="console" className="flex-1 min-h-0 m-0 p-0">
                  <div className="h-full bg-card/50 p-3">
                    <ScrollArea className="h-full">
                      {consoleMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <Terminal size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Console output will appear here</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 font-mono text-xs">
                          {consoleMessages.map(msg => (
                            <div key={msg.id} className={`flex gap-2 ${getConsoleColor(msg.type)}`}>
                              <span>{getConsoleIcon(msg.type)}</span>
                              <span className="flex-1">{msg.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-muted-foreground">
                  <Code size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Select or create a file to start coding</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
          <Card className="col-span-2 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Folders size={16} />
                Projects
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {(!safeProjects || safeProjects.length === 0) && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No projects</p>
                  </div>
                )}
                {safeProjects.map(project => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Button
                      variant={activeProjectId === project.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start h-auto py-2 px-2 text-xs"
                      onClick={() => {
                        setActiveProjectId(project.id)
                        setActiveFileId(project.files[0]?.id || null)
                        addConsoleMessage('info', `Opened project "${project.name}"`)
                      }}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <p className="truncate font-medium">{project.name}</p>
                        <p className="text-xs opacity-70 truncate capitalize">{project.framework}</p>
                      </div>
                    </Button>
                    {activeProjectId === project.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1 h-7 text-xs"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash size={14} className="mr-1" />
                        Delete
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          <Card className="col-span-2 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <File size={16} />
                Files
              </h3>
              {activeProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setNewFileDialog(true)}
                >
                  <Plus size={14} />
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1">
              {activeProject ? (
                <div className="space-y-1">
                  {activeProject.files.map(file => (
                    <div key={file.id} className="group">
                      <Button
                        variant={activeFileId === file.id ? 'secondary' : 'ghost'}
                        className="w-full justify-start h-auto py-2 px-2 text-xs"
                        onClick={() => {
                          setActiveFileId(file.id)
                          addConsoleMessage('info', `Opened file "${file.path}"`)
                        }}
                      >
                        <span className="mr-2">{getFileIcon(file.path)}</span>
                        <span className="flex-1 truncate text-left">{file.path}</span>
                        {!file.saved && <span className="text-accent">●</span>}
                      </Button>
                      {activeFileId === file.id && activeProject.files.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-1 h-6 text-xs opacity-0 group-hover:opacity-100"
                          onClick={() => deleteFile(file.id)}
                        >
                          <Trash size={12} className="mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <FileCode size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No project selected</p>
                </div>
              )}
            </ScrollArea>
          </Card>

          <div className="col-span-8 flex flex-col gap-4 min-h-0">
            <Card className="flex-1 min-h-0 flex flex-col">
              {activeFile ? (
              <>
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span>{getFileIcon(activeFile.path)}</span>
                    <span className="font-medium text-sm">{activeFile.path}</span>
                    <AnimatePresence mode="wait">
                      {isSaving ? (
                        <motion.div
                          key="saving"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 text-xs text-accent"
                        >
                          <Circle size={12} className="animate-pulse" weight="fill" />
                          <span>Saving...</span>
                        </motion.div>
                      ) : activeFile.saved ? (
                        <motion.div
                          key="saved"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 text-xs text-green-500"
                        >
                          <CheckCircle size={12} weight="fill" />
                          <span>{lastSaveTime ? getRelativeTime(lastSaveTime) : 'Saved'}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="unsaved"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <Circle size={12} weight="fill" className="text-accent" />
                          <span>Unsaved changes</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveFile}
                      disabled={activeFile.saved || isSaving}
                      className="h-8"
                    >
                      <FloppyDisk size={16} className="mr-1" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={runProject}
                      disabled={isRunning}
                      className="h-8"
                    >
                      <Play size={16} weight="fill" className="mr-1" />
                      {isRunning ? 'Running...' : 'Run'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadProject}
                      className="h-8"
                    >
                      <Download size={16} className="mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <CodeEditor
                    code={activeFile.content}
                    language={activeFile.language}
                    onChange={handleCodeChange}
                    readOnly={false}
                    className="h-full"
                    theme={safeEditorTheme}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Code size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium">No file selected</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {activeProject ? 'Select a file from the sidebar' : 'Create or select a project'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card className="h-48 flex flex-col">
            <Tabs defaultValue="preview" className="flex-1 flex flex-col">
              <TabsList className="mx-3 mt-3 mb-0">
                <TabsTrigger value="preview" className="text-xs">
                  <Eye size={16} className="mr-1" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="console" className="text-xs">
                  <Terminal size={16} className="mr-1" />
                  Console ({consoleMessages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 m-3 mt-2 min-h-0">
                {activeProject && activeProject.files.length > 0 ? (
                  <iframe
                    key={previewKey}
                    ref={iframeRef}
                    srcDoc={generatePreviewHtml()}
                    className="w-full h-full border border-border rounded-lg bg-background"
                    title={`Preview of ${activeProject.name}`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center border border-border rounded-lg bg-muted/30">
                    <div className="text-center">
                      <Eye size={32} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-xs text-muted-foreground">No preview available</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="console" className="flex-1 m-3 mt-2 min-h-0">
                <div className="h-full border border-border rounded-lg bg-background overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
                    <span className="text-xs font-medium">Console Output</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setConsoleMessages([])
                        addConsoleMessage('info', 'Console cleared')
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1 font-mono text-xs">
                      {consoleMessages.length === 0 && (
                        <div className="text-muted-foreground text-center py-4">
                          <Terminal size={24} className="mx-auto mb-2 opacity-50" />
                          <p>No console messages</p>
                        </div>
                      )}
                      {consoleMessages.map(msg => (
                        <div key={msg.id} className="flex items-start gap-2">
                          <span>{getConsoleIcon(msg.type)}</span>
                          <span className={getConsoleColor(msg.type)}>{msg.message}</span>
                          <span className="ml-auto text-muted-foreground text-[10px]">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
      )}

      <Dialog open={newProjectDialog} onOpenChange={setNewProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up a new web development project with your preferred framework
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Awesome Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Input
                id="project-description"
                value={newProjectForm.description}
                onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>

            <div className="space-y-2">
              <Label>Framework</Label>
              <Select
                value={newProjectForm.framework}
                onValueChange={(value: IDEProject['framework']) =>
                  setNewProjectForm(prev => ({ ...prev, framework: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vanilla">Vanilla JS - Pure HTML, CSS, JavaScript</SelectItem>
                  <SelectItem value="react">React - Component-based UI library</SelectItem>
                  <SelectItem value="preact">Preact - Lightweight React alternative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createProject} disabled={!newProjectForm.name}>
              <Package size={16} className="mr-2" />
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFileDialog} onOpenChange={setNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Add a new file to your project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                value={newFileForm.name}
                onChange={(e) => setNewFileForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="component.js"
              />
            </div>

            <div className="space-y-2">
              <Label>File Type</Label>
              <Select
                value={newFileForm.language}
                onValueChange={(value: IDEFile['language']) =>
                  setNewFileForm(prev => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript (.js)</SelectItem>
                  <SelectItem value="typescript">TypeScript (.ts)</SelectItem>
                  <SelectItem value="jsx">JSX (.jsx)</SelectItem>
                  <SelectItem value="tsx">TSX (.tsx)</SelectItem>
                  <SelectItem value="html">HTML (.html)</SelectItem>
                  <SelectItem value="css">CSS (.css)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createFile} disabled={!newFileForm.name}>
              <FileCode size={16} className="mr-2" />
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LocalIDE
