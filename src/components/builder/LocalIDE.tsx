import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Sparkle,
  Code,
  Lightning
} from '@phosphor-icons/react'
import { CodeEditor } from './CodeEditor'
import { analytics } from '@/lib/analytics'

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
  const [projects, setProjects] = useKV<IDEProject[]>('ide-projects', [])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [newProjectDialog, setNewProjectDialog] = useState(false)
  const [newFileDialog, setNewFileDialog] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const editorContentRef = useRef<string>('')

  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    framework: 'vanilla' as IDEProject['framework']
  })

  const [newFileForm, setNewFileForm] = useState({
    name: '',
    language: 'javascript' as IDEFile['language']
  })

  const activeProject = projects.find(p => p.id === activeProjectId)
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
      prev.map(p =>
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

    const project = projects.find(p => p.id === activeProjectId)
    const file = project?.files.find(f => f.id === fileId)
    
    if (!file) return

    setProjects(prev =>
      prev.map(p =>
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
    const project = projects.find(p => p.id === projectId)
    
    setProjects(prev => prev.filter(p => p.id !== projectId))
    
    if (activeProjectId === projectId) {
      setActiveProjectId(null)
      setActiveFileId(null)
    }

    toast.success(`Project "${project?.name}" deleted`)

    analytics.track('ide_project_deleted', 'builder', 'delete_ide_project', {
      metadata: { projectId, projectName: project?.name }
    })
  }

  const saveFile = () => {
    if (!activeProjectId || !activeFileId) return

    setIsSaving(true)
    
    setProjects(prev =>
      prev.map(p =>
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

    setTimeout(() => {
      setIsSaving(false)
      addConsoleMessage('info', `File "${activeFile?.path}" saved`)
      toast.success('File saved')
    }, 300)

    analytics.track('ide_file_saved', 'builder', 'save_ide_file', {
      metadata: { projectId: activeProjectId, fileId: activeFileId, fileName: activeFile?.path }
    })
  }

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
      prev.map(p =>
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
  }

  useEffect(() => {
    if (activeFile) {
      editorContentRef.current = activeFile.content
    }
  }, [activeFileId])

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

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Local IDE</h2>
          <p className="text-sm text-muted-foreground">Build web apps with a full-featured code editor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setNewProjectDialog(true)} size="sm">
            <Plus weight="bold" size={20} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

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
              {projects.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No projects</p>
                </div>
              )}
              {projects.map(project => (
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
                    {!activeFile.saved && <span className="text-accent text-xs">(unsaved)</span>}
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
